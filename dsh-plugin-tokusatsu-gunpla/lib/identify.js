/**
 * Identification engine: the deterministic core of the plugin.
 *
 * Pipeline: evidence → counterfeit gate → knowledge match → line-specific
 * judgment → confidence → answer. Only the final "write a review" step may
 * involve a model; everything here is local, cached, and free.
 * @module @dsh-plugin/tokusatsu-gunpla/identify
 */

import { judgeConfidence } from './checklist.js'
import { decideBelt, normalizeEvidence } from './decide.js'
import { buildSourcePlan, scopeOf } from './sources.js'
import { loadKnowledge, searchRecords } from './store.js'
import { cacheKey, TtlCache, dataPath } from './runtime.js'
import { mergeObservations, recognize } from './vision.js'

/** Recognition cache, keyed by image set plus manual evidence. */
let cache

/**
 * @param {object} config - resolved plugin configuration.
 * @returns {TtlCache} the process-wide recognition cache.
 */
function getCache(config) {
  if (cache === undefined) {
    cache = new TtlCache({ file: dataPath('cache', 'identify.json'), ttlMs: config.cacheTtlMs })
  }
  return cache
}

/**
 * Score a record against the observed evidence. Every contribution is a
 * documented, inspectable rule — no embeddings, no model calls.
 * @param {any} record - knowledge record.
 * @param {object} observations - merged evidence bag.
 * @returns {{ score: number, evidence: string[], contradictions: string[] }} match result.
 */
export function scoreRecord(record, observations) {
  let score = 0
  const evidence = []
  const contradictions = []

  const normalized = normalizeEvidence(observations)

  if (observations.productLine != null) {
    const claimed = String(observations.productLine)
    if (claimed === record.grade) {
      score += 3
      evidence.push(`等级一致：${record.grade}`)
    } else if (claimed !== 'unknown' && claimed !== '未知') {
      contradictions.push(`声明等级 ${claimed} 与库内 ${record.grade} 不一致`)
    }
  }

  const materials = Array.isArray(observations.materials) ? observations.materials : []
  if (materials.length > 0) {
    const expected = record.physical?.materials ?? []
    const overlap = materials.filter((item) => expected.includes(item))
    if (overlap.length > 0) {
      score += 1.5 + 0.5 * (overlap.length - 1)
      evidence.push(`材质吻合：${overlap.join('/')}`)
    }
    const unexpected = materials.filter((item) => item !== 'UNKNOWN' && !expected.includes(item))
    if (unexpected.length > 0) contradictions.push(`出现库内未记录的材质：${unexpected.join('/')}`)
  }

  const observedSize = observations.sizeClass
  if (typeof observedSize === 'string' && observedSize !== 'UNKNOWN' && record.physical?.sizeClass) {
    if (observedSize === record.physical.sizeClass) {
      score += 2
      evidence.push(`尺寸档一致：${observedSize}`)
    } else {
      contradictions.push(`尺寸档 ${observedSize} 与库内 ${record.physical.sizeClass} 不一致`)
    }
  }

  const observedScale = observations.scale
  if (typeof observedScale === 'string' && record.scale) {
    if (String(record.scale).includes(observedScale) || observedScale.includes(String(record.scale))) {
      score += 2
      evidence.push(`比例一致：${record.scale}`)
    } else {
      contradictions.push(`比例 ${observedScale} 与库内 ${record.scale} 不一致`)
    }
  }

  if (observations.jan && record.jan) {
    if (String(observations.jan) === String(record.jan)) {
      score += 5
      evidence.push('JAN 条码完全一致')
    } else {
      contradictions.push('JAN 条码与库内不一致')
    }
  } else if (observations.jan) {
    const prefix = String(observations.jan).slice(0, 7)
    if (/^(?:4543112|4573102|4549660|4573102)/u.test(prefix)) {
      score += 0.5
      evidence.push(`JAN 前缀 ${prefix} 落在万代常用段`)
    } else {
      contradictions.push(`JAN 前缀 ${prefix} 不在万代常用段`)
    }
  }

  if (observations.partsCount != null && record.identifiers?.parts) {
    const declared = Number(String(record.identifiers.parts).match(/\d+/u)?.[0] ?? Number.NaN)
    if (Number.isFinite(declared)) {
      const delta = Math.abs(declared - observations.partsCount)
      if (delta <= 2) {
        score += 1.5
        evidence.push('板件数量区间吻合')
      } else if (delta > 6) {
        contradictions.push(`板件数量 ${observations.partsCount} 与库内约 ${declared} 差距较大`)
      }
    }
  }

  const brand = String(observations.brandText ?? '')
  if (brand !== '') {
    if (/bandai|バンダイ|万代/iu.test(brand)) {
      score += record.brand === 'BANDAI' ? 1.5 : 0
      if (record.brand === 'BANDAI') evidence.push('品牌字样与库内一致')
    } else {
      contradictions.push(`品牌字样为「${brand}」，与 BANDAI 不符`)
    }
  }

  if (normalized.audio !== 'unknown' && record.identifiers?.audio) {
    const expected = String(record.identifiers.audio)
    if (normalized.audio === 'bgm' && /BGM/iu.test(expected)) {
      score += 3
      evidence.push('音效含 BGM，与库内一致')
    } else if (normalized.audio === 'voice' && /台词/iu.test(expected)) {
      score += 2.5
      evidence.push('音效含台词，与库内一致')
    } else if (normalized.audio === 'beep' && /无台词|变身音/iu.test(expected)) {
      score += 1.5
      evidence.push('音效为无台词音效，与库内一致')
    } else if (normalized.audio === 'bgm' && !/BGM/iu.test(expected)) {
      contradictions.push('听到 BGM，但库内记录为无 BGM')
    }
  }

  const observedColors = String(observations.colorway ?? '')
  if (observedColors !== '' && Array.isArray(record.physical?.colors)) {
    const keywords = observedColors.toLowerCase().split(/[\s,，、/]+/u).filter((item) => item.length > 0)
    const text = record.physical.colors.map((item) => `${item['zh-Hans'] ?? ''} ${item.en ?? ''}`).join(' ').toLowerCase()
    if (keywords.some((keyword) => text.includes(keyword))) {
      score += 1
      evidence.push('主色调与库内记录接近')
    }
  }

  return { score, evidence, contradictions }
}

/**
 * Counterfeit gate.
 *
 * Runs before any answer is produced. It never blocks the display path — a
 * suspected counterfeit still gets shown — but it sets `inLibrary: false` so
 * nothing is filed and the user is warned.
 * @param {object} observations - merged evidence bag.
 * @param {any} taxonomy - taxonomy carrying the indicator catalogue.
 * @returns {{ suspected: boolean, hits: any[], score: number, verdict: string }} the gate result.
 */
export function bootlegGate(observations, taxonomy) {
  const hits = []
  const brand = String(observations.brandText ?? '')
  const indicators = taxonomy?.bootlegIndicators ?? []

  const byId = (id) => indicators.find((item) => item.id === id)
  const push = (id, detail) => {
    const indicator = byId(id)
    if (indicator === undefined) return
    hits.push({ id, weight: indicator.weight, label: indicator.label, detail })
  }

  if (brand === '') push('ko-logo-missing', '未读到任何品牌字样')
  if (/banda1|bandia|bandi\b|bandia|万代南|万代商/iu.test(brand)) push('ko-bandai-misspell', `品牌字样异常：${brand}`)
  if (typeof observations.jan === 'string' && observations.jan.length >= 8) {
    const prefix = observations.jan.slice(0, 7)
    if (!/^(?:4543112|4573102|4549660|4543112)/u.test(prefix)) push('ko-no-jan', `JAN 前缀 ${prefix} 不在万代常用段`)
  }
  if (observations.textSharpness === 'blurry' || observations.textSharpness === 'soft') {
    push('ko-logo-distorted', `印刷清晰度：${observations.textSharpness}`)
  }
  const defects = Array.isArray(observations.defects) ? observations.defects : []
  if (defects.some((item) => /毛边|缩水|错位|色差|发白|flash|sink/iu.test(String(item)))) {
    push('ko-cheap-plastic', `可见瑕疵：${defects.join('、')}`)
  }
  if (observations.audioEvidence === 'none' && observations.ledColor != null) {
    push('ko-voice-quality', '有灯光但无音效，疑似音频模块异常')
  }
  if (observations.beltStrapMaterial != null && /薄|纸|廉价|thin|cheap/iu.test(String(observations.beltStrapMaterial))) {
    push('ko-wrong-strap', `带子材质：${observations.beltStrapMaterial}`)
  }
  if (observations.hasMetalParts === false && /CSM|CS/u.test(String(observations.productLine ?? ''))) {
    push('ko-grade-mismatch', '标称 CSM/CS 但未见金属饰件')
  }

  const score = hits.reduce((total, hit) => total + hit.weight, 0)
  const verdict = score >= 45
    ? '高度疑似仿冒/盗版，仅提示不入库'
    : score >= 20
      ? '存在可疑特征，建议补拍铭牌与条码'
      : '未检出明显仿冒特征'
  return { suspected: score >= 45, score, hits, verdict }
}

/**
 * Run the full identification pipeline.
 *
 * @param {object} config - resolved plugin configuration.
 * @param {object} request - identification request.
 * @param {string[]} [request.images] - absolute image paths.
 * @param {string} [request.kind] - claimed category.
 * @param {string} [request.hint] - user hint.
 * @param {object} [request.manual] - user-supplied observation overrides.
 * @param {string[]} [request.provided] - supplied checklist requirement ids.
 * @param {boolean} [request.hasBox] - whether packaging is available.
 * @param {Record<string, string>} [request.answers] - DX/CSM answers already known.
 * @param {boolean} [request.userConfirmed] - whether the user already confirmed a model.
 * @param {boolean} [request.useCache] - whether the recognition cache may answer (default true).
 * @param {AbortSignal} [request.signal] - caller cancellation.
 * @returns {Promise<object>} the identification result.
 */
export async function identify(config, request) {
  const { images = [], kind = 'unknown', hint = '', manual = {}, provided = [], hasBox = false, answers = {}, userConfirmed = false, useCache = true, signal } = request
  const knowledge = await loadKnowledge()
  const key = cacheKey('identify', { images, kind, mode: config.richMode, observations: manual, text: hint })

  if (useCache) {
    const cached = await getCache(config).get(key)
    if (cached !== undefined) return { ...cached, cached: true }
  }

  const notes = []
  let vision
  if (images.length > 0) {
    vision = await recognize(config, { images, kind, hint, signal })
    if (vision.status === 'unavailable') {
      if (vision.reason === 'model-required') {
        // A configuration mistake, not a missing local model. Saying "local vision
        // model unavailable" here sent the user looking for an Ollama install they
        // never had, while the real fix was one config line. The marker lets the
        // result panel surface this above the manual-entry box instead of beside it.
        const advertised = Array.isArray(vision.models) && vision.models.length > 0
          ? `该端点提供：${vision.models.slice(0, 5).join(' / ')}。`
          : ''
        notes.push(`[配置问题] 已配置远端识别端点（${vision.tried?.[0] ?? ''}）但没有指定模型名，本次未发图。请在配置里填 visionModel（例如智谱的 glm-5.3-flash）。${advertised}`)
      } else {
        notes.push(`视觉识别不可用（${vision.reason}），已切换到拍照清单 + 手动补型号路径，本步骤零 token。`)
      }
    } else if (vision.status === 'failed') {
      notes.push(`视觉模型调用失败：${vision.error}。请补拍，或检查端点与 API Key。`)
    }
  } else {
    notes.push('本次未提供图片，按手动证据处理。')
  }

  const observed = vision?.status === 'observed' ? vision.observations : undefined
  const observations = mergeObservations(observed, manual)

  const gate = bootlegGate(observations, knowledge.taxonomy)

  const candidates = []
  const queryText = buildQueryText(observations, hint)
  let ranked = []
  if (queryText !== '') {
    ranked = searchRecords(knowledge.records, queryText, 5)
  }
  if (ranked.length === 0) {
    // Fall back to scoring every record on structured evidence alone; the
    // catalogue is small enough that an exhaustive pass is still free.
    for (const record of knowledge.records) {
      const scored = scoreRecord(record, observations)
      if (scored.score > 0) ranked.push({ record, score: Math.min(0.99, scored.score / 12), via: '结构化证据' })
    }
    ranked.sort((left, right) => right.score - left.score)
    ranked = ranked.slice(0, 5)
  }

  for (const hit of ranked) {
    const scored = scoreRecord(hit.record, observations)
    candidates.push({
      id: hit.record.id,
      model: hit.record.model,
      modelEn: hit.record.modelEn ?? null,
      line: hit.record.line,
      kind: hit.record.kind,
      grade: hit.record.grade,
      series: hit.record.series ?? null,
      matchScore: Number(hit.score.toFixed(3)),
      evidenceScore: scored.score,
      evidence: scored.evidence,
      contradictions: scored.contradictions,
      layer: hit.record.layer,
      matchedVia: hit.via,
    })
  }

  const best = candidates[0]
  const bestRecord = best ? knowledge.records.find((record) => record.id === best.id) : undefined
  const scope = best ? scopeOf(best.line, best.grade, config.richMode) : { inScope: false, tier: 'unknown', reason: '未匹配到库内条目' }

  let judgment
  if (observations.productLine === 'CSM' || observations.productLine === 'CS' || kind === 'belt' || kind === 'device' || kind === 'accessory') {
    judgment = decideBelt({ answers, evidence: observations, ambiguityMargin: 2 })
  } else if (kind === 'gunpla' || kind === 'figure') {
    judgment = judgeGunplaGrade(observations, best?.grade)
  } else {
    judgment = { verdict: 'undetermined', summary: '品类未知，先确认是腰带还是模型。', questions: [] }
  }

  const confidence = judgeConfidence({
    evaluation: { identityEvidence: provided.length > 0 || queryText !== '', blocked: provided.length === 0 && queryText === '' },
    bestScore: best?.matchScore ?? 0,
    bootlegSuspected: gate.suspected,
    visionUsed: vision?.status === 'observed',
    userConfirmed,
  })

  const result = {
    status: best === undefined ? 'no-match' : confidence.level === 'low' ? 'low-confidence' : 'matched',
    observations,
    observationSource: vision?.status === 'observed' ? `local:${vision.model}@${vision.endpoint}` : vision?.status ?? 'manual',
    bootleg: gate,
    candidates,
    best: best ?? null,
    record: bestRecord === undefined ? null : projectRecord(bestRecord, config),
    scope,
    judgment,
    confidence,
    checklist: { provided, hasBox, missingRequired: provided.length === 0 },
    sourcePlan: buildSourcePlan(queryText !== '' ? queryText : String(observations.visibleText?.[0] ?? kind), config.searchLanguage, config.allowBaidu),
    notes,
    generatedAt: new Date().toISOString(),
  }

  if (gate.suspected) notes.push('识别到盗版/KO 特征：结果仅提示，不写入知识库。')

  if (useCache) await getCache(config).set(key, result)
  return result
}

/**
 * Build the search text a knowledge lookup should use.
 * @param {object} observations - merged evidence bag.
 * @param {string} hint - user hint.
 * @returns {string} the query text, possibly empty.
 */
function buildQueryText(observations, hint) {
  const parts = []
  if (typeof observations.seriesText === 'string' && observations.seriesText.trim() !== '') parts.push(observations.seriesText.trim())
  if (typeof observations.modelText === 'string' && observations.modelText.trim() !== '') parts.push(observations.modelText.trim())
  if (Array.isArray(observations.visibleText) && observations.visibleText.length > 0) parts.push(observations.visibleText.slice(0, 2).join(' '))
  if (typeof observations.latin === 'string' && observations.latin.trim() !== '') parts.push(observations.latin.trim())
  if (parts.length === 0 && hint.trim() !== '') parts.push(hint.trim())
  return parts.join(' ').trim()
}

/**
 * Grade judgment for model kits: box evidence plus part count, which is what
 * actually separates EG/HG/RG/MG/PG in the field.
 * @param {object} observations - merged evidence bag.
 * @param {string | undefined} libraryGrade - grade of the best knowledge match.
 * @returns {object} the judgment.
 */
export function judgeGunplaGrade(observations, libraryGrade) {
  const parts = observations.partsCount
  const scale = String(observations.scale ?? '')
  const inferred = []
  if (typeof parts === 'number') {
    const ranges = [
      { grade: 'EG', max: 6, label: '板件极少，符合 EG' },
      { grade: 'HG', max: 12, label: '板件数符合 HG' },
      { grade: 'RG', max: 18, label: '板件数符合 RG' },
      { grade: 'MG', max: 40, label: '板件数符合 MG' },
      { grade: 'PG', max: Number.POSITIVE_INFINITY, label: '板件数符合 PG' },
    ]
    const match = ranges.find((range) => parts <= range.max)
    if (match) inferred.push({ grade: match.grade, reason: match.label })
  }
  if (scale !== '') {
    const scaleGrade = { '1/144': 'HG/RG/EG', '1/100': 'MG/RE100/FULLMECHANICS', '1/60': 'PG' }[scale]
    if (scaleGrade) inferred.push({ grade: scaleGrade, reason: `比例为 ${scale}` })
  }
  const agree = libraryGrade !== undefined && inferred.some((item) => item.grade.includes(libraryGrade))
  return {
    verdict: libraryGrade === undefined ? (inferred.length > 0 ? 'inferred' : 'undetermined') : agree ? 'decided' : 'suspected',
    grade: libraryGrade ?? inferred[0]?.grade ?? null,
    support: inferred,
    needsUserChoice: libraryGrade === undefined || !agree,
    questions: [
      {
        id: 'grade',
        title: '等级',
        prompt: '盒面左下角的等级色块是什么颜色？',
        help: 'EG 绿 / HG 蓝 / RG 红 / MG 白底红字 / PG 金；这是最快的等级判据。',
        options: [
          { value: 'EG', label: '绿色 EG' },
          { value: 'HG', label: '蓝色 HG' },
          { value: 'RG', label: '红色 RG' },
          { value: 'MG', label: '白底红字 MG' },
          { value: 'PG', label: '金色 PG' },
          { value: 'unknown', label: '没有盒子 / 看不清' },
        ],
      },
    ],
    summary: libraryGrade === undefined
      ? '未能确定等级，请回答等级色块问题或手动补型号。'
      : agree
        ? `等级判定为 ${libraryGrade}，与板件/比例证据一致。`
        : `库内等级为 ${libraryGrade}，但板件/比例证据指向其它等级，标为「疑似」请用户确认。`,
  }
}

/**
 * Strip internal bookkeeping from a record before it is shown.
 * @param {any} record - knowledge record.
 * @param {object} config - resolved plugin configuration.
 * @returns {object} the projected record.
 */
function projectRecord(record, config) {
  return {
    id: record.id,
    model: record.model,
    modelEn: record.modelEn ?? null,
    line: record.line,
    kind: record.kind,
    grade: record.grade,
    series: record.series ?? null,
    brand: record.brand,
    scale: record.scale ?? null,
    boxNumber: record.boxNumber ?? null,
    aliases: record.aliases ?? [],
    physical: record.physical ?? null,
    identifiers: record.identifiers ?? null,
    distinguishers: record.distinguishers ?? [],
    pricing: record.pricing ?? null,
    bootlegRisk: record.bootlegRisk ?? null,
    confidence: record.confidence ?? null,
    layer: record.layer,
    updatedAt: record.updatedAt ?? null,
    review: config.richMode ? record.review ?? null : null,
  }
}

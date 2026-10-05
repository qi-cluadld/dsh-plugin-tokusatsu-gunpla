/**
 * Smoke test for the Host domain engine.
 *
 * Runs the whole local pipeline against the packaged seed catalogue with no
 * model and no network, and asserts the behaviours the product specification
 * actually promises: photo requirements are enforced, DX/CSM separates on sound
 * evidence, counterfeit hits never become filable, and corrections win.
 *
 * Usage: node scripts/smoke.mjs
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The store writes under DSH_HOME; point it at a scratch directory so a smoke
// run can never touch real user data.
const scratch = await mkdtemp(join(tmpdir(), 'toku-smoke-'))
process.env.DSH_HOME = scratch

const { planChecklist, evaluateChecklist, captureBanner, judgeConfidence } = await import('../lib/checklist.js')
const { decideBelt } = await import('../lib/decide.js')
const { assessSource, crossVerify, buildSourcePlan, classifyBilibili, scopeOf } = await import('../lib/sources.js')
const { loadKnowledge, searchRecords, recordCorrection, upsertLearned } = await import('../lib/store.js')
const { identify, bootlegGate, judgeGunplaGrade } = await import('../lib/identify.js')

const failures = []
let checks = 0

/**
 * Assert one condition.
 * @param {string} label - what is being asserted.
 * @param {boolean} condition - the result.
 * @param {unknown} [detail] - extra context printed on failure.
 */
function check(label, condition, detail) {
  checks += 1
  if (condition) {
    console.log(`  PASS  ${label}`)
    return
  }
  failures.push(label)
  console.log(`  FAIL  ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
}

console.log('1. Photo requirements')
{
  const gunpla = planChecklist({ kind: 'gunpla', hasBox: true })
  check('gunpla with box requires the box front', gunpla.requirements.some((item) => item.id === 'box-front' && item.level === 'required'))
  check('gunpla with box blocks until box front is provided', evaluateChecklist(gunpla.requirements, []).blocked)
  const noBox = planChecklist({ kind: 'gunpla', hasBox: false })
  check('gunpla without box permits the alternative path', !noBox.requirements.some((item) => item.id === 'box-front'))
  check('no-box gunpla is not blocked, matching the spec fallback chain', !evaluateChecklist(noBox.requirements, []).blocked)
  check('the runner mark is the recommended no-box alternative', noBox.requirements.some((item) => item.id === 'runner-mark' && item.level === 'alternative' && item.recommended === true))
  check('manual model entry is offered as the last alternative', noBox.requirements.some((item) => item.id === 'manual-model' && item.alternativeGroup === 'identity'))
  const alt = evaluateChecklist(noBox.requirements, ['multi-angle'])
  check('one alternative path item is enough for identity evidence', alt.identityEvidence, alt.requirements)
  check('manual model entry alone supplies identity evidence', evaluateChecklist(noBox.requirements, [], true).identityEvidence)
  check('no evidence at all leaves identity evidence unproven', !evaluateChecklist(noBox.requirements, []).identityEvidence)

  const belt = planChecklist({ kind: 'belt', hasBox: true })
  check('belt requires the buckle detached', belt.requirements.some((item) => item.id === 'buckle-detached' && item.level === 'required'))
  check('belt requires the device detached', belt.requirements.some((item) => item.id === 'device-detached' && item.level === 'required'))
  check('belt stays blocked without the two detached shots', evaluateChecklist(belt.requirements, ['strap-overall']).blocked)
  check('belt unblocks once both detached shots exist', !evaluateChecklist(belt.requirements, ['buckle-detached', 'device-detached']).blocked)
  check('rich mode adds the provenance requirement', planChecklist({ kind: 'gunpla', hasBox: true, richMode: true }).requirements.some((item) => item.id === 'provenance-doc'))
  check('capture banner states the belt rule', captureBanner('belt').primary.includes('单独拆下'))
}

console.log('2. DX / CSM decision chain')
{
  const nothing = decideBelt({})
  check('no evidence yields a suspected verdict', nothing.verdict === 'suspected')
  check('no evidence asks for the material question first', nothing.questions[0]?.id === 'material')
  check('no evidence requires a user choice', nothing.needsUserChoice)

  const csm = decideBelt({ answers: { material: 'DIECAST', volume: 'LARGE', detail: 'engraved-numbered', audio: 'bgm', packaging: 'magnetic-hardbox' } })
  check('metal + large + numbered + BGM decides CSM', csm.verdict === 'decided' && csm.grade === 'CSM', csm)

  const dx = decideBelt({ answers: { material: 'ABS', volume: 'HAND', detail: 'molded-mark', audio: 'beep', packaging: 'window-box' } })
  check('plastic + small + molded + no voice decides DX', dx.verdict === 'decided' && dx.grade === 'DX', dx)

  const ambiguous = decideBelt({ answers: { material: 'ABS', audio: 'unknown' } })
  check('contradictory evidence stays suspected', ambiguous.verdict === 'suspected')

  const seeded = decideBelt({ evidence: { materials: ['DIECAST', 'LEATHER'], sizeClass: 'LARGE', audioEvidence: 'bgm', copyrightMarkShape: '激光刻字 编号 001' } })
  check('evidence bag pre-answers the chain', seeded.verdict === 'decided' && seeded.grade === 'CSM', seeded.ranked)
}

console.log('3. Counterfeit gate')
{
  const knowledge = await loadKnowledge()
  const clean = bootlegGate({ brandText: 'BANDAI', jan: '4543112000000', textSharpness: 'sharp' }, knowledge.taxonomy)
  check('clean evidence does not fire the gate', !clean.suspected, clean.hits)
  const dirty = bootlegGate({ brandText: 'BANDA1 万代', jan: '6901234567890', textSharpness: 'blurry', defects: ['毛边', '缩水'] }, knowledge.taxonomy)
  check('misspelt brand + bad JAN + defects fires the gate', dirty.suspected, dirty.hits)
  check('gate reports each indicator with a weight', dirty.hits.every((hit) => typeof hit.weight === 'number' && hit.weight > 0))
}

console.log('4. Knowledge base and user corrections')
{
  const base = await loadKnowledge()
  check('seed catalogue loads', base.records.length >= 10, base.counts)
  const beltHits = searchRecords(base.records, 'CSM Decade Driver')
  check('exact model name matches the CSM record', beltHits[0]?.record.id === 'belt-csm-decade', beltHits[0]?.record.id)
  const jpHits = searchRecords(base.records, 'デザイアドライバー')
  check('Japanese alias matches the Geats belt', jpHits[0]?.record.id === 'belt-dx-geats', jpHits[0]?.record.id)
  const cnHits = searchRecords(base.records, '牛高达')
  check('Chinese alias matches the RG Nu', cnHits[0]?.record.id === 'gunpla-rg-nu', cnHits[0]?.record.id)

  await upsertLearned({ id: 'belt-test-learned', line: 'belt', kind: 'belt', grade: 'DX', model: 'DX 测试条目', brand: 'BANDAI' })
  const withLearned = await loadKnowledge()
  check('learned layer is visible', withLearned.records.some((record) => record.id === 'belt-test-learned'))
  check('learned count is reported', withLearned.counts.learned === 1, withLearned.counts)

  await recordCorrection({ id: 'belt-dx-geats', fields: { grade: 'CSM' }, origin: 'smoke test' })
  const corrected = await loadKnowledge()
  const geats = corrected.records.find((record) => record.id === 'belt-dx-geats')
  check('correction overrides the seed layer', geats.grade === 'CSM' && geats.layer === 'correction', geats)
  check('correction count is reported', corrected.counts.corrected === 1, corrected.counts)
}

console.log('5. Source tiers, Bilibili rules, and filtering')
{
  const official = await assessSource({ url: 'https://www.bandai-hobby.net/item/xyz/', platform: 'retailer' })
  check('vendor domain is tier 1', official.tier === 1, official)
  check('vendor domain is fileable', official.filedable)

  const vpn = await assessSource({ url: 'https://x.com/bandai_official', platform: 'official' })
  check('X official source needs a VPN', vpn.needsVpn === true, vpn)

  const blue = await classifyBilibili({ handle: '万代模型', lightning: 'blue', verifiedSubject: '万代模型官方', hasAvatar: true, title: '高达模型', bio: '拼装模型与手办资讯' })
  check('blue bolt + subject + avatar + toy topic is official', blue.accountClass === 'official', blue)

  const blueIncomplete = await classifyBilibili({ handle: '某某', lightning: 'blue', hasAvatar: true, title: '美食', bio: '日常' })
  check('blue bolt with off-topic content needs user confirmation', blueIncomplete.needsUserConfirmation === true, blueIncomplete)

  const noBolt = await classifyBilibili({ handle: '玩具UP', lightning: 'none', title: '高达', bio: '模型' })
  check('no bolt is the lowest tier and not official', noBolt.accountClass === 'plain-creator' && noBolt.tier === 9, noBolt)

  const yellow = await classifyBilibili({ handle: '某某UP', lightning: 'yellow', title: '高达', bio: '模型' })
  check('yellow bolt is reference only', yellow.accountClass === 'verified-creator' && yellow.tier === 8, yellow)

  const ai = await assessSource({ platform: 'blog', url: 'https://example.com/post', title: 'AI generated', text: '本文由 AI 生成，仅供参考' })
  check('AI-generated content is display only', ai.displayOnly && !ai.filedable, ai)

  const single = crossVerify([official], 'claim')
  check('one source cannot support a claim', !single.supported && single.blockers.length > 0, single)
  const double = crossVerify([official, { ...official, domain: 'tamashiiweb.com', label: 'x', tier: 1, filedable: true, displayOnly: false, flags: {} }], 'claim')
  check('two fileable sources support a claim', double.supported, double)

  const plan = buildSourcePlan('HGUC 191', 'zh', true)
  check('Chinese plan prefers Bing', plan.searches[0].engine === 'bing')
  check('Baidu is offered but marked unverified', plan.searches.some((item) => item.engine === 'baidu' && item.unverified))
  check('banned engines are declared', plan.banned.length === 3)
  check('at least two sources are required by the rules', plan.rules.some((rule) => rule.includes('至少两个')))
  check('default scope excludes PG', !scopeOf('gunpla', 'PG', false).inScope)
  check('rich mode includes PG', scopeOf('gunpla', 'PG', true).inScope)
}

console.log('6. End-to-end identification with manual evidence')
{
  const config = {
    richMode: false,
    vision: { enabled: false, baseUrl: '', model: '', apiKey: '', timeoutMs: 1000, maxImages: 2, maxTokens: 100 },
    cacheTtlMs: 60000,
    searchLanguage: 'zh',
    allowBaidu: false,
  }
  const result = await identify(config, {
    images: [],
    kind: 'gunpla',
    hint: 'HGUC 191',
    manual: { productLine: 'HG', brandText: 'BANDAI', materials: ['PS', 'PE'], sizeClass: 'HAND', scale: '1/144', jan: '4543112000000', textSharpness: 'sharp' },
    provided: ['box-front', 'runner-mark'],
    hasBox: true,
  })
  check('manual evidence matches the HGUC record', result.best?.id === 'gunpla-hg-rx78', result.best)
  check('vision being off is reported, not fatal', result.observationSource === 'manual')
  check('score is positive for a real match', (result.best?.matchScore ?? 0) > 0, result.best?.matchScore)
  check('no counterfeit warning on clean evidence', !result.bootleg.suspected, result.bootleg.hits)
  check('scope says in-scope for HG', result.scope.inScope, result.scope)
  check('a source plan is attached', result.sourcePlan.searches.length >= 1)

  const cached = await identify(config, {
    images: [],
    kind: 'gunpla',
    hint: 'HGUC 191',
    manual: { productLine: 'HG', brandText: 'BANDAI', materials: ['PS', 'PE'], sizeClass: 'HAND', scale: '1/144', jan: '4543112000000', textSharpness: 'sharp' },
    provided: ['box-front', 'runner-mark'],
    hasBox: true,
  })
  check('identical request hits the local cache', cached.cached === true)

  const fake = await identify(config, {
    images: [],
    kind: 'gunpla',
    manual: { brandText: 'BANDA1', jan: '6901234567890', materials: ['ABS'], textSharpness: 'blurry', defects: ['毛边'] },
    hasBox: false,
  })
  check('counterfeit evidence is flagged and not filable', fake.bootleg.suspected && fake.confidence.level === 'suspect', fake.confidence)

  const grade = judgeGunplaGrade({ partsCount: 30, scale: '1/100' }, 'MG')
  check('part count and scale agree with MG', grade.verdict === 'decided', grade)

  const mismatch = judgeGunplaGrade({ partsCount: 30, scale: '1/100' }, 'HG')
  check('a contradicting library grade becomes suspected', mismatch.verdict === 'suspected' && mismatch.needsUserChoice, mismatch)

  const confidence = judgeConfidence({
    evaluation: { identityEvidence: true, blocked: false },
    bestScore: 0.9,
    bootlegSuspected: false,
    visionUsed: true,
    userConfirmed: true,
  })
  check('strong evidence reaches the high band', confidence.level === 'high', confidence)
}

console.log('7. Language catalogue')
{
  const { LANGUAGES, FALLBACK_LANGUAGE, pickLocalized, DISCLAIMER, COMPLIANCE } = await import('../lib/i18n.js')
  check('15 languages are declared', LANGUAGES.length === 15, LANGUAGES.length)
  check('the four fully-translated languages are present', ['zh-Hans', 'zh-Hant', 'en', 'ja'].every((id) => LANGUAGES.some((item) => item.id === id)))
  // A shell commonly reports Chinese as a bare or region-qualified tag. Those are
  // handled as LOOKUP ALIASES, not as catalog entries: widening the catalog would
  // advertise languages this plugin cannot serve and, on the client, mutate a
  // catalog every plugin shares.
  check('the catalog lists no region variants', !LANGUAGES.some((item) => /^zh-(?:CN|SG|TW|HK|MO|MY)$/u.test(item.id)))
  check('a bare zh tag resolves Simplified Chinese', pickLocalized({ en: 'en', 'zh-Hans': 'zh' }, 'zh') === 'zh')
  check('a zh-TW tag resolves Traditional Chinese', pickLocalized({ en: 'en', 'zh-Hant': 'tw' }, 'zh-TW') === 'tw')
  check('an unknown tag still falls back to English', pickLocalized({ en: 'en' }, 'xx-YY') === 'en')
  check('only English has no fallback', LANGUAGES.filter((item) => item.fallback === null).map((item) => item.id).join(',') === 'en')
  check('every non-English language reaches a terminal fallback', LANGUAGES.every((item) => item.id === 'en' || item.fallback !== null))
  check('English text is always available', pickLocalized({ en: 'x' }, 'pl') === 'x')
  check('a missing language falls back along the chain', pickLocalized({ en: 'en', 'zh-Hans': 'zh' }, 'yue') === 'zh')
  check('disclaimer covers all seven clauses in Chinese', DISCLAIMER['zh-Hans'].split('\n').length === 7)
  check('disclaimer covers all seven clauses in English', DISCLAIMER.en.split('\n').length === 7)
  check('compliance copy names GDPR and the EU AI Act', COMPLIANCE.en.split('\n').some((line) => line.includes('GDPR')) && COMPLIANCE.en.split('\n').some((line) => line.includes('EU AI Act')))
}

console.log('9. Vision endpoint degradation')
{
  // A deployment without a local vision model is an EXPECTED state, not an error:
  // the product fallback is the checklist plus manual model entry. So endpoint
  // detection must return undefined rather than throwing, whichever way it is
  // called.
  const { detectEndpoint, DEFAULT_ENDPOINTS } = await import('../lib/vision.js')

  check('three default endpoints are probed', DEFAULT_ENDPOINTS.length === 3)
  check('no argument degrades to undefined', (await detectEndpoint()) === undefined)
  check('an empty string degrades to undefined', (await detectEndpoint('')) === undefined)
  check('an unreachable URL degrades to undefined', (await detectEndpoint('http://127.0.0.1:59999/v1')) === undefined)

  // A wrong argument type must say which value was wrong. It used to surface as
  // "candidate.replace is not a function", which names neither the caller nor the
  // offending input.
  let message = ''
  try {
    await detectEndpoint({ timeoutMs: 1500 })
  } catch (error) {
    message = error instanceof TypeError ? error.message : `wrong error type: ${error.name}`
  }
  check('a non-string argument reports the offending input', message.includes('expects a string base URL') && message.includes('object'), message)
}

console.log('10. Packaged release contents')
{
  // Publishing uses the `files` allow-list, so anything read at runtime but absent
  // from it silently disappears from the published package. The seed catalogue and
  // the whitelist are both loaded by URL relative to `lib/`, so a missing `data`
  // entry shipped a plugin with no knowledge base at all.
  const { readFileSync, readdirSync, existsSync } = await import('node:fs')
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const patterns = manifest.files ?? []

  /** Resolve a glob from the manifest against a literal package-relative path. */
  const covered = (candidate) => patterns.some((pattern) => {
    // npm's globs: `**` crosses directory separators, `*` does not. A single `*`
    // DOES cross dots, so `data/*.json` covers `data/seed-catalog.json`.
    const expression = new RegExp(`^${pattern
      .replace(/[.+^${}()|[\]\\]/gu, '\\$&')
      .replace(/\*\*\//gu, '(?:.*/)?')
      .replace(/\*\*/gu, '.*')
      .replace(/\*/gu, '[^/]*')}$`, 'u')
    return expression.test(candidate)
  })

  // Files the runtime reads by literal path, discovered from the source itself.
  const runtimeReads = []
  for (const name of readdirSync(new URL('../lib', import.meta.url))) {
    if (!name.endsWith('.js')) continue
    const text = readFileSync(new URL(`../lib/${name}`, import.meta.url), 'utf8')
    for (const match of text.matchAll(/new URL\(\s*'(\.\.\/[^']+)'/gu)) {
      runtimeReads.push({ from: name, target: match[1].replace(/^\.\.\//u, '') })
    }
  }
  check('the source reads at least one packaged data file', runtimeReads.length > 0, runtimeReads.length)
  for (const read of runtimeReads) {
    const present = existsSync(new URL(`../${read.target}`, import.meta.url))
    check(`data file ${read.target} exists on disk`, present)
    check(`${read.target} is covered by the published files list`, covered(read.target), manifest.files)
  }
  check('the bundle patch the installer needs is published', covered('cordis.patch.yml'), manifest.files)
}

console.log(`\n${checks - failures.length}/${checks} checks passed`)
await rm(scratch, { recursive: true, force: true })

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('All smoke checks passed.')

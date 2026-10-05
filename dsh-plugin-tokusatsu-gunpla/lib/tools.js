/**
 * Model-facing tools.
 *
 * These four tools are the whole local capability surface. Recognition, DX/CSM
 * judgment, knowledge lookup, source grading, and correction feedback all run
 * in-process for free; the tool descriptions explicitly forbid the model from
 * doing this work itself, which is what keeps the token bill bounded to the
 * one thing only a model can do — writing the review text.
 * @module @dsh-plugin/tokusatsu-gunpla/tools
 */

import { isAbsolute, resolve } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'

import { captureBanner, evaluateChecklist, planChecklist, reminderLines, REQUIREMENTS } from './checklist.js'
import { DECISION_QUESTIONS, decideBelt } from './decide.js'
import { identify } from './identify.js'
import { assessSource, buildSourcePlan, confirmAccount, crossVerify, scopeOf, TIERS } from './sources.js'
import { loadKnowledge, recordCorrection, searchRecords, upsertLearned } from './store.js'
import { visionSettings } from './vision.js'
import { KINDS, KIND_VALUES } from './i18n.js'

/** Session event type carrying one identification result (mirrored from the plugin root). */
const RESULT_EVENT = 'tokusatsu/result'

/**
 * Marker the vision layer puts in a note when the endpoint itself is misconfigured.
 *
 * Kept as a shared constant so the note writer and the panel reader cannot drift:
 * the note is the single source of truth, and this is only how it is recognised.
 */
export const SETUP_ISSUE_MARKER = '[配置问题]'

/** Categories the tools accept, shared by every schema that takes a `kind`. */
const KIND_PROPERTY = {
  type: 'string',
  enum: [...KIND_VALUES],
  description: '品类：belt 腰带本体/带扣、device 变身道具、accessory 配件、gunpla 拼装模型、figure 成品手办、unknown 未知。',
}

/** Closed observation keys the manual escape hatch accepts. */
const MANUAL_DESCRIPTION = [
  '人工观测覆盖项，可覆盖本地模型的判读。常用键：',
  'brandText（品牌字样原文）、productLine（DX/CSM/HG/RG/MG/PG/MB 等）、seriesText（作品名）、',
  'jan（条码数字）、materials（数组，ABS/PC/PS/PVC/DIECAST/LEATHER/PP/UNKNOWN）、',
  'sizeClass（POCKET/HAND/SPAN/LARGE/UNKNOWN）、colorway（主色调）、scale（比例，如 1/144）、',
  'partsCount（板件数整数）、audioEvidence（none/beep/voice/bgm/unknown）、ledColor、',
  'copyrightMarkShape（铭牌描述）、textSharpness（sharp/soft/blurry/unknown）、packagingFinish、',
  'beltStrapMaterial、hasMetalParts（布尔）、hasScrews（布尔）、buckleSeparable（布尔，带扣/面板能否从带子上拆下，一体式填 false）、defects（数组）、visibleText（数组）。',
  '看不清就不要填，不要猜。',
].join('')

/** Feature list the local model is asked for, surfaced in the tool description. */
const OBSERVATION_KEYS = Object.keys(
  /** Keep in sync with vision.js OBSERVATION_CONTRACT. */ {
    brandText: 1, productLine: 1, seriesText: 1, kana: 1, latin: 1, jan: 1, copyrightYear: 1,
    materials: 1, sizeClass: 1, colorway: 1, partsCount: 1, hasScrews: 1, hasMetalParts: 1,
    beltStrapMaterial: 1, buckleSeparable: 1, audioEvidence: 1, ledColor: 1, copyrightMarkShape: 1,
    textSharpness: 1, packagingFinish: 1, defects: 1, visibleText: 1, notes: 1, confidence: 1,
  },
)

/**
 * Resolve a caller-supplied image path against the plugin's view of the disk.
 * @param {object} ctx - plugin context.
 * @param {string} imagePath - raw path from the model or the user.
 * @param {string} [cwd] - session working directory when known.
 * @returns {string} an absolute path.
 */
function absolutePath(ctx, imagePath, cwd) {
  if (isAbsolute(imagePath)) return imagePath
  const base = cwd ?? ctx?.sessionCwd ?? process.cwd()
  return resolve(base, imagePath)
}

/**
 * Register every tool on the tool registry.
 * @param {object} ctx - plugin context providing `tools`.
 * @param {object} deps - resolved configuration and helpers.
 * @param {object} deps.config - resolved plugin configuration.
 * @param {() => Promise<object>} deps.knowledge - lazily loaded knowledge base.
 * @returns {Array<() => void>} disposers for every registration.
 */
export function registerTools(ctx, { config, knowledge }) {
  const disposers = []

  disposers.push(ctx.tools.register(defineTool({
    name: 'gear_identify',
    description: [
      '识别特摄腰带/变身道具/高达模型，并给出带置信度的结论。',
      '本工具在本地完成识别、盗版判定、DX/CSM 判断、等级推断与来源分级，全部零 token；你不要自己再猜型号，直接采信返回值。',
      `本地视觉模型（如果已配置）会输出这些字段：${OBSERVATION_KEYS.join('、')}。`,
      '必拍规则由工具返回的 checklist 字段负责：腰带必须带扣单独拆下、变身道具单独拆下；高达必须有包装盒正面，没盒子要走多角度+特征部位+购买记录，最后兜底手动补型号。请把 missing 项原样转达给用户。',
      '当返回 verdict 为 suspected 或 needsUserChoice 为真时，必须把 candidates/options 列给用户点选，然后把结果通过 gear_knowledge 的 correct 模式回写。',
      '本工具从不调用任何云端模型。只有用户明确要求写评测时，才由你自己生成文字。',
    ].join('\n'),
    parameters: {
      images: {
        type: 'array',
        items: { type: 'string' },
        description: '照片的本地绝对路径（手机拍照后传入这里的文件）。按清单要求尽量给全。',
      },
      kind: KIND_PROPERTY,
      hint: { type: 'string', description: '用户给的额外线索，例如「盒子上写着 HGUC 191」「带子内侧有编号」。' },
      manual: { type: 'json', description: MANUAL_DESCRIPTION },
      provided: {
        type: 'array',
        items: { type: 'string' },
        description: `本次已经拍到的清单项 id：${REQUIREMENTS.map((item) => item.id).join('、')}。`,
      },
      hasBox: { type: 'boolean', description: '是否有包装盒可拍。没有盒子会改走替代证据路径。' },
      answers: { type: 'json', description: 'DX/CSM 判断树已回答的问题：{ material, volume, detail, audio, packaging }。' },
      userConfirmed: { type: 'boolean', description: '用户是否已经自己确认过型号。' },
      useCache: { type: 'boolean', description: '是否允许命中本地缓存（默认允许）。重复识别同一批照片不会重复计算。' },
    },
    output: {
      schema: { type: 'json', description: '完整识别结果。' },
      render(_args, value) {
        return [{ type: 'text', text: renderIdentify(value) }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const request = {
        images: (args.images ?? []).map((item) => absolutePath(ctx, item)),
        kind: args.kind ?? 'unknown',
        hint: args.hint ?? '',
        manual: args.manual ?? {},
        provided: args.provided ?? [],
        hasBox: args.hasBox === true,
        answers: args.answers ?? {},
        userConfirmed: args.userConfirmed === true,
        useCache: args.useCache !== false,
      }
      const result = await identify(config, request)
      // `buckleSeparable` has been part of the observation contract all along but
      // was read by nothing, which is what left one-piece belts permanently
      // blocked. Either the local model or the user's manual override may report
      // it, so accept both spellings and leave anything else unknown.
      const observed = result.observations?.buckleSeparable
      const buckleSeparable = observed === false || observed === 'false' ? false : observed === true || observed === 'true' ? true : undefined
      const plan = evaluateChecklist(
        planChecklist({ kind: request.kind, hasBox: request.hasBox, richMode: config.richMode, buckleSeparable }).requirements,
        request.provided,
        result.candidates.length > 0 && result.confidence.level !== 'low',
      )
      const payload = { ...result, checklist: { ...plan, hasBox: request.hasBox, buckleSeparable: buckleSeparable ?? null }, reminders: reminderLines(plan) }
      // Publish the whole result to the session so the browser half can render
      // it: a client plugin has no other way to read tool output. Only the fields
      // the result panel draws are persisted, to keep the session log small.
      exec.agent?.session?.append(RESULT_EVENT, { result: forPanel(payload), at: Date.now() })
      return payload
    },
    presentCall: (args) => ({
      card: 'generic',
      title: `识别 ${KINDS[args.kind ?? 'unknown'] ?? args.kind ?? 'unknown'}（${args.images?.length ?? 0} 张照片）`,
      kind: 'read',
      rawInput: { kind: args.kind, images: args.images },
    }),
    presentResult: (_args, result) => ({
      card: 'generic',
      title: '识别完成（本地推理，零 token）',
      content: [{ type: 'text', text: String(result.content?.[0]?.text ?? '').slice(0, 4000) }],
    }),
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'gear_checklist',
    description: [
      '生成或核对拍照清单。这是纯本地规则，零 token。',
      '在用户准备拍照前调用一次，把 primary 提醒原样显示在界面上（腰带必须拆带扣、拆变身道具；高达必须有盒子正面）。',
      '腰带的面板与带子一体、拆不下来时传 buckleSeparable=false：清单会用「面板背面铭牌翻拍」替代「带扣单独拆下拍摄」，这类腰带不会永远卡在必拍项上。',
      '用户拍完后再调用一次并传入 provided，工具会算出还缺什么。blocked 为真时不要给出确定性结论。',
    ].join('\n'),
    parameters: {
      kind: KIND_PROPERTY,
      hasBox: { type: 'boolean', description: '是否有包装盒可拍。' },
      buckleSeparable: { type: 'boolean', description: '腰带的带扣/面板能否从带子上拆下。不可拆（一体式）传 false；不确定就不要传。' },
      provided: { type: 'array', items: { type: 'string' }, description: '已经拍到的清单项 id。' },
    },
    output: {
      schema: { type: 'json', description: '清单计划与核对结果。' },
      render(_args, value) {
        const plan = value
        const lines = [
          `【拍照要求 · ${KINDS[plan.kind] ?? plan.kind}】`,
          plan.banner.primary,
          plan.banner.secondary,
          '',
          ...plan.requirements.map((item) => `${item.satisfied ? '✅' : item.level === 'required' ? '❗' : item.level === 'alternative' ? '🔁' : '⭕'} ${item.title} — ${item.hint}`),
          '',
          plan.blocked ? `⛔ 仍有必拍项未完成，先补拍：${plan.missing.map((item) => item.title).join('、')}` : '✅ 清单已满足，可以开始识别。',
        ]
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    isConcurrencySafe: () => true,
    execute(args) {
      const buckleSeparable = typeof args.buckleSeparable === 'boolean' ? args.buckleSeparable : undefined
      const plan = planChecklist({ kind: args.kind ?? 'unknown', hasBox: args.hasBox === true, richMode: config.richMode, buckleSeparable })
      const evaluation = evaluateChecklist(plan.requirements, args.provided ?? [])
      return Promise.resolve({
        kind: plan.kind,
        hasBox: plan.hasBox,
        buckleSeparable: plan.buckleSeparable,
        banner: captureBanner(plan.kind, { buckleSeparable }),
        requirements: evaluation.requirements,
        satisfied: evaluation.satisfied,
        missing: evaluation.missing,
        blocked: evaluation.blocked,
        identityEvidence: evaluation.identityEvidence,
        nextAction: evaluation.nextAction,
        reminders: reminderLines(evaluation),
      })
    },
    presentCall: (args) => ({ card: 'generic', title: `拍照清单 · ${KINDS[args.kind ?? 'unknown'] ?? 'unknown'}`, kind: 'other' }),
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'gear_decide_edition',
    description: [
      '按 材质 → 体积 → 细节 → 问音效 的顺序判定 DX / CSM。纯本地打分，零 token。',
      '先尽量用已知证据调用一次；返回的 questions 是还缺的问题，按顺序问用户。',
      'verdict 为 suspected 时不要自己拍板：把 candidate 与 alternatives 给用户点选，再用 gear_knowledge 的 correct 模式回写纠正库。',
      '音效有台词/BGM 是 CSM 的最强判据；只有变身音没人说话则偏 DX。',
    ].join('\n'),
    parameters: {
      answers: { type: 'json', description: '已回答的问题：{ material: DIECAST|LEATHER|ABS|UNKNOWN, volume: LARGE|SPAN|HAND|POCKET, detail: engraved-numbered|molded-mark|unknown, audio: bgm|voice|beep|none|unknown, packaging: magnetic-hardbox|window-box|none|unknown }。' },
      evidence: { type: 'json', description: '原始证据包，与 gear_identify 的 observations 同结构；用于自动填答。' },
      maxQuestions: { type: 'number', description: '最多返回几个未回答的问题，默认 3。' },
    },
    output: {
      schema: { type: 'json', description: '判定结果与待问问题。' },
      render(_args, value) {
        const verdict = value
        const lines = [`【DX / CSM 判定】${verdict.summary}`]
        if (verdict.verdict === 'decided') lines.push(`结论：${verdict.grade}`)
        else lines.push(`疑似：倾向 ${verdict.candidate}${verdict.alternatives.length > 0 ? `，也可能是 ${verdict.alternatives.join(' / ')}` : ''}，请用户点选。`)
        lines.push('', '得分明细：', ...verdict.ranked.map((item) => `- ${item.grade}: ${item.score}${item.hits.length > 0 ? `（${item.hits.join(', ')}）` : ''}`))
        if (verdict.questions.length > 0) {
          lines.push('', '还需要问：')
          for (const question of verdict.questions) {
            lines.push(`· ${question.title}：${question.prompt}`, `  可选：${question.options.map((option) => `${option.value}=${option.label}`).join(' / ')}`)
          }
        }
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    isConcurrencySafe: () => true,
    execute(args) {
      return Promise.resolve(decideBelt({
        answers: args.answers ?? {},
        evidence: args.evidence ?? {},
        maxQuestions: typeof args.maxQuestions === 'number' ? Math.max(0, Math.min(DECISION_QUESTIONS.length, Math.trunc(args.maxQuestions))) : 3,
      }))
    },
    presentCall: () => ({ card: 'generic', title: 'DX / CSM 判定（本地规则）', kind: 'other' }),
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'gear_knowledge',
    description: [
      '查询和回写本地知识库。零 token。',
      'mode=lookup：按型号/别名模糊查库（本地相似度，不用模型）。',
      'mode=search：返回检索计划，含中文 Bing 优先的搜索入口、官网站内检索提示、来源优先级表与假消息过滤规则。不要用 360/搜狗/2345。',
      'mode=assess：给一批候选来源打分。B 站账号需要传 account（handle/lightning/verifiedSubject/hasAvatar/title/bio），无闪电或主体不符会返回 needsUserConfirmation，必须弹窗让用户确认。',
      'mode=cross：至少两源交叉核对，不足两源或含 AI 生成内容时 filedable 为假，只能标「待确认」。',
      'mode=correct：把用户纠正的结果写入纠正库（最高优先级，更新不会覆盖）。',
      'mode=file：把已核实的条目写入本地库。只在 cross 通过后使用。',
      'mode=scope：判断某个等级属于大众款还是富哥模式范围。',
      'mode=stats：库内条目统计与数据目录。',
    ].join('\n'),
    parameters: {
      mode: {
        type: 'string',
        required: true,
        enum: ['lookup', 'search', 'assess', 'cross', 'correct', 'file', 'scope', 'stats'],
        description: '要执行的操作。',
      },
      query: { type: 'string', description: 'lookup/search/scope 的检索词或等级；scope 模式传等级键。' },
      language: { type: 'string', enum: ['zh', 'en', 'ja', 'ru'], description: 'search 模式的市场语言，默认 zh。' },
      allowBaidu: { type: 'boolean', description: 'search 模式是否附带百度入口（结果会被标注「未认证」）。' },
      id: { type: 'string', description: 'correct/file 模式的目标记录 id。' },
      fields: { type: 'json', description: 'correct 模式要写入的字段对象；file 模式传整条记录。' },
      origin: { type: 'string', description: 'correct 模式的来源说明，例如「用户在疑似弹窗中选择了 CSM」。' },
      account: { type: 'json', description: 'assess 模式的 B 站账号信息：{ handle, lightning: blue|yellow|none, verifiedSubject, hasAvatar, title, bio }。' },
      sources: { type: 'array', items: { type: 'json' }, description: 'assess/cross 模式的候选来源数组。' },
      confirmAccount: { type: 'boolean', description: 'assess 模式下用户已确认该账号为官方，将其写入用户白名单。' },
      line: { type: 'string', enum: ['gunpla', 'belt'], description: 'scope 模式的产品线。' },
      limit: { type: 'number', description: 'lookup 模式返回上限，默认 8。' },
    },
    output: {
      schema: { type: 'json', description: '按 mode 返回的结果。' },
      render(_args, value) {
        return [{ type: 'text', text: typeof value?.rendered === 'string' ? value.rendered : JSON.stringify(value, null, 2) }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args) {
      switch (args.mode) {
        case 'lookup': {
          const base = await knowledge()
          const hits = searchRecords(base.records, args.query ?? '', typeof args.limit === 'number' ? Math.trunc(args.limit) : 8)
          const rendered = hits.length === 0
            ? `库内未找到「${args.query ?? ''}」。可改用 search 模式走官网与官方发售列表，或手动补型号。`
            : hits.map((hit) => `- ${hit.record.model}（${hit.record.grade}/${hit.record.line}）匹配度 ${(hit.score * 100).toFixed(0)}%，命中「${hit.via}」，层：${hit.record.layer}`).join('\n')
          return { mode: args.mode, hits: hits.map((hit) => ({ id: hit.record.id, model: hit.record.model, grade: hit.record.grade, line: hit.record.line, score: hit.score, layer: hit.record.layer })), rendered }
        }
        case 'search': {
          const plan = buildSourcePlan(args.query ?? '', args.language ?? config.searchLanguage, args.allowBaidu === true)
          const rendered = [
            `检索计划：${plan.query}`,
            ...plan.searches.map((item) => `· ${item.engine}${item.unverified ? '（未认证）' : ''}${item.requiresVpn ? ' [需 VPN]' : ''}：${item.url}`),
            '',
            '官网站内检索：',
            ...plan.officialSiteHints.map((item) => `· ${item.hint}${item.requiresVpn ? ' [需 VPN]' : ''}`),
            '',
            '来源优先级：',
            ...plan.hierarchy.map((tier) => `${tier.tier}. ${tier.label}（${tier.note}）`),
            '',
            '规则：',
            ...plan.rules.map((rule) => `· ${rule}`),
          ].join('\n')
          return { mode: args.mode, plan, rendered }
        }
        case 'assess': {
          const account = args.account ?? {}
          const assessments = []
          if (Object.keys(account).length > 0) {
            assessments.push(await assessSource({ platform: 'bilibili', account }))
            if (args.confirmAccount === true) await confirmAccount(account)
          }
          for (const source of args.sources ?? []) assessments.push(await assessSource(source))
          const rendered = assessments.map((item) => [
            `· ${item.domain || item.label} → 层级 ${item.tier}（${item.label}），信任上限 ${item.trust}`,
            ...(item.needsUserConfirmation ? [`  ⚠ 需要用户确认：${item.prompt ?? '账号身份无法自动确认'}`] : []),
            `  ${item.displayOnly ? '只展示，不入库' : '可入库'}`,
            ...(item.reasons ?? []).map((reason) => `  - ${reason}`),
          ].join('\n')).join('\n')
          return { mode: args.mode, assessments, rendered: rendered === '' ? '未提供任何来源。' : rendered }
        }
        case 'cross': {
          const assessments = []
          for (const source of args.sources ?? []) assessments.push(await assessSource(source))
          const verdict = crossVerify(assessments, args.query ?? '')
          const rendered = [
            `交叉核对：${verdict.claim || '(未命名结论)'}`,
            `独立来源数：${verdict.independentSources}，最佳层级：${verdict.bestTier}`,
            verdict.supported ? '✅ 满足入库条件' : `⛔ 不可入库：\n${verdict.blockers.map((item) => `· ${item}`).join('\n')}`,
          ].join('\n')
          return { mode: args.mode, verdict, rendered }
        }
        case 'correct': {
          const outcome = await recordCorrection({ id: args.id ?? '', fields: args.fields ?? {}, origin: args.origin ?? 'user' })
          knowledge.cache = undefined
          return {
            mode: args.mode,
            ...outcome,
            rendered: `已写入纠正库：${outcome.id}（字段 ${outcome.fields.join('、')}），共 ${outcome.total} 条纠正。该结果优先级最高，不会被后续更新覆盖。`,
          }
        }
        case 'file': {
          const fields = args.fields ?? {}
          const record = { ...fields, id: args.id ?? fields.id }
          const outcome = await upsertLearned(record)
          knowledge.cache = undefined
          return { mode: args.mode, ...outcome, rendered: `已写入本地库：${outcome.id}，本地层共 ${outcome.total} 条。` }
        }
        case 'scope': {
          const verdict = scopeOf(args.line ?? 'gunpla', args.query ?? '', config.richMode)
          return {
            mode: args.mode,
            ...verdict,
            rendered: verdict.inScope ? `✅ ${verdict.reason}` : `⛔ ${verdict.reason}`,
          }
        }
        default: {
          const base = await knowledge()
          const vision = visionSettings(config)
          return {
            mode: 'stats',
            counts: base.counts,
            tiers: TIERS.map((tier) => ({ tier: tier.id, label: tier.label })),
            richMode: config.richMode,
            vision: { enabled: vision.enabled, baseUrl: vision.baseUrl ?? '(自动探测)', model: vision.model || '(第一个可用)' },
            rendered: [
              `库内条目：seed ${base.counts.seed} / learned ${base.counts.learned} / 用户纠正 ${base.counts.corrected}`,
              `富哥模式：${config.richMode ? '开启' : '关闭'}`,
              `本地视觉端点：${vision.enabled ? vision.baseUrl || '自动探测 127.0.0.1:11434 / :1234 / :8080' : '已关闭'}，模型 ${vision.model || '第一个可用'}`,
            ].join('\n'),
          }
        }
      }
    },
    presentCall: (args) => ({ card: 'generic', title: `知识库 · ${args.mode}`, kind: args.mode === 'search' ? 'search' : 'other' }),
  })))

  return disposers
}

/**
 * Project an identification result down to the fields the result panel renders.
 *
 * The full result is quadratic in nothing but is still large (source plans,
 * observations, per-candidate evidence); the panel needs a small, stable subset,
 * and the session log should not carry the rest.
 * @param {any} result - the full identification result.
 * @returns {object} the panel projection, plain JSON.
 */
export function forPanel(result) {
  const notes = result.notes ?? []
  return {
    status: result.status,
    observationSource: result.observationSource,
    cached: result.cached === true,
    generatedAt: result.generatedAt,
    best: result.best,
    candidates: result.candidates,
    bootleg: result.bootleg,
    judgment: result.judgment,
    scope: result.scope,
    confidence: result.confidence,
    notes,
    reminders: result.reminders ?? [],
    // A misconfigured endpoint is a different situation from "the photo did not
    // show enough". The panel has to say which, or the user reads "enter the model
    // number" as the answer when the answer is one configuration line. Recognised
    // by the marker the vision layer writes, so no second source of truth.
    setupIssue: notes.find((note) => typeof note === 'string' && note.includes(SETUP_ISSUE_MARKER)) ?? null,
  }
}

/**
 * Human-readable identification summary. Built as a string because the tool
 * output is `type: 'json'`: the model reads this text, and the raw structured
 * value stays available for the UI.
 * @param {any} result - identification result.
 * @returns {string} the rendered summary.
 */
function renderIdentify(result) {
  const lines = []
  const level = { high: '高', medium: '中', low: '低', suspect: '疑似仿冒' }[result.confidence.level] ?? result.confidence.level
  lines.push(`【识别结论】置信度 ${level}（${(result.confidence.score * 100).toFixed(0)}%），状态 ${result.status}`)
  if (result.cached === true) lines.push('（命中本地缓存，未重新推理）')

  if (result.best) {
    lines.push(`最可能：${result.best.model}${result.best.modelEn ? ` / ${result.best.modelEn}` : ''}（${result.best.grade} · ${result.best.line}），匹配度 ${(result.best.matchScore * 100).toFixed(0)}%`)
  } else {
    lines.push('库内没有匹配到条目，请走 gear_knowledge 的 search 模式，或请用户手动补型号。')
  }

  if (result.scope) lines.push(`范围：${result.scope.inScope ? '✅' : '⛔'} ${result.scope.reason}`)

  if (result.bootleg && result.bootleg.hits.length > 0) {
    lines.push('', `【盗版/仿冒判定】${result.bootleg.verdict}（风险分 ${result.bootleg.score}）`)
    for (const hit of result.bootleg.hits) lines.push(`· ${hit.label}${hit.detail ? `（${hit.detail}）` : ''}`)
    if (result.bootleg.suspected) lines.push('⚠ 该结果仅作提醒，不会写入知识库。')
  } else {
    lines.push('', '【盗版/仿冒判定】未检出明显仿冒特征。')
  }

  if (result.judgment) {
    lines.push('', `【版本/等级判定】${result.judgment.summary}`)
    if (result.judgment.needsUserChoice) {
      lines.push('需要用户点选确认（把下面选项原样列出）：')
      for (const question of result.judgment.questions ?? []) {
        lines.push(`· ${question.title}：${question.prompt}`)
        lines.push(`  可选：${(question.options ?? []).map((option) => `${option.value}=${option.label}`).join(' / ')}`)
      }
    }
  }

  if (result.reminders && result.reminders.length > 0) {
    lines.push('', '【还缺的拍照项】')
    for (const line of result.reminders) lines.push(line)
  }

  if (result.notes && result.notes.length > 0) {
    lines.push('', '【说明】')
    for (const note of result.notes) lines.push(`· ${note}`)
  }

  lines.push('', `【数据来源】观测来源：${result.observationSource}；结果生成于 ${result.generatedAt}`)
  lines.push('识别仅供参考，非官方工具；数据来自公开网络，不构成购买建议。')
  return lines.join('\n')
}

/**
 * Build the lazily-cached knowledge accessor shared by the tools.
 * @returns {() => Promise<object>} accessor that memoizes the merged knowledge base.
 */
export function knowledgeAccessor() {
  let cached
  const accessor = async () => {
    if (cached === undefined) cached = await loadKnowledge()
    return cached
  }
  return accessor
}

/** @returns {string[]} the registered tool names, for diagnostics. */
export const TOOL_NAMES = ['gear_identify', 'gear_checklist', 'gear_decide_edition', 'gear_knowledge']

/** Exported for tests: the checklist names the schemas reference. */
export { REQUIREMENTS }

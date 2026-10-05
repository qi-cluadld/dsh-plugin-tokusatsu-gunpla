/**
 * Photo-requirement engine.
 *
 * The product's hard rule is that identification quality is bounded by photo
 * quality, so the requirements are computed as data and enforced before any
 * judgment runs. Titles and hints carry stable ids; the client translates them,
 * and the Host falls back to the Chinese strings so a tool result is always
 * readable on its own.
 * @module @dsh-plugin/tokusatsu-gunpla/checklist
 */

/**
 * Requirement catalogue.
 *
 * `level` is `required` for entries that block a confident answer, `alternative`
 * for entries that can substitute for a missing requirement, and `optional` for
 * quality boosters. `appliesTo` lists the kinds the requirement covers.
 */
export const REQUIREMENTS = [
  {
    id: 'box-front',
    level: 'required',
    appliesTo: ['gunpla', 'figure'],
    title: '包装盒正面',
    hint: '含万代商标、等级色块与商品编号的整面；不要裁掉盒角。',
    reason: '盒面是等级、编号与商标的唯一可靠来源，也是判定盗版的第一现场。',
    alternativeGroup: 'identity',
  },
  {
    id: 'box-side',
    level: 'optional',
    appliesTo: ['gunpla', 'figure'],
    title: '包装盒侧面/背面',
    hint: '拍带 JAN 条码的一侧，以及标有 Bandai Hobby / 魂ウェブ 的一面。',
    reason: '条码与发行信息用于核对版本与真伪。',
  },
  {
    id: 'runner-mark',
    level: 'alternative',
    recommended: true,
    appliesTo: ['gunpla'],
    title: '板件流道铭文',
    hint: '对着流道上 BANDAI 字样与年份拍一张微距。',
    reason: '正版流道必有万代铭文与年份，是 KO 最常缺失的证据；没有盒子时它是最强替代证据。',
    alternativeGroup: 'identity',
  },
  {
    id: 'multi-angle',
    level: 'alternative',
    appliesTo: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'],
    title: '无盒时的多角度',
    hint: '正面、背面、侧面各一张，保持同一距离与光线。',
    reason: '没有包装时的最低限度证据。',
    alternativeGroup: 'identity',
  },
  {
    id: 'feature-part',
    level: 'alternative',
    appliesTo: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'],
    title: '特征部位特写',
    hint: '模型拍头部/胸口/关节；腰带拍带扣正面与背面。',
    reason: '特征部位用于区分等级与批次差异。',
    alternativeGroup: 'identity',
  },
  {
    id: 'purchase-record',
    level: 'alternative',
    appliesTo: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'],
    title: '购买记录截图',
    hint: '订单页或收据，需含商品全名与店铺。',
    reason: '在影像证据不足时用于交叉核对，不作为唯一依据。',
    alternativeGroup: 'identity',
  },
  {
    id: 'manual-model',
    level: 'alternative',
    appliesTo: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'],
    title: '手动补型号',
    hint: '直接输入完整型号，例如「HGUC 191 RX-78-2」「CSM Decade Driver」。',
    reason: '影像与记录都不可得时的兜底路径；结果会标记为「用户提供」。',
    alternativeGroup: 'identity',
  },
  {
    id: 'buckle-detached',
    level: 'required',
    appliesTo: ['belt'],
    title: '带扣单独拆下拍摄',
    hint: '把带扣从带子上拆下，正面、背面各一张，背面要有铭牌。',
    reason: '带扣背面的商标、年份与产地铭牌是腰带鉴定的核心证据，装在带子上拍不到。',
  },
  {
    id: 'device-detached',
    level: 'required',
    appliesTo: ['belt'],
    title: '变身道具单独拆下拍摄',
    hint: '把变身道具（卡/锁种/密钥/硬币等）从带扣取出分开拍。',
    reason: '道具是 DX 与 CSM 在配件层面的主要差异所在。',
  },
  {
    id: 'strap-overall',
    level: 'optional',
    appliesTo: ['belt'],
    title: '带子整体',
    hint: '带子摊平，包含扣具、调节孔与内衬。',
    reason: '带子材质与扣具是第三方与复刻件最容易暴露的地方。',
  },
  {
    id: 'audio-evidence',
    level: 'optional',
    appliesTo: ['belt', 'device'],
    title: '音效证据',
    hint: '录一段变身音：有没有台词、有没有 BGM、音质是否发闷。',
    reason: 'DX 与 CSM 的音频差距最大，这一条常能一票定性。',
  },
  {
    id: 'electronics-bay',
    level: 'optional',
    appliesTo: ['belt', 'device'],
    title: '电池仓与触点',
    hint: '打开电池仓拍触点与弹簧。',
    reason: '正版触点规整无氧化，仿品常见弹片歪斜。',
  },
]

/**
 * Compute the requirement plan for one capture session.
 * @param {object} input - session shape.
 * @param {string} input.kind - belt | device | accessory | gunpla | figure | unknown.
 * @param {boolean} [input.hasBox] - whether the user has the packaging to hand.
 * @param {boolean} [input.richMode] - 富哥模式, which adds a few evidence requirements for high-value items.
 * @returns {{ kind: string, hasBox: boolean, requirements: any[], satisfied: string[], missing: any[], blocked: boolean, nextAction: string }} the plan.
 */
export function planChecklist({ kind = 'unknown', hasBox = false, richMode = false } = {}) {
  const applicable = REQUIREMENTS.filter((requirement) => requirement.appliesTo.includes(kind))
  const requirements = applicable
    .filter((requirement) => (hasBox ? true : requirement.id !== 'box-front' && requirement.id !== 'box-side'))
    .map((requirement) => ({ ...requirement, satisfied: false }))

  if (richMode) {
    requirements.push({
      id: 'provenance-doc',
      level: 'optional',
      appliesTo: [kind],
      title: '来源凭证',
      hint: '限定/高价位商品的抽选记录、代理贴标或官方订单页。',
      reason: '富哥模式下的高价商品需要来源链，否则结果只标「待确认」。',
      satisfied: false,
    })
  }

  const missing = requirements.filter((requirement) => !requirement.satisfied)
  const requiredMissing = missing.filter((requirement) => requirement.level === 'required')
  return {
    kind,
    hasBox,
    requirements,
    satisfied: [],
    missing,
    blocked: requiredMissing.length > 0,
    nextAction: nextActionFor(missing),
  }
}

/**
 * Evaluate a plan against the photos actually supplied.
 * @param {object[]} requirements - plan requirements.
 * @param {string[]} provided - requirement ids the user says they supplied.
 * @param {boolean} [modelKnown] - whether a model number arrived by any route.
 * @returns {{ requirements: any[], satisfied: string[], missing: any[], blocked: boolean, nextAction: string, identityEvidence: boolean }} the evaluation.
 */
export function evaluateChecklist(requirements, provided, modelKnown = false) {
  const given = new Set(provided)
  if (modelKnown) given.add('manual-model')
  const evaluated = requirements.map((requirement) => ({ ...requirement, satisfied: given.has(requirement.id) }))
  const missing = evaluated.filter((requirement) => !requirement.satisfied)
  const blocked = missing.some((requirement) => requirement.level === 'required')
  const groups = new Map()
  for (const requirement of evaluated) {
    const group = requirement.alternativeGroup ?? requirement.id
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(requirement)
  }
  let identityEvidence = false
  for (const group of groups.values()) {
    if (group.some((requirement) => requirement.satisfied)) identityEvidence = true
  }
  return {
    requirements: evaluated,
    satisfied: evaluated.filter((requirement) => requirement.satisfied).map((requirement) => requirement.id),
    missing,
    blocked,
    identityEvidence,
    nextAction: nextActionFor(missing),
  }
}

/**
 * The single most useful next instruction, so the UI and the model always ask
 * for the same thing.
 * @param {any[]} missing - unsatisfied requirements, in catalogue order.
 * @returns {string} a next-action id or an empty string when nothing is missing.
 */
export function nextActionFor(missing) {
  if (missing.length === 0) return ''
  const required = missing.filter((requirement) => requirement.level === 'required')
  if (required.length > 0) return required[0].id
  const alternative = missing.filter((requirement) => requirement.level === 'alternative')
  if (alternative.length > 0) return alternative[0].id
  return missing[0].id
}

/**
 * Human-readable reminder lines, used by tool results and by the fallback
 * prompt when the local vision endpoint is unavailable.
 * @param {object} plan - a plan or evaluation result.
 * @param {number} [limit] - maximum lines.
 * @returns {string[]} reminder lines.
 */
export function reminderLines(plan, limit = 5) {
  const lines = []
  for (const requirement of plan.missing.slice(0, limit)) {
    const tag = requirement.level === 'required' ? '【必须】' : requirement.level === 'alternative' ? '【替代】' : '【可选】'
    lines.push(`${tag}${requirement.title}：${requirement.hint}`)
  }
  return lines
}

/**
 * The persistent capture-screen reminder. The spec requires the requirement to
 * stay on screen for the whole session rather than appear only on failure, so
 * this returns the standing banner text per category.
 * @param {string} kind - capture category.
 * @returns {{ primary: string, secondary: string }} banner text.
 */
export function captureBanner(kind) {
  if (kind === 'belt') {
    return {
      primary: '腰带必须：带扣单独拆下拍、变身道具单独拆下拍。装在带子上的照片无法用于鉴定。',
      secondary: '再补带子整体、电池仓、变身音，判断会更准。',
    }
  }
  if (kind === 'gunpla' || kind === 'figure') {
    return {
      primary: '高达必须：包装盒正面（含商标与等级色块）。',
      secondary: '没盒子：多角度 + 特征部位 + 购买记录；都不行就手动补型号。',
    }
  }
  return {
    primary: '先拍包装或本体的品牌、编号与铭牌，再拍整体。',
    secondary: '看不清的字段留空，不要猜；手动补型号永远可用。',
  }
}

/**
 * Estimate how much an answer can be trusted from the evidence actually held.
 * Everything here is deterministic and free.
 * @param {object} input - evidence summary.
 * @param {object} input.evaluation - result of {@link evaluateChecklist}.
 * @param {number} input.bestScore - knowledge-base match score in [0, 1].
 * @param {boolean} input.bootlegSuspected - whether counterfeit indicators fired.
 * @param {boolean} input.visionUsed - whether the local model contributed.
 * @param {boolean} input.userConfirmed - whether the user already confirmed the model.
 * @returns {{ level: 'high'|'medium'|'low'|'suspect', score: number, reasons: string[] }} the confidence verdict.
 */
export function judgeConfidence({ evaluation, bestScore, bootlegSuspected, visionUsed, userConfirmed }) {
  const reasons = []
  let score = bestScore * 0.6
  if (evaluation.identityEvidence) {
    score += 0.2
    reasons.push('已取得标识性证据（包装/铭牌/型号）')
  } else {
    reasons.push('缺少标识性证据，型号来源不充分')
  }
  if (!evaluation.blocked) {
    score += 0.1
  } else {
    score -= 0.1
    reasons.push('存在未完成的必拍项')
  }
  if (visionUsed) {
    score += 0.08
    reasons.push('本地视觉模型已参与判读')
  } else {
    reasons.push('本地视觉模型未参与，结论基于规则与人工输入')
  }
  if (userConfirmed) {
    score += 0.1
    reasons.push('用户已确认')
  }
  if (bootlegSuspected) {
    reasons.push('检出仿冒/盗版特征，不入库')
    return { level: 'suspect', score: Math.max(0, Math.min(1, score)), reasons }
  }
  const clamped = Math.max(0, Math.min(1, score))
  const level = clamped >= 0.75 ? 'high' : clamped >= 0.45 ? 'medium' : 'low'
  return { level, score: clamped, reasons }
}

/**
 * DX / CSM discrimination.
 *
 * The chain is material → volume → detail → sound effect, and every step is a
 * deterministic test over evidence. When the top two candidates stay within the
 * ambiguity margin the engine refuses to guess: it returns a `suspected` verdict
 * with the competing candidates so the UI can ask the user to pick, and that
 * pick is what feeds {@link module:@dsh-plugin/tokusatsu-gunpla/store} as a
 * correction.
 * @module @dsh-plugin/tokusatsu-gunpla/decide
 */

/**
 * Answer fields the question chain can consume. Each entry names the evidence
 * key it reads and the closed value set the user or local model can supply.
 */
export const DECISION_QUESTIONS = [
  {
    id: 'material',
    stage: 'material',
    evidence: 'materials',
    title: '材质',
    prompt: '带扣主体和带子是什么材质？',
    help: '金属压铸饰件、皮革内衬基本只在 CSM/CS 上出现；DX 以 ABS 塑料加少量弹簧为主。',
    options: [
      { value: 'DIECAST', label: '有金属压铸件/配重' },
      { value: 'LEATHER', label: '带子是皮革或厚实仿皮内衬' },
      { value: 'ABS', label: '整件基本都是塑料' },
      { value: 'UNKNOWN', label: '说不清' },
    ],
  },
  {
    id: 'volume',
    stage: 'volume',
    evidence: 'sizeClass',
    title: '体积',
    prompt: '带扣在你的手掌里大致占多大？',
    help: 'CSM 带扣通常比 DX 大一圈、更厚，单手张开会更有分量。',
    options: [
      { value: 'LARGE', label: '张手还嫌大 / 很厚' },
      { value: 'SPAN', label: '张开手掌刚好托住' },
      { value: 'HAND', label: '手掌内还有余量' },
      { value: 'POCKET', label: '掌内很小' },
    ],
  },
  {
    id: 'detail',
    stage: 'detail',
    evidence: 'engravingDetail',
    title: '细节',
    prompt: '背面铭牌和饰件细节怎么样？',
    help: 'CSM 背面常有激光刻字、独立编号与金属铭牌；DX 多为注塑商标加年份。',
    options: [
      { value: 'engraved-numbered', label: '有激光刻字/独立编号/金属铭牌' },
      { value: 'molded-mark', label: '只有注塑的 BANDAI 商标与年份' },
      { value: 'unknown', label: '没注意' },
    ],
  },
  {
    id: 'audio',
    stage: 'audio',
    evidence: 'audioEvidence',
    title: '音效',
    prompt: '按下去有没有台词或 BGM？',
    help: '这一条通常一票定性：有原版台词与 BGM 的腰带基本不是 DX。',
    options: [
      { value: 'bgm', label: '有台词，还有 BGM' },
      { value: 'voice', label: '有台词，没有 BGM' },
      { value: 'beep', label: '只有音效和必杀音，没人说话' },
      { value: 'none', label: '基本没声音 / 坏了' },
      { value: 'unknown', label: '还没试过' },
    ],
  },
  {
    id: 'packaging',
    stage: 'detail',
    evidence: 'packagingFinish',
    title: '包装',
    prompt: '包装是什么样子？',
    help: 'CSM 多为厚纸磁吸翻盖盒并带编号标签；DX 是常规开窗盒。',
    options: [
      { value: 'magnetic-hardbox', label: '厚磁吸翻盖盒，带编号或证书' },
      { value: 'window-box', label: '常规开窗盒' },
      { value: 'none', label: '没有盒子' },
      { value: 'unknown', label: '记不清' },
    ],
  },
]

/** Score contributions per candidate line, keyed by question id and answer value. */
const LINE_SCORES = {
  CSM: {
    material: { DIECAST: 3, LEATHER: 3, ABS: -1, UNKNOWN: 0 },
    volume: { LARGE: 3, SPAN: 2, HAND: 0, POCKET: -2 },
    detail: { 'engraved-numbered': 3, 'molded-mark': -2, unknown: 0 },
    audio: { bgm: 4, voice: 3, beep: -2, none: 0, unknown: 0 },
    packaging: { 'magnetic-hardbox': 2, 'window-box': -1, none: 0, unknown: 0 },
  },
  DX: {
    material: { DIECAST: -1, LEATHER: -1, ABS: 2, UNKNOWN: 0 },
    volume: { LARGE: 0, SPAN: 1, HAND: 2, POCKET: 1 },
    detail: { 'engraved-numbered': -3, 'molded-mark': 3, unknown: 0 },
    audio: { bgm: -4, voice: -3, beep: 3, none: 0, unknown: 0 },
    packaging: { 'magnetic-hardbox': -2, 'window-box': 2, none: 0, unknown: 0 },
  },
  CS: {
    material: { DIECAST: 3, LEATHER: 3, ABS: -1, UNKNOWN: 0 },
    volume: { LARGE: 3, SPAN: 2, HAND: 0, POCKET: -1 },
    detail: { 'engraved-numbered': 3, 'molded-mark': -2, unknown: 0 },
    audio: { bgm: 1, voice: 1, beep: 1, none: 0, unknown: 0 },
    packaging: { 'magnetic-hardbox': 3, 'window-box': 0, none: 0, unknown: 0 },
  },
  SHOKUGAN: {
    material: { DIECAST: 0, LEATHER: -2, ABS: 1, UNKNOWN: 0 },
    volume: { LARGE: -2, SPAN: -1, HAND: 1, POCKET: 2 },
    detail: { 'engraved-numbered': -2, 'molded-mark': 1, unknown: 0 },
    audio: { bgm: -3, voice: -2, beep: 1, none: 0, unknown: 0 },
    packaging: { 'magnetic-hardbox': -2, 'window-box': 1, none: 0, unknown: 0 },
  },
}

/** Grades the belt decision tree can return, best first on ties. */
const BELT_CANDIDATES = ['CSM', 'DX', 'CS', 'SHOKUGAN']

/**
 * Normalize free evidence into the closed answer values the rule table uses.
 * @param {object} evidence - raw evidence bag (local model observations plus manual input).
 * @returns {{ material: string, volume: string, detail: string, audio: string, packaging: string }} normalized answers.
 */
export function normalizeEvidence(evidence = {}) {
  const materials = Array.isArray(evidence.materials) ? evidence.materials : []
  let material = 'unknown'
  if (materials.includes('DIECAST')) material = 'DIECAST'
  else if (materials.includes('LEATHER')) material = 'LEATHER'
  else if (materials.includes('ABS')) material = 'ABS'

  const sizeClass = typeof evidence.sizeClass === 'string' ? evidence.sizeClass : 'UNKNOWN'
  const volume = ['LARGE', 'SPAN', 'HAND', 'POCKET'].includes(sizeClass) ? sizeClass : 'unknown'

  let detail = 'unknown'
  const hasNumber = typeof evidence.serialNumber === 'string' && evidence.serialNumber.trim() !== ''
  const engraved = /engrav|laser|刻|金属铭牌|编号/iu.test(String(evidence.copyrightMarkShape ?? ''))
  const molded = /molded|注塑|mould|凸字|浮雕/iu.test(String(evidence.copyrightMarkShape ?? ''))
  if (hasNumber || engraved) detail = 'engraved-numbered'
  else if (molded) detail = 'molded-mark'

  const audioEvidence = typeof evidence.audioEvidence === 'string' ? evidence.audioEvidence : 'unknown'
  const audio = ['bgm', 'voice', 'beep', 'none', 'unknown'].includes(audioEvidence) ? audioEvidence : 'unknown'

  let packaging = 'unknown'
  const finish = String(evidence.packagingFinish ?? '')
  if (/\bmagnetic\b|磁吸|厚盒/iu.test(finish)) packaging = 'magnetic-hardbox'
  else if (/window|开窗|常规盒/iu.test(finish)) packaging = 'window-box'
  else if (/none|无盒|没有/iu.test(finish)) packaging = 'none'

  return { material, volume, detail, audio, packaging }
}

/**
 * Score every belt candidate against the answers collected so far.
 * @param {Record<string, string>} answers - question id → answer value.
 * @returns {Array<{ grade: string, score: number, hits: string[] }>} ranked candidates.
 */
export function scoreBeltCandidates(answers) {
  const ranked = []
  for (const grade of BELT_CANDIDATES) {
    const table = LINE_SCORES[grade]
    let score = 0
    const hits = []
    for (const [questionId, answer] of Object.entries(answers)) {
      const contribution = table[questionId]?.[answer]
      if (contribution === undefined || contribution === 0) continue
      score += contribution
      hits.push(`${questionId}=${answer}${contribution > 0 ? '+' : ''}${contribution}`)
    }
    ranked.push({ grade, score, hits })
  }
  ranked.sort((left, right) => right.score - left.score || BELT_CANDIDATES.indexOf(left.grade) - BELT_CANDIDATES.indexOf(right.grade))
  return ranked
}

/**
 * Build the DX/CSM verdict.
 *
 * @param {object} input - decision inputs.
 * @param {Record<string, string>} [input.answers] - answers already known (question id → value).
 * @param {object} [input.evidence] - raw evidence used to seed answers when `answers` is partial.
 * @param {number} [input.ambiguityMargin] - score gap below which the engine says "疑似".
 * @param {number} [input.maxQuestions] - how many unanswered questions to return.
 * @returns {object} the verdict.
 */
export function decideBelt({ answers = {}, evidence = {}, ambiguityMargin = 2, maxQuestions = 3 } = {}) {
  const seeded = { ...fromEvidence(normalizeEvidence(evidence)), ...answers }
  const ranked = scoreBeltCandidates(seeded)
  const top = ranked[0]
  const runnerUp = ranked[1]
  const gap = top.score - runnerUp.score
  const answeredKnown = Object.values(seeded).filter((value) => !isUnknown(value)).length

  const questions = DECISION_QUESTIONS
    .filter((question) => isUnknown(seeded[question.id]))
    .slice(0, maxQuestions)
    .map((question) => ({ ...question, options: question.options.map((option) => ({ ...option })) }))

  const ambiguous = askedNothing(seeded) || gap < ambiguityMargin
  if (ambiguous) {
    return {
      verdict: 'suspected',
      candidate: top.grade,
      alternatives: ranked.filter((entry) => entry.grade !== top.grade && entry.score === runnerUp.score).map((entry) => entry.grade),
      ranked,
      gap,
      answers: seeded,
      questions,
      needsUserChoice: true,
      summary: askedNothing(seeded)
        ? '证据不足，无法判定 DX 还是 CSM，请按顺序回答材质、体积、细节、音效。'
        : `DX 与 CSM 得分接近（差距 ${gap}），请用户点选确认；选择结果会写入纠正库。`,
    }
  }

  return {
    verdict: 'decided',
    grade: top.grade,
    ranked,
    gap,
    answers: seeded,
    questions,
    needsUserChoice: false,
    summary: judgedSummary(top.grade, seeded, answeredKnown),
  }
}

/**
 * @param {unknown} value - one answer value.
 * @returns {boolean} whether the value carries no information.
 */
function isUnknown(value) {
  return value === undefined || value === null || String(value).toLowerCase() === 'unknown'
}

/**
 * @param {Record<string, string>} answers - accumulated answers.
 * @returns {boolean} whether no question has a usable answer yet.
 */
function askedNothing(answers) {
  return Object.values(answers).every(isUnknown)
}

/**
 * Convert normalized evidence into pre-answered question values so the chain
 * only asks what it still does not know.
 * @param {object} normalized - output of {@link normalizeEvidence}.
 * @returns {Record<string, string>} question id → answer value.
 */
function fromEvidence(normalized) {
  return {
    material: normalized.material,
    volume: normalized.volume,
    detail: normalized.detail,
    audio: normalized.audio,
    packaging: normalized.packaging,
  }
}

/**
 * One-line explanation naming the decisive evidence, so a decision is auditable.
 * @param {string} grade - the winning grade.
 * @param {Record<string, string>} answers - accumulated answers.
 * @param {number} answeredKnown - how many answers carried information.
 * @returns {string} the summary.
 */
function judgedSummary(grade, answers, answeredKnown) {
  const decisive = answers.audio === 'bgm' || answers.audio === 'voice'
    ? '音效含台词，指向 CSM/CS 级别'
    : answers.audio === 'beep'
      ? '音效仅变身音与必杀音，指向 DX'
      : answers.material === 'DIECAST' || answers.material === 'LEATHER'
        ? '材质含金属或皮革，指向 CSM/CS 级别'
        : answers.detail === 'engraved-numbered'
          ? '存在激光刻字或独立编号，指向 CSM/CS 级别'
          : '依据体积与细节综合判断'
  return `判定为 ${grade}（依据 ${answeredKnown} 项证据）：${decisive}。`
}

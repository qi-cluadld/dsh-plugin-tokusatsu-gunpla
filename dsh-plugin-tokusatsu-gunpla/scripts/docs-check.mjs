/**
 * Documentation consistency check.
 *
 * The READMEs are a user's first contact with the plugin and the place the legal
 * disclaimers live, so the three language versions must not drift: the same
 * section skeleton, the same four tool names, the same test counts, the same QQ
 * groups, and — most importantly — all seven disclaimer clauses in each
 * language.
 *
 * Each language version is only required to carry its own language's disclaimer;
 * cross-language verbatim matching is deliberately not asserted.
 *
 * Usage: node scripts/docs-check.mjs
 */

import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (name) => readFile(new URL(name, root), 'utf8')

const failures = []
let checks = 0

/**
 * Assert one condition.
 * @param {string} label - assertion label.
 * @param {boolean} condition - result.
 * @param {unknown} [detail] - context printed on failure.
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

const i18n = await import(new URL('lib/i18n.js', root).href)

/** Tool names: exactly these four, never a fifth. */
const TOOLS = ['gear_identify', 'gear_checklist', 'gear_decide_edition', 'gear_knowledge']

/** Configuration keys every version must document. */
const CONFIG_KEYS = [
  'richMode', 'visionEnabled', 'visionBaseUrl', 'visionModel', 'visionTimeoutMs',
  'visionMaxImages', 'cacheTtlMs', 'searchLanguage', 'allowBaidu', 'showCompliance', 'requireAcknowledgement',
]

/** The disclaimer clause set every language must render, in its own language. */
for (const [language, text] of Object.entries(i18n.DISCLAIMER)) {
  const clauses = text.split('\n').filter((line) => line.trim() !== '')
  check(`the ${language} disclaimer carries exactly seven clauses`, clauses.length === 7, clauses.length)
}

const readmes = {
  'README.md': { text: await read('README.md'), language: 'zh-Hans' },
  'README.en.md': { text: await read('README.en.md'), language: 'en' },
  'README.ja.md': { text: await read('README.ja.md'), language: 'ja' },
}

for (const [name, entry] of Object.entries(readmes)) {
  console.log(`\n${name}`)
  const { text, language } = entry

  const h2 = (text.match(/^## /gm) ?? []).length
  const h3 = (text.match(/^### /gm) ?? []).length
  const fences = (text.match(/^```/gm) ?? []).length

  check('has a coherent heading skeleton', h2 >= 10 && h3 >= 8, { h2, h3 })
  check('code fences are balanced', fences % 2 === 0 && fences >= 8, fences)

  const presentTools = TOOLS.filter((tool) => text.includes(tool))
  check('names all four tools', presentTools.length === 4, presentTools)
  const extraTools = (text.match(/gear_[a-z_]+/gu) ?? []).filter((tool) => !TOOLS.includes(tool))
  check('invents no fifth tool', extraTools.length === 0, [...new Set(extraTools)])

  check('states the exact test counts', text.includes('69') && text.includes('43'))
  check('names the local data directory', text.includes('plugin-data/tokusatsu-gunpla'))
  check('carries both QQ group numbers', text.includes('419573550') && text.includes('579938880'))
  check('names the banned search engines', text.includes('360') && text.includes('2345') && /搜狗|sogou/iu.test(text))

  // Accept either the "two independent sources" phrasing used by each translation.
  check(
    'states the two-source ingress rule',
    /(?:2\s*个独立来源|至少\s*2\s*个独立来源|2\s*independent\s+sources|two\s+independent\s+sources|2\s*つの独立|独立した情報源|独立来源数)/iu.test(text),
  )

  check('states that AI content is display-only', /只展示|display-only|表示のみ/u.test(text))
  check('states the counterfeit warning is not an endorsement', /不背书|No endorsement|not an endorsement|推奨しません|推奨ではありません|不代表推荐/u.test(text))

  // The UI section must name the real slot identifiers, or at minimum describe
  // all three surfaces the plugin actually registers. Surface wording differs per
  // translation, so match vocabulary rather than fixed sentences.
  const slotNames = ['conversation.input.dock', 'conversation.composer.dock', 'settings.section'].filter((slot) => text.includes(slot))
  const surfaces = [
    /引导|onboard|guide|startup|ガイド|案内/iu,
    /拍照|capture|photo|拍摄|撮影/iu,
    /结果|result|面板|panel|設定|setting|結果/iu,
  ].filter((pattern) => pattern.test(text))
  check('names the three registered slots or describes all three surfaces', slotNames.length === 3 || surfaces.length === 3, { slotNames, surfaces: surfaces.length })

  const links = (text.match(/README(?:\.en|\.ja)?\.md/gu) ?? [])
  check('links the other two language versions', links.length >= 2, links)

  const missingConfig = CONFIG_KEYS.filter((key) => !text.includes(key))
  check('documents every configuration key', missingConfig.length === 0, missingConfig)

  // This language's own disclaimer, clause by clause, ignoring each clause's
  // leading label so a translation may reword it.
  const clauses = i18n.DISCLAIMER[language].split('\n').filter((line) => line.trim() !== '')
  const probes = clauses
    .map((clause) => clause.replace(/^[^:：]*[:：]\s*/u, '').trim())
    .filter((clause) => clause.length >= 12)
    .map((clause) => clause.slice(0, Math.min(24, clause.length)))
  const matched = probes.filter((probe) => text.includes(probe))
  check(`carries its own ${language} disclaimer clauses verbatim`, matched.length === probes.length, { matched: matched.length, probes: probes.length })

  // Each clause must be presented as a numbered item inside the disclaimer
  // section. The scope matters: the document also numbers the tool list, so a
  // whole-file count cannot distinguish the two.
  const afterHeading = text.split(/^#+ .*(?:免责声明|Disclaimer|免責事項)/mu)[1] ?? ''
  const numbered = (afterHeading.match(/^\d\.\s+\*\*/gmu) ?? []).length
  check('renders the disclaimer as seven numbered clauses', numbered === 7, numbered)
}

console.log(`\n${checks - failures.length}/${checks} checks passed`)

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('All documentation checks passed.')

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
const contract = await import(new URL('scripts/docs-contract.mjs', root).href)

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

/**
 * Every documentation language, paired with the file that carries it.
 *
 * The list is the single source for which translations must exist, so adding a
 * README means adding one row here and the whole contract applies to it.
 */
const DOC_LANGUAGES = ['en', 'en-GB', 'ja', 'de', 'fr', 'es', 'pt', 'ko', 'ru', 'it']

const readmes = {
  'README.md': { text: await read('README.md'), language: 'zh-Hans' },
}
for (const language of DOC_LANGUAGES) {
  readmes[`README.${language}.md`] = { text: await read(`README.${language}.md`), language }
}

/** Every other language version, which each file must link. */
const otherReadmes = (name) =>
  Object.keys(readmes).filter((other) => other !== name).map((other) => other.replace(/^README/u, 'README'))

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

  // These statements must be present in every language. The patterns live in
  // scripts/docs-contract.mjs and match the phrasings the translations actually
  // use, so a failure means the statement is missing, not merely worded
  // differently.
  check('states the two-source ingress rule', contract.REQUIRED_STATEMENTS.twoSources.test(text))
  check('states that AI content is display-only', contract.REQUIRED_STATEMENTS.displayOnly.test(text))
  check('states the counterfeit warning is not an endorsement', contract.REQUIRED_STATEMENTS.notEndorsement.test(text))

  // The UI section must name the real slot identifiers, or at minimum describe
  // all three surfaces the plugin actually registers. Surface wording differs per
  // translation, so match vocabulary rather than fixed sentences.
  const slotNames = ['conversation.input.dock', 'conversation.composer.dock', 'settings.section'].filter((slot) => text.includes(slot))
  const surfaces = contract.SURFACE_PATTERNS.filter((pattern) => pattern.test(text))
  check('names the three registered slots or describes all three surfaces', slotNames.length === 3 || surfaces.length === 3, { slotNames, surfaces: surfaces.length })

  // Each version must offer a way to every other version, so a reader who lands
  // on the wrong language is never stuck.
  const missingLinks = otherReadmes(name).filter((other) => !text.includes(other))
  check('links every other language version', missingLinks.length === 0, missingLinks)

  const missingConfig = CONFIG_KEYS.filter((key) => !text.includes(key))
  check('documents every configuration key', missingConfig.length === 0, missingConfig)

  // The feature must be called what the UI calls it. Translating the Chinese name
  // literally produced "Rich mode" / "Reicher Modus" while the switch in the
  // application reads "Collector mode" / "Sammler-Modus". Both directions are
  // asserted: the right term present AND no leftover of the wrong one, because a
  // partial replacement would otherwise pass.
  const term = contract.RICH_MODE_TERM[name]
  check('names the rich-mode feature as the UI does', text.includes(term), { expected: term })
  const legacy = text.match(contract.RICH_MODE_LEGACY)
  check('carries no literal translation of the Chinese feature name', legacy === null, legacy?.[0])

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
  // section. The scope matters: the document also numbers the tool list and the
  // UI-surface list, so a whole-file count cannot distinguish them.
  const section = contract.disclaimerSection(text)
  const numbered = (section.match(/^\d\.\s+\*\*/gmu) ?? []).length
  check('renders the disclaimer as seven numbered clauses', numbered === 7, numbered)
}

console.log(`\n${checks - failures.length}/${checks} checks passed`)

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('All documentation checks passed.')

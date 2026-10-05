/**
 * Language-aware documentation contract patterns.
 *
 * The READMEs exist in eleven languages now, so a check written around the
 * original three silently reports "missing" for a statement that is present in
 * German or Korean. Keeping the patterns here — rather than inline in one script —
 * means the contract and any diagnostic tool cannot drift apart.
 */

/**
 * REQUIRED STATEMENTS: each must appear in every README, in that language.
 *
 * Every alternative is a phrasing actually used by one of the translations, so a
 * failure means the statement is genuinely absent rather than merely worded
 * differently.
 */
export const REQUIRED_STATEMENTS = {
  twoSources: /(?:2\s*个独立来源|至少\s*2\s*个独立来源|2\s*independent\s+sources|two\s+independent\s+sources|2\s*つの独立|独立した情報源|独立来源数|2\s*unabhängige\s+Quellen|2\s*sources\s+indépendantes|2\s*fuentes\s+independientes|2\s*fontes\s+independentes|2\s*개의?\s*독립|2\s*независимых\s+источник|2\s*fonti\s+indipendenti)/iu,
  displayOnly: /只展示|display-only|表示のみ|nur\s+(?:angezeigt|der\s+Anzeige|zur\s+Anzeige)|affichage\s+seul|solo\s+(?:visualiz|para\s+mostrar)|apenas\s+exib|표시만|только\s+(?:для\s+)?отображ|solo\s+per\s+visualizzazione/iu,
  notEndorsement: /不背书|No endorsement|not an endorsement|推奨しません|推奨ではありません|不代表推荐|keine\s+Empfehlung|non\s+une\s+recommandation|no\s+una\s+recomendación|não\s+uma\s+recomendação|추천이\s+아닙니다|не\s+recomendación|не\s+рекомендация|non\s+una\s+raccomandazione/iu,
}

/** How a translation may describe each of the three registered UI surfaces. */
export const SURFACE_PATTERNS = [
  /引导|onboard|guide|startup|ガイド|案内|Anleitung|guía|guia|가이드|руководство|guida/iu,
  /拍照|capture|photo|拍摄|撮影|Foto|foto|촬영|фото|fotograf/iu,
  /结果|result|面板|panel|設定|setting|結果|Ergebnis|résultat|resultado|risultato|결과|результат/iu,
]

/**
 * Locate the disclaimer section of a README.
 *
 * `split` consumes the separator, so each part BEGINS with its heading only after
 * the leading `## ` has been sliced off. The section is then identified by its
 * shape — exactly seven numbered bold clauses — rather than by a translated
 * heading word, because a heading in an unknown language would otherwise yield an
 * empty section and a false failure.
 * @param {string} text - the README body.
 * @returns {string} the disclaimer section, or '' when it cannot be found.
 */
export function disclaimerSection(text) {
  const sections = text.split(/^## /gmu).slice(1)
  const numbered = (section) => (section.match(/^\d\.\s+\*\*/gmu) ?? []).length
  return sections.find((section) => numbered(section) === 7) ?? ''
}

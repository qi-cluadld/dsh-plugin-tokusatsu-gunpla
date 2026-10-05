/**
 * Language catalogue and shared copy.
 *
 * Three tiers, exactly as the product specifies: complete support for Chinese
 * (Simplified and Traditional), English, and Japanese; UI translation for
 * French, Spanish, Portuguese, Russian, Korean, Cantonese, Vietnamese, German,
 * Italian, Dutch, and Polish; English as the universal fallback. Every
 * registration declares English as its fallback so an incomplete dictionary can
 * never surface a raw key.
 * @module @dsh-plugin/tokusatsu-gunpla/i18n
 */

/**
 * Language ids, display labels (written in the language itself), and fallbacks.
 *
 * This is the supported language set. Region and script tags a shell may report
 * (`zh`, `zh-CN`, `zh-TW`, ...) are handled by {@link LOCALE_ALIASES} at lookup
 * time instead of by widening this list, so nothing here changes the catalog a
 * deployment exposes.
 */
export const LANGUAGES = [
  { id: 'zh-Hans', label: '简体中文', fallback: 'en', tier: 'complete' },
  { id: 'zh-Hant', label: '繁體中文', fallback: 'zh-Hans', tier: 'complete' },
  { id: 'en', label: 'English', fallback: null, tier: 'complete' },
  { id: 'ja', label: '日本語', fallback: 'en', tier: 'complete' },
  { id: 'ko', label: '한국어', fallback: 'en', tier: 'ui' },
  { id: 'fr', label: 'Français', fallback: 'en', tier: 'ui' },
  { id: 'es', label: 'Español', fallback: 'en', tier: 'ui' },
  { id: 'pt', label: 'Português', fallback: 'en', tier: 'ui' },
  { id: 'ru', label: 'Русский', fallback: 'en', tier: 'ui' },
  { id: 'yue', label: '粵語', fallback: 'zh-Hans', tier: 'ui' },
  { id: 'vi', label: 'Tiếng Việt', fallback: 'en', tier: 'ui' },
  { id: 'de', label: 'Deutsch', fallback: 'en', tier: 'ui' },
  { id: 'it', label: 'Italiano', fallback: 'en', tier: 'ui' },
  { id: 'nl', label: 'Nederlands', fallback: 'en', tier: 'ui' },
  { id: 'pl', label: 'Polski', fallback: 'en', tier: 'ui' },
]

/** The language the UI opens in when nothing else is known. */
export const FALLBACK_LANGUAGE = 'en'

/** Item categories, mirrored from the taxonomy for tool schemas. */
export const KINDS = {
  belt: '腰带带扣/带子',
  device: '变身道具',
  accessory: '配件',
  gunpla: '模型套件',
  figure: '成品手办',
  unknown: '未知品类',
}

/** Accepted `kind` values, shared by every schema that takes one. */
export const KIND_VALUES = Object.keys(KINDS)

/**
 * Canonical disclaimer, verbatim from the product specification.
 * Rendered on the onboarding page (behind a checkbox), in the settings page,
 * and in every README.
 */
export const DISCLAIMER = {
  'zh-Hans': [
    '识别仅供参考：本插件不是官方工具，识别结果存在误差，不保证正确。',
    '非官方工具：与万代、东映、圆谷及任何厂商均无关联，未获授权或背书。',
    '数据来自公开网络：条目由公开资料整理，可能过时或有误，请以官方信息为准。',
    'QQ 互通有封号风险：如启用 QQ 转发，账号风险由使用者自行承担。',
    'AI 内容不构成购买建议：评测与描述可能由 AI 生成，不构成投资或购买建议。',
    '开源免费按现状提供：无任何明示或默示担保，使用风险自负。',
    '不背书国产/KO/海外第三方：识别到仿冒品仅作提醒，不代表推荐或认可。',
  ].join('\n'),
  en: [
    'Identification is reference only: this plugin is not an official tool and its results can be wrong.',
    'Unofficial: not affiliated with, authorized by, or endorsed by Bandai, Toei, Tsuburaya, or any vendor.',
    'Data comes from public sources: entries are compiled from public material and may be outdated or inaccurate; always defer to official information.',
    'QQ bridging carries a ban risk: if you enable QQ forwarding, the account risk is yours.',
    'AI content is not buying advice: generated reviews or descriptions are not investment or purchase recommendations.',
    'Open source, provided as is: no warranty of any kind, express or implied; use at your own risk.',
    'No endorsement of domestic, KO, or overseas third-party products: detecting a counterfeit is a warning, not a recommendation.',
  ].join('\n'),
  'zh-Hant': [
    '識別僅供參考：本插件不是官方工具，識別結果存在誤差，不保證正確。',
    '非官方工具：與萬代、東映、圓谷及任何廠商均無關聯，未獲授權或背書。',
    '資料來自公開網路：條目由公開資料整理，可能過時或有誤，請以官方資訊為準。',
    'QQ 互通有封號風險：如啟用 QQ 轉發，帳號風險由使用者自行承擔。',
    'AI 內容不構成購買建議：評測與描述可能由 AI 生成，不構成投資或購買建議。',
    '開源免費按現狀提供：無任何明示或默示擔保，使用風險自負。',
    '不背書國產/KO/海外第三方：識別到仿冒品僅作提醒，不代表推薦或認可。',
  ].join('\n'),
  ja: [
    '識別は参考情報です：本プラグインは非公式ツールであり、結果が誤っている可能性があります。',
    '非公式：バンダイ、東映、円谷プロ、その他いかなるメーカーとも関係なく、許諾も受けておりません。',
    'データは公開情報に基づきます：公開資料の整理であり、古い情報や誤りを含む場合があります。公式情報を優先してください。',
    'QQ 連携にはアカウント停止リスクがあります：有効化する場合、リスクは利用者の負担となります。',
    'AI コンテンツは購入助言ではありません：レビューや説明は AI 生成の可能性があり、投資・購入の推奨ではありません。',
    'オープンソース・現状有姿：明示黙示を問わずいかなる保証もありません。自己責任でご利用ください。',
    '国内・KO・海外サードパーティを推奨しません：模倣品の検出は警告であり、推奨ではありません。',
  ].join('\n'),
  'en-GB': [
    'Identification is reference only: this plugin is not an official tool and its results can be wrong.',
    'Unofficial: not affiliated with, authorised by, or endorsed by Bandai, Toei, Tsuburaya, or any vendor.',
    'Data comes from public sources: entries are compiled from public material and may be out of date or inaccurate; always defer to official information.',
    'QQ bridging carries a ban risk: if you enable QQ forwarding, the account risk is yours.',
    'AI content is not buying advice: generated reviews or descriptions are not investment or purchase recommendations.',
    'Open source, provided as is: no warranty of any kind, express or implied; use at your own risk.',
    'No endorsement of domestic, KO, or overseas third-party products: detecting a counterfeit is a warning, not a recommendation.',
  ].join('\n'),
  de: [
    'Die Identifikation dient nur als Hinweis: Dieses Plugin ist kein offizielles Werkzeug, und seine Ergebnisse können falsch sein.',
    'Inoffiziell: keine Verbindung zu Bandai, Toei, Tsuburaya oder irgendeinem Hersteller, weder autorisiert noch unterstützt.',
    'Daten stammen aus öffentlichen Quellen: Die Einträge sind aus öffentlichem Material zusammengestellt und können veraltet oder ungenau sein; maßgeblich sind stets offizielle Angaben. KI-Inhalte werden nur angezeigt und nie übernommen.',
    'Die QQ-Anbindung birgt ein Sperrrisiko: Wenn Sie die QQ-Weiterleitung aktivieren, tragen Sie das Kontorisiko selbst.',
    'KI-Inhalte sind keine Kaufberatung: Erzeugte Bewertungen oder Beschreibungen sind keine Investitions- oder Kaufempfehlung.',
    'Open Source, bereitgestellt wie besehen: keinerlei Gewährleistung, weder ausdrücklich noch stillschweigend; Nutzung auf eigenes Risiko.',
    'Keine Empfehlung inländischer, KO- oder ausländischer Drittanbieterprodukte: Das Erkennen einer Fälschung ist eine Warnung, keine Empfehlung.',
  ].join('\n'),
  fr: [
    "L'identification est donnée à titre indicatif : ce plugin n'est pas un outil officiel et ses résultats peuvent être erronés.",
    'Non officiel : aucun lien avec Bandai, Toei, Tsuburaya ou quelque fabricant que ce soit, ni autorisation ni approbation.',
    'Les données proviennent de sources publiques : les fiches sont compilées à partir de documents publics et peuvent être obsolètes ou inexactes ; les informations officielles prévalent toujours. Le contenu généré par IA est en affichage seul et n\'est jamais enregistré.',
    "La passerelle QQ comporte un risque de bannissement : si vous activez le transfert QQ, le risque incombe au compte de l'utilisateur.",
    "Le contenu généré par IA ne constitue pas un conseil d'achat : les évaluations ou descriptions générées ne sont ni un conseil en investissement ni une recommandation d'achat.",
    "Open source, fourni en l'état : aucune garantie, expresse ou implicite ; utilisation à vos propres risques.",
    "Aucune recommandation des produits nationaux, KO ou tiers étrangers : détecter une contrefaçon est un avertissement, non une recommandation.",
  ].join('\n'),
  es: [
    'La identificación es solo orientativa: este plugin no es una herramienta oficial y sus resultados pueden ser erróneos.',
    'No oficial: sin relación con Bandai, Toei, Tsuburaya ni ningún fabricante, y sin autorización ni respaldo alguno.',
    'Los datos proceden de fuentes públicas: las fichas se recopilan de material público y pueden estar desactualizadas o ser inexactas; prevalece siempre la información oficial. El contenido de IA solo se visualiza y nunca se registra.',
    'La pasarela de QQ conlleva riesgo de bloqueo: si activas el reenvío de QQ, el riesgo de la cuenta es tuyo.',
    'El contenido de IA no es asesoramiento de compra: las reseñas o descripciones generadas no son recomendaciones de inversión ni de compra.',
    'Código abierto, tal cual: sin garantía de ningún tipo, expresa o implícita; uso bajo tu propio riesgo.',
    'Sin respaldo a productos nacionales, KO o de terceros extranjeros: detectar una falsificación es una advertencia, no una recomendación.',
  ].join('\n'),
  pt: [
    'A identificação é apenas uma referência: este plugin não é uma ferramenta oficial e os seus resultados podem estar errados.',
    'Não oficial: sem qualquer vínculo, autorização ou aval da Bandai, Toei, Tsuburaya ou de qualquer fabricante.',
    'Os dados vêm de fontes públicas: as fichas são compiladas a partir de material público e podem estar desatualizadas ou incorretas; a informação oficial prevalece sempre. O conteúdo de IA é apenas exibido e nunca é registado.',
    'A ponte com o QQ envolve risco de bloqueio: se ativar o encaminhamento de QQ, o risco da conta é seu.',
    'O conteúdo de IA não é aconselhamento de compra: avaliações ou descrições geradas não são recomendações de investimento ou de compra.',
    'Código aberto, fornecido tal como está: sem qualquer garantia, expressa ou implícita; utilização por sua conta e risco.',
    'Sem aval a produtos nacionais, KO ou de terceiros estrangeiros: detetar uma falsificação é um aviso, não uma recomendação.',
  ].join('\n'),
  ko: [
    '식별 결과는 참고용입니다: 이 플러그인은 공식 도구가 아니며 결과에 오류가 있을 수 있습니다.',
    '비공식: 반다이, 도에이, 츠부라야 및 어떤 제조사와도 관계가 없으며, 허가나 보증을 받지 않았습니다.',
    '데이터는 공개 자료에서 옵니다: 공개 자료를 정리한 것이므로 오래되었거나 부정확할 수 있으며, 공식 정보를 우선하십시오. AI 생성 콘텐츠는 표시만 되고 절대 등록되지 않습니다.',
    'QQ 연동에는 계정 정지 위험이 있습니다: QQ 전달을 활성화하면 계정 위험은 사용자가 부담합니다.',
    'AI 콘텐츠는 구매 조언이 아닙니다: 생성된 리뷰나 설명은 투자나 구매 권유가 아닙니다.',
    '오픈 소스, 있는 그대로 제공: 명시적이든 묵시적이든 어떠한 보증도 없으며 사용 책임은 본인에게 있습니다.',
    '국내·KO·해외 제3자 제품을 보증하지 않습니다: 모조품 탐지는 경고이며 추천이 아닙니다.',
  ].join('\n'),
  ru: [
    'Идентификация носит справочный характер: этот плагин не является официальным инструментом, и его результаты могут быть ошибочными.',
    'Неофициально: нет связи с Bandai, Toei, Tsuburaya или любым производителем, нет разрешения или одобрения.',
    'Данные взяты из открытых источников: записи собраны из публичных материалов и могут быть устаревшими или неточными; приоритет всегда у официальной информации.',
    'Связка с QQ несёт риск блокировки: если вы включите пересылку QQ, риск для аккаунта несёте вы сами.',
    'Контент ИИ не является советом по покупке: сгенерированные обзоры и описания не являются инвестиционной или покупательской рекомендацией.',
    'Открытый исходный код, предоставляется как есть: никаких гарантий, явных или подразумеваемых; использование на ваш риск.',
    'Не поддерживаем отечественные, KO- и зарубежные сторонние товары: обнаружение подделки — это предупреждение, а не рекомендация.',
  ].join('\n'),
  it: [
    "L'identificazione è solo indicativa: questo plugin non è uno strumento ufficiale e i suoi risultati possono essere errati.",
    'Non ufficiale: nessun legame, autorizzazione o approvazione da parte di Bandai, Toei, Tsuburaya o di qualsiasi produttore.',
    'I dati provengono da fonti pubbliche: le schede sono compilate da materiale pubblico e possono essere obsolete o inesatte; prevalgono sempre le informazioni ufficiali. I contenuti IA sono solo visualizzati e non vengono mai registrati.',
    "Il ponte con QQ comporta un rischio di ban: se attivi l'inoltro di QQ, il rischio dell'account è tuo.",
    "I contenuti IA non sono consigli d'acquisto: recensioni o descrizioni generate non costituiscono raccomandazioni di investimento o di acquisto.",
    'Open source, fornito così com\u0027è: nessuna garanzia, esplicita o implicita; uso a proprio rischio.',
    'Nessuna raccomandazione di prodotti nazionali, KO o di terze parti estere: rilevare un falso è un avviso, non una raccomandazione.',
  ].join('\n'),
}

/**
 * EU compliance notes, shown only when region compliance is enabled. The
 * product targets GDPR and the EU AI Act; because the plugin is open source and
 * keeps data local, the practical obligations are data-subject rights and
 * transparency.
 */
export const COMPLIANCE = {
  'zh-Hans': [
    'GDPR：识别数据默认只存在本机（$DSH_HOME/plugin-data/tokusatsu-gunpla）。知识库不上传。',
    'GDPR：若你把识别端点配成**远端地址**（例如智谱），照片会发送给该服务商——这是你主动配置的结果，本地端点则不出本机。',
    'GDPR：可随时删除本地数据目录以行使删除权；插件不建立用户画像。',
    'EU AI Act：本插件为开源、非高风险用途的 AI 系统，仅做辅助识别与信息整理。',
    'EU AI Act：所有 AI 生成内容均标注来源与层级，并且只展示、不入库。',
    '透明度：识别结果附带置信度与证据链，用户可随时纠正，纠正优先于自动结果。',
  ].join('\n'),
  en: [
    'GDPR: recognition data stays on this machine by default ($DSH_HOME/plugin-data/tokusatsu-gunpla). The knowledge base is never uploaded.',
    'GDPR: if you point the recognition endpoint at a REMOTE address (Zhipu, for example), photos are sent to that provider. That is your own configuration; a local endpoint keeps them on this machine.',
    'GDPR: deleting the local data directory exercises your erasure right; the plugin builds no user profiles.',
    'EU AI Act: this is an open-source AI system for non-high-risk assistance with identification and information organisation.',
    'EU AI Act: all AI-generated content is labelled with its source tier and is display-only, never filed.',
    'Transparency: results carry confidence and an evidence chain, and user corrections always outrank automatic results.',
  ].join('\n'),
}

/** Copy keys the client renders; the client ships full dictionaries for these. */
export const UI_KEYS = [
  'nav',
  'onboard.title', 'onboard.intro', 'onboard.require', 'onboard.accept', 'onboard.decline', 'onboard.declined',
  'onboard.disclaimer', 'onboard.compliance', 'onboard.richMode', 'onboard.enter',
  'capture.title', 'capture.belt', 'capture.gunpla', 'capture.other',
  'capture.banner.belt.primary', 'capture.banner.belt.secondary',
  'capture.banner.belt.panel.primary', 'capture.banner.belt.panel.secondary',
  'capture.banner.gunpla.primary', 'capture.banner.gunpla.secondary',
  'capture.banner.other.primary', 'capture.banner.other.secondary',
  'capture.hasBox', 'capture.noBox', 'capture.separable', 'capture.nonSeparable',
  'capture.checklist', 'capture.next', 'capture.blocked', 'capture.ready',
  'capture.required', 'capture.alternative', 'capture.optional',
  'result.title', 'result.confidence', 'result.confidence.high', 'result.confidence.medium',
  'result.confidence.low', 'result.confidence.suspect',
  'result.candidates', 'result.evidence', 'result.contradictions', 'result.bootleg', 'result.bootleg.warning',
  'result.scope', 'result.scope.richOff', 'result.judgment', 'result.pick', 'result.corrected',
  'result.noMatch', 'result.manual', 'result.manualPlaceholder', 'result.submit', 'result.empty',
  'settings.title', 'settings.richMode', 'settings.richModeHint', 'settings.vision', 'settings.visionHint',
  'settings.visionUrl', 'settings.visionModel', 'settings.language', 'settings.languageHint',
  'settings.baidu', 'settings.baiduHint', 'settings.cache', 'settings.cacheHint', 'settings.clearCache',
  'settings.cleared', 'settings.dataDir', 'settings.disclaimer', 'settings.compliance', 'settings.stats',
  'settings.kbSeed', 'settings.kbLearned', 'settings.kbCorrected', 'settings.reset', 'settings.resetHint',
  'common.yes', 'common.no', 'common.close', 'common.save', 'common.unknown', 'common.required',
]

/** Tier labels reused by the settings page to explain where data may come from. */
export const SOURCE_TIER_SUMMARY = {
  'zh-Hans': '来源优先级：官网 > X/油管官方号（需VPN）> 国内官方号（蓝闪电+认证主体+头像）> 官方发售列表 > 当年官号宣发视频 > 大型电商/主流维基 > 当年帖子/博客 > 黄闪电UP主 > 普通UP主 > 群聊',
  en: 'Source priority: official site > X/YouTube official (VPN) > domestic official account (blue bolt + verified subject + avatar) > official release list > original promo video > major retailer/wiki > era posts/blogs > yellow-bolt creator > plain creator > group chat',
  ja: '情報源の優先度：公式サイト > X/YouTube 公式（VPN）> 国内公式アカウント（青稲妻＋認証主体＋アイコン）> 公式発売リスト > 当時の公式プロモ動画 > 大手EC/主要Wiki > 当時の投稿・ブログ > 黄稲妻UP主 > 一般UP主 > グループチャット',
}

/**
 * Region and script tags a shell may report, mapped to the language whose text
 * should answer for them.
 *
 * A browser or Electron shell commonly reports Chinese as `zh`, `zh-CN` or
 * `zh-TW` rather than `zh-Hans`/`zh-Hant`. Every lookup walks the requested
 * language's own fallback chain, so such a tag would otherwise find no Chinese
 * entry and silently resolve to English.
 *
 * These live here — as a lookup alias — rather than as extra entries in
 * {@link LANGUAGES}, because that list is the catalog a deployment exposes:
 * widening it would advertise languages this plugin cannot fully serve and, on
 * the client, mutate a catalog every plugin shares.
 */
export const LOCALE_ALIASES = {
  zh: 'zh-Hans',
  'zh-CN': 'zh-Hans',
  'zh-SG': 'zh-Hans',
  'zh-MY': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'zh-MO': 'zh-Hant',
}

/**
 * Pick the best available text for a language, walking its declared fallback
 * chain. Mirrors the client locale lookup so Host and client never disagree
 * about which language a string is in.
 * @param {Record<string, string>} table - language id → text.
 * @param {string} language - requested language id.
 * @returns {string} the resolved text.
 */
export function pickLocalized(table, language) {
  const seen = new Set()
  // A region tag answers with its base language first, then the fallback walk.
  let current = LOCALE_ALIASES[language] ?? language
  while (typeof current === 'string' && current !== '' && !seen.has(current)) {
    seen.add(current)
    if (typeof table[current] === 'string') return table[current]
    const definition = LANGUAGES.find((item) => item.id === current)
    current = definition?.fallback ?? FALLBACK_LANGUAGE
  }
  return table[FALLBACK_LANGUAGE] ?? ''
}

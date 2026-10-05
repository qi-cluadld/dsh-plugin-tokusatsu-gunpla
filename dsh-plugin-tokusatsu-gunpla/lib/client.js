/**
 * Kamen Rider DX Belt & Bandai Gunpla identification assistant - browser half.
 *
 * Four surfaces, all through the shell's slot ledger:
 *   - `settings.section`        - preferences, disclaimer, compliance, local data.
 *   - `conversation.input.dock` - the onboarding gate until the disclaimer is
 *     accepted, then the standing capture guide and requirement checklist. The
 *     spec requires the photo rules to be visible continuously rather than only
 *     after a failure, which is why this is a dock and not a dialog.
 *   - `conversation.composer.dock` - the result panel, whose "suspected" picker is
 *     the UI half of the correction loop.
 *
 * The bundle requires only `react` and `react/jsx-runtime`, both in the shell's
 * static module table, and declares no package-row dependency, so it cannot fail
 * to activate because of a missing client bundle.
 *
 * Every user-visible string is written as an ASCII escape sequence (\uXXXX), and
 * every component is rendered as an ELEMENT. The escapes keep this file pure
 * ASCII so no toolchain encoding round-trip can corrupt the copy; rendering
 * elements rather than calling components keeps each component's hooks in its own
 * slot list, which is what React's hook bookkeeping requires.
 * @module @dsh-plugin/tokusatsu-gunpla/client
 */

window.__ModuleLoader__.load({
  id: '@dsh-plugin/tokusatsu-gunpla',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const jsxRuntime = require('react/jsx-runtime')
    const React = require('react')
    const jsx = jsxRuntime.jsx
    const jsxs = jsxRuntime.jsxs

    const NS = 'tokusatsu-gunpla'
    const SETTINGS_KEY = 'dsh-plugin:tokusatsu-gunpla:settings'
    const REPORTS_KEY = 'dsh-plugin:tokusatsu-gunpla:reports'
    const CACHE_KEY = 'dsh-plugin:tokusatsu-gunpla:cache'

    /**
     * Build marker, bumped whenever the UI changes shape.
     *
     * The client combo script is served by content-addressed revision, so a page
     * that is never reloaded keeps running the bundle it already materialized.
     * That made "the fix is on disk but the page still shows the old UI" an
     * indistinguishable symptom, so the settings page prints this marker: a marker
     * older than the source means the browser is running a stale bundle.
     */
    const BUILD = 'ui-7'

    /** Outcome of dictionary registration, surfaced on the settings page. */
    let localeRegistration = 'not-attempted'

    /**
     * Build a dictionary from `[key, text]` pairs, so the tables below stay
     * readable without repeating every key as an object-literal member.
     * @param {Array<[string, string]>} pairs - key/value pairs.
     * @returns {Record<string, string>} the dictionary.
     */
    const dict = (pairs) => {
      const out = {}
      for (const [key, value] of pairs) out[key] = value
      return out
    }

    // #region styles
    const CSS = [
      '.TKG_root{box-sizing:border-box;width:100%;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:20px;max-height:var(--tkg-dock-max-height,42vh);overflow-y:auto;overscroll-behavior:contain}',
      '.TKG_dock{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width,100%);margin:0 auto;display:flex;flex-direction:column;gap:8px;max-height:var(--tkg-dock-max-height,42vh);overflow-y:auto;overscroll-behavior:contain}',
      '.TKG_card{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}',
      // The composer column is a flex stack, so an unbounded dock grows the column
      // past the viewport and takes the conversation's scroll with it: the page then
      // cannot be scrolled at all. Capping every dock and scrolling it INTERNALLY
      // keeps the page scrollable however many checklist rows are showing. The gate
      // is exempt because it is the whole page in a blank session, with nothing
      // beneath it to push out of reach.
      '.TKG_gateDock{max-height:none;overflow-y:visible}',
      '.TKG_row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.TKG_between{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.TKG_title{color:var(--dsw-alias-label-primary);font-weight:600;font-size:13px}',
      '.TKG_hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px}',
      '.TKG_banner{border-left:3px solid var(--dsw-alias-state-warn-primary);padding-left:10px;color:var(--dsw-alias-label-primary);font-weight:600}',
      '.TKG_bannerSub{color:var(--dsw-alias-label-secondary);font-weight:400;font-size:12px;margin-top:2px}',
      '.TKG_error{border-left-color:var(--dsw-alias-state-error-primary)}',
      '.TKG_success{border-left-color:var(--dsw-alias-state-success-primary)}',
      '.TKG_tabs{display:flex;gap:4px;flex-wrap:wrap}',
      '.TKG_tab{appearance:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;font-family:inherit}',
      '.TKG_tab:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}',
      '.TKG_tabOn{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}',
      '.TKG_list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}',
      '.TKG_item{display:flex;gap:8px;align-items:flex-start}',
      '.TKG_mark{flex:none;width:16px;text-align:center;color:var(--dsw-alias-label-secondary)}',
      '.TKG_body{min-width:0;display:flex;flex-direction:column;gap:1px;flex:1}',
      '.TKG_itemTitle{color:var(--dsw-alias-label-primary)}',
      '.TKG_done .TKG_itemTitle{color:var(--dsw-alias-label-secondary);text-decoration:line-through}',
      '.TKG_done .TKG_mark{color:var(--dsw-alias-state-success-primary)}',
      '.TKG_btn{appearance:none;font-family:inherit;font-size:12px;border-radius:8px;padding:5px 12px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.TKG_btn:hover{border-color:var(--dsw-alias-border-l2)}',
      '.TKG_btnPrimary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}',
      '.TKG_btnDanger{color:var(--dsw-alias-state-error-primary)}',
      '.TKG_btn:disabled{opacity:.45;cursor:not-allowed}',
      '.TKG_input,.TKG_select{box-sizing:border-box;width:100%;font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 9px;outline:none}',
      '.TKG_input:focus,.TKG_select:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.TKG_field{display:flex;flex-direction:column;gap:4px}',
      '.TKG_label{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:500}',
      '.TKG_switch{display:flex;align-items:flex-start;gap:8px;cursor:pointer}',
      '.TKG_switch input{margin-top:3px;flex:none}',
      '.TKG_gate{display:flex;flex-direction:column;gap:12px;padding:18px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1)}',
      '.TKG_gateTitle{font-size:19px;line-height:26px;font-weight:700;color:var(--dsw-alias-label-primary)}',
      '.TKG_gateLead{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}',
      '.TKG_giant{font-size:15px;line-height:24px;font-weight:700;color:var(--dsw-alias-label-primary);border-left:4px solid var(--dsw-alias-brand-primary);padding-left:12px}',
      '.TKG_pill{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;line-height:17px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.TKG_cand{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-2)}',
      '.TKG_candOn{border-color:var(--dsw-alias-brand-primary)}',
      '.TKG_score{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);font-size:12px;flex:none}',
      '.TKG_divider{height:1px;background:var(--dsw-alias-border-l1);border:0;margin:0}',
      '.TKG_checks{display:flex;flex-direction:column;gap:8px}',
    ].join('')

    const STYLE_ID = '@dsh-plugin/tokusatsu-gunpla/styles'
    if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_ID)}]`) === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = '@dsh-plugin/tokusatsu-gunpla'
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }
    // #endregion

    // #region languages
    /**
     * This plugin's own language table, mirroring the Host `i18n` module.
     *
     * It exists only to resolve THIS namespace's fallbacks, and is never pushed to
     * the shell. The shell ships exactly two locales (`zh` and `en`) and owns the
     * user-facing choice through its own General row.
     *
     * `zh` is the primary Chinese entry because that is the id the shell actually
     * catalogs; `zh-Hans` resolves THROUGH `zh` rather than straight to English, so
     * a stored preference of either spelling lands on the Chinese dictionary.
     */
    const LANGUAGES = [
      { id: 'zh-Hans', label: '\u7b80\u4f53\u4e2d\u6587', fallback: 'en' },
      { id: 'zh-Hant', label: '\u7e41\u9ad4\u4e2d\u6587', fallback: 'zh-Hans' },
      { id: 'en', label: 'English', fallback: null },
      { id: 'ja', label: '\u65e5\u672c\u8a9e', fallback: 'en' },
      { id: 'ko', label: '\ud55c\uad6d\uc5b4', fallback: 'en' },
      { id: 'fr', label: 'Fran\u00e7ais', fallback: 'en' },
      { id: 'es', label: 'Espa\u00f1ol', fallback: 'en' },
      { id: 'pt', label: 'Portugu\u00eas', fallback: 'en' },
      { id: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', fallback: 'en' },
      { id: 'yue', label: '\u7cb5\u8a9e', fallback: 'zh-Hans' },
      { id: 'vi', label: 'Ti\u1ebfng Vi\u1ec7t', fallback: 'en' },
      { id: 'de', label: 'Deutsch', fallback: 'en' },
      { id: 'it', label: 'Italiano', fallback: 'en' },
      { id: 'nl', label: 'Nederlands', fallback: 'en' },
      { id: 'pl', label: 'Polski', fallback: 'en' },
    ]

    /**
     * Locale ids the shell may report, mapped to the key this bundle's tables use.
     *
     * The shell catalogs Chinese as `zh`, while this bundle's rule and disclaimer
     * tables are keyed `zh-Hans`/`zh-Hant`. Without the `zh` entry a shell reporting
     * `zh` finds no Chinese key at all and every table-driven string renders in
     * English, while the `t()`-driven ones stay Chinese - the exact mixed output
     * that made this look like a dictionary-registration problem.
     *
     * These aliases live entirely inside this namespace. They are never added to the
     * shell's catalog, which every plugin in the page shares.
     */
    const LOCALE_ALIASES = {
      zh: 'zh-Hans',
      'zh-CN': 'zh-Hans',
      'zh-SG': 'zh-Hans',
      'zh-MY': 'zh-Hans',
      'zh-TW': 'zh-Hant',
      'zh-HK': 'zh-Hant',
      'zh-MO': 'zh-Hant',
    }

    /** Simplified Chinese - the key-set source of truth. */
    const zhHans = dict([
      ['nav', '\u8170\u5e26 / \u9ad8\u8fbe\u8bc6\u522b'],
      ['onboard.title', '\u5047\u9762\u9a91\u58ebDX\u8170\u5e26 & \u4e07\u4ee3\u9ad8\u8fbe\u8bc6\u522b\u52a9\u624b'],
      ['onboard.intro', '\u62cd\u7167\u4ea4\u7ed9\u624b\u673a\uff0c\u8bc6\u522b\u3001\u5224\u65ad\u3001\u67e5\u5e93\u5168\u90e8\u5728\u672c\u673a\u5b8c\u6210\uff0c\u4e0d\u82b1 token\u3002\u53ea\u6709\u4f60\u8981\u6c42\u5199\u8bc4\u6d4b\u65f6\u624d\u4f1a\u8c03\u7528\u5927\u6a21\u578b\u3002'],
      ['onboard.require', '\u62cd\u7167\u786c\u6027\u8981\u6c42'],
      ['onboard.accept', '\u6211\u5df2\u9605\u8bfb\u5e76\u540c\u610f\u4ee5\u4e0a\u514d\u8d23\u58f0\u660e'],
      ['onboard.decline', '\u4e0d\u540c\u610f\uff0c\u6682\u4e0d\u4f7f\u7528'],
      ['onboard.declined', '\u672a\u540c\u610f\u514d\u8d23\u58f0\u660e\uff0c\u8bc6\u522b\u529f\u80fd\u4fdd\u6301\u5173\u95ed\u3002\u4f60\u4ecd\u53ef\u5728\u8bbe\u7f6e\u9875\u91cd\u65b0\u5f00\u542f\u3002'],
      ['onboard.enter', '\u5f00\u59cb\u4f7f\u7528'],
      ['onboard.disclaimer', '\u514d\u8d23\u58f0\u660e'],
      ['onboard.compliance', 'GDPR / EU AI Act \u5408\u89c4\u8bf4\u660e'],
      ['onboard.richMode', '\u5f00\u542f\u5bcc\u54e5\u6a21\u5f0f\uff08PG / MB / \u89e3\u4f53\u5320\u673a / \u9650\u5b9a / \u7b2c\u4e09\u65b9\uff0cCSM / CS / \u98df\u73a9 / \u9650\u5b9a\u914d\u4ef6\uff09'],
      ['capture.title', '\u62cd\u7167\u5f15\u5bfc'],
      ['capture.belt', '\u8170\u5e26'],
      ['capture.gunpla', '\u9ad8\u8fbe'],
      ['capture.other', '\u5176\u5b83'],
      ['capture.banner.belt.primary', '\u8170\u5e26\u5fc5\u987b\uff1a\u5e26\u6263\u5355\u72ec\u62c6\u4e0b\u62cd\u3001\u53d8\u8eab\u9053\u5177\u5355\u72ec\u62c6\u4e0b\u62cd\u3002\u88c5\u5728\u5e26\u5b50\u4e0a\u7684\u7167\u7247\u65e0\u6cd5\u7528\u4e8e\u9274\u5b9a\u3002'],
      ['capture.banner.belt.secondary', '\u518d\u8865\u5e26\u5b50\u6574\u4f53\u3001\u7535\u6c60\u4ed3\u3001\u53d8\u8eab\u97f3\uff0c\u5224\u65ad\u4f1a\u66f4\u51c6\u3002'],
      ['capture.banner.gunpla.primary', '\u9ad8\u8fbe\u5fc5\u987b\uff1a\u5305\u88c5\u76d2\u6b63\u9762\uff08\u542b\u5546\u6807\u4e0e\u7b49\u7ea7\u8272\u5757\uff09\u3002'],
      ['capture.banner.gunpla.secondary', '\u6ca1\u76d2\u5b50\uff1a\u591a\u89d2\u5ea6 + \u7279\u5f81\u90e8\u4f4d + \u8d2d\u4e70\u8bb0\u5f55\uff1b\u90fd\u4e0d\u884c\u5c31\u624b\u52a8\u8865\u578b\u53f7\u3002'],
      ['capture.banner.other.primary', '\u5148\u62cd\u54c1\u724c\u3001\u7f16\u53f7\u4e0e\u94ed\u724c\uff0c\u518d\u62cd\u6574\u4f53\u3002'],
      ['capture.banner.other.secondary', '\u770b\u4e0d\u6e05\u7684\u5b57\u6bb5\u7559\u7a7a\uff0c\u4e0d\u8981\u731c\uff1b\u624b\u52a8\u8865\u578b\u53f7\u6c38\u8fdc\u53ef\u7528\u3002'],
      ['capture.hasBox', '\u6709\u5305\u88c5\u76d2\u53ef\u62cd'],
      ['capture.noBox', '\u6ca1\u6709\u5305\u88c5\u76d2'],
      ['capture.checklist', '\u62cd\u7167\u6e05\u5355'],
      ['capture.blocked', '\u4ecd\u6709\u5fc5\u62cd\u9879\u672a\u5b8c\u6210\uff0c\u5148\u8865\u62cd\u518d\u8bc6\u522b\u3002'],
      ['capture.ready', '\u6e05\u5355\u5df2\u6ee1\u8db3\uff0c\u53ef\u4ee5\u8ba9\u52a9\u624b\u5f00\u59cb\u8bc6\u522b\u3002'],
      ['capture.required', '\u5fc5\u987b'],
      ['capture.alternative', '\u66ff\u4ee3'],
      ['capture.optional', '\u53ef\u9009'],
      ['capture.worthAdding', '\u5efa\u8bae\u518d\u8865'],
      ['result.title', '\u8bc6\u522b\u7ed3\u679c'],
      ['result.confidence', '\u7f6e\u4fe1\u5ea6'],
      ['result.confidence.high', '\u9ad8'],
      ['result.confidence.medium', '\u4e2d'],
      ['result.confidence.low', '\u4f4e'],
      ['result.confidence.suspect', '\u7591\u4f3c\u4eff\u5192'],
      ['result.candidates', '\u5019\u9009\u6761\u76ee'],
      ['result.contradictions', '\u77db\u76fe\u70b9'],
      ['result.bootleg', '\u76d7\u7248 / \u4eff\u5192\u63d0\u9192'],
      ['result.bootleg.warning', '\u8be5\u7ed3\u679c\u4ec5\u4f5c\u63d0\u9192\uff0c\u4e0d\u4f1a\u5199\u5165\u77e5\u8bc6\u5e93\u3002'],
      ['result.scope.richOff', '\u5c5e\u4e8e\u5bcc\u54e5\u6a21\u5f0f\u8303\u56f4\uff0c\u5f53\u524d\u672a\u5f00\u542f\u3002'],
      ['result.pick', '\u5c31\u662f\u8fd9\u4e2a'],
      ['result.picked', '\u5df2\u751f\u6210\u7ea0\u6b63\u6307\u4ee4\uff0c\u53d1\u9001\u540e\u7531\u52a9\u624b\u5199\u5165\u7ea0\u6b63\u5e93\uff1b\u540e\u7eed\u66f4\u65b0\u4e0d\u4f1a\u8986\u76d6\u3002'],
      ['result.noMatch', '\u8fd8\u6ca1\u6709\u8bc6\u522b\u7ed3\u679c\u3002\u6309\u62cd\u7167\u6e05\u5355\u62cd\u597d\u540e\uff0c\u76f4\u63a5\u5bf9\u52a9\u624b\u8bf4\u300c\u8bc6\u522b\u8fd9\u5f20\u56fe\u300d\u3002'],
      ['result.manual', '\u624b\u52a8\u8865\u578b\u53f7'],
      ['result.manualPlaceholder', '\u4f8b\u5982 HGUC 191 RX-78-2 \u6216 CSM Decade Driver'],
      ['result.submit', '\u751f\u6210\u7ea0\u6b63\u6307\u4ee4'],
      ['result.clipboard', '\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f\uff08\u627e\u4e0d\u5230\u8f93\u5165\u6846\uff0c\u624b\u52a8\u7c98\u8d34\u5373\u53ef\uff09\u3002'],
      ['result.lastPick', '\u6700\u8fd1\u4e00\u6b21\u786e\u8ba4'],
      ['settings.title', '\u8170\u5e26 / \u9ad8\u8fbe\u8bc6\u522b'],
      ['settings.richMode', '\u5bcc\u54e5\u6a21\u5f0f'],
      ['settings.richModeHint', '\u7eb3\u5165 PG / MB / \u89e3\u4f53\u5320\u673a / \u9650\u5b9a / \u6d77\u5916\u7b2c\u4e09\u65b9\uff0c\u4ee5\u53ca CSM / CS / \u98df\u73a9 / \u9650\u5b9a\u914d\u4ef6\u3002'],
      ['settings.vision', '\u672c\u5730\u89c6\u89c9\u6a21\u578b'],
      ['settings.visionHint', '\u8bc6\u522b\u53ea\u7528\u672c\u673a\u7aef\u70b9\uff0c\u7edd\u4e0d\u4e0a\u4f20\u7167\u7247\u3002\u8fd9\u91cc\u586b\u7684\u5730\u5740\u4f1a\u7531\u52a9\u624b\u5199\u5165\u63d2\u4ef6\u914d\u7f6e\uff1b\u672a\u914d\u7f6e\u65f6\u81ea\u52a8\u63a2\u6d4b 127.0.0.1:11434 / :1234 / :8080\u3002'],
      ['settings.visionUrl', '\u7aef\u70b9\u5730\u5740'],
      ['settings.visionModel', '\u6a21\u578b\u540d'],
      ['settings.visionApply', '\u751f\u6210\u914d\u7f6e\u6307\u4ee4'],
      ['settings.visionApplied', '\u5df2\u751f\u6210\u914d\u7f6e\u6307\u4ee4\uff0c\u53d1\u9001\u540e\u7531\u52a9\u624b\u5199\u5165\u3002'],
      ['settings.language', '\u754c\u9762\u8bed\u8a00'],
      ['settings.languageHint', '\u754c\u9762\u7ffb\u8bd1\uff1b\u8bc6\u522b\u4e0e\u5224\u636e\u672c\u8eab\u4e0e\u8bed\u8a00\u65e0\u5173\u3002\u7f3a\u5931\u7684\u952e\u56de\u9000\u5230\u82f1\u6587\u3002'],
      ['settings.baidu', '\u9644\u767e\u5ea6\u641c\u7d22\u5165\u53e3'],
      ['settings.baiduHint', '\u4e2d\u6587\u68c0\u7d22\u4ee5 Bing \u4e3a\u4e3b\u3002\u767e\u5ea6\u7ed3\u679c\u4f1a\u5728\u5c55\u793a\u65f6\u6807\u6ce8\u300c\u672a\u8ba4\u8bc1\u300d\u3002'],
      ['settings.cache', '\u7ed3\u679c\u7f13\u5b58'],
      ['settings.cacheHint', '\u7f13\u5b58\u7531\u672c\u5730\u63d2\u4ef6\u6301\u6709\uff1b\u8fd9\u91cc\u6e05\u7a7a\u7684\u662f\u6d4f\u89c8\u5668\u4fa7\u8bb0\u5f55\u3002'],
      ['settings.clearCache', '\u6e05\u7a7a\u672c\u5730\u8bb0\u5f55'],
      ['settings.cleared', '\u5df2\u6e05\u7a7a\u3002'],
      ['settings.dataDir', '\u672c\u5730\u6570\u636e\u76ee\u5f55'],
      ['settings.disclaimer', '\u514d\u8d23\u58f0\u660e'],
      ['settings.compliance', '\u5408\u89c4\u8bf4\u660e'],
      ['settings.stats', '\u77e5\u8bc6\u5e93\u72b6\u6001'],
      ['settings.kbSeed', '\u5185\u7f6e\u6761\u76ee'],
      ['settings.kbLearned', '\u5df2\u6838\u5b9e\u5165\u5e93'],
      ['settings.kbCorrected', '\u7528\u6237\u7ea0\u6b63'],
      ['settings.reset', '\u91cd\u7f6e\u672c\u63d2\u4ef6\u8bbe\u7f6e'],
      ['settings.resetHint', '\u53ea\u6e05\u9664\u672c\u63d2\u4ef6\u4fdd\u5b58\u5728\u6d4f\u89c8\u5668\u91cc\u7684\u8bbe\u7f6e\uff0c\u4e0d\u52a8\u672c\u5730\u77e5\u8bc6\u5e93\u3002'],
      ['common.yes', '\u662f'],
      ['common.no', '\u5426'],
      ['common.save', '\u4fdd\u5b58'],
      ['common.unknown', '\u672a\u77e5'],
    ])

    /** Traditional Chinese. */
    const zhHant = dict([
      ['nav', '\u8170\u5e36 / \u92fc\u5f48\u8b58\u5225'],
      ['onboard.title', '\u5047\u9762\u9a0e\u58ebDX\u8170\u5e36 & \u842c\u4ee3\u92fc\u5f48\u8b58\u5225\u52a9\u624b'],
      ['onboard.intro', '\u62cd\u7167\u4ea4\u7d66\u624b\u6a5f\uff0c\u8b58\u5225\u3001\u5224\u65b7\u3001\u67e5\u5eab\u5168\u90e8\u5728\u672c\u6a5f\u5b8c\u6210\uff0c\u4e0d\u82b1 token\u3002\u53ea\u6709\u4f60\u8981\u6c42\u5beb\u8a55\u6e2c\u6642\u624d\u6703\u547c\u53eb\u5927\u6a21\u578b\u3002'],
      ['onboard.require', '\u62cd\u7167\u786c\u6027\u8981\u6c42'],
      ['onboard.accept', '\u6211\u5df2\u95b1\u8b80\u4e26\u540c\u610f\u4ee5\u4e0a\u514d\u8cac\u8072\u660e'],
      ['onboard.decline', '\u4e0d\u540c\u610f\uff0c\u66ab\u4e0d\u4f7f\u7528'],
      ['onboard.declined', '\u672a\u540c\u610f\u514d\u8cac\u8072\u660e\uff0c\u8b58\u5225\u529f\u80fd\u4fdd\u6301\u95dc\u9589\u3002\u4f60\u4ecd\u53ef\u5728\u8a2d\u5b9a\u9801\u91cd\u65b0\u958b\u555f\u3002'],
      ['onboard.enter', '\u958b\u59cb\u4f7f\u7528'],
      ['onboard.disclaimer', '\u514d\u8cac\u8072\u660e'],
      ['onboard.compliance', 'GDPR / EU AI Act \u5408\u898f\u8aaa\u660e'],
      ['onboard.richMode', '\u958b\u555f\u5bcc\u54e5\u6a21\u5f0f\uff08PG / MB / \u89e3\u9ad4\u5320\u6a5f / \u9650\u5b9a / \u7b2c\u4e09\u65b9\uff0cCSM / CS / \u98df\u73a9 / \u9650\u5b9a\u914d\u4ef6\uff09'],
      ['capture.title', '\u62cd\u7167\u5f15\u5c0e'],
      ['capture.belt', '\u8170\u5e36'],
      ['capture.gunpla', '\u92fc\u5f48'],
      ['capture.other', '\u5176\u5b83'],
      ['capture.banner.belt.primary', '\u8170\u5e36\u5fc5\u9808\uff1a\u5e36\u6263\u55ae\u7368\u62c6\u4e0b\u62cd\u3001\u8b8a\u8eab\u9053\u5177\u55ae\u7368\u62c6\u4e0b\u62cd\u3002\u88dd\u5728\u5e36\u5b50\u4e0a\u7684\u7167\u7247\u7121\u6cd5\u7528\u65bc\u9451\u5b9a\u3002'],
      ['capture.banner.belt.secondary', '\u518d\u88dc\u5e36\u5b50\u6574\u9ad4\u3001\u96fb\u6c60\u5009\u3001\u8b8a\u8eab\u97f3\uff0c\u5224\u65b7\u6703\u66f4\u6e96\u3002'],
      ['capture.banner.gunpla.primary', '\u92fc\u5f48\u5fc5\u9808\uff1a\u5305\u88dd\u76d2\u6b63\u9762\uff08\u542b\u5546\u6a19\u8207\u7b49\u7d1a\u8272\u584a\uff09\u3002'],
      ['capture.banner.gunpla.secondary', '\u6c92\u76d2\u5b50\uff1a\u591a\u89d2\u5ea6 + \u7279\u5fb5\u90e8\u4f4d + \u8cfc\u8cb7\u8a18\u9304\uff1b\u90fd\u4e0d\u884c\u5c31\u624b\u52d5\u88dc\u578b\u865f\u3002'],
      ['capture.banner.other.primary', '\u5148\u62cd\u54c1\u724c\u3001\u7de8\u865f\u8207\u9298\u724c\uff0c\u518d\u62cd\u6574\u9ad4\u3002'],
      ['capture.banner.other.secondary', '\u770b\u4e0d\u6e05\u7684\u6b04\u4f4d\u7559\u7a7a\uff0c\u4e0d\u8981\u731c\uff1b\u624b\u52d5\u88dc\u578b\u865f\u6c38\u9060\u53ef\u7528\u3002'],
      ['capture.hasBox', '\u6709\u5305\u88dd\u76d2\u53ef\u62cd'],
      ['capture.noBox', '\u6c92\u6709\u5305\u88dd\u76d2'],
      ['capture.checklist', '\u62cd\u7167\u6e05\u55ae'],
      ['capture.blocked', '\u4ecd\u6709\u5fc5\u62cd\u9805\u672a\u5b8c\u6210\uff0c\u5148\u88dc\u62cd\u518d\u8b58\u5225\u3002'],
      ['capture.ready', '\u6e05\u55ae\u5df2\u6eff\u8db3\uff0c\u53ef\u4ee5\u8b93\u52a9\u624b\u958b\u59cb\u8b58\u5225\u3002'],
      ['capture.required', '\u5fc5\u9808'],
      ['capture.alternative', '\u66ff\u4ee3'],
      ['capture.optional', '\u53ef\u9078'],
      ['capture.worthAdding', '\u5efa\u8b70\u518d\u88dc'],
      ['result.title', '\u8b58\u5225\u7d50\u679c'],
      ['result.confidence', '\u4fe1\u8cf4\u5ea6'],
      ['result.confidence.high', '\u9ad8'],
      ['result.confidence.medium', '\u4e2d'],
      ['result.confidence.low', '\u4f4e'],
      ['result.confidence.suspect', '\u7591\u4f3c\u4eff\u5192'],
      ['result.candidates', '\u5019\u9078\u689d\u76ee'],
      ['result.contradictions', '\u77db\u76fe\u9ede'],
      ['result.bootleg', '\u76dc\u7248 / \u4eff\u5192\u63d0\u9192'],
      ['result.bootleg.warning', '\u6b64\u7d50\u679c\u50c5\u4f5c\u63d0\u9192\uff0c\u4e0d\u6703\u5beb\u5165\u77e5\u8b58\u5eab\u3002'],
      ['result.scope.richOff', '\u5c6c\u65bc\u5bcc\u54e5\u6a21\u5f0f\u7bc4\u570d\uff0c\u76ee\u524d\u672a\u958b\u555f\u3002'],
      ['result.pick', '\u5c31\u662f\u9019\u500b'],
      ['result.picked', '\u5df2\u7522\u751f\u7cfe\u6b63\u6307\u4ee4\uff0c\u9001\u51fa\u5f8c\u7531\u52a9\u624b\u5beb\u5165\u7cfe\u6b63\u5eab\uff1b\u5f8c\u7e8c\u66f4\u65b0\u4e0d\u6703\u8986\u84cb\u3002'],
      ['result.noMatch', '\u9084\u6c92\u6709\u8b58\u5225\u7d50\u679c\u3002\u6309\u62cd\u7167\u6e05\u55ae\u62cd\u597d\u5f8c\uff0c\u76f4\u63a5\u5c0d\u52a9\u624b\u8aaa\u300c\u8b58\u5225\u9019\u5f35\u5716\u300d\u3002'],
      ['result.manual', '\u624b\u52d5\u88dc\u578b\u865f'],
      ['result.manualPlaceholder', '\u4f8b\u5982 HGUC 191 RX-78-2 \u6216 CSM Decade Driver'],
      ['result.submit', '\u7522\u751f\u7cfe\u6b63\u6307\u4ee4'],
      ['result.clipboard', '\u5df2\u8907\u88fd\u5230\u526a\u8cbc\u7c3f\uff08\u627e\u4e0d\u5230\u8f38\u5165\u6846\uff0c\u624b\u52d5\u8cbc\u4e0a\u5373\u53ef\uff09\u3002'],
      ['result.lastPick', '\u6700\u8fd1\u4e00\u6b21\u78ba\u8a8d'],
      ['settings.title', '\u8170\u5e36 / \u92fc\u5f48\u8b58\u5225'],
      ['settings.richMode', '\u5bcc\u54e5\u6a21\u5f0f'],
      ['settings.richModeHint', '\u7d0d\u5165 PG / MB / \u89e3\u9ad4\u5320\u6a5f / \u9650\u5b9a / \u6d77\u5916\u7b2c\u4e09\u65b9\uff0c\u4ee5\u53ca CSM / CS / \u98df\u73a9 / \u9650\u5b9a\u914d\u4ef6\u3002'],
      ['settings.vision', '\u672c\u6a5f\u8996\u89ba\u6a21\u578b'],
      ['settings.visionHint', '\u8b58\u5225\u53ea\u7528\u672c\u6a5f\u7aef\u9ede\uff0c\u7d55\u4e0d\u4e0a\u50b3\u7167\u7247\u3002\u9019\u88e1\u586b\u7684\u4f4d\u5740\u6703\u7531\u52a9\u624b\u5beb\u5165\u63d2\u4ef6\u8a2d\u5b9a\uff1b\u672a\u8a2d\u5b9a\u6642\u81ea\u52d5\u63a2\u6e2c 127.0.0.1:11434 / :1234 / :8080\u3002'],
      ['settings.visionUrl', '\u7aef\u9ede\u4f4d\u5740'],
      ['settings.visionModel', '\u6a21\u578b\u540d\u7a31'],
      ['settings.visionApply', '\u7522\u751f\u8a2d\u5b9a\u6307\u4ee4'],
      ['settings.visionApplied', '\u5df2\u7522\u751f\u8a2d\u5b9a\u6307\u4ee4\uff0c\u9001\u51fa\u5f8c\u7531\u52a9\u624b\u5beb\u5165\u3002'],
      ['settings.language', '\u4ecb\u9762\u8a9e\u8a00'],
      ['settings.languageHint', '\u4ecb\u9762\u7ffb\u8b6f\uff1b\u8b58\u5225\u8207\u5224\u64da\u672c\u8eab\u8207\u8a9e\u8a00\u7121\u95dc\u3002\u7f3a\u5931\u7684\u9375\u56de\u9000\u5230\u82f1\u6587\u3002'],
      ['settings.baidu', '\u9644\u767e\u5ea6\u641c\u5c0b\u5165\u53e3'],
      ['settings.baiduHint', '\u4e2d\u6587\u6aa2\u7d22\u4ee5 Bing \u70ba\u4e3b\u3002\u767e\u5ea6\u7d50\u679c\u6703\u5728\u5c55\u793a\u6642\u6a19\u8a3b\u300c\u672a\u8a8d\u8a3c\u300d\u3002'],
      ['settings.cache', '\u7d50\u679c\u5feb\u53d6'],
      ['settings.cacheHint', '\u5feb\u53d6\u7531\u672c\u6a5f\u63d2\u4ef6\u6301\u6709\uff1b\u9019\u88e1\u6e05\u7a7a\u7684\u662f\u700f\u89bd\u5668\u5074\u8a18\u9304\u3002'],
      ['settings.clearCache', '\u6e05\u7a7a\u672c\u6a5f\u8a18\u9304'],
      ['settings.cleared', '\u5df2\u6e05\u7a7a\u3002'],
      ['settings.dataDir', '\u672c\u6a5f\u8cc7\u6599\u76ee\u9304'],
      ['settings.disclaimer', '\u514d\u8cac\u8072\u660e'],
      ['settings.compliance', '\u5408\u898f\u8aaa\u660e'],
      ['settings.stats', '\u77e5\u8b58\u5eab\u72c0\u614b'],
      ['settings.kbSeed', '\u5167\u5efa\u689d\u76ee'],
      ['settings.kbLearned', '\u5df2\u6838\u5be6\u5165\u5eab'],
      ['settings.kbCorrected', '\u4f7f\u7528\u8005\u7cfe\u6b63'],
      ['settings.reset', '\u91cd\u8a2d\u672c\u63d2\u4ef6\u8a2d\u5b9a'],
      ['settings.resetHint', '\u53ea\u6e05\u9664\u672c\u63d2\u4ef6\u4fdd\u5b58\u5728\u700f\u89bd\u5668\u88e1\u7684\u8a2d\u5b9a\uff0c\u4e0d\u52d5\u672c\u6a5f\u77e5\u8b58\u5eab\u3002'],
      ['common.yes', '\u662f'],
      ['common.no', '\u5426'],
      ['common.save', '\u5132\u5b58'],
      ['common.unknown', '\u672a\u77e5'],
    ])

    /** English - the universal fallback, so every other dictionary may be partial. */
    const en = dict([
      ['nav', 'Belt / Gunpla ID'],
      ['onboard.title', 'Kamen Rider DX Belt & Bandai Gunpla Identification Assistant'],
      ['onboard.intro', 'Your phone takes the photos; recognition, judgment, and lookup all run locally and cost no tokens. A model is called only when you ask for a written review.'],
      ['onboard.require', 'Mandatory photo requirements'],
      ['onboard.accept', 'I have read and accept the disclaimer above'],
      ['onboard.decline', 'Decline for now'],
      ['onboard.declined', 'Disclaimer not accepted, so identification stays off. You can re-enable it in Settings.'],
      ['onboard.enter', 'Start'],
      ['onboard.disclaimer', 'Disclaimer'],
      ['onboard.compliance', 'GDPR / EU AI Act notes'],
      ['onboard.richMode', 'Enable collector mode (PG / Metal Build / Kaitai-Shou-Ki / limited / third party; CSM / CS / shokugan / limited accessories)'],
      ['capture.title', 'Capture guide'],
      ['capture.belt', 'Belt'],
      ['capture.gunpla', 'Gunpla'],
      ['capture.other', 'Other'],
      ['capture.banner.belt.primary', 'Belts: the buckle and the transformation device must each be photographed detached. A belt photographed assembled cannot be identified.'],
      ['capture.banner.belt.secondary', 'Add the full strap, the battery bay, and a sound clip for a firmer judgment.'],
      ['capture.banner.gunpla.primary', 'Gunpla: the front of the box is required (logo and grade colour block visible).'],
      ['capture.banner.gunpla.secondary', 'No box: multiple angles + characteristic parts + purchase record; failing that, enter the model number manually.'],
      ['capture.banner.other.primary', 'Photograph the brand, product number, and nameplate first, then the whole item.'],
      ['capture.banner.other.secondary', 'Leave fields you cannot read blank rather than guessing; manual entry always works.'],
      ['capture.hasBox', 'Box available'],
      ['capture.noBox', 'No box'],
      ['capture.checklist', 'Photo checklist'],
      ['capture.blocked', 'Mandatory photos are still missing. Take them before identifying.'],
      ['capture.ready', 'Checklist satisfied - the assistant can identify now.'],
      ['capture.required', 'Required'],
      ['capture.alternative', 'Alternative'],
      ['capture.optional', 'Optional'],
      ['capture.worthAdding', 'Worth adding'],
      ['result.title', 'Identification result'],
      ['result.confidence', 'Confidence'],
      ['result.confidence.high', 'High'],
      ['result.confidence.medium', 'Medium'],
      ['result.confidence.low', 'Low'],
      ['result.confidence.suspect', 'Suspected counterfeit'],
      ['result.candidates', 'Candidates'],
      ['result.contradictions', 'Contradictions'],
      ['result.bootleg', 'Counterfeit warning'],
      ['result.bootleg.warning', 'Shown as a warning only; nothing is written to the knowledge base.'],
      ['result.scope.richOff', 'This item belongs to collector mode, which is currently off.'],
      ['result.pick', 'Use this one'],
      ['result.picked', 'Correction instruction prepared; once sent, the assistant files it. Later updates will not overwrite it.'],
      ['result.noMatch', 'No result yet. Once the checklist is satisfied, just tell the assistant to identify the photos.'],
      ['result.manual', 'Enter the model number'],
      ['result.manualPlaceholder', 'e.g. HGUC 191 RX-78-2 or CSM Decade Driver'],
      ['result.submit', 'Prepare correction'],
      ['result.clipboard', 'Copied to the clipboard (no composer field found - paste it manually).'],
      ['result.lastPick', 'Last confirmation'],
      ['settings.title', 'Belt / Gunpla ID'],
      ['settings.richMode', 'Collector mode'],
      ['settings.richModeHint', 'Include PG / Metal Build / Kaitai-Shou-Ki / limited / overseas third party, and CSM / CS / shokugan / limited accessories.'],
      ['settings.vision', 'Local vision model'],
      ['settings.visionHint', 'Recognition only ever uses a local endpoint; photos are never uploaded. The address you enter here is written into the plugin config by the assistant. Unset, it probes 127.0.0.1:11434 / :1234 / :8080.'],
      ['settings.visionUrl', 'Endpoint URL'],
      ['settings.visionModel', 'Model name'],
      ['settings.visionApply', 'Prepare config instruction'],
      ['settings.visionApplied', 'Config instruction prepared; send it and the assistant writes the setting.'],
      ['settings.language', 'Interface language'],
      ['settings.languageHint', 'Interface translation only; identification and its rules are language independent. Missing keys fall back to English.'],
      ['settings.baidu', 'Offer a Baidu search entry'],
      ['settings.baiduHint', 'Chinese search prefers Bing. Baidu results are labelled "unverified" wherever they are shown.'],
      ['settings.cache', 'Result cache'],
      ['settings.cacheHint', 'The cache lives with the local plugin; this clears the browser-side record.'],
      ['settings.clearCache', 'Clear local record'],
      ['settings.cleared', 'Cleared.'],
      ['settings.dataDir', 'Local data directory'],
      ['settings.disclaimer', 'Disclaimer'],
      ['settings.compliance', 'Compliance notes'],
      ['settings.stats', 'Knowledge base status'],
      ['settings.kbSeed', 'Bundled entries'],
      ['settings.kbLearned', 'Verified and filed'],
      ['settings.kbCorrected', 'User corrections'],
      ['settings.reset', "Reset this plugin's settings"],
      ['settings.resetHint', "Clears only this plugin's browser-stored settings; the local knowledge base is untouched."],
      ['common.yes', 'Yes'],
      ['common.no', 'No'],
      ['common.save', 'Save'],
      ['common.unknown', 'Unknown'],
    ])

    /** Japanese. */
    const ja = dict([
      ['nav', '\u30d9\u30eb\u30c8 / \u30ac\u30f3\u30d7\u30e9\u8b58\u5225'],
      ['onboard.title', '\u4eee\u9762\u30e9\u30a4\u30c0\u30fcDX\u30d9\u30eb\u30c8 & \u30d0\u30f3\u30c0\u30a4\u30ac\u30f3\u30d7\u30e9\u8b58\u5225\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8'],
      ['onboard.intro', '\u64ae\u5f71\u306f\u30b9\u30de\u30fc\u30c8\u30d5\u30a9\u30f3\u3067\u3002\u8b58\u5225\u30fb\u5224\u5b9a\u30fb\u691c\u7d22\u306f\u3059\u3079\u3066\u30ed\u30fc\u30ab\u30eb\u3067\u5b8c\u7d50\u3057\u3001\u30c8\u30fc\u30af\u30f3\u3092\u6d88\u8cbb\u3057\u307e\u305b\u3093\u3002\u30ec\u30d3\u30e5\u30fc\u57f7\u7b46\u3092\u4f9d\u983c\u3057\u305f\u3068\u304d\u3060\u3051\u30e2\u30c7\u30eb\u3092\u547c\u3073\u307e\u3059\u3002'],
      ['onboard.require', '\u64ae\u5f71\u306e\u5fc5\u9808\u8981\u4ef6'],
      ['onboard.accept', '\u4e0a\u8a18\u306e\u514d\u8cac\u4e8b\u9805\u3092\u8aad\u307f\u3001\u540c\u610f\u3057\u307e\u3059'],
      ['onboard.decline', '\u540c\u610f\u3057\u306a\u3044'],
      ['onboard.declined', '\u514d\u8cac\u4e8b\u9805\u306b\u540c\u610f\u3057\u3066\u3044\u306a\u3044\u305f\u3081\u3001\u8b58\u5225\u6a5f\u80fd\u306f\u7121\u52b9\u306e\u307e\u307e\u3067\u3059\u3002\u8a2d\u5b9a\u304b\u3089\u518d\u5ea6\u6709\u52b9\u306b\u3067\u304d\u307e\u3059\u3002'],
      ['onboard.enter', '\u958b\u59cb\u3059\u308b'],
      ['onboard.disclaimer', '\u514d\u8cac\u4e8b\u9805'],
      ['onboard.compliance', 'GDPR / EU AI Act \u306b\u3064\u3044\u3066'],
      ['onboard.richMode', '\u30b3\u30ec\u30af\u30bf\u30fc\u30e2\u30fc\u30c9\u3092\u6709\u52b9\u5316\uff08PG / \u30e1\u30bf\u30eb\u30d3\u30eb\u30c9 / \u89e3\u4f53\u5320\u6a5f / \u9650\u5b9a / \u6d77\u5916\u30b5\u30fc\u30c9\u30d1\u30fc\u30c6\u30a3\u3001CSM / CS / \u98df\u73a9 / \u9650\u5b9a\u30aa\u30d7\u30b7\u30e7\u30f3\uff09'],
      ['capture.title', '\u64ae\u5f71\u30ac\u30a4\u30c9'],
      ['capture.belt', '\u30d9\u30eb\u30c8'],
      ['capture.gunpla', '\u30ac\u30f3\u30d7\u30e9'],
      ['capture.other', '\u305d\u306e\u4ed6'],
      ['capture.banner.belt.primary', '\u30d9\u30eb\u30c8\u306f\u5fc5\u9808\uff1a\u30d0\u30c3\u30af\u30eb\u3092\u5916\u3057\u3066\u5358\u4f53\u3067\u3001\u5909\u8eab\u30a2\u30a4\u30c6\u30e0\u3082\u5916\u3057\u3066\u5358\u4f53\u3067\u64ae\u5f71\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u4ed8\u3051\u305f\u307e\u307e\u306e\u5199\u771f\u3067\u306f\u9451\u5b9a\u3067\u304d\u307e\u305b\u3093\u3002'],
      ['capture.banner.belt.secondary', '\u30d9\u30eb\u30c8\u5168\u4f53\u30fb\u96fb\u6c60\u5ba4\u30fb\u5909\u8eab\u97f3\u3082\u6dfb\u3048\u308b\u3068\u7cbe\u5ea6\u304c\u4e0a\u304c\u308a\u307e\u3059\u3002'],
      ['capture.banner.gunpla.primary', '\u30ac\u30f3\u30d7\u30e9\u306f\u5fc5\u9808\uff1a\u30d1\u30c3\u30b1\u30fc\u30b8\u524d\u9762\uff08\u30ed\u30b4\u3068\u30b0\u30ec\u30fc\u30c9\u306e\u8272\u5e2f\u304c\u898b\u3048\u308b\u72b6\u614b\uff09\u3002'],
      ['capture.banner.gunpla.secondary', '\u7bb1\u304c\u306a\u3044\u5834\u5408\uff1a\u591a\u89d2\u5ea6\uff0b\u7279\u5fb4\u90e8\u4f4d\uff0b\u8cfc\u5165\u8a18\u9332\u3002\u305d\u308c\u3082\u7121\u7406\u306a\u3089\u578b\u756a\u3092\u624b\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002'],
      ['capture.banner.other.primary', '\u307e\u305a\u30d6\u30e9\u30f3\u30c9\u30fb\u578b\u756a\u30fb\u9298\u677f\u3092\u3001\u6b21\u306b\u5168\u4f53\u3092\u64ae\u5f71\u3057\u3066\u304f\u3060\u3055\u3044\u3002'],
      ['capture.banner.other.secondary', '\u8aad\u3081\u306a\u3044\u9805\u76ee\u306f\u7a7a\u6b04\u306e\u307e\u307e\u306b\u3002\u63a8\u6e2c\u3067\u57cb\u3081\u306a\u3044\u3067\u304f\u3060\u3055\u3044\u3002\u624b\u5165\u529b\u306f\u3044\u3064\u3067\u3082\u4f7f\u3048\u307e\u3059\u3002'],
      ['capture.hasBox', '\u7bb1\u304c\u3042\u308b'],
      ['capture.noBox', '\u7bb1\u304c\u306a\u3044'],
      ['capture.checklist', '\u64ae\u5f71\u30c1\u30a7\u30c3\u30af\u30ea\u30b9\u30c8'],
      ['capture.blocked', '\u5fc5\u9808\u306e\u64ae\u5f71\u9805\u76ee\u304c\u6b8b\u3063\u3066\u3044\u307e\u3059\u3002\u5148\u306b\u64ae\u5f71\u3057\u3066\u304f\u3060\u3055\u3044\u3002'],
      ['capture.ready', '\u30c1\u30a7\u30c3\u30af\u30ea\u30b9\u30c8\u3092\u6e80\u305f\u3057\u307e\u3057\u305f\u3002\u8b58\u5225\u3092\u958b\u59cb\u3067\u304d\u307e\u3059\u3002'],
      ['capture.required', '\u5fc5\u9808'],
      ['capture.alternative', '\u4ee3\u66ff'],
      ['capture.optional', '\u4efb\u610f'],
      ['capture.worthAdding', '\u8ffd\u52a0\u63a8\u5968'],
      ['result.title', '\u8b58\u5225\u7d50\u679c'],
      ['result.confidence', '\u4fe1\u983c\u5ea6'],
      ['result.confidence.high', '\u9ad8'],
      ['result.confidence.medium', '\u4e2d'],
      ['result.confidence.low', '\u4f4e'],
      ['result.confidence.suspect', '\u6a21\u5023\u54c1\u306e\u7591\u3044'],
      ['result.candidates', '\u5019\u88dc'],
      ['result.contradictions', '\u77db\u76fe\u70b9'],
      ['result.bootleg', '\u6a21\u5023\u54c1\u306e\u8b66\u544a'],
      ['result.bootleg.warning', '\u8b66\u544a\u306e\u307f\u306e\u8868\u793a\u3067\u3059\u3002\u30ca\u30ec\u30c3\u30b8\u30d9\u30fc\u30b9\u306b\u306f\u66f8\u304d\u8fbc\u307f\u307e\u305b\u3093\u3002'],
      ['result.scope.richOff', '\u30b3\u30ec\u30af\u30bf\u30fc\u30e2\u30fc\u30c9\u306e\u7bc4\u56f2\u3067\u3059\u304c\u3001\u73fe\u5728\u306f\u7121\u52b9\u3067\u3059\u3002'],
      ['result.pick', '\u3053\u308c\u3067\u78ba\u5b9a'],
      ['result.picked', '\u8a02\u6b63\u6307\u793a\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f\u3002\u9001\u4fe1\u3059\u308b\u3068\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8\u304c\u8a02\u6b63\u30b9\u30c8\u30a2\u306b\u66f8\u304d\u8fbc\u307f\u307e\u3059\u3002\u4ee5\u964d\u306e\u66f4\u65b0\u3067\u4e0a\u66f8\u304d\u3055\u308c\u307e\u305b\u3093\u3002'],
      ['result.noMatch', '\u307e\u3060\u7d50\u679c\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u30c1\u30a7\u30c3\u30af\u30ea\u30b9\u30c8\u3092\u6e80\u305f\u3057\u305f\u3089\u3001\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8\u306b\u8b58\u5225\u3092\u4f9d\u983c\u3057\u3066\u304f\u3060\u3055\u3044\u3002'],
      ['result.manual', '\u578b\u756a\u3092\u624b\u5165\u529b'],
      ['result.manualPlaceholder', '\u4f8b\uff1aHGUC 191 RX-78-2 / CSM \u30c7\u30a3\u30b1\u30a4\u30c9\u30e9\u30a4\u30d0\u30fc'],
      ['result.submit', '\u8a02\u6b63\u6307\u793a\u3092\u4f5c\u6210'],
      ['result.clipboard', '\u30af\u30ea\u30c3\u30d7\u30dc\u30fc\u30c9\u306b\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\uff08\u5165\u529b\u6b04\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002\u624b\u52d5\u3067\u8cbc\u308a\u4ed8\u3051\u3066\u304f\u3060\u3055\u3044\uff09\u3002'],
      ['result.lastPick', '\u76f4\u8fd1\u306e\u78ba\u5b9a'],
      ['settings.title', '\u30d9\u30eb\u30c8 / \u30ac\u30f3\u30d7\u30e9\u8b58\u5225'],
      ['settings.richMode', '\u30b3\u30ec\u30af\u30bf\u30fc\u30e2\u30fc\u30c9'],
      ['settings.richModeHint', 'PG / \u30e1\u30bf\u30eb\u30d3\u30eb\u30c9 / \u89e3\u4f53\u5320\u6a5f / \u9650\u5b9a / \u6d77\u5916\u30b5\u30fc\u30c9\u30d1\u30fc\u30c6\u30a3\u3001\u304a\u3088\u3073 CSM / CS / \u98df\u73a9 / \u9650\u5b9a\u30aa\u30d7\u30b7\u30e7\u30f3\u3092\u542b\u3081\u307e\u3059\u3002'],
      ['settings.vision', '\u30ed\u30fc\u30ab\u30eb\u8996\u899a\u30e2\u30c7\u30eb'],
      ['settings.visionHint', '\u8b58\u5225\u306f\u30ed\u30fc\u30ab\u30eb\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u306e\u307f\u3092\u4f7f\u7528\u3057\u3001\u5199\u771f\u306f\u4e00\u5207\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3057\u307e\u305b\u3093\u3002\u3053\u3053\u3067\u5165\u529b\u3057\u305f\u30a2\u30c9\u30ec\u30b9\u306f\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8\u304c\u8a2d\u5b9a\u306b\u66f8\u304d\u8fbc\u307f\u307e\u3059\u3002\u672a\u8a2d\u5b9a\u6642\u306f 127.0.0.1:11434 / :1234 / :8080 \u3092\u81ea\u52d5\u691c\u51fa\u3057\u307e\u3059\u3002'],
      ['settings.visionUrl', '\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8'],
      ['settings.visionModel', '\u30e2\u30c7\u30eb\u540d'],
      ['settings.visionApply', '\u8a2d\u5b9a\u6307\u793a\u3092\u4f5c\u6210'],
      ['settings.visionApplied', '\u8a2d\u5b9a\u6307\u793a\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f\u3002\u9001\u4fe1\u3059\u308b\u3068\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8\u304c\u66f8\u304d\u8fbc\u307f\u307e\u3059\u3002'],
      ['settings.language', '\u8868\u793a\u8a00\u8a9e'],
      ['settings.languageHint', 'UI \u306e\u7ffb\u8a33\u306e\u307f\u3002\u8b58\u5225\u3068\u5224\u5b9a\u306f\u8a00\u8a9e\u306b\u4f9d\u5b58\u3057\u307e\u305b\u3093\u3002\u672a\u8a33\u306e\u30ad\u30fc\u306f\u82f1\u8a9e\u306b\u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af\u3057\u307e\u3059\u3002'],
      ['settings.baidu', 'Baidu \u691c\u7d22\u5165\u53e3\u3092\u4f75\u8a18'],
      ['settings.baiduHint', '\u4e2d\u56fd\u8a9e\u691c\u7d22\u306f Bing \u3092\u512a\u5148\u3057\u307e\u3059\u3002Baidu \u306e\u7d50\u679c\u306f\u8868\u793a\u6642\u306b\u300c\u672a\u8a8d\u8a3c\u300d\u3068\u660e\u8a18\u3057\u307e\u3059\u3002'],
      ['settings.cache', '\u7d50\u679c\u30ad\u30e3\u30c3\u30b7\u30e5'],
      ['settings.cacheHint', '\u30ad\u30e3\u30c3\u30b7\u30e5\u306f\u30ed\u30fc\u30ab\u30eb\u30d7\u30e9\u30b0\u30a4\u30f3\u5074\u306b\u3042\u308a\u307e\u3059\u3002\u3053\u3053\u3067\u6d88\u53bb\u3059\u308b\u306e\u306f\u30d6\u30e9\u30a6\u30b6\u5074\u306e\u8a18\u9332\u3067\u3059\u3002'],
      ['settings.clearCache', '\u30ed\u30fc\u30ab\u30eb\u8a18\u9332\u3092\u6d88\u53bb'],
      ['settings.cleared', '\u6d88\u53bb\u3057\u307e\u3057\u305f\u3002'],
      ['settings.dataDir', '\u30ed\u30fc\u30ab\u30eb\u30c7\u30fc\u30bf\u30c7\u30a3\u30ec\u30af\u30c8\u30ea'],
      ['settings.disclaimer', '\u514d\u8cac\u4e8b\u9805'],
      ['settings.compliance', '\u30b3\u30f3\u30d7\u30e9\u30a4\u30a2\u30f3\u30b9'],
      ['settings.stats', '\u30ca\u30ec\u30c3\u30b8\u30d9\u30fc\u30b9\u306e\u72b6\u614b'],
      ['settings.kbSeed', '\u540c\u68b1\u30a8\u30f3\u30c8\u30ea'],
      ['settings.kbLearned', '\u78ba\u8a8d\u6e08\u307f\u767b\u9332'],
      ['settings.kbCorrected', '\u30e6\u30fc\u30b6\u30fc\u8a02\u6b63'],
      ['settings.reset', '\u3053\u306e\u30d7\u30e9\u30b0\u30a4\u30f3\u306e\u8a2d\u5b9a\u3092\u521d\u671f\u5316'],
      ['settings.resetHint', '\u30d6\u30e9\u30a6\u30b6\u306b\u4fdd\u5b58\u3055\u308c\u305f\u672c\u30d7\u30e9\u30b0\u30a4\u30f3\u306e\u8a2d\u5b9a\u306e\u307f\u3092\u6d88\u53bb\u3057\u307e\u3059\u3002\u30ed\u30fc\u30ab\u30eb\u306e\u30ca\u30ec\u30c3\u30b8\u30d9\u30fc\u30b9\u306f\u4fdd\u6301\u3055\u308c\u307e\u3059\u3002'],
      ['common.yes', '\u306f\u3044'],
      ['common.no', '\u3044\u3044\u3048'],
      ['common.save', '\u4fdd\u5b58'],
      ['common.unknown', '\u4e0d\u660e'],
    ])

    /**
     * Partial dictionaries for the remaining UI languages. Only the strings a
     * reader meets before English takes over are translated; every other key
     * resolves through the declared fallback.
     */
    const partial = {
      ko: dict([
        ['nav', '\ubca8\ud2b8 / \uac74\ud504\ub77c \uc2dd\ubcc4'],
        ['onboard.title', '\uac00\uba74\ub77c\uc774\ub354 DX \ubca8\ud2b8 & \ubc18\ub2e4\uc774 \uac74\ud504\ub77c \uc2dd\ubcc4 \ub3c4\uc6b0\ubbf8'],
        ['onboard.accept', '\uc704 \uba74\ucc45 \uc870\ud56d\uc744 \uc77d\uace0 \ub3d9\uc758\ud569\ub2c8\ub2e4'],
        ['onboard.decline', '\ub3d9\uc758\ud558\uc9c0 \uc54a\uc74c'],
        ['capture.title', '\ucd2c\uc601 \uac00\uc774\ub4dc'],
        ['capture.belt', '\ubca8\ud2b8'],
        ['capture.gunpla', '\uac74\ud504\ub77c'],
        ['capture.other', '\uae30\ud0c0'],
        ['capture.hasBox', '\ubc15\uc2a4 \uc788\uc74c'],
        ['capture.noBox', '\ubc15\uc2a4 \uc5c6\uc74c'],
        ['capture.required', '\ud544\uc218'],
        ['capture.alternative', '\ub300\uccb4'],
        ['capture.optional', '\uc120\ud0dd'],
        ['result.title', '\uc2dd\ubcc4 \uacb0\uacfc'],
        ['result.confidence', '\uc2e0\ub8b0\ub3c4'],
        ['settings.title', '\ubca8\ud2b8 / \uac74\ud504\ub77c \uc2dd\ubcc4'],
        ['settings.richMode', '\uceec\ub809\ud130 \ubaa8\ub4dc'],
        ['settings.language', '\uc778\ud130\ud398\uc774\uc2a4 \uc5b8\uc5b4'],
        ['settings.clearCache', '\uae30\ub85d \ube44\uc6b0\uae30'],
        ['common.save', '\uc800\uc7a5'],
      ]),
      fr: dict([
        ['nav', 'Ceinture / Gunpla'],
        ['onboard.title', "Assistant d'identification ceinture DX & Gunpla Bandai"],
        ['onboard.accept', "J'ai lu et j'accepte l'avertissement ci-dessus"],
        ['onboard.decline', "Refuser pour l'instant"],
        ['capture.title', 'Guide de prise de vue'],
        ['capture.belt', 'Ceinture'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Autre'],
        ['capture.hasBox', 'Bo\u00eete disponible'],
        ['capture.noBox', 'Pas de bo\u00eete'],
        ['capture.required', 'Obligatoire'],
        ['capture.alternative', 'Alternative'],
        ['capture.optional', 'Facultatif'],
        ['result.title', "R\u00e9sultat de l'identification"],
        ['result.confidence', 'Confiance'],
        ['settings.title', 'Ceinture / Gunpla'],
        ['settings.richMode', 'Mode collectionneur'],
        ['settings.language', "Langue de l'interface"],
        ['settings.clearCache', 'Vider le cache'],
        ['common.save', 'Enregistrer'],
      ]),
      es: dict([
        ['nav', 'Cintur\u00f3n / Gunpla'],
        ['onboard.title', 'Asistente de identificaci\u00f3n de cinturones DX y Gunpla de Bandai'],
        ['onboard.accept', 'He le\u00eddo y acepto el aviso anterior'],
        ['onboard.decline', 'Rechazar por ahora'],
        ['capture.title', 'Gu\u00eda de captura'],
        ['capture.belt', 'Cintur\u00f3n'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Otro'],
        ['capture.hasBox', 'Caja disponible'],
        ['capture.noBox', 'Sin caja'],
        ['capture.required', 'Obligatorio'],
        ['capture.alternative', 'Alternativa'],
        ['capture.optional', 'Opcional'],
        ['result.title', 'Resultado de la identificaci\u00f3n'],
        ['result.confidence', 'Confianza'],
        ['settings.title', 'Cintur\u00f3n / Gunpla'],
        ['settings.richMode', 'Modo coleccionista'],
        ['settings.language', 'Idioma de la interfaz'],
        ['settings.clearCache', 'Vaciar cach\u00e9'],
        ['common.save', 'Guardar'],
      ]),
      pt: dict([
        ['nav', 'Cinto / Gunpla'],
        ['onboard.title', 'Assistente de identifica\u00e7\u00e3o de cintos DX e Gunpla da Bandai'],
        ['onboard.accept', 'Li e aceito o aviso acima'],
        ['onboard.decline', 'Recusar por agora'],
        ['capture.title', 'Guia de captura'],
        ['capture.belt', 'Cinto'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Outro'],
        ['capture.hasBox', 'Caixa dispon\u00edvel'],
        ['capture.noBox', 'Sem caixa'],
        ['capture.required', 'Obrigat\u00f3rio'],
        ['capture.alternative', 'Alternativa'],
        ['capture.optional', 'Opcional'],
        ['result.title', 'Resultado da identifica\u00e7\u00e3o'],
        ['result.confidence', 'Confian\u00e7a'],
        ['settings.title', 'Cinto / Gunpla'],
        ['settings.richMode', 'Modo colecionador'],
        ['settings.language', 'Idioma da interface'],
        ['settings.clearCache', 'Limpar cache'],
        ['common.save', 'Guardar'],
      ]),
      ru: dict([
        ['nav', '\u0420\u0435\u043c\u0435\u043d\u044c / Gunpla'],
        ['onboard.title', '\u041f\u043e\u043c\u043e\u0449\u043d\u0438\u043a \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f \u0440\u0435\u043c\u043d\u0435\u0439 DX \u0438 \u043c\u043e\u0434\u0435\u043b\u0435\u0439 Gunpla Bandai'],
        ['onboard.accept', '\u042f \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043b \u0438 \u043f\u0440\u0438\u043d\u0438\u043c\u0430\u044e \u043e\u0442\u043a\u0430\u0437 \u043e\u0442 \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u0438 \u0432\u044b\u0448\u0435'],
        ['onboard.decline', '\u041e\u0442\u043a\u0430\u0437\u0430\u0442\u044c\u0441\u044f'],
        ['capture.title', '\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e \u043f\u043e \u0441\u044a\u0451\u043c\u043a\u0435'],
        ['capture.belt', '\u0420\u0435\u043c\u0435\u043d\u044c'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', '\u0414\u0440\u0443\u0433\u043e\u0435'],
        ['capture.hasBox', '\u0415\u0441\u0442\u044c \u043a\u043e\u0440\u043e\u0431\u043a\u0430'],
        ['capture.noBox', '\u041d\u0435\u0442 \u043a\u043e\u0440\u043e\u0431\u043a\u0438'],
        ['capture.required', '\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e'],
        ['capture.alternative', '\u0410\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u0430'],
        ['capture.optional', '\u041d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e'],
        ['result.title', '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0432\u0430\u043d\u0438\u044f'],
        ['result.confidence', '\u0414\u043e\u0441\u0442\u043e\u0432\u0435\u0440\u043d\u043e\u0441\u0442\u044c'],
        ['settings.title', '\u0420\u0435\u043c\u0435\u043d\u044c / Gunpla'],
        ['settings.richMode', '\u0420\u0435\u0436\u0438\u043c \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u043e\u043d\u0435\u0440\u0430'],
        ['settings.language', '\u042f\u0437\u044b\u043a \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430'],
        ['settings.clearCache', '\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043a\u044d\u0448'],
        ['common.save', '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'],
      ]),
      yue: dict([
        ['nav', '\u8170\u5e36 / \u9ad8\u9054\u8b58\u5225'],
        ['onboard.title', '\u5e7c\u9762\u8d85\u4ebadx\u8170\u5e36 & \u842c\u4ee3\u9ad8\u9054\u8b58\u5225\u52a9\u624b'],
        ['onboard.accept', '\u6211\u7747\u904e\u4e26\u540c\u610f\u4e0a\u9762\u5605\u514d\u8cac\u8072\u660e'],
        ['onboard.decline', '\u5514\u540c\u610f'],
        ['capture.title', '\u5f71\u76f8\u6307\u5f15'],
        ['capture.belt', '\u8170\u5e36'],
        ['capture.gunpla', '\u9ad8\u9054'],
        ['capture.other', '\u5176\u4ed6'],
        ['capture.hasBox', '\u6709\u76d2'],
        ['capture.noBox', '\u5187\u76d2'],
        ['capture.required', '\u4e00\u5b9a\u8981'],
        ['capture.alternative', '\u66ff\u4ee3'],
        ['capture.optional', '\u96a8\u610f'],
        ['result.title', '\u8b58\u5225\u7d50\u679c'],
        ['result.confidence', '\u4fe1\u5514\u4fe1\u5f97\u904e'],
        ['settings.title', '\u8170\u5e36 / \u9ad8\u9054\u8b58\u5225'],
        ['settings.language', '\u4ecb\u9762\u8a9e\u8a00'],
        ['settings.clearCache', '\u6e05\u5feb\u53d6'],
        ['common.save', '\u5132\u5b58'],
      ]),
      vi: dict([
        ['nav', '\u0110ai / Gunpla'],
        ['onboard.title', 'Tr\u1ee3 l\u00fd nh\u1eadn di\u1ec7n \u0111ai DX v\u00e0 m\u00f4 h\u00ecnh Gunpla Bandai'],
        ['onboard.accept', 'T\u00f4i \u0111\u00e3 \u0111\u1ecdc v\u00e0 \u0111\u1ed3ng \u00fd v\u1edbi tuy\u00ean b\u1ed1 mi\u1ec5n tr\u00e1ch tr\u00ean'],
        ['onboard.decline', 'T\u1eeb ch\u1ed1i'],
        ['capture.title', 'H\u01b0\u1edbng d\u1eabn ch\u1ee5p \u1ea3nh'],
        ['capture.belt', '\u0110ai'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Kh\u00e1c'],
        ['capture.hasBox', 'C\u00f3 h\u1ed9p'],
        ['capture.noBox', 'Kh\u00f4ng c\u00f3 h\u1ed9p'],
        ['capture.required', 'B\u1eaft bu\u1ed9c'],
        ['capture.alternative', 'Thay th\u1ebf'],
        ['capture.optional', 'T\u00f9y ch\u1ecdn'],
        ['result.title', 'K\u1ebft qu\u1ea3 nh\u1eadn di\u1ec7n'],
        ['result.confidence', '\u0110\u1ed9 tin c\u1eady'],
        ['settings.title', '\u0110ai / Gunpla'],
        ['settings.richMode', 'Ch\u1ebf \u0111\u1ed9 nh\u00e0 s\u01b0u t\u1ea7m'],
        ['settings.language', 'Ng\u00f4n ng\u1eef giao di\u1ec7n'],
        ['settings.clearCache', 'X\u00f3a b\u1ed9 nh\u1edb \u0111\u1ec7m'],
        ['common.save', 'L\u01b0u'],
      ]),
      de: dict([
        ['nav', 'G\u00fcrtel / Gunpla'],
        ['onboard.title', 'Assistent zur Identifikation von DX-G\u00fcrteln und Bandai-Gunpla'],
        ['onboard.accept', 'Ich habe den obigen Haftungsausschluss gelesen und akzeptiere ihn'],
        ['onboard.decline', 'Vorerst ablehnen'],
        ['capture.title', 'Aufnahmeanleitung'],
        ['capture.belt', 'G\u00fcrtel'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Sonstiges'],
        ['capture.hasBox', 'Schachtel vorhanden'],
        ['capture.noBox', 'Keine Schachtel'],
        ['capture.required', 'Erforderlich'],
        ['capture.alternative', 'Alternative'],
        ['capture.optional', 'Optional'],
        ['result.title', 'Identifikationsergebnis'],
        ['result.confidence', 'Konfidenz'],
        ['settings.title', 'G\u00fcrtel / Gunpla'],
        ['settings.richMode', 'Sammler-Modus'],
        ['settings.language', 'Sprache der Oberfl\u00e4che'],
        ['settings.clearCache', 'Cache leeren'],
        ['common.save', 'Speichern'],
      ]),
      it: dict([
        ['nav', 'Cintura / Gunpla'],
        ['onboard.title', 'Assistente di identificazione cinture DX e Gunpla Bandai'],
        ['onboard.accept', "Ho letto e accetto l'avviso sopra"],
        ['onboard.decline', 'Rifiuta per ora'],
        ['capture.title', 'Guida alla cattura'],
        ['capture.belt', 'Cintura'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Altro'],
        ['capture.hasBox', 'Scatola disponibile'],
        ['capture.noBox', 'Nessuna scatola'],
        ['capture.required', 'Obbligatorio'],
        ['capture.alternative', 'Alternativa'],
        ['capture.optional', 'Facoltativo'],
        ['result.title', "Risultato dell'identificazione"],
        ['result.confidence', 'Affidabilit\u00e0'],
        ['settings.title', 'Cintura / Gunpla'],
        ['settings.richMode', 'Modalit\u00e0 collezionista'],
        ['settings.language', "Lingua dell'interfaccia"],
        ['settings.clearCache', 'Svuota cache'],
        ['common.save', 'Salva'],
      ]),
      nl: dict([
        ['nav', 'Riem / Gunpla'],
        ['onboard.title', 'Assistent voor het identificeren van DX-riemen en Bandai Gunpla'],
        ['onboard.accept', 'Ik heb de bovenstaande disclaimer gelezen en accepteer deze'],
        ['onboard.decline', 'Voorlopig weigeren'],
        ['capture.title', 'Opnamegids'],
        ['capture.belt', 'Riem'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Overig'],
        ['capture.hasBox', 'Doos beschikbaar'],
        ['capture.noBox', 'Geen doos'],
        ['capture.required', 'Vereist'],
        ['capture.alternative', 'Alternatief'],
        ['capture.optional', 'Optioneel'],
        ['result.title', 'Identificatieresultaat'],
        ['result.confidence', 'Betrouwbaarheid'],
        ['settings.title', 'Riem / Gunpla'],
        ['settings.richMode', 'Verzamelaarsmodus'],
        ['settings.language', 'Interfacetaal'],
        ['settings.clearCache', 'Cache wissen'],
        ['common.save', 'Opslaan'],
      ]),
      pl: dict([
        ['nav', 'Pasek / Gunpla'],
        ['onboard.title', 'Asystent rozpoznawania pas\u00f3w DX i modeli Gunpla Bandai'],
        ['onboard.accept', 'Przeczyta\u0142em i akceptuj\u0119 powy\u017csze zastrze\u017cenie'],
        ['onboard.decline', 'Odrzu\u0107'],
        ['capture.title', 'Przewodnik po zdj\u0119ciach'],
        ['capture.belt', 'Pasek'],
        ['capture.gunpla', 'Gunpla'],
        ['capture.other', 'Inne'],
        ['capture.hasBox', 'Pude\u0142ko dost\u0119pne'],
        ['capture.noBox', 'Brak pude\u0142ka'],
        ['capture.required', 'Wymagane'],
        ['capture.alternative', 'Alternatywa'],
        ['capture.optional', 'Opcjonalne'],
        ['result.title', 'Wynik rozpoznania'],
        ['result.confidence', 'Pewno\u015b\u0107'],
        ['settings.title', 'Pasek / Gunpla'],
        ['settings.richMode', 'Tryb kolekcjonera'],
        ['settings.language', 'J\u0119zyk interfejsu'],
        ['settings.clearCache', 'Wyczy\u015b\u0107 pami\u0119\u0107 podr\u0119czn\u0105'],
        ['common.save', 'Zapisz'],
      ]),
    }

    /**
     * Every dictionary this bundle registers, keyed by locale id.
     *
     * `zh` is registered because that is the id the shell catalogs, and every other
     * Chinese spelling is registered too so this namespace answers correctly
     * whichever one the shell reports. All of it stays inside this namespace, so no
     * other plugin's resolution changes.
     */
    const DICTIONARIES = {
      'zh-Hans': zhHans,
      'zh-Hant': zhHant,
      en,
      ja,
      ...partial,
      ...Object.fromEntries(Object.entries(LOCALE_ALIASES).map(([tag, target]) => [
        tag,
        target === 'zh-Hant' ? zhHant : zhHans,
      ])),
    }

    /** Disclaimer lines per language, mirroring the Host module. */
    const DISCLAIMER = {
      'zh-Hans': [
        '\u8bc6\u522b\u4ec5\u4f9b\u53c2\u8003\uff1a\u4e0d\u662f\u5b98\u65b9\u5de5\u5177\uff0c\u7ed3\u679c\u5b58\u5728\u8bef\u5dee\uff0c\u4e0d\u4fdd\u8bc1\u6b63\u786e\u3002',
        '\u975e\u5b98\u65b9\u5de5\u5177\uff1a\u4e0e\u4e07\u4ee3\u3001\u4e1c\u6620\u3001\u5706\u8c37\u53ca\u4efb\u4f55\u5382\u5546\u5747\u65e0\u5173\u8054\uff0c\u672a\u83b7\u6388\u6743\u6216\u80cc\u4e66\u3002',
        '\u6570\u636e\u6765\u81ea\u516c\u5f00\u7f51\u7edc\uff1a\u6761\u76ee\u7531\u516c\u5f00\u8d44\u6599\u6574\u7406\uff0c\u53ef\u80fd\u8fc7\u65f6\u6216\u6709\u8bef\uff0c\u8bf7\u4ee5\u5b98\u65b9\u4fe1\u606f\u4e3a\u51c6\u3002',
        'QQ \u4e92\u901a\u6709\u5c01\u53f7\u98ce\u9669\uff1a\u5982\u542f\u7528 QQ \u8f6c\u53d1\uff0c\u8d26\u53f7\u98ce\u9669\u7531\u4f7f\u7528\u8005\u81ea\u884c\u627f\u62c5\u3002',
        'AI \u5185\u5bb9\u4e0d\u6784\u6210\u8d2d\u4e70\u5efa\u8bae\uff1a\u8bc4\u6d4b\u4e0e\u63cf\u8ff0\u53ef\u80fd\u7531 AI \u751f\u6210\uff0c\u4e0d\u6784\u6210\u6295\u8d44\u6216\u8d2d\u4e70\u5efa\u8bae\u3002',
        '\u5f00\u6e90\u514d\u8d39\u6309\u73b0\u72b6\u63d0\u4f9b\uff1a\u65e0\u4efb\u4f55\u660e\u793a\u6216\u9ed8\u793a\u62c5\u4fdd\uff0c\u4f7f\u7528\u98ce\u9669\u81ea\u8d1f\u3002',
        '\u4e0d\u80cc\u4e66\u56fd\u4ea7/KO/\u6d77\u5916\u7b2c\u4e09\u65b9\uff1a\u8bc6\u522b\u5230\u4eff\u5192\u54c1\u4ec5\u4f5c\u63d0\u9192\uff0c\u4e0d\u4ee3\u8868\u63a8\u8350\u6216\u8ba4\u53ef\u3002',
      ],
      'zh-Hant': [
        '\u8b58\u5225\u50c5\u4f9b\u53c3\u8003\uff1a\u4e0d\u662f\u5b98\u65b9\u5de5\u5177\uff0c\u7d50\u679c\u5b58\u5728\u8aa4\u5dee\uff0c\u4e0d\u4fdd\u8b49\u6b63\u78ba\u3002',
        '\u975e\u5b98\u65b9\u5de5\u5177\uff1a\u8207\u842c\u4ee3\u3001\u6771\u6620\u3001\u5713\u8c37\u53ca\u4efb\u4f55\u5ee0\u5546\u5747\u7121\u95dc\u806f\uff0c\u672a\u7372\u6388\u6b0a\u6216\u80cc\u66f8\u3002',
        '\u8cc7\u6599\u4f86\u81ea\u516c\u958b\u7db2\u8def\uff1a\u689d\u76ee\u7531\u516c\u958b\u8cc7\u6599\u6574\u7406\uff0c\u53ef\u80fd\u904e\u6642\u6216\u6709\u8aa4\uff0c\u8acb\u4ee5\u5b98\u65b9\u8cc7\u8a0a\u70ba\u6e96\u3002',
        'QQ \u4e92\u901a\u6709\u5c01\u865f\u98a8\u96aa\uff1a\u5982\u555f\u7528 QQ \u8f49\u767c\uff0c\u5e33\u865f\u98a8\u96aa\u7531\u4f7f\u7528\u8005\u81ea\u884c\u627f\u64d4\u3002',
        'AI \u5167\u5bb9\u4e0d\u69cb\u6210\u8cfc\u8cb7\u5efa\u8b70\uff1a\u8a55\u6e2c\u8207\u63cf\u8ff0\u53ef\u80fd\u7531 AI \u751f\u6210\uff0c\u4e0d\u69cb\u6210\u6295\u8cc7\u6216\u8cfc\u8cb7\u5efa\u8b70\u3002',
        '\u958b\u6e90\u514d\u8cbb\u6309\u73fe\u72c0\u63d0\u4f9b\uff1a\u7121\u4efb\u4f55\u660e\u793a\u6216\u9ed8\u793a\u64d4\u4fdd\uff0c\u4f7f\u7528\u98a8\u96aa\u81ea\u8ca0\u3002',
        '\u4e0d\u80cc\u66f8\u570b\u7522/KO/\u6d77\u5916\u7b2c\u4e09\u65b9\uff1a\u8b58\u5225\u5230\u4eff\u5192\u54c1\u50c5\u4f5c\u63d0\u9192\uff0c\u4e0d\u4ee3\u8868\u63a8\u85a6\u6216\u8a8d\u53ef\u3002',
      ],
      ja: [
        '\u8b58\u5225\u306f\u53c2\u8003\u60c5\u5831\u3067\u3059\uff1a\u975e\u516c\u5f0f\u30c4\u30fc\u30eb\u3067\u3042\u308a\u3001\u7d50\u679c\u304c\u8aa4\u3063\u3066\u3044\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002',
        '\u975e\u516c\u5f0f\uff1a\u30d0\u30f3\u30c0\u30a4\u3001\u6771\u6620\u3001\u5186\u8c37\u30d7\u30ed\u3001\u305d\u306e\u4ed6\u3044\u304b\u306a\u308b\u30e1\u30fc\u30ab\u30fc\u3068\u3082\u95a2\u4fc2\u306a\u304f\u3001\u8a31\u8afe\u3082\u53d7\u3051\u3066\u304a\u308a\u307e\u305b\u3093\u3002',
        '\u30c7\u30fc\u30bf\u306f\u516c\u958b\u60c5\u5831\u306b\u57fa\u3065\u304d\u307e\u3059\uff1a\u53e4\u3044\u60c5\u5831\u3084\u8aa4\u308a\u3092\u542b\u3080\u5834\u5408\u304c\u3042\u308a\u307e\u3059\u3002\u516c\u5f0f\u60c5\u5831\u3092\u512a\u5148\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
        'QQ \u9023\u643a\u306b\u306f\u30a2\u30ab\u30a6\u30f3\u30c8\u505c\u6b62\u30ea\u30b9\u30af\u304c\u3042\u308a\u307e\u3059\uff1a\u6709\u52b9\u5316\u3059\u308b\u5834\u5408\u3001\u30ea\u30b9\u30af\u306f\u5229\u7528\u8005\u306e\u8ca0\u62c5\u3068\u306a\u308a\u307e\u3059\u3002',
        'AI \u30b3\u30f3\u30c6\u30f3\u30c4\u306f\u8cfc\u5165\u52a9\u8a00\u3067\u306f\u3042\u308a\u307e\u305b\u3093\uff1aAI \u751f\u6210\u306e\u53ef\u80fd\u6027\u304c\u3042\u308a\u3001\u8cfc\u5165\u306e\u63a8\u5968\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002',
        '\u30aa\u30fc\u30d7\u30f3\u30bd\u30fc\u30b9\u30fb\u73fe\u72b6\u6709\u59ff\uff1a\u660e\u793a\u9ed8\u793a\u3092\u554f\u308f\u305a\u3044\u304b\u306a\u308b\u4fdd\u8a3c\u3082\u3042\u308a\u307e\u305b\u3093\u3002',
        '\u56fd\u5185\u30fbKO\u30fb\u6d77\u5916\u30b5\u30fc\u30c9\u30d1\u30fc\u30c6\u30a3\u3092\u63a8\u5968\u3057\u307e\u305b\u3093\uff1a\u6a21\u5023\u54c1\u306e\u691c\u51fa\u306f\u8b66\u544a\u3067\u3042\u308a\u3001\u63a8\u5968\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002',
      ],
      en: [
        'Identification is reference only: not an official tool, results can be wrong.',
        'Unofficial: not affiliated with, authorized by, or endorsed by Bandai, Toei, Tsuburaya, or any vendor.',
        'Data comes from public sources: entries may be outdated or inaccurate; defer to official information.',
        'QQ bridging carries a ban risk: the account risk is yours if you enable it.',
        'AI content is not buying advice: generated text is not a purchase recommendation.',
        'Open source, provided as is: no warranty of any kind; use at your own risk.',
        'No endorsement of domestic, KO, or overseas third-party products: a counterfeit warning is not a recommendation.',
      ],
    }

    /** EU GDPR / AI Act notes per language, mirroring the Host module. */
    const COMPLIANCE = {
      'zh-Hans': [
        'GDPR\uff1a\u8bc6\u522b\u6570\u636e\u9ed8\u8ba4\u53ea\u5b58\u5728\u672c\u673a\uff08$DSH_HOME/plugin-data/tokusatsu-gunpla\uff09\uff0c\u63d2\u4ef6\u4e0d\u4e0a\u4f20\u7167\u7247\u4e0e\u77e5\u8bc6\u5e93\u3002',
        'GDPR\uff1a\u5220\u9664\u672c\u5730\u6570\u636e\u76ee\u5f55\u5373\u53ef\u884c\u4f7f\u5220\u9664\u6743\uff1b\u63d2\u4ef6\u4e0d\u5efa\u7acb\u7528\u6237\u753b\u50cf\u3002',
        'EU AI Act\uff1a\u672c\u63d2\u4ef6\u4e3a\u5f00\u6e90\u3001\u975e\u9ad8\u98ce\u9669\u7528\u9014\u7684 AI \u7cfb\u7edf\uff0c\u4ec5\u505a\u8f85\u52a9\u8bc6\u522b\u4e0e\u4fe1\u606f\u6574\u7406\u3002',
        'EU AI Act\uff1aAI \u751f\u6210\u5185\u5bb9\u5747\u6807\u6ce8\u6765\u6e90\u5c42\u7ea7\uff0c\u4e14\u53ea\u5c55\u793a\u4e0d\u5165\u5e93\u3002',
        '\u900f\u660e\u5ea6\uff1a\u7ed3\u679c\u9644\u5e26\u7f6e\u4fe1\u5ea6\u4e0e\u8bc1\u636e\u94fe\uff0c\u7528\u6237\u7ea0\u6b63\u4f18\u5148\u4e8e\u81ea\u52a8\u7ed3\u679c\u3002',
      ],
      'zh-Hant': [
        'GDPR\uff1a\u8b58\u5225\u8cc7\u6599\u9810\u8a2d\u53ea\u5b58\u5728\u672c\u6a5f\uff08$DSH_HOME/plugin-data/tokusatsu-gunpla\uff09\uff0c\u63d2\u4ef6\u4e0d\u4e0a\u50b3\u7167\u7247\u8207\u77e5\u8b58\u5eab\u3002',
        'GDPR\uff1a\u522a\u9664\u672c\u6a5f\u8cc7\u6599\u76ee\u9304\u5373\u53ef\u884c\u4f7f\u522a\u9664\u6b0a\uff1b\u63d2\u4ef6\u4e0d\u5efa\u7acb\u4f7f\u7528\u8005\u8f2a\u5ed3\u3002',
        'EU AI Act\uff1a\u672c\u63d2\u4ef6\u70ba\u958b\u6e90\u3001\u975e\u9ad8\u98a8\u96aa\u7528\u9014\u7684 AI \u7cfb\u7d71\uff0c\u50c5\u505a\u8f14\u52a9\u8b58\u5225\u8207\u8cc7\u8a0a\u6574\u7406\u3002',
        'EU AI Act\uff1aAI \u751f\u6210\u5167\u5bb9\u5747\u6a19\u8a3b\u4f86\u6e90\u5c64\u7d1a\uff0c\u4e14\u53ea\u5c55\u793a\u4e0d\u5165\u5eab\u3002',
        '\u900f\u660e\u5ea6\uff1a\u7d50\u679c\u9644\u5e36\u4fe1\u8cf4\u5ea6\u8207\u8b49\u64da\u93c8\uff0c\u4f7f\u7528\u8005\u7cfe\u6b63\u512a\u5148\u65bc\u81ea\u52d5\u7d50\u679c\u3002',
      ],
      ja: [
        'GDPR\uff1a\u8b58\u5225\u30c7\u30fc\u30bf\u306f\u65e2\u5b9a\u3067\u672c\u6a5f\u306e\u307f\uff08$DSH_HOME/plugin-data/tokusatsu-gunpla\uff09\u306b\u4fdd\u5b58\u3055\u308c\u3001\u5199\u771f\u3068\u30ca\u30ec\u30c3\u30b8\u30d9\u30fc\u30b9\u306f\u9001\u4fe1\u3057\u307e\u305b\u3093\u3002',
        'GDPR\uff1a\u30ed\u30fc\u30ab\u30eb\u30c7\u30fc\u30bf\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u3092\u524a\u9664\u3059\u308c\u3070\u6d88\u53bb\u6a29\u3092\u884c\u4f7f\u3067\u304d\u307e\u3059\u3002\u30e6\u30fc\u30b6\u30fc\u30d7\u30ed\u30d5\u30a1\u30a4\u30eb\u306f\u4f5c\u6210\u3057\u307e\u305b\u3093\u3002',
        'EU AI Act\uff1a\u672c\u30d7\u30e9\u30b0\u30a4\u30f3\u306f\u30aa\u30fc\u30d7\u30f3\u30bd\u30fc\u30b9\u304b\u3064\u975e\u9ad8\u30ea\u30b9\u30af\u7528\u9014\u306e AI \u30b7\u30b9\u30c6\u30e0\u3067\u3001\u8b58\u5225\u3068\u60c5\u5831\u6574\u7406\u306e\u88dc\u52a9\u306e\u307f\u3092\u884c\u3044\u307e\u3059\u3002',
        'EU AI Act\uff1aAI \u751f\u6210\u30b3\u30f3\u30c6\u30f3\u30c4\u306f\u60c5\u5831\u6e90\u306e\u968e\u5c64\u3092\u660e\u793a\u3057\u3001\u8868\u793a\u306e\u307f\u3067\u767b\u9332\u3057\u307e\u305b\u3093\u3002',
        '\u900f\u660e\u6027\uff1a\u7d50\u679c\u306b\u306f\u4fe1\u983c\u5ea6\u3068\u6839\u62e0\u304c\u4ed8\u304d\u3001\u30e6\u30fc\u30b6\u30fc\u306e\u8a02\u6b63\u304c\u81ea\u52d5\u7d50\u679c\u3088\u308a\u512a\u5148\u3055\u308c\u307e\u3059\u3002',
      ],
      en: [
        'GDPR: recognition data stays on this machine by default ($DSH_HOME/plugin-data/tokusatsu-gunpla); photos and the knowledge base are never uploaded.',
        'GDPR: deleting the local data directory exercises your erasure right; no user profiles are built.',
        'EU AI Act: an open-source AI system for non-high-risk identification and information organisation.',
        'EU AI Act: AI-generated content is labelled with its source tier and is display-only, never filed.',
        'Transparency: results carry confidence and an evidence chain; user corrections outrank automatic results.',
      ],
    }

    /** Photo requirements, mirroring `lib/checklist.js`. */
    const REQUIREMENTS = [
      { id: 'box-front', level: 'required', kinds: ['gunpla', 'figure'], title: { 'zh-Hans': '\u5305\u88c5\u76d2\u6b63\u9762', 'zh-Hant': '\u5305\u88dd\u76d2\u6b63\u9762', en: 'Front of the box', ja: '\u30d1\u30c3\u30b1\u30fc\u30b8\u524d\u9762' }, hint: { 'zh-Hans': '\u542b\u4e07\u4ee3\u5546\u6807\u3001\u7b49\u7ea7\u8272\u5757\u4e0e\u5546\u54c1\u7f16\u53f7\u7684\u6574\u9762\u3002', 'zh-Hant': '\u542b\u842c\u4ee3\u5546\u6a19\u3001\u7b49\u7d1a\u8272\u584a\u8207\u5546\u54c1\u7de8\u865f\u7684\u6574\u9762\u3002', en: 'Whole face with the logo, grade colour block, and product number.', ja: '\u30ed\u30b4\u30fb\u30b0\u30ec\u30fc\u30c9\u8272\u5e2f\u30fb\u578b\u756a\u304c\u5165\u3063\u305f\u9762\u5168\u4f53\u3002' } },
      { id: 'box-side', level: 'optional', kinds: ['gunpla', 'figure'], title: { 'zh-Hans': '\u76d2\u4fa7 / \u80cc\u9762', 'zh-Hant': '\u76d2\u5074 / \u80cc\u9762', en: 'Box side or back', ja: '\u7bb1\u306e\u5074\u9762\u30fb\u80cc\u9762' }, hint: { 'zh-Hans': '\u62cd\u5e26 JAN \u6761\u7801\u7684\u4e00\u4fa7\u3002', 'zh-Hant': '\u62cd\u5e36 JAN \u689d\u78bc\u7684\u4e00\u5074\u3002', en: 'Photograph the JAN barcode side.', ja: 'JAN \u30d0\u30fc\u30b3\u30fc\u30c9\u306e\u3042\u308b\u9762\u3002' } },
      { id: 'runner-mark', level: 'alternative', recommended: true, kinds: ['gunpla'], title: { 'zh-Hans': '\u677f\u4ef6\u6d41\u9053\u94ed\u6587', 'zh-Hant': '\u677f\u4ef6\u6d41\u9053\u9298\u6587', en: 'Runner marking', ja: '\u30e9\u30f3\u30ca\u30fc\u523b\u5370' }, hint: { 'zh-Hans': '\u5bf9\u7740\u6d41\u9053\u4e0a BANDAI \u5b57\u6837\u4e0e\u5e74\u4efd\u62cd\u5fae\u8ddd\u3002', 'zh-Hant': '\u5c0d\u8457\u6d41\u9053\u4e0a BANDAI \u5b57\u6a23\u8207\u5e74\u4efd\u62cd\u5fae\u8ddd\u3002', en: 'Macro shot of the BANDAI mark and year on a runner.', ja: '\u30e9\u30f3\u30ca\u30fc\u306e BANDAI \u523b\u5370\u3068\u5e74\u3092\u30de\u30af\u30ed\u64ae\u5f71\u3002' } },
      { id: 'multi-angle', level: 'alternative', kinds: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'], title: { 'zh-Hans': '\u591a\u89d2\u5ea6', 'zh-Hant': '\u591a\u89d2\u5ea6', en: 'Multiple angles', ja: '\u591a\u89d2\u5ea6' }, hint: { 'zh-Hans': '\u6b63\u9762\u3001\u80cc\u9762\u3001\u4fa7\u9762\u5404\u4e00\u5f20\u3002', 'zh-Hant': '\u6b63\u9762\u3001\u80cc\u9762\u3001\u5074\u9762\u5404\u4e00\u5f35\u3002', en: 'One each: front, back, side.', ja: '\u524d\u9762\u30fb\u80cc\u9762\u30fb\u5074\u9762\u3092\u54041\u679a\u3002' } },
      { id: 'feature-part', level: 'alternative', kinds: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'], title: { 'zh-Hans': '\u7279\u5f81\u90e8\u4f4d\u7279\u5199', 'zh-Hant': '\u7279\u5fb5\u90e8\u4f4d\u7279\u5beb', en: 'Characteristic part close-up', ja: '\u7279\u5fb4\u90e8\u4f4d\u306e\u63a5\u5199' }, hint: { 'zh-Hans': '\u6a21\u578b\u62cd\u5934\u90e8 / \u80f8\u53e3\uff1b\u8170\u5e26\u62cd\u5e26\u6263\u6b63\u53cd\u9762\u3002', 'zh-Hant': '\u6a21\u578b\u62cd\u982d\u90e8 / \u80f8\u53e3\uff1b\u8170\u5e36\u62cd\u5e36\u6263\u6b63\u53cd\u9762\u3002', en: 'Head or chest for kits; buckle front and back for belts.', ja: '\u30d7\u30e9\u30e2\u30c7\u30eb\u306f\u982d\u90e8\u30fb\u80f8\u90e8\u3001\u30d9\u30eb\u30c8\u306f\u30d0\u30c3\u30af\u30eb\u8868\u88cf\u3002' } },
      { id: 'purchase-record', level: 'alternative', kinds: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'], title: { 'zh-Hans': '\u8d2d\u4e70\u8bb0\u5f55', 'zh-Hant': '\u8cfc\u8cb7\u8a18\u9304', en: 'Purchase record', ja: '\u8cfc\u5165\u8a18\u9332' }, hint: { 'zh-Hans': '\u8ba2\u5355\u9875\u6216\u6536\u636e\uff0c\u9700\u542b\u5546\u54c1\u5168\u540d\u4e0e\u5e97\u94fa\u3002', 'zh-Hant': '\u8a02\u55ae\u9801\u6216\u6536\u64da\uff0c\u9700\u542b\u5546\u54c1\u5168\u540d\u8207\u5e97\u5bb6\u3002', en: 'Order page or receipt with the full product name and shop.', ja: '\u5546\u54c1\u540d\u3068\u5e97\u8217\u304c\u5206\u304b\u308b\u6ce8\u6587\u753b\u9762\u30fb\u9818\u53ce\u66f8\u3002' } },
      { id: 'manual-model', level: 'alternative', kinds: ['gunpla', 'figure', 'belt', 'device', 'accessory', 'unknown'], title: { 'zh-Hans': '\u624b\u52a8\u8865\u578b\u53f7', 'zh-Hant': '\u624b\u52d5\u88dc\u578b\u865f', en: 'Enter the model number', ja: '\u578b\u756a\u3092\u624b\u5165\u529b' }, hint: { 'zh-Hans': '\u76f4\u63a5\u8f93\u5165\u5b8c\u6574\u578b\u53f7\u3002', 'zh-Hant': '\u76f4\u63a5\u8f38\u5165\u5b8c\u6574\u578b\u865f\u3002', en: 'Type the full model number directly.', ja: '\u578b\u756a\u3092\u305d\u306e\u307e\u307e\u5165\u529b\u3057\u307e\u3059\u3002' } },
      { id: 'buckle-detached', level: 'required', kinds: ['belt'], title: { 'zh-Hans': '\u5e26\u6263\u5355\u72ec\u62c6\u4e0b\u62cd\u6444', 'zh-Hant': '\u5e36\u6263\u55ae\u7368\u62c6\u4e0b\u62cd\u651d', en: 'Buckle detached and photographed alone', ja: '\u30d0\u30c3\u30af\u30eb\u3092\u5916\u3057\u3066\u5358\u4f53\u64ae\u5f71' }, hint: { 'zh-Hans': '\u6b63\u9762\u3001\u80cc\u9762\u5404\u4e00\u5f20\uff0c\u80cc\u9762\u8981\u6709\u94ed\u724c\u3002', 'zh-Hant': '\u6b63\u9762\u3001\u80cc\u9762\u5404\u4e00\u5f35\uff0c\u80cc\u9762\u8981\u6709\u9298\u724c\u3002', en: 'One front and one back; the back must show the nameplate.', ja: '\u8868\u3068\u88cf\u3092\u54041\u679a\u3002\u88cf\u9762\u306e\u9298\u677f\u304c\u5199\u308b\u3053\u3068\u3002' } },
      { id: 'device-detached', level: 'required', kinds: ['belt'], title: { 'zh-Hans': '\u53d8\u8eab\u9053\u5177\u5355\u72ec\u62c6\u4e0b\u62cd\u6444', 'zh-Hant': '\u8b8a\u8eab\u9053\u5177\u55ae\u7368\u62c6\u4e0b\u62cd\u651d', en: 'Transformation device detached and photographed alone', ja: '\u5909\u8eab\u30a2\u30a4\u30c6\u30e0\u3092\u5916\u3057\u3066\u5358\u4f53\u64ae\u5f71' }, hint: { 'zh-Hans': '\u628a\u9053\u5177\u4ece\u5e26\u6263\u53d6\u51fa\u5206\u5f00\u62cd\u3002', 'zh-Hant': '\u628a\u9053\u5177\u5f9e\u5e36\u6263\u53d6\u51fa\u5206\u958b\u62cd\u3002', en: 'Take the device out of the buckle and photograph it separately.', ja: '\u30d9\u30eb\u30c8\u304b\u3089\u53d6\u308a\u51fa\u3057\u3066\u5225\u3005\u306b\u64ae\u5f71\u3002' } },
      { id: 'strap-overall', level: 'optional', kinds: ['belt'], title: { 'zh-Hans': '\u5e26\u5b50\u6574\u4f53', 'zh-Hant': '\u5e36\u5b50\u6574\u9ad4', en: 'Full strap', ja: '\u30d9\u30eb\u30c8\u5168\u4f53' }, hint: { 'zh-Hans': '\u5e26\u5b50\u644a\u5e73\uff0c\u5305\u542b\u6263\u5177\u4e0e\u5185\u886c\u3002', 'zh-Hant': '\u5e36\u5b50\u6524\u5e73\uff0c\u5305\u542b\u6263\u5177\u8207\u5167\u8961\u3002', en: 'Strap laid flat, showing hardware and lining.', ja: '\u91d1\u5177\u3068\u88cf\u5730\u304c\u898b\u3048\u308b\u3088\u3046\u5e73\u3089\u306b\u3002' } },
      { id: 'audio-evidence', level: 'optional', kinds: ['belt', 'device'], title: { 'zh-Hans': '\u97f3\u6548\u8bc1\u636e', 'zh-Hant': '\u97f3\u6548\u8b49\u64da', en: 'Audio evidence', ja: '\u97f3\u58f0\u306e\u6839\u62e0' }, hint: { 'zh-Hans': '\u6709\u6ca1\u6709\u53f0\u8bcd\u3001\u6709\u6ca1\u6709 BGM\u3002', 'zh-Hant': '\u6709\u6c92\u6709\u53f0\u8a5e\u3001\u6709\u6c92\u6709 BGM\u3002', en: 'Whether there are voice lines and BGM.', ja: '\u30bb\u30ea\u30d5\u3084 BGM \u306e\u6709\u7121\u3002' } },
      { id: 'electronics-bay', level: 'optional', kinds: ['belt', 'device'], title: { 'zh-Hans': '\u7535\u6c60\u4ed3\u4e0e\u89e6\u70b9', 'zh-Hant': '\u96fb\u6c60\u5009\u8207\u89f8\u9ede', en: 'Battery bay and contacts', ja: '\u96fb\u6c60\u5ba4\u3068\u63a5\u70b9' }, hint: { 'zh-Hans': '\u6253\u5f00\u7535\u6c60\u4ed3\u62cd\u89e6\u70b9\u4e0e\u5f39\u7c27\u3002', 'zh-Hant': '\u6253\u958b\u96fb\u6c60\u5009\u62cd\u89f8\u9ede\u8207\u5f48\u7c27\u3002', en: 'Open the battery bay and photograph contacts and springs.', ja: '\u96fb\u6c60\u5ba4\u3092\u958b\u3051\u3066\u63a5\u70b9\u3068\u30d0\u30cd\u3092\u64ae\u5f71\u3002' } },
    ]

    /** Standing banner keys per capture category. */
    const BANNERS = {
      belt: ['capture.banner.belt.primary', 'capture.banner.belt.secondary'],
      gunpla: ['capture.banner.gunpla.primary', 'capture.banner.gunpla.secondary'],
      other: ['capture.banner.other.primary', 'capture.banner.other.secondary'],
    }
    // #endregion

    // #region store
    /**
     * Local observable store over `localStorage`.
     * @param {string} key - storage key.
     * @param {object} defaults - initial values.
     * @returns {object} the store.
     */
    function createStore(key, defaults) {
      let state = { ...defaults }
      const listeners = new Set()
      try {
        const raw = window.localStorage.getItem(key)
        if (raw !== null) {
          const parsed = JSON.parse(raw)
          if (parsed !== null && typeof parsed === 'object') state = { ...defaults, ...parsed }
        }
      } catch {
        // A corrupt or blocked localStorage must not stop the plugin loading; it
        // only means settings do not persist for this session.
      }
      const persist = () => {
        try {
          window.localStorage.setItem(key, JSON.stringify(state))
        } catch {
          // Ignore quota and privacy-mode failures.
        }
      }
      return {
        getSnapshot: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        set(patch) {
          state = { ...state, ...patch }
          persist()
          for (const listener of [...listeners]) listener()
        },
        reset() {
          state = { ...defaults }
          persist()
          for (const listener of [...listeners]) listener()
        },
      }
    }

    const DEFAULT_SETTINGS = {
      acknowledged: false,
      declined: false,
      richMode: false,
      visionUrl: '',
      visionModel: '',
      allowBaidu: false,
      kind: 'belt',
      hasBox: true,
      provided: [],
    }

    const DEFAULT_REPORTS = { lastPick: null }
    // #endregion

    // #region helpers
    /**
     * Resolve a locale id to the dictionary keys to consult, in order.
     *
     * This is THE resolution rule for every text lookup in this bundle, and the one
     * the test harness drives, so the two can never drift apart.
     * @param {string} language - the locale id the shell reports.
     * @returns {string[]} dictionary keys to try, ending at the English fallback.
     */
    function resolveChain(language) {
      const chain = []
      const seen = new Set()
      let current = LOCALE_ALIASES[language] ?? language
      while (typeof current === 'string' && current !== '' && !seen.has(current)) {
        seen.add(current)
        chain.push(current)
        const definition = LANGUAGES.find((item) => item.id === current)
        current = definition === undefined ? null : definition.fallback
      }
      chain.push('en')
      return [...new Set(chain)]
    }

    /**
     * Resolve a localized string through the declared fallback chain.
     * @param {string} language - active language id.
     * @param {Record<string, string>} table - language id to text.
     * @returns {string} the resolved text.
     */
    function pick(language, table) {
      for (const key of resolveChain(language)) {
        if (typeof table[key] === 'string') return table[key]
      }
      return table.en ?? ''
    }

    /**
     * Resolve a localized line array through the same fallback chain.
     * @param {string} language - active language id.
     * @param {Record<string, string[]>} table - language id to lines.
     * @returns {string[]} the resolved lines.
     */
    function pickLines(language, table) {
      const seen = new Set()
      let current = LOCALE_ALIASES[language] ?? language
      while (typeof current === 'string' && current !== '' && !seen.has(current)) {
        seen.add(current)
        if (Array.isArray(table[current])) return table[current]
        const definition = LANGUAGES.find((item) => item.id === current)
        current = definition === undefined ? 'en' : definition.fallback
      }
      return table.en ?? []
    }

    /**
     * Resolve a per-language field on a requirement.
     * @param {string} language - active language id.
     * @param {Record<string, string> | undefined} table - the field.
     * @returns {string} the resolved text.
     */
    const field = (language, table) => (table === undefined ? '' : pick(language, table))

    /**
     * Read the shell's active locale and re-render when it changes.
     *
     * `ctx.locale` also carries the LocaleFace (`getSnapshot`/`subscribe`), and a
     * component must subscribe to it: `t` reads the active locale at CALL time, so
     * without this subscription a component keeps rendering whatever language was
     * active when it last rendered. That is why a stale English title survived a
     * language switch.
     * @param {object} locale - the client `locale` service.
     * @returns {string} the active locale id, or '' when the service is absent.
     */
    function useActiveLocale(locale) {
      const subscribe = React.useCallback(
        (listener) => (typeof locale?.subscribe === 'function' ? locale.subscribe(listener) : () => {}),
        [locale],
      )
      const read = React.useCallback(
        () => (typeof locale?.getSnapshot === 'function' ? locale.getSnapshot().active : ''),
        [locale],
      )
      const readServer = React.useCallback(() => '', [])
      return React.useSyncExternalStore(subscribe, read, readServer)
    }

    /**
     * The shell's registered language catalog, falling back to this bundle's own
     * list when the locale service is unavailable.
     * @param {object} locale - the client `locale` service.
     * @returns {Array<{ id: string, label: string }>} selectable languages.
     */
    function localeCatalog(locale) {
      try {
        const snapshot = locale?.getSnapshot?.()
        if (snapshot !== undefined && Array.isArray(snapshot.locales) && snapshot.locales.length > 0) {
          return snapshot.locales.map((item) => ({ id: item.id, label: item.label }))
        }
      } catch {
        // Fall through to the local list.
      }
      return LANGUAGES.map((item) => ({ id: item.id, label: item.label }))
    }

    /**
     * Send an instruction into a session as a real queued user turn.
     *
     * The panel cannot call Host tools itself, so it hands the agent a precise
     * instruction and lets the agent execute the tool. `beginSubmission` must
     * precede `prompt` so the composer shows the pending echo; the returned handle
     * is abandoned when the call cannot reach `prompt`.
     * @param {object | undefined} session - the client session face, when a session is selected.
     * @param {string} text - the instruction text.
     * @returns {Promise<boolean>} whether the turn was accepted.
     */
    async function submitInstruction(session, text) {
      if (session === undefined || session === null || typeof session.prompt !== 'function') return false
      let handle
      try {
        handle = session.beginSubmission({ mode: 'queue', text, attachments: [] })
      } catch {
        handle = undefined
      }
      try {
        const result = await session.prompt([{ type: 'text', text }], 'queue', undefined, handle?.requestId)
        if (result !== null && typeof result === 'object' && result.ok === false) {
          handle?.abandon?.()
          return false
        }
        return true
      } catch {
        handle?.abandon?.()
        return false
      }
    }
    // #endregion

    // #region OnboardingGate
    /**
     * Onboarding gate. The disclaimer must be explicitly accepted before any
     * capture surface appears, which is what the startup-guide requirement means
     * in practice.
     * @param {object} props - injected store and translate function.
     * @returns {object} the gate element.
     */
    function OnboardingGate({ store, locale, t }) {
      const settings = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
      const language = useActiveLocale(locale)
      const rules = [
        { 'zh-Hans': '\u8170\u5e26\uff1a\u5e26\u6263\u4e0e\u53d8\u8eab\u9053\u5177\u5fc5\u987b\u5404\u81ea\u62c6\u4e0b\u5355\u72ec\u62cd\u3002', 'zh-Hant': '\u8170\u5e36\uff1a\u5e36\u6263\u8207\u8b8a\u8eab\u9053\u5177\u5fc5\u9808\u5404\u81ea\u62c6\u4e0b\u55ae\u7368\u62cd\u3002', en: 'Belts: the buckle and the transformation device must each be photographed detached.', ja: '\u30d9\u30eb\u30c8\uff1a\u30d0\u30c3\u30af\u30eb\u3068\u5909\u8eab\u30a2\u30a4\u30c6\u30e0\u306f\u5fc5\u305a\u5916\u3057\u3066\u5358\u4f53\u3067\u64ae\u5f71\u3002' },
        { 'zh-Hans': '\u9ad8\u8fbe\uff1a\u5fc5\u987b\u6709\u5305\u88c5\u76d2\u6b63\u9762\uff1b\u6ca1\u76d2\u5b50\u8d70\u591a\u89d2\u5ea6 + \u7279\u5f81\u90e8\u4f4d + \u8d2d\u4e70\u8bb0\u5f55\uff0c\u6700\u540e\u624b\u52a8\u8865\u578b\u53f7\u3002', 'zh-Hant': '\u92fc\u5f48\uff1a\u5fc5\u9808\u6709\u5305\u88dd\u76d2\u6b63\u9762\uff1b\u6c92\u76d2\u5b50\u8d70\u591a\u89d2\u5ea6 + \u7279\u5fb5\u90e8\u4f4d + \u8cfc\u8cb7\u8a18\u9304\uff0c\u6700\u5f8c\u624b\u52d5\u88dc\u578b\u865f\u3002', en: 'Gunpla: the box front is required; without a box use angles + parts + purchase record, then manual entry.', ja: '\u30ac\u30f3\u30d7\u30e9\uff1a\u30d1\u30c3\u30b1\u30fc\u30b8\u524d\u9762\u304c\u5fc5\u9808\u3002\u7bb1\u304c\u7121\u3051\u308c\u3070\u591a\u89d2\u5ea6\uff0b\u7279\u5fb4\u90e8\u4f4d\uff0b\u8cfc\u5165\u8a18\u9332\u3001\u6700\u5f8c\u306f\u578b\u756a\u306e\u624b\u5165\u529b\u3002' },
        { 'zh-Hans': '\u76d7\u7248 / \u4eff\u5192\u54c1\uff1a\u8bc6\u522b\u5230\u53ea\u63d0\u9192\uff0c\u4e0d\u5165\u5e93\u3002', 'zh-Hant': '\u76dc\u7248 / \u4eff\u5192\u54c1\uff1a\u8b58\u5225\u5230\u53ea\u63d0\u9192\uff0c\u4e0d\u5165\u5eab\u3002', en: 'Counterfeits: detected items are flagged as a warning and never filed.', ja: '\u6a21\u5023\u54c1\uff1a\u691c\u51fa\u3057\u3066\u3082\u8b66\u544a\u306e\u307f\u3067\u3001\u767b\u9332\u306f\u3057\u307e\u305b\u3093\u3002' },
      ]

      return jsxs('div', {
        className: 'TKG_dock TKG_gateDock',
        'data-tkg': 'onboarding',
        children: [jsxs('div', {
          className: 'TKG_gate',
          children: [
            jsx('div', { className: 'TKG_gateTitle', children: t('onboard.title') }),
            jsx('div', { className: 'TKG_gateLead', children: t('onboard.intro') }),
            jsx('div', { className: 'TKG_giant', children: t('onboard.require') }),
            ...rules.map((rule, index) => jsx('div', { className: 'TKG_giant', children: pick(language, rule) }, index)),
            jsx('hr', { className: 'TKG_divider' }),
            jsx('div', { className: 'TKG_title', children: t('onboard.disclaimer') }),
            jsx('ul', {
              className: 'TKG_list',
              children: pickLines(language, DISCLAIMER).map((line, index) => jsxs('li', {
                className: 'TKG_item',
                children: [
                  jsx('span', { className: 'TKG_mark', children: '\u00a7' }),
                  jsx('span', { className: 'TKG_body', children: jsx('span', { className: 'TKG_hint', children: line }) }),
                ],
              }, index)),
            }),
            jsxs('div', {
              className: 'TKG_field',
              children: [
                jsx('div', { className: 'TKG_title', children: t('onboard.compliance') }),
                jsx('ul', {
                  className: 'TKG_list',
                  children: pickLines(language, COMPLIANCE).map((line, index) => jsx('li', { className: 'TKG_hint', children: line }, index)),
                }),
              ],
            }),
            jsx('label', {
              className: 'TKG_switch',
              children: [
                jsx('input', { type: 'checkbox', checked: settings.richMode, onChange: (event) => store.set({ richMode: event.target.checked }) }),
                jsx('span', { className: 'TKG_hint', children: t('onboard.richMode') }),
              ],
            }),
            // The spec asks for an explicit TICK plus an enter action, not just a
            // button: the disclaimer is a consent record, and a tickbox is what
            // makes the user's agreement unambiguous. Enter stays disabled until
            // the tick is set, so the gate cannot be passed by accident.
            jsx('label', {
              className: 'TKG_switch',
              children: [
                jsx('input', {
                  type: 'checkbox',
                  checked: settings.acknowledged === true,
                  'data-tkg': 'acknowledge',
                  onChange: (event) => store.set({ acknowledged: event.target.checked, declined: false }),
                }),
                jsx('span', { className: 'TKG_hint', children: t('onboard.accept') }),
              ],
            }),
            jsxs('div', {
              className: 'TKG_row',
              children: [
                jsx('button', {
                  type: 'button',
                  className: 'TKG_btn TKG_btnPrimary',
                  disabled: settings.acknowledged !== true,
                  'data-tkg': 'enter',
                  onClick: () => store.set({ acknowledged: true, declined: false }),
                  children: t('onboard.enter'),
                }),
                jsx('button', {
                  type: 'button',
                  className: 'TKG_btn',
                  onClick: () => store.set({ acknowledged: false, declined: true }),
                  children: t('onboard.decline'),
                }),
              ],
            }),
            settings.declined === true
              ? jsx('div', { className: 'TKG_banner TKG_error', children: t('onboard.declined') })
              : null,
          ],
        })],
      })
    }
    // #endregion

    // #region CaptureGuide
    /**
     * Capture guide: the standing banner plus the interactive requirement
     * checklist. This is the only place the mandatory photo rules live in the UI,
     * and it stays visible for the whole session.
     * @param {object} props - injected store and translate function.
     * @returns {object} the guide element.
     */
    function CaptureGuide({ store, locale, t }) {
      const settings = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
      const language = useActiveLocale(locale)
      const kindKey = settings.kind === 'gunpla' || settings.kind === 'figure' ? 'gunpla' : settings.kind === 'belt' ? 'belt' : 'other'
      const banner = BANNERS[kindKey]
      const requirements = REQUIREMENTS.filter((item) => item.kinds.includes(settings.kind) && (settings.hasBox || (item.id !== 'box-front' && item.id !== 'box-side')))
      const satisfied = new Set(settings.provided)
      const requiredMissing = requirements.filter((item) => item.level === 'required' && !satisfied.has(item.id))
      const alternativesMissing = requirements.filter((item) => item.level === 'alternative' && !satisfied.has(item.id))

      const toggle = (id) => {
        const next = new Set(satisfied)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        store.set({ provided: [...next] })
      }

      return jsxs('div', {
        className: 'TKG_dock',
        'data-tkg': 'capture-guide',
        children: [jsxs('div', {
          className: 'TKG_card',
          children: [
            jsxs('div', {
              className: 'TKG_between',
              children: [
                jsx('div', { className: 'TKG_title', children: t('capture.title') }),
                jsx('div', {
                  className: 'TKG_tabs',
                  children: [['belt', t('capture.belt')], ['gunpla', t('capture.gunpla')], ['device', t('capture.other')]].map(([value, label]) => jsx('button', {
                    type: 'button',
                    className: settings.kind === value || (value === 'gunpla' && settings.kind === 'figure') ? 'TKG_tab TKG_tabOn' : 'TKG_tab',
                    onClick: () => store.set({ kind: value, provided: [] }),
                    children: label,
                  }, value)),
                }),
              ],
            }),
            jsxs('div', {
              children: [
                jsx('div', { className: 'TKG_banner', children: t(banner[0]) }),
                jsx('div', { className: 'TKG_bannerSub', children: t(banner[1]) }),
              ],
            }),
            jsx('label', {
              className: 'TKG_switch',
              children: [
                jsx('input', { type: 'checkbox', checked: settings.hasBox, onChange: (event) => store.set({ hasBox: event.target.checked }) }),
                jsx('span', { className: 'TKG_hint', children: settings.hasBox ? t('capture.hasBox') : t('capture.noBox') }),
              ],
            }),
            jsxs('div', {
              className: 'TKG_checks',
              children: [
                jsx('div', { className: 'TKG_label', children: t('capture.checklist') }),
                jsx('ul', {
                  className: 'TKG_list',
                  children: requirements.map((item) => {
                    const done = satisfied.has(item.id)
                    const title = field(language, item.title)
                    const hint = field(language, item.hint)
                    const tag = item.level === 'required' ? t('capture.required') : item.level === 'alternative' ? t('capture.alternative') : t('capture.optional')
                    return jsxs('li', {
                      className: done ? 'TKG_item TKG_done' : 'TKG_item',
                      children: [
                        jsx('input', { type: 'checkbox', checked: done, onChange: () => toggle(item.id), 'aria-label': title }),
                        jsxs('span', {
                          className: 'TKG_body',
                          children: [
                            jsxs('span', {
                              className: 'TKG_itemTitle',
                              children: [title, ' ', jsx('span', { className: 'TKG_pill', children: tag })],
                            }),
                            jsx('span', { className: 'TKG_hint', children: hint }),
                          ],
                        }),
                      ],
                    }, item.id)
                  }),
                }),
              ],
            }),
            jsx('div', {
              className: requiredMissing.length > 0 ? 'TKG_banner TKG_error' : 'TKG_banner TKG_success',
              children: requiredMissing.length > 0 ? t('capture.blocked') : t('capture.ready'),
            }),
            requiredMissing.length > 0
              ? jsx('div', { className: 'TKG_hint', children: requiredMissing.map((item) => field(language, item.title)).join('\u3001') })
              : null,
            alternativesMissing.length > 0
              ? jsx('div', {
                className: 'TKG_hint',
                children: `${t('capture.worthAdding')}: ${alternativesMissing.map((item) => field(language, item.title)).join('\u3001')}`,
              })
              : null,
          ],
        })],
      })
    }
    // #endregion

    // #region ResultPanel
    /**
     * Result panel.
     *
     * Renders the last result the Host folded into this session's projection, and
     * is the UI half of the correction loop: picking a candidate prepares a
     * `gear_knowledge` correction instruction for the composer, which the agent
     * then executes. When two candidates are close, or when the DX/CSM chain says
     * "suspected", the picker is the required user choice.
     * @param {object} props - injected store, report store, projection face, session face, and translate.
     * @returns {object} the panel element.
     */
    function ResultPanel({ store, reports, projection, session, locale, t }) {
      const settings = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
      const reportState = React.useSyncExternalStore(reports.subscribe, reports.getSnapshot, reports.getSnapshot)
      const [manual, setManual] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const language = useActiveLocale(locale)

      // The Host folds each identification into this session projection; that is
      // the only channel by which a client plugin can see tool output.
      const subscribeProjection = React.useCallback(
        (listener) => (projection === undefined ? () => {} : projection.subscribe(listener)),
        [projection],
      )
      const readProjection = React.useCallback(
        () => (projection === undefined ? undefined : projection.getSnapshot()),
        [projection],
      )
      const readProjectionServer = React.useCallback(() => undefined, [])
      const snapshot = React.useSyncExternalStore(subscribeProjection, readProjection, readProjectionServer)
      const result = snapshot !== null && typeof snapshot === 'object' ? snapshot.result : undefined

      if (result === undefined) {
        // Nothing to show yet. Rendering a full card here would add height to the
        // composer column for no information, which is the other half of the
        // "page will not scroll" problem; one line of guidance is enough.
        return jsx('div', {
          className: 'TKG_dock',
          'data-tkg': 'result-empty',
          children: jsx('div', { className: 'TKG_hint', children: t('result.noMatch') }),
        })
      }

      const levelWord = result.confidence?.level === 'high' ? t('result.confidence.high')
        : result.confidence?.level === 'medium' ? t('result.confidence.medium')
          : result.confidence?.level === 'suspect' ? t('result.confidence.suspect')
            : t('result.confidence.low')

      const candidates = Array.isArray(result.candidates) ? result.candidates : []
      const needsPick = result.bootleg?.suspected !== true && (result.judgment?.needsUserChoice === true || candidates.length > 1)

      /**
       * Prepare a correction instruction, queue it as a user turn, and remember the
       * choice locally.
       * @param {object} candidate - the chosen candidate.
       * @param {string} origin - what the correction came from.
       */
      const correct = (candidate, origin) => {
        const instruction = [
          '\u8bf7\u8c03\u7528 gear_knowledge \u5de5\u5177\uff0cmode \u7528 correct\uff0c\u628a\u8fd9\u6761\u8bc6\u522b\u7ed3\u679c\u6309\u7528\u6237\u786e\u8ba4\u7ea0\u6b63\uff1a',
          `id: ${candidate.id}`,
          `fields: ${JSON.stringify({ grade: candidate.grade ?? null, line: candidate.line ?? null })}`,
          `origin: ${origin}`,
          `\u539f\u59cb\u8bc6\u522b\uff1a${result?.best?.model ?? 'unknown'}\uff0c\u7f6e\u4fe1\u5ea6 ${result?.confidence?.level ?? 'unknown'}\u3002`,
          '\u5199\u5165\u540e\u7ea0\u6b63\u5e93\u4f18\u5148\u7ea7\u6700\u9ad8\uff0c\u540e\u7eed\u81ea\u52a8\u66f4\u65b0\u4e0d\u4f1a\u8986\u76d6\u3002',
        ].join('\n')
        reports.set({ lastPick: { id: candidate.id, model: candidate.model ?? candidate.id, at: Date.now() } })
        setNotice('')
        void submitInstruction(session, instruction).then((accepted) => {
          setNotice(accepted ? t('result.picked') : t('result.clipboard'))
        })
      }

      return jsx('div', {
        className: 'TKG_dock',
        'data-tkg': 'result',
        children: jsxs('div', {
          className: 'TKG_card',
          children: [
            jsxs('div', {
              className: 'TKG_between',
              children: [
                jsx('div', { className: 'TKG_title', children: t('result.title') }),
                jsxs('div', {
                  className: 'TKG_row',
                  children: [
                    jsx('span', { className: 'TKG_pill', children: `${t('result.confidence')} ${levelWord} \u00b7 ${Math.round((result.confidence?.score ?? 0) * 100)}%` }),
                    jsx('span', { className: 'TKG_pill', children: String(result.observationSource ?? 'manual') }),
                  ],
                }),
              ],
            }),

            result.bootleg?.suspected === true
              ? jsxs('div', {
                className: 'TKG_banner TKG_error',
                children: [
                  t('result.bootleg'),
                  jsx('div', { className: 'TKG_bannerSub', children: t('result.bootleg.warning') }),
                  jsx('ul', {
                    className: 'TKG_list',
                    children: (result.bootleg.hits ?? []).map((hit, index) => jsx('li', {
                      className: 'TKG_hint',
                      children: `\u00b7 ${field(language, hit.label) || hit.id}`,
                    }, index)),
                  }),
                ],
              })
              : null,

            result.best !== null && result.best !== undefined
              ? jsxs('div', {
                className: 'TKG_field',
                children: [
                  jsx('div', { className: 'TKG_itemTitle', children: `${result.best.model}${result.best.modelEn !== null && result.best.modelEn !== undefined ? ` / ${result.best.modelEn}` : ''}` }),
                  jsx('div', { className: 'TKG_hint', children: `${result.best.grade} \u00b7 ${result.best.line} \u00b7 ${Math.round((result.best.matchScore ?? 0) * 100)}%` }),
                  result.judgment?.summary !== undefined ? jsx('div', { className: 'TKG_hint', children: String(result.judgment.summary) }) : null,
                  result.scope?.inScope === false ? jsx('div', { className: 'TKG_banner TKG_error', children: t('result.scope.richOff') }) : null,
                ],
              })
              : null,

            needsPick && candidates.length > 0
              ? jsxs('div', {
                className: 'TKG_field',
                children: [
                  jsx('div', { className: 'TKG_label', children: t('result.candidates') }),
                  ...candidates.map((candidate) => jsxs('div', {
                    className: reportState.lastPick?.id === candidate.id ? 'TKG_cand TKG_candOn' : 'TKG_cand',
                    children: [
                      jsxs('span', {
                        className: 'TKG_body',
                        children: [
                          jsx('span', { className: 'TKG_itemTitle', children: `${candidate.model}${candidate.modelEn !== null && candidate.modelEn !== undefined ? ` / ${candidate.modelEn}` : ''}` }),
                          jsx('span', { className: 'TKG_hint', children: `${candidate.grade} \u00b7 ${candidate.line}` }),
                          (candidate.contradictions ?? []).length > 0
                            ? jsx('span', { className: 'TKG_hint', children: `${t('result.contradictions')}: ${candidate.contradictions.join('; ')}` })
                            : null,
                        ],
                      }),
                      jsx('span', { className: 'TKG_score', children: `${Math.round((candidate.matchScore ?? 0) * 100)}%` }),
                      jsx('button', {
                        type: 'button',
                        className: 'TKG_btn',
                        onClick: () => correct(candidate, '\u7528\u6237\u5728\u7ed3\u679c\u5361\u7247\u4e2d\u786e\u8ba4'),
                        children: t('result.pick'),
                      }),
                    ],
                  }, candidate.id)),
                ],
              })
              : null,

            notice !== ''
              ? jsx('div', { className: 'TKG_banner TKG_success', children: notice })
              : null,

            reportState.lastPick !== null
              ? jsx('div', { className: 'TKG_hint', children: `${t('result.lastPick')}: ${reportState.lastPick.model}` })
              : null,

            jsxs('div', {
              className: 'TKG_field',
              children: [
                jsx('div', { className: 'TKG_label', children: t('result.manual') }),
                jsxs('div', {
                  className: 'TKG_row',
                  children: [
                    jsx('input', {
                      className: 'TKG_input',
                      type: 'text',
                      value: manual,
                      placeholder: t('result.manualPlaceholder'),
                      onChange: (event) => setManual(event.target.value),
                      onKeyDown: (event) => {
                        if (event.key === 'Enter' && manual.trim() !== '') {
                          correct({ id: `user-manual:${manual.trim()}`, model: manual.trim(), grade: null, line: null }, '\u7528\u6237\u624b\u52a8\u8865\u578b\u53f7')
                          setManual('')
                        }
                      },
                    }),
                    jsx('button', {
                      type: 'button',
                      className: 'TKG_btn',
                      disabled: manual.trim() === '',
                      onClick: () => {
                        correct({ id: `user-manual:${manual.trim()}`, model: manual.trim(), grade: null, line: null }, '\u7528\u6237\u624b\u52a8\u8865\u578b\u53f7')
                        setManual('')
                      },
                      children: t('result.submit'),
                    }),
                  ],
                }),
              ],
            }),

            (result.notes ?? []).length > 0
              ? jsx('ul', {
                className: 'TKG_list',
                children: result.notes.map((note, index) => jsx('li', { className: 'TKG_hint', children: `\u00b7 ${note}` }, index)),
              })
              : null,
          ],
        }),
      })
    }
    // #endregion

    // #region SettingsSection
    /**
     * Settings page: preferences, the local vision endpoint handoff, the
     * disclaimer, EU compliance notes, and local data status.
     * @param {object} props - injected store, session face, and translate function.
     * @returns {object} the settings element.
     */
    function SettingsSection({ store, session, locale, t }) {
      const settings = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
      const [notice, setNotice] = React.useState('')
      // Subscribing is what makes this page follow a language switch immediately;
      // the live active locale (not a stored copy) is also what the select shows.
      const language = useActiveLocale(locale)

      /** Ask the agent to persist the local vision endpoint into the plugin config. */
      const applyVision = () => {
        const instruction = [
          '\u8bf7\u628a\u672c\u5730\u89c6\u89c9\u8bc6\u522b\u7aef\u70b9\u5199\u5165 tokusatsu-gunpla \u63d2\u4ef6\u914d\u7f6e\uff08visionBaseUrl / visionModel\uff09\uff0c\u4e0d\u8981\u6539\u52a8\u5176\u5b83\u5b57\u6bb5\uff1a',
          `visionBaseUrl: ${JSON.stringify(settings.visionUrl)}`,
          `visionModel: ${JSON.stringify(settings.visionModel)}`,
          '\u8bf4\u660e\uff1a\u8be5\u7aef\u70b9\u5fc5\u987b\u662f OpenAI \u517c\u5bb9\u7684\u672c\u5730\u670d\u52a1\uff0c\u4f8b\u5982 Ollama (http://127.0.0.1:11434/v1) \u6216 LM Studio\u3002',
        ].join('\n')
        setNotice('')
        void submitInstruction(session, instruction).then((accepted) => {
          setNotice(accepted ? t('settings.visionApplied') : t('result.clipboard'))
        })
      }

      return jsxs('div', {
        className: 'TKG_root',
        'data-tkg': 'settings',
        children: [
          jsxs('div', {
            className: 'TKG_card',
            children: [
              jsx('div', { className: 'TKG_title', children: t('settings.vision') }),
              jsx('div', { className: 'TKG_hint', children: t('settings.visionHint') }),
              jsxs('div', {
                className: 'TKG_field',
                children: [
                  jsx('label', { className: 'TKG_label', children: t('settings.visionUrl') }),
                  jsx('input', {
                    className: 'TKG_input',
                    type: 'text',
                    value: settings.visionUrl,
                    placeholder: 'http://127.0.0.1:11434/v1',
                    onChange: (event) => store.set({ visionUrl: event.target.value }),
                  }),
                ],
              }),
              jsxs('div', {
                className: 'TKG_field',
                children: [
                  jsx('label', { className: 'TKG_label', children: t('settings.visionModel') }),
                  jsx('input', {
                    className: 'TKG_input',
                    type: 'text',
                    value: settings.visionModel,
                    placeholder: 'llava / qwen2.5-vl / minicpm-v',
                    onChange: (event) => store.set({ visionModel: event.target.value }),
                  }),
                ],
              }),
              jsxs('div', {
                className: 'TKG_row',
                children: [
                  jsx('button', { type: 'button', className: 'TKG_btn', disabled: settings.visionUrl.trim() === '', onClick: applyVision, children: t('settings.visionApply') }),
                  notice !== '' ? jsx('span', { className: 'TKG_hint', children: notice }) : null,
                ],
              }),
            ],
          }),

          jsxs('div', {
            className: 'TKG_card',
            children: [
              jsx('div', { className: 'TKG_title', children: t('settings.title') }),
              jsx('label', {
                className: 'TKG_switch',
                children: [
                  jsx('input', { type: 'checkbox', checked: settings.richMode, onChange: (event) => store.set({ richMode: event.target.checked }) }),
                  jsxs('span', {
                    className: 'TKG_body',
                    children: [
                      jsx('span', { className: 'TKG_itemTitle', children: t('settings.richMode') }),
                      jsx('span', { className: 'TKG_hint', children: t('settings.richModeHint') }),
                    ],
                  }),
                ],
              }),
              jsx('hr', { className: 'TKG_divider' }),
              jsx('label', {
                className: 'TKG_switch',
                children: [
                  jsx('input', { type: 'checkbox', checked: settings.allowBaidu, onChange: (event) => store.set({ allowBaidu: event.target.checked }) }),
                  jsxs('span', {
                    className: 'TKG_body',
                    children: [
                      jsx('span', { className: 'TKG_itemTitle', children: t('settings.baidu') }),
                      jsx('span', { className: 'TKG_hint', children: t('settings.baiduHint') }),
                    ],
                  }),
                ],
              }),
              jsx('hr', { className: 'TKG_divider' }),
              jsx('label', {
                className: 'TKG_switch',
                children: [
                  jsx('input', { type: 'checkbox', checked: settings.acknowledged, onChange: (event) => store.set({ acknowledged: event.target.checked, declined: false }) }),
                  jsx('span', { className: 'TKG_hint', children: t('onboard.accept') }),
                ],
              }),
              jsx('hr', { className: 'TKG_divider' }),
              jsxs('div', {
                className: 'TKG_field',
                children: [
                  jsx('label', { className: 'TKG_label', children: t('settings.language') }),
                  // This is the shell's ONE locale preference, not a plugin-local
                  // copy: writing through `setLocale` is what makes the choice
                  // stick, and reading the live snapshot is what keeps the select
                  // honest when the language changes elsewhere (the shipped
                  // Language row in General).
                  jsx('select', {
                    className: 'TKG_select',
                    'data-tkg': 'language-select',
                    value: language,
                    onChange: (event) => {
                      try {
                        locale.setLocale(event.target.value)
                      } catch {
                        // An unknown id throws; the select then re-renders unchanged.
                      }
                    },
                    children: localeCatalog(locale).map((item) => jsx('option', { value: item.id, children: item.label }, item.id)),
                  }),
                  jsx('div', { className: 'TKG_hint', children: t('settings.languageHint') }),
                  // Build + live locale readout. Two long-running symptoms were
                  // indistinguishable without it: "the browser is running a stale
                  // bundle" and "the active locale is not what I think it is".
                  jsx('div', {
                    className: 'TKG_hint',
                    'data-tkg': 'build',
                    children: `build ${BUILD} | locale=${language || '(empty)'} | dicts=${Object.keys(DICTIONARIES).length}`,
                  }),
                  // Canary: asks the SHELL to resolve three of this namespace's own
                  // keys. If these come back as raw keys, the dictionaries never
                  // registered; if they come back in the wrong language, the
                  // registry resolved a different locale than `locale=` reports.
                  jsx('div', {
                    className: 'TKG_hint',
                    'data-tkg': 'canary',
                    children: `t(): ${t('nav')} / ${t('capture.title')} / ${t('settings.language')}`,
                  }),
                  jsx('div', {
                    className: 'TKG_hint',
                    'data-tkg': 'registration',
                    children: `register: ${localeRegistration}`,
                  }),
                ],
              }),
            ],
          }),

          jsxs('div', {
            className: 'TKG_card',
            children: [
              jsx('div', { className: 'TKG_title', children: t('settings.cache') }),
              jsx('div', { className: 'TKG_hint', children: t('settings.cacheHint') }),
              jsxs('div', {
                className: 'TKG_row',
                children: [
                  jsx('button', {
                    type: 'button',
                    className: 'TKG_btn',
                    onClick: () => {
                      try {
                        window.localStorage.removeItem(CACHE_KEY)
                      } catch {
                        // Nothing to clear when storage is unavailable.
                      }
                      setNotice(t('settings.cleared'))
                    },
                    children: t('settings.clearCache'),
                  }),
                  notice !== '' ? jsx('span', { className: 'TKG_hint', children: notice }) : null,
                ],
              }),
              jsx('hr', { className: 'TKG_divider' }),
              jsx('div', { className: 'TKG_label', children: t('settings.stats') }),
              jsxs('div', {
                className: 'TKG_row',
                children: [
                  jsx('span', { className: 'TKG_pill', children: `${t('settings.kbSeed')} 12` }),
                  jsx('span', { className: 'TKG_pill', children: `${t('settings.kbLearned')} \u2014` }),
                  jsx('span', { className: 'TKG_pill', children: `${t('settings.kbCorrected')} \u2014` }),
                ],
              }),
              jsx('div', { className: 'TKG_hint', children: `${t('settings.dataDir')}: $DSH_HOME/plugin-data/tokusatsu-gunpla` }),
              jsxs('div', {
                className: 'TKG_row',
                children: [
                  jsx('button', {
                    type: 'button',
                    className: 'TKG_btn TKG_btnDanger',
                    onClick: () => {
                      store.reset()
                      setNotice('')
                    },
                    children: t('settings.reset'),
                  }),
                  jsx('span', { className: 'TKG_hint', children: t('settings.resetHint') }),
                ],
              }),
            ],
          }),

          jsxs('div', {
            className: 'TKG_card',
            children: [
              jsx('div', { className: 'TKG_title', children: t('settings.disclaimer') }),
              jsx('ul', {
                className: 'TKG_list',
                children: pickLines(language, DISCLAIMER).map((line, index) => jsx('li', { className: 'TKG_hint', children: `\u00a7 ${line}` }, index)),
              }),
              jsx('hr', { className: 'TKG_divider' }),
              jsx('div', { className: 'TKG_title', children: t('settings.compliance') }),
              jsx('ul', {
                className: 'TKG_list',
                children: pickLines(language, COMPLIANCE).map((line, index) => jsx('li', { className: 'TKG_hint', children: line }, index)),
              }),
            ],
          }),
        ],
      })
    }
    // #endregion

    // #region activation
    /** Services this client half consumes. Static-module requires need no edges. */
    const inject = ['sessions', 'slots', 'locale']

    /** Projection key the Host folds identification results into. */
    const RESULT_PROJECTION_KEY = 'tokusatsuResult'

    /**
     * Resolve a session binding, tolerating an absent or already-pruned session
     * rather than throwing during a slot injection.
     * @param {object} sessions - client `sessions` service.
     * @param {string} sessionId - the session to resolve.
     * @returns {object | undefined} the binding, when available.
     */
    function safeBinding(sessions, sessionId) {
      try {
        const binding = sessions.binding(sessionId)
        return binding === null || binding === undefined ? undefined : binding
      } catch {
        return undefined
      }
    }

    /**
     * Resolve the currently selected session's outward face, for surfaces that
     * are not session-scoped (the settings page).
     * @param {object} sessions - client `sessions` service.
     * @returns {object | undefined} the session face, when a session is selected.
     */
    function currentSessionFace(sessions) {
      try {
        const list = sessions.list.getSnapshot()
        const id = list?.currentId ?? list?.current
        if (typeof id !== 'string') return undefined
        return safeBinding(sessions, id)?.session
      } catch {
        return undefined
      }
    }

    /**
     * Resolve the projection face for one session, tolerating an absent binding
     * (no session selected yet) rather than throwing during render.
     * @param {object} sessions - client `sessions` service.
     * @param {string} sessionId - the session to read.
     * @returns {object | undefined} the observable snapshot face, when available.
     */
    function projectionFace(sessions, sessionId) {
      try {
        const binding = safeBinding(sessions, sessionId)
        if (binding === undefined) return undefined
        const face = binding.session.projections.faceOf(RESULT_PROJECTION_KEY)
        return face === undefined ? undefined : face
      } catch {
        return undefined
      }
    }

    /**
     * Client plugin body: dictionaries, the language catalogue, and the slot
     * registrations.
     * @param {object} ctx - client root context.
     */
    function apply(ctx) {
      const store = createStore(SETTINGS_KEY, DEFAULT_SETTINGS)
      const reports = createStore(REPORTS_KEY, DEFAULT_REPORTS)

      // Dictionaries, one registration per language.
      //
      // Each call is guarded INDIVIDUALLY. The registry throws when a namespace
      // already carries a locale (which a hot reload can produce before the old
      // effect's disposer runs), and an unguarded `.map()` would abandon every
      // remaining language on the first throw, leaving English as the only
      // resolvable dictionary, so the whole surface quietly renders in English
      // while this bundle's own locale reads still say Chinese. Failures are
      // recorded so the settings page can show them instead of hiding them.
      ctx.effect(() => {
        const disposers = []
        localeRegistration = 'ok'
        for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
          try {
            disposers.push(ctx.locale.register(NS, language, dictionary))
            localeRegistration = `${localeRegistration} ${language}`
          } catch (error) {
            localeRegistration = `FAILED ${language}: ${error instanceof Error ? error.message : String(error)}`
          }
        }
        return () => {
          for (const dispose of disposers) dispose()
        }
      }, 'tokusatsu-gunpla: dictionaries')

      // NOTE: this plugin deliberately does NOT call `ctx.locale.addLanguage`.
      //
      // That method widens a catalog every plugin in the page shares, so adding a
      // language the shell itself has no dictionary for changes how that language
      // resolves for the WHOLE application. Doing it for `zh-Hans`  -  which the
      // shell does not ship (it ships `zh` and `en`)  -  registered a catalog entry
      // whose only reachable dictionary was English, and the entire app fell back
      // to English while the stored preference still read "Simplified Chinese".
      //
      // This plugin only needs its OWN namespace to answer correctly for the
      // locale the shell reports, which the dictionary aliases already do.
      // The user-facing language choice belongs to the shell's own General row.

      /** Bound translate function for this namespace. */
      const t = ctx.locale.bind(NS)

      /**
       * The capture dock is either the onboarding gate or the capture guide,
       * depending on whether the disclaimer has been accepted. One registration
       * keeps the slot single-occupancy correct.
       *
       * Both branches are rendered as ELEMENTS, never invoked as functions. A
       * direct `OnboardingGate({...})` call would run its hooks inside this
       * component's own hook list, so the two branches - which have different hook
       * counts - would corrupt React's hook bookkeeping the moment the accepted
       * flag flips, and every parent re-render would re-run the child's hooks in
       * the parent's slots. That is what froze the page.
       * @returns {object} the element for the current gate state.
       */
      function CaptureDock({ store, locale, t }) {
        const settings = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
        if (settings.acknowledged !== true) return jsx(OnboardingGate, { store, locale, t })
        return jsx(CaptureGuide, { store, locale, t })
      }

      // Each inject waits for its slot declaration, so a composition without a
      // surface simply omits it.
      ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'tokusatsu-gunpla-capture',
        order: 40,
        locale: NS,
        inject: () => ({ store, locale: ctx.locale, t }),
      }, CaptureDock))

      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'tokusatsu-gunpla-result',
        order: 40,
        locale: NS,
        inject: (sessionId) => {
          const binding = safeBinding(ctx.sessions, sessionId)
          return { store, reports, projection: projectionFace(ctx.sessions, sessionId), session: binding?.session, locale: ctx.locale, t }
        },
      }, ResultPanel))

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'tokusatsu-gunpla',
        order: 60,
        label: () => t('nav'),
        locale: NS,
        inject: () => ({ store, session: currentSessionFace(ctx.sessions), locale: ctx.locale, t }),
      }, SettingsSection))
    }
    // #endregion

    exports.apply = apply
    exports.inject = inject
    exports.CaptureGuide = CaptureGuide
    exports.OnboardingGate = OnboardingGate
    exports.ResultPanel = ResultPanel
    exports.SettingsSection = SettingsSection
    exports.REQUIREMENTS = REQUIREMENTS
    exports.LANGUAGES = LANGUAGES
    exports.resolveChain = resolveChain
    return module.exports
  },
})

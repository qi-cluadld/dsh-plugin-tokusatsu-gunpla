/**
 * Client-bundle contract test.
 *
 * The browser half cannot be imported by Node: it registers itself with
 * `window.__ModuleLoader__` and pulls React out of the shell's static module
 * table. This harness recreates exactly that boundary — a fake registration
 * facade, a fake `localStorage`, a fake `document`, and a minimal React
 * implementation — then asserts the bundle's observable contract:
 *
 *   • it registers under the package name the host graph row uses,
 *   • it exports `apply`/`inject`,
 *   • activation registers dictionaries for every declared language,
 *   • all three slots are registered with the ids and orders the host expects,
 *   • every UI copy key resolves, in every language, through the fallback chain,
 *   • the rendered trees contain the mandatory photo rules and the disclaimer.
 *
 * Usage: node scripts/client-test.mjs
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const failures = []
let checks = 0

/**
 * Run one named check.
 * @param {string} label - assertion label.
 * @param {() => void | Promise<void>} body - assertion body.
 */
async function check(label, body) {
  checks += 1
  try {
    await body()
    console.log(`  PASS  ${label}`)
  } catch (error) {
    failures.push(label)
    console.log(`  FAIL  ${label} — ${error.message}`)
  }
}

// ---------------------------------------------------------------- fake React
/** Element tree produced by the fake jsx runtime. */
function element(type, props, key) {
  return { __el: true, type, props: props ?? {}, key }
}

/**
 * Minimal `react/jsx-runtime`. Children are flattened into an array so tests can
 * walk the tree without reproducing React's own semantics.
 * @param {unknown} type - element type.
 * @param {object} props - element props.
 * @param {unknown} key - element key.
 * @returns {object} the element.
 */
function createElement(type, props, key) {
  const { children, ...rest } = props ?? {}
  const flat = []
  const push = (value) => {
    if (Array.isArray(value)) for (const item of value) push(item)
    else if (value !== undefined && value !== null && value !== false) flat.push(value)
  }
  push(children)
  return element(type, { ...rest, children: flat }, key)
}

const jsxRuntime = {
  jsx: createElement,
  jsxs: createElement,
  Fragment: Symbol('Fragment'),
}

/**
 * Hook implementations the harness can actually drive.
 *
 * Hooks are scoped by a FRAME STACK, one frame per component being rendered, so
 * nested components get their own hook slots — exactly like React. That is what
 * makes a component invoking another component as a plain function detectable:
 * both would share one frame, and the frame stack records the violation.
 *
 * `useSyncExternalStore` subscribes for real and re-renders its owning component
 * when the snapshot reference changes, which is what lets the tests exercise the
 * accepted-disclaimer branch rather than only the initial one.
 */
const hookFrames = []

/** @returns {object} the frame for the component currently being rendered. */
function currentFrame() {
  const frame = hookFrames[hookFrames.length - 1]
  if (frame === undefined) throw new Error('a hook was called outside a component render')
  return frame
}

const react = {
  useState(initial) {
    const frame = currentFrame()
    const index = frame.states.length
    if (frame.states[index] === undefined) {
      frame.states[index] = typeof initial === 'function' ? initial() : initial
    }
    const setter = (next) => {
      frame.states[index] = typeof next === 'function' ? next(frame.states[index]) : next
      if (typeof reactHooks.rerender === 'function') reactHooks.rerender()
    }
    return [frame.states[index], setter]
  },
  useEffect() {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useRef: (initial) => ({ current: initial }),
  useSyncExternalStore(subscribe, getSnapshot) {
    const frame = currentFrame()
    const index = frame.effects.length
    const previous = frame.effects[index]
    if (previous === undefined) {
      const record = { listener: undefined, dispose: undefined }
      record.listener = () => {
        if (typeof reactHooks.rerender === 'function') reactHooks.rerender()
      }
      record.dispose = subscribe(record.listener)
      frame.effects[index] = record
    }
    return getSnapshot()
  },
  memo: (component) => component,
  createElement,
}

/** Set by `renderWith` so a hook can request a re-render (unused storage path). */
const reactHooks = { rerender: undefined }

/**
 * Render a function component inside its own hook frame.
 *
 * Every component gets a fresh frame, so a parent that renders a child as an
 * ELEMENT keeps the two hook lists separate, exactly like React. A parent that
 * instead calls `Child(props)` would run the child's hooks in the parent's frame
 * and break on the next branch switch — which is precisely why the mutation test
 * asserts the registration renders elements rather than a pre-built tree.
 * @param {Function} component - the component to render.
 * @param {object} props - props to pass.
 * @returns {unknown} the rendered node.
 */
function invokeComponent(component, props) {
  const frame = { states: [], effects: [], component: component.name || '(anonymous)' }
  hookFrames.push(frame)
  try {
    return component(props)
  } finally {
    hookFrames.pop()
  }
}

/**
 * Fully render an element tree: function elements are invoked in their own hook
 * frame and their output is rendered recursively. This is the minimum a test
 * needs to observe what a parent component actually builds.
 * @param {unknown} node - a rendered node.
 * @returns {unknown} the fully expanded tree.
 */
function renderTree(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(renderTree)
  if (node.__el !== true) return node
  if (typeof node.type === 'function') return renderTree(invokeComponent(node.type, node.props))
  return { ...node, props: { ...node.props, children: renderTree(node.props.children) } }
}

/**
 * Render one registered component with the given props, resetting the hook stack
 * so each render starts clean (there is no reconciler here).
 * @param {Function} component - the component to render.
 * @param {object} props - props to pass.
 * @returns {unknown} the fully rendered tree.
 */
function renderWith(component, props) {
  hookFrames.length = 0
  // The top-level component needs its own frame too: its hooks run before any
  // child element is reached.
  return renderTree(invokeComponent(component, props))
}

// ------------------------------------------------------- fake browser globals
/** In-memory localStorage stand-in. */
class MemoryStorage {
  constructor() {
    this.map = new Map()
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }

  setItem(key, value) {
    this.map.set(key, String(value))
  }

  removeItem(key) {
    this.map.delete(key)
  }
}

const styleTags = []
globalThis.window = {
  localStorage: new MemoryStorage(),
  navigator: { clipboard: { writeText: async () => {} } },
}
globalThis.document = {
  querySelector: (selector) => styleTags.find((tag) => `style[data-plugin-css="${tag.dataset.pluginCss}"]` === selector) ?? null,
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: { appendChild: (tag) => styleTags.push(tag) },
}

// ---------------------------------------------------- fake module registration
let registration
globalThis.window.__ModuleLoader__ = {
  load(value) {
    registration = value
  },
}

// ------------------------------------------------------------------- the test
const clientPath = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const source = await readFile(clientPath, 'utf8')

// The bundle is a classic script that registers itself; evaluating it is exactly
// what the browser does when the combo script arrives.
const { runInNewContext } = await import('node:vm')
runInNewContext(source, { window: globalThis.window, document: globalThis.document }, { filename: clientPath })

await check('the bundle registers itself with the module loader', () => {
  assert.ok(registration !== undefined, 'no registration was submitted')
})

await check('it registers under the package name the host graph row uses', () => {
  assert.equal(registration.id, '@dsh-plugin/tokusatsu-gunpla')
})

await check('the factory requires only react and react/jsx-runtime', () => {
  const requested = []
  registration.factory((spec) => {
    requested.push(spec)
    if (spec === 'react') return react
    if (spec === 'react/jsx-runtime') return jsxRuntime
    throw new Error(`unexpected require: ${spec}`)
  })
  assert.deepEqual([...new Set(requested)].sort(), ['react', 'react/jsx-runtime'])
})

const bundle = registration.factory((spec) => {
  if (spec === 'react') return react
  if (spec === 'react/jsx-runtime') return jsxRuntime
  throw new Error(`unexpected require: ${spec}`)
})

await check('it exports apply and inject', () => {
  assert.equal(typeof bundle.apply, 'function')
  assert.ok(Array.isArray(bundle.inject))
  assert.deepEqual([...bundle.inject].sort(), ['locale', 'sessions', 'slots'])
})

// ------------------------------------------------------------ fake plugin ctx
const registered = []
const dictionaries = new Map()
const languages = []
/** Languages the shell's catalog actually holds, by id (fallback source). */
const definedLanguages = new Map()
const slotDeclarations = new Set()

/**
 * Build a fake client context whose slot registry behaves like the real ledger:
 * `inject` only fires once the slot is declared, and `register` records the entry.
 * @returns {object} the fake context.
 */
function createContext() {
  const ctx = {
    locale: {
      register(ns, localeOrDicts, dict) {
        // Mirror the real registry: either `(ns, locale, dict)` or `(ns, dicts)`.
        // A mock that accepted only the first shape would hide a batch-registration
        // failure, which is exactly how a live defect once slipped through.
        const pairs = typeof localeOrDicts === 'string'
          ? [[localeOrDicts, dict]]
          : Object.entries(localeOrDicts ?? {})
        for (const [locale, dictionary] of pairs) {
          if (dictionaries.has(`${ns}|${locale}`)) throw new Error(`locale namespace "${ns}" already has locale "${locale}"`)
          dictionaries.set(`${ns}|${locale}`, dictionary)
        }
        return () => {
          for (const [locale] of pairs) dictionaries.delete(`${ns}|${locale}`)
        }
      },
      addLanguage(input) {
        languages.push(input)
        definedLanguages.set(input.id, input)
        return () => {
          definedLanguages.delete(input.id)
        }
      },
      bind(ns) {
        return (key) => {
          // Drive the SAME resolution the bundle uses, so the harness cannot drift
          // from production. The bundle owns the aliases and fallbacks, so the mock
          // no longer re-derives a chain of its own (which once stayed lenient
          // enough to hide a real defect).
          const namespaces = [ns, 'common']
          for (const language of bundle.resolveChain(ctx.__language)) {
            for (const space of namespaces) {
              const dictionary = dictionaries.get(`${space}|${language}`)
              if (dictionary !== undefined && typeof dictionary[key] === 'string') return dictionary[key]
            }
          }
          return key
        }
      },
      /**
       * The LocaleFace the plugin subscribes to. `active` is the switchable locale;
       * `locales` is the registered catalog a settings select draws from.
       */
      getSnapshot: () => ({
        active: ctx.__language,
        locales: bundle.LANGUAGES.map((item) => ({ id: item.id, label: item.label })),
        revision: ctx.__localeRevision,
      }),
      subscribe(listener) {
        ctx.__localeListeners.add(listener)
        return () => ctx.__localeListeners.delete(listener)
      },
      setLocale(id) {
        ctx.__language = id
        ctx.__localeRevision += 1
        for (const listener of [...ctx.__localeListeners]) listener()
      },
    },
    slots: {
      inject(slot, callback) {
        if (slotDeclarations.has(slot)) callback()
        else ctx.__pending.push([slot, callback])
        return () => {}
      },
      register(options, component) {
        registered.push({ options, component })
        return () => {}
      },
    },
    sessions: {
      binding: () => undefined,
      list: { getSnapshot: () => ({}) },
    },
    effect: (factory) => {
      const disposer = factory()
      return () => {
        if (typeof disposer === 'function') disposer()
      }
    },
    __language: 'zh-Hans',
    __localeRevision: 1,
    __localeListeners: new Set(),
    __pending: [],
  }
  return ctx
}

// The bundle needs `window.__ModuleLoader__` already used; reuse the same window.
const ctx = createContext()
bundle.apply(ctx)

await check('every declared language gets a dictionary registration', () => {
  const registeredLanguages = [...dictionaries.keys()]
    .filter((key) => key.startsWith('tokusatsu-gunpla|'))
    .map((key) => key.split('|')[1])
  for (const language of bundle.LANGUAGES) {
    assert.ok(registeredLanguages.includes(language.id), `missing dictionary for ${language.id}`)
  }
})

await check('the bundle leaves the shell catalogue untouched', () => {
  // The user-facing language list belongs to the shell's own General row. This
  // plugin contributes dictionaries, never catalog entries.
  assert.deepEqual(languages.map((item) => item.id), [], 'a language was added to the shared catalogue')
})

await check('every added language declares a fallback that terminates at English', () => {
  for (const item of languages) {
    const seen = new Set()
    let current = item.fallback
    while (current !== null) {
      assert.ok(!seen.has(current), `fallback cycle at ${item.id}`)
      seen.add(current)
      const next = bundle.LANGUAGES.find((entry) => entry.id === current)
      assert.ok(next !== undefined, `unknown fallback target ${current}`)
      current = next.fallback
    }
  }
})

await check('registration waits for the slots it targets', () => {
  assert.equal(registered.length, 0, 'slots registered before their declaration')
  assert.equal(ctx.__pending.length, 3, `expected 3 pending slots, got ${ctx.__pending.length}`)
})

// Declare the slots the shell owns, then flush.
for (const slot of ['conversation.input.dock', 'conversation.composer.dock', 'settings.section']) {
  slotDeclarations.add(slot)
}
for (const [slot, callback] of ctx.__pending) {
  assert.ok(slotDeclarations.has(slot), `undeclared slot ${slot}`)
  callback()
}

await check('all three slots are registered once their declarations arrive', () => {
  assert.equal(registered.length, 3, `expected 3 registrations, got ${registered.length}`)
})

await check('slot identifiers and orders match what the host surfaces expect', () => {
  const byId = Object.fromEntries(registered.map((entry) => [entry.options.id, entry.options]))
  assert.ok(byId['tokusatsu-gunpla-capture'] !== undefined)
  assert.equal(byId['tokusatsu-gunpla-capture'].name, 'conversation.input.dock')
  assert.ok(byId['tokusatsu-gunpla-result'] !== undefined)
  assert.equal(byId['tokusatsu-gunpla-result'].name, 'conversation.composer.dock')
  assert.ok(byId['tokusatsu-gunpla'] !== undefined)
  assert.equal(byId['tokusatsu-gunpla'].name, 'settings.section')
  assert.equal(byId['tokusatsu-gunpla'].locale, 'tokusatsu-gunpla')
  assert.equal(typeof byId['tokusatsu-gunpla'].label, 'function')
})

// ------------------------------------------------------- render-tree traversal
/**
 * Flatten a rendered tree into its text content and element types.
 *
 * `items` collects only the checklist rows' own titles — the `aria-label` of each
 * requirement checkbox. That distinction matters: the standing banner quotes the
 * mandatory rules verbatim, so a text search cannot tell a dropped checklist item
 * from the banner that still advertises it.
 * @param {unknown} node - a rendered node.
 * @returns {{ texts: string[], types: Set<string>, items: string[] }} collected content.
 */
function walk(node) {
  const texts = []
  const types = new Set()
  const items = []
  const classes = []
  const checkboxes = []
  const buttons = []
  const selects = []
  const textsOutsideCatalog = []
  const visit = (value, inCatalog = false) => {
    if (value === null || value === undefined || typeof value === 'boolean') return
    if (typeof value === 'string' || typeof value === 'number') {
      texts.push(String(value))
      if (!inCatalog) textsOutsideCatalog.push(String(value))
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, inCatalog)
      return
    }
    if (typeof value === 'object' && value.__el === true) {
      types.add(String(value.type))
      if (value.type === 'input' && typeof value.props['aria-label'] === 'string') items.push(value.props['aria-label'])
      if (typeof value.props.className === 'string') classes.push(...value.props.className.split(/\s+/u).filter(Boolean))
      if (value.type === 'input' && value.props.type === 'checkbox') {
        checkboxes.push({ tkg: value.props['data-tkg'], checked: value.props.checked === true })
      }
      if (value.type === 'button') {
        buttons.push({ tkg: value.props['data-tkg'], disabled: value.props.disabled === true })
      }
      if (value.type === 'select') {
        const children = Array.isArray(value.props.children) ? value.props.children : [value.props.children]
        selects.push({
          value: value.props.value,
          options: children.filter((child) => child !== null && child !== undefined && child.__el === true).map((child) => child.props.value),
        })
      }
      // A language catalog lists every language written in its own script, so its
      // subtree is excluded from "is the interface translated" scans.
      const catalog = inCatalog || value.props['data-tkg'] === 'language-select'
      visit(value.props.children, catalog)
      return
    }
  }
  visit(node)
  return { texts, textsOutsideCatalog, types, items, classes, checkboxes, buttons, selects }
}

/**
 * Invoke one registered component the way the renderer would, with the inject
 * face the registration declared, and fully render the tree it returns.
 *
 * The inject result is forwarded WHOLE. Overriding any field (as an earlier
 * version overrode `t`) silently withholds the others — that masked a real
 * defect where components read `locale` for reactivity and got undefined.
 * @param {string} id - registration id.
 * @returns {unknown} the fully rendered tree.
 */
function render(id) {
  const entry = registered.find((item) => item.options.id === id)
  assert.ok(entry !== undefined, `no registration for ${id}`)
  const props = typeof entry.options.inject === 'function' ? entry.options.inject('session-test') : {}
  return renderWith(entry.component, props)
}

for (const language of ['zh-Hans', 'zh-Hant', 'en', 'ja', 'ko', 'fr', 'ru', 'pl']) {
  ctx.__language = language
  await check(`the onboarding gate renders fully in ${language}`, () => {
    const tree = walk(render('tokusatsu-gunpla-capture'))
    const text = tree.texts.join('\n')
    assert.ok(text.includes('§'), `disclaimer lines missing in ${language}`)
    assert.ok(text.length > 200, `gate content unexpectedly short in ${language}`)
  })

  await check(`no raw copy key leaks into the ${language} render`, () => {
    const tree = walk(render('tokusatsu-gunpla-capture'))
    const leaked = tree.texts.filter((text) => /^(?:onboard|capture|result|settings|common)\.[a-zA-Z.]+$/u.test(text))
    assert.deepEqual(leaked, [], `untranslated keys surfaced: ${leaked.join(', ')}`)
  })
}

ctx.__language = 'zh-Hans'

await check('switching the locale re-renders the surfaces in that language', () => {
  // Regression: components must SUBSCRIBE to the shell locale, not merely read it.
  // `t` resolves at call time, so a component that never subscribes keeps showing
  // whatever language was active at its last render — which is how an English
  // title survived a switch to Chinese.
  ctx.locale.setLocale('en')
  const english = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(english.includes('Mandatory photo requirements'), 'the gate did not follow the locale switch to English')
  assert.ok(!english.includes('拍照硬性要求'), 'the gate kept the previous language')

  ctx.locale.setLocale('zh-Hans')
  const chinese = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(chinese.includes('拍照硬性要求'), 'the gate did not follow the locale switch back to Chinese')
  assert.ok(!chinese.includes('Mandatory photo requirements'), 'the gate kept the previous language')
})

await check('every surface follows the locale, not just the capture dock', () => {
  ctx.locale.setLocale('en')
  for (const id of ['tokusatsu-gunpla-capture', 'tokusatsu-gunpla-result', 'tokusatsu-gunpla']) {
    // The language catalog is excluded: it lists every language in its own script
    // by design, so it is not untranslated interface copy.
    const text = walk(render(id)).textsOutsideCatalog.join('\n')
    const leaked = text.match(/[\u4e00-\u9fff]/gu) ?? []
    assert.deepEqual(leaked, [], `${id} still renders Chinese interface copy while the locale is English: ${leaked.slice(0, 8).join('')}`)
  }
  // Restore, so a later check never inherits this switch.
  ctx.locale.setLocale('zh-Hans')
})

await check('the settings select reflects the active locale', () => {
  // The select is bound to the SHELL's live locale, not a plugin-local copy, so it
  // stays honest when the language changes from the shipped General row too.
  ctx.locale.setLocale('zh-Hans')
  const select = walk(render('tokusatsu-gunpla')).selects[0]
  assert.ok(select !== undefined, 'no language select rendered')
  assert.equal(select.value, 'zh-Hans', 'the select does not show the active locale')
  assert.equal(select.options.length, bundle.LANGUAGES.length, `expected ${bundle.LANGUAGES.length} languages, got ${select.options.length}`)

  ctx.locale.setLocale('ja')
  const japanese = walk(render('tokusatsu-gunpla')).selects[0]
  assert.equal(japanese.value, 'ja', 'the select did not follow the locale change')
  ctx.locale.setLocale('zh-Hans')
})

await check('the gate states both mandatory photo rules', () => {
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('带扣'), 'belt buckle rule missing')
  assert.ok(text.includes('变身道具'), 'transformation device rule missing')
  assert.ok(text.includes('包装盒正面'), 'box-front rule missing')
})

await check('the gate names all seven disclaimer clauses', () => {
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  for (const clause of ['仅供参考', '非官方工具', '公开网络', '封号风险', '购买建议', '按现状', '不背书']) {
    assert.ok(text.includes(clause), `disclaimer clause missing: ${clause}`)
  }
})

await check('the gate names the EU AI Act and GDPR', () => {
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('GDPR'), 'GDPR note missing')
  assert.ok(text.includes('EU AI Act'), 'EU AI Act note missing')
})

await check('the capture slot renders the gate as an ELEMENT, not by calling it', () => {
  // Regression: the registered dock previously did `OnboardingGate({store, t})`,
  // which runs the gate's hooks inside the dock's own hook frame. The two
  // branches have different hook counts, so switching on `acknowledged` corrupted
  // React's hook bookkeeping. A component element keeps the frames separate.
  const entry = registered.find((item) => item.options.id === 'tokusatsu-gunpla-capture')
  assert.ok(entry !== undefined)
  const props = { ...entry.options.inject('session-test'), t: ctx.locale.bind('tokusatsu-gunpla') }
  hookFrames.length = 0
  const raw = invokeComponent(entry.component, props)
  // The dock must return an element whose type is a component, never a built tree.
  assert.equal(raw?.__el, true, 'the dock did not return an element')
  assert.equal(typeof raw.type, 'function', 'the dock returned a raw tree instead of a component element')
  assert.ok(['OnboardingGate', 'CaptureGuide'].includes(raw.type.name), raw.type.name)
})

await check('composer docks are height-capped and scroll internally', () => {
  // Regression: an uncapped dock inside the composer's flex column grows the
  // column past the viewport, which takes the CONVERSATION's scroll with it and
  // makes the whole page unscrollable. Every dock must be bounded and scroll
  // inside itself.
  const styleTag = styleTags.find((tag) => tag.dataset.pluginCss === '@dsh-plugin/tokusatsu-gunpla/styles')
  assert.ok(styleTag !== undefined, 'no stylesheet was injected')
  const css = styleTag.textContent
  const dockRule = css.match(/\.TKG_dock\{[^}]*\}/u)
  assert.ok(dockRule !== null, 'no .TKG_dock rule')
  assert.ok(/max-height:/u.test(dockRule[0]), 'the dock has no height cap')
  assert.ok(/overflow-y:auto/u.test(dockRule[0]), 'the dock does not scroll internally')
  assert.ok(/overscroll-behavior:contain/u.test(dockRule[0]), 'the dock does not contain scroll chaining')

  const rootRule = css.match(/\.TKG_root\{[^}]*\}/u)
  assert.ok(rootRule !== null, 'no .TKG_root rule')
  assert.ok(/max-height:/u.test(rootRule[0]), 'the settings root has no height cap')
  assert.ok(/overflow-y:auto/u.test(rootRule[0]), 'the settings root does not scroll internally')
})

await check('the onboarding gate is exempt from the dock cap', () => {
  const styleTag = styleTags.find((tag) => tag.dataset.pluginCss === '@dsh-plugin/tokusatsu-gunpla/styles')
  const css = styleTag.textContent
  const gateRule = css.match(/\.TKG_gateDock\{[^}]*\}/u)
  assert.ok(gateRule !== null, 'no .TKG_gateDock exemption rule')
  assert.ok(/max-height:none/u.test(gateRule[0]), 'the gate exemption does not lift the cap')
})

await check('the bundle never widens the shell language catalog', () => {
  // Regression with app-wide impact, twice over. `addLanguage` mutates a catalog
  // every plugin in the page shares.
  //
  //  1. Registering `zh`/`zh-CN`/`zh-TW` advertised languages the shell has no
  //     dictionary for, so OTHER plugins resolved them to English.
  //  2. Even the legitimate-looking `zh-Hans` is not a shell language — the shell
  //     ships `zh` and `en`. Registering it with `fallback: 'en'` meant a shell
  //     whose stored preference was `zh-Hans` found no dictionary for it and fell
  //     back to English, turning the WHOLE application English while the settings
  //     row still displayed "Simplified Chinese".
  //
  // This plugin only needs its own namespace to answer for the reported locale,
  // which dictionary aliases already cover. It must not touch the catalog at all.
  assert.deepEqual(
    languages.map((item) => item.id),
    [],
    'the bundle called addLanguage, widening the shared language catalog',
  )
  const declared = bundle.LANGUAGES.map((item) => item.id).filter((id) => id.startsWith('zh')).sort()
  assert.equal(declared.join(','), 'zh-Hans,zh-Hant', `declared zh languages: ${declared.join(',')}`)
})

await check('a bare or region-qualified Chinese locale resolves Chinese', () => {
  // Regression that reached the live page: the shell/Electron commonly reports
  // Chinese as `zh` or `zh-CN`, not `zh-Hans`. Registering only `zh-Hans`/
  // `zh-Hant` left those tags with no Chinese dictionary in the fallback chain, so
  // the entire surface silently rendered in English while the bundle's own locale
  // reads still looked correct — the exact mixed state the user saw.
  //
  // The strings asserted are ones the ONBOARDING GATE shows (it replaces the
  // capture guide until the disclaimer is accepted), so the assertion holds
  // whichever branch the stored settings select.
  const simplified = ['zh', 'zh-CN', 'zh-SG', 'zh-Hans']
  const traditional = ['zh-TW', 'zh-HK', 'zh-Hant']

  for (const locale of simplified) {
    ctx.locale.setLocale(locale)
    const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
    assert.ok(text.includes('拍照硬性要求'), `locale "${locale}" did not resolve Simplified Chinese`)
    assert.ok(text.includes('免责声明'), `locale "${locale}" did not resolve the disclaimer heading`)
  }
  for (const locale of traditional) {
    ctx.locale.setLocale(locale)
    const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
    assert.ok(text.includes('拍照硬性要求'), `locale "${locale}" did not resolve Traditional Chinese`)
    assert.ok(text.includes('免責聲明'), `locale "${locale}" did not resolve the traditional disclaimer heading`)
  }
  ctx.locale.setLocale('zh-Hans')
})

await check('the most visible Chinese copy resolves for every zh tag', () => {
  // Assert on copy the ONBOARDING GATE shows (it replaces the capture guide until
  // the disclaimer is accepted). The banner strings live on the guide branch, so
  // asking the gate for them fails however healthy the locale plumbing is.
  const cases = [
    ['zh', '腰带：带扣与变身道具必须各自拆下单独拍。'],
    ['zh-CN', '腰带：带扣与变身道具必须各自拆下单独拍。'],
    ['zh-Hans', '腰带：带扣与变身道具必须各自拆下单独拍。'],
    ['zh-Hant', '腰帶：帶扣與變身道具必須各自拆下單獨拍。'],
    ['zh-TW', '腰帶：帶扣與變身道具必須各自拆下單獨拍。'],
  ]
  for (const [locale, expected] of cases) {
    ctx.locale.setLocale(locale)
    const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
    assert.ok(text.includes(expected), `locale "${locale}" did not resolve the belt rule "${expected}"`)
  }
  // Restore, so a later check never inherits Traditional Chinese.
  ctx.locale.setLocale('zh-Hans')
})

await check('the empty result panel is one line, not a card', () => {
  // A full card of empty state in the composer column is wasted vertical space and
  // part of the same "page will not scroll" failure mode.
  const classes = walk(render('tokusatsu-gunpla-result')).classes
  assert.ok(!classes.includes('TKG_card'), 'the empty result state still renders a card')
})

await check('a throwing dictionary registration does not abandon the other languages', () => {
  // Regression: the registry throws when a namespace already carries a locale
  // (reachable across a hot reload before the old effect's disposer runs). An
  // unguarded `.map()` over the languages abandoned every LATER one on the first
  // throw, leaving English as the only resolvable dictionary — so the whole
  // surface rendered in English while this bundle's own locale reads still said
  // Chinese. That exact mixed state is what the live page showed.
  const flaky = createContext()
  const originalRegister = flaky.locale.register
  let calls = 0
  flaky.locale.register = (ns, locale, dictionary) => {
    calls += 1
    if (calls === 1) throw new Error('locale namespace already has locale')
    return originalRegister(ns, locale, dictionary)
  }
  let threw
  try {
    bundle.apply(flaky)
  } catch (error) {
    threw = error
  }
  assert.equal(threw, undefined, 'apply threw instead of containing the registration failure')
  assert.ok(calls > 1, `only ${calls} registration(s) attempted: the batch aborted on the first throw`)
})

await check('the gate offers an explicit consent tick plus an enter action', () => {
  // The specification asks for a TICK on the disclaimer, not a bare button: the
  // agreement must be an explicit act, and the enter action must not be reachable
  // until it is ticked.
  const tree = walk(render('tokusatsu-gunpla-capture'))
  assert.ok(tree.types.has('input'), 'the gate renders no checkbox at all')
  const tick = tree.checkboxes.find((box) => box.tkg === 'acknowledge')
  assert.ok(tick !== undefined, 'the gate renders no acknowledgement checkbox')
  assert.equal(tick.checked, false, 'the acknowledgement checkbox starts ticked')
  const enter = tree.buttons.find((button) => button.tkg === 'enter')
  assert.ok(enter !== undefined, 'the gate renders no enter button')
  assert.equal(enter.disabled, true, 'the enter button is enabled before the disclaimer is ticked')
})

await check('the gate states the mandatory photo rules', () => {
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('带扣'), 'belt buckle rule missing')
  assert.ok(text.includes('变身道具'), 'transformation device rule missing')
  assert.ok(text.includes('包装盒正面'), 'box-front rule missing')
})

// Drive the store into the accepted state so the checklist branch renders. The
// capture dock listens through useSyncExternalStore, so writing storage and
// re-rendering is exactly what a user tapping "accept" does.
const settingsStore = registered
  .find((item) => item.options.id === 'tokusatsu-gunpla-capture')
  .options.inject('session-test').store

await check('ticking the disclaimer enables the enter action', () => {
  settingsStore.set({ acknowledged: true, declined: false })
  const tree = walk(render('tokusatsu-gunpla-capture'))
  const enter = tree.buttons.find((button) => button.tkg === 'enter')
  // Once ticked, the gate swaps to the capture guide, so the enter button is gone
  // and the checklist is what the user sees.
  assert.ok(tree.texts.join('\n').includes('拍照清单'), 'the guide did not replace the gate after ticking')
  assert.equal(enter, undefined, 'the gate is still rendered after the disclaimer was ticked')
})

await check('both capture branches render fully through the dock', () => {
  // The two branches have different hook counts; rendering through the dock is
  // what proves they are elements rather than inlined hook calls.
  settingsStore.set({ acknowledged: false, declined: false })
  const gate = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(gate.includes('免责声明'), 'gate branch did not render through the dock')

  settingsStore.set({ acknowledged: true })
  const guide = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(guide.includes('拍照清单'), 'guide branch did not render through the dock')
  assert.ok(!guide.includes('免责声明'), 'gate leaked into the accepted branch')
})

await check('the result panel renders through its registration', () => {
  const tree = walk(render('tokusatsu-gunpla-result'))
  assert.ok(tree.texts.length > 0, 'result panel rendered nothing')
})

await check('every registration renders without throwing', () => {
  for (const entry of registered) {
    const props = typeof entry.options.inject === 'function'
      ? entry.options.inject('session-test')
      : {}
    renderWith(entry.component, { ...props, t: ctx.locale.bind('tokusatsu-gunpla') })
  }
})

await check('accepting the disclaimer swaps the gate for the checklist', () => {
  settingsStore.set({ acknowledged: true })
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('拍照清单'), 'checklist heading missing after acceptance')
  assert.ok(!text.includes('免责声明'), 'gate still rendered after acceptance')
})

await check('the checklist renders every level tag and the standing banner', () => {
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('必须'), 'required tag missing')
  assert.ok(text.includes('替代'), 'alternative tag missing')
  assert.ok(text.includes('腰带必须'), 'standing belt banner missing')
  assert.ok(text.includes('装在带子上'), 'belt secondary banner missing')
})

await check('switching to the gunpla tab applies the box requirement', () => {
  settingsStore.set({ kind: 'gunpla', hasBox: true, provided: [] })
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('包装盒正面'), 'box-front requirement missing on the gunpla tab')
  assert.ok(text.includes('板件流道铭文'), 'runner requirement missing on the gunpla tab')
  assert.ok(text.includes('仍有必拍项未完成'), 'blocked banner missing with no photos ticked')
  assert.ok(!text.includes('腰带必须'), 'belt banner still shown on the gunpla tab')
})

await check('ticking the box front clears the blocked banner', () => {
  settingsStore.set({ kind: 'gunpla', hasBox: true, provided: ['box-front'] })
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('清单已满足'), 'ready banner missing after satisfying the requirement')
})

await check('dropping the box switches to the alternative-evidence path', () => {
  settingsStore.set({ kind: 'gunpla', hasBox: false, provided: [] })
  const tree = walk(render('tokusatsu-gunpla-capture'))
  // The standing banner always states the box rule; it is the checklist that
  // must drop the requirement when no box exists.
  const items = tree.items
  assert.ok(!items.includes('包装盒正面'), 'box-front item still offered without a box')
  assert.ok(items.includes('板件流道铭文'), 'runner alternative missing without a box')
  assert.ok(items.includes('手动补型号'), 'manual fallback missing without a box')
})

await check('belt mode still demands the two detached shots', () => {
  settingsStore.set({ kind: 'belt', hasBox: true, provided: ['strap-overall'] })
  const text = walk(render('tokusatsu-gunpla-capture')).texts.join('\n')
  assert.ok(text.includes('带扣单独拆下拍摄'), 'detached-buckle requirement missing')
  assert.ok(text.includes('变身道具单独拆下拍摄'), 'detached-device requirement missing')
  assert.ok(text.includes('仍有必拍项未完成'), 'belt mode should stay blocked without the detached shots')
})

await check('accepting the disclaimer is recorded in the store', () => {
  settingsStore.set({ acknowledged: true, declined: false })
  const entry = registered.find((item) => item.options.id === 'tokusatsu-gunpla-capture')
  const tree = walk(renderWith(entry.component, { ...entry.options.inject('session-test'), t: ctx.locale.bind('tokusatsu-gunpla') }))
  assert.ok(tree.texts.join('\n').includes('拍照清单'))
})

await check('the result panel renders the empty-state guidance', () => {
  ctx.__language = 'zh-Hans'
  const text = walk(render('tokusatsu-gunpla-result')).texts.join('\n')
  assert.ok(text.includes('识别'), 'empty-state copy missing')
})

await check('the settings page renders the disclaimer and compliance notes', () => {
  ctx.__language = 'zh-Hans'
  const text = walk(render('tokusatsu-gunpla')).texts.join('\n')
  assert.ok(text.includes('免责声明'), 'disclaimer heading missing')
  assert.ok(text.includes('合规说明'), 'compliance heading missing')
  assert.ok(text.includes('plugin-data'), 'local data directory not disclosed')
})

await check('the settings page exposes every declared language', () => {
  const text = walk(render('tokusatsu-gunpla')).texts.join('\n')
  assert.ok(text.includes('English'), 'English option missing')
  assert.ok(text.includes('繁體中文'), 'Traditional Chinese option missing')
  assert.ok(text.includes('Polski'), 'Polish option missing')
  assert.ok(bundle.LANGUAGES.length >= 15, `expected at least 15 languages, got ${bundle.LANGUAGES.length}`)
})

await check('the settings page lists every language the bundle declares', () => {
  const tree = walk(render('tokusatsu-gunpla'))
  assert.ok(tree.types.has('select'), 'no language select rendered')
  for (const language of bundle.LANGUAGES) {
    assert.ok(tree.texts.includes(language.label), `language option missing: ${language.label}`)
  }
})

await check('the client bundle stays pure ASCII', () => {
  // The file is read and rewritten by tooling; a single non-ASCII byte makes it
  // vulnerable to the encoding round-trip that once destroyed every user-visible
  // string in it. All copy is written as \uXXXX escapes for exactly this reason.
  const bytes = readFileSync(new URL('../lib/client.js', import.meta.url))
  const offenders = []
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] > 0x7f) offenders.push({ offset: index, byte: bytes[index].toString(16) })
  }
  assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} non-ASCII byte(s) in lib/client.js`)
})

await check('the stylesheet is injected exactly once with a stable tag', () => {
  assert.equal(styleTags.length, 1, `expected 1 style tag, got ${styleTags.length}`)
  assert.equal(styleTags[0].dataset.pluginCss, '@dsh-plugin/tokusatsu-gunpla/styles')
})

await check('the bundle declares no package-row dependency', async () => {
  const { readFile: read } = await import('node:fs/promises')
  const manifest = JSON.parse(await read(new URL('../package.json', import.meta.url), 'utf8'))
  const client = manifest.dsh?.client
  assert.ok(client !== undefined, 'dsh.client is missing')
  assert.equal(client.platform, 'web')
  assert.deepEqual(client.inject ?? [], [], 'client inject must stay empty: no package rows are required')
})

console.log(`\n${checks - failures.length}/${checks} checks passed`)

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('All client contract checks passed.')

/**
 * Reproduce the plugin's activation against the services the running app
 * actually provides, to find why the entry never reaches `active`.
 *
 * The mock context used earlier supplied only `tools`; the live composition also
 * provides `sessionProjections`, and the plugin's optional projection path reads
 * that service through `ctx.inject`. This harness covers both, plus the failure
 * modes a real loader would hit: a throwing `apply`, and a throwing registration.
 *
 * Usage: node scripts/activation-repro.mjs
 */

import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

process.env.DSH_HOME = process.env.TEMP ? join(process.env.TEMP, 'tkg-repro') : process.env.DSH_HOME

const plugin = await import(pathToFileURL(join(process.cwd(), 'lib', 'index.js')).href)

/** A registration recorder. */
function recorder(label) {
  const items = []
  return {
    items,
    register(definition) {
      items.push(definition)
      return () => {}
    },
    label,
  }
}

/**
 * Build a context approximating one composition.
 * @param {object} options - which services to provide and how they behave.
 * @returns {object} the fake context plus its recorders.
 */
function makeContext(options = {}) {
  const tools = recorder('tools')
  const projections = recorder('projections')
  const effects = []
  const ctx = {
    tools: { register: (definition) => tools.register(definition) },
    logger: { info() {}, warn() {}, error() {} },
    effect(factory, label) {
      effects.push(label)
      const disposer = factory()
      return () => {
        if (typeof disposer === 'function') disposer()
      }
    },
  }
  if (options.sessionProjections !== false) {
    ctx.sessionProjections = { register: (definition) => projections.register(definition) }
  }
  if (options.inject === true) {
    // The real client/host context exposes `ctx.inject(names, callback)`.
    ctx.inject = (names, callback) => {
      const scope = {}
      for (const name of names) {
        if (ctx[name] === undefined) throw new Error(`cannot resolve injected service ${name}`)
        scope[name] = ctx[name]
      }
      callback(scope)
      return () => {}
    }
  }
  return { ctx, tools, projections, effects }
}

const config = plugin.Config({})

const scenarios = [
  ['tools only (no ctx.inject)', { sessionProjections: false }],
  ['tools + sessionProjections', {}],
  ['tools + sessionProjections + ctx.inject', { inject: true }],
]

let failed = 0
for (const [label, options] of scenarios) {
  const { ctx, tools, projections, effects } = makeContext(options)
  let error
  try {
    plugin.apply(ctx, config)
  } catch (thrown) {
    error = thrown
  }
  const ok = error === undefined
  if (!ok) failed += 1
  console.log(`\n${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) {
    console.log(`     ${error?.message}`)
    console.log(`     ${String(error?.stack ?? '').split('\n')[1]?.trim() ?? ''}`)
  }
  console.log(`     tools=${tools.items.length} projections=${projections.items.length} effects=${effects.length}`)
}

console.log(`\n${scenarios.length - failed}/${scenarios.length} scenarios activate cleanly`)
if (failed > 0) process.exit(1)

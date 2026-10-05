/**
 * Activation harness.
 *
 * Boots the plugin's `apply()` against a recording mock context that mirrors the
 * two services it injects, and reports exactly what it registered. This isolates
 * the plugin's own correctness from profile composition, which is what a
 * distingushing test needs: "does my code activate" and "does the profile offer
 * my dependencies" are different questions with different fixes.
 *
 * Usage: node scripts/activate-check.mjs
 */

import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const home = process.env.USERPROFILE ?? process.env.HOME
const pluginLib = join(process.cwd(), 'lib', 'index.js')

process.env.DSH_HOME = process.env.TEMP ? join(process.env.TEMP, 'tkg-activate') : process.env.DSH_HOME

const plugin = await import(pathToFileURL(pluginLib).href)

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

/** Recording mock context with the services the plugin injects. */
function createContext() {
  const tools = []
  const projections = []
  const effects = []

  const ctx = {
    tools: {
      register(definition) {
        tools.push(definition)
        return () => {}
      },
    },
    sessionProjections: {
      register(definition) {
        projections.push(definition)
        return () => {}
      },
    },
    effect(factory, label) {
      effects.push(label)
      const disposer = factory()
      return () => {
        if (typeof disposer === 'function') disposer()
      }
    },
    logger: { info() {}, warn() {}, error() {} },
  }
  return { ctx, tools, projections, effects }
}

const config = plugin.Config({})

console.log('1. Module surface')
check('exports apply', typeof plugin.apply === 'function')
check('exports a Config schema', typeof plugin.Config === 'function')
check('declares exactly one hard dependency', Array.isArray(plugin.inject) && plugin.inject.length === 1, plugin.inject)
check('hard-depends on tools', plugin.inject.includes('tools'))
// The projection is a progressive enhancement: a hard dependency on it would make
// the whole plugin fail to activate in compositions that do not mount it.
check('does NOT hard-depend on sessionProjections', !plugin.inject.includes('sessionProjections'), plugin.inject)

console.log('\n2. apply() against the declared services')
const { ctx, tools, projections, effects } = createContext()
let threw
try {
  plugin.apply(ctx, config)
} catch (error) {
  threw = error instanceof Error ? `${error.message}` : String(error)
}
check('apply() completes without throwing', threw === undefined, threw)
check('registers exactly four tools', tools.length === 4, tools.map((tool) => tool.name))

const names = tools.map((tool) => tool.name).sort()
check('registers the expected tool names', JSON.stringify(names) === JSON.stringify(['gear_checklist', 'gear_decide_edition', 'gear_identify', 'gear_knowledge']), names)
check('registers the result projection', projections.length === 1, projections.length)
check('projection key matches what the client reads', projections[0]?.key === plugin.RESULT_PROJECTION_KEY, projections[0]?.key)
check('projection exposes a wire view', projections[0]?.wire !== undefined)
check('registers effects for cleanup', effects.length >= 1, effects.length)

console.log('\n3. Tool definitions are complete')
for (const tool of tools) {
  check(`${tool.name}: has a description`, typeof tool.description === 'string' && tool.description.length > 40)
  check(`${tool.name}: has parameters`, tool.parameters !== undefined && typeof tool.parameters === 'object')
  check(`${tool.name}: has an output schema + render`, tool.output !== undefined && typeof tool.output.render === 'function')
  check(`${tool.name}: has an execute body`, typeof tool.execute === 'function')
}

console.log('\n3b. gear_identify tells the model when to call it')
{
  // The description is the only thing that makes the assistant act on an attached
  // photo without being told to. A user who sends a belt photo and gets "which
  // model 腰带 would you like me to analyse?" has been failed by this text, not by
  // the recognition pipeline. So the load-bearing sentences are asserted.
  const identifyTool = tools.find((tool) => tool.name === 'gear_identify')
  const identify = identifyTool.description

  check('says to call it when photos arrive', identify.includes('照片时**直接调用**') || identify.includes('直接调用'))
  check('says the user need not ask', identify.includes('不需要用户说'))
  check('says where attachment files live', identify.includes('attachments/v1/objects'))
  check('warns that attachments have no extension', identify.includes('没有扩展名'))
  check('forbids describing the photo as text instead of passing it', identify.includes('不要把照片里的内容自己描述一遍'))
  check('the images parameter points at the attachment path', identifyTool.parameters.properties.images.description.includes('附件'))
}

console.log('\n4. Projection fold behaviour')
const projection = projections[0]
check('init() returns null', projection.init({}, 0) === null)
const state = { result: { status: 'matched' }, at: 123 }
const folded = projection.apply(null, { type: plugin.RESULT_EVENT, data: state })
check('folds the result event', folded?.result?.status === 'matched', folded)
const unrelated = projection.apply(folded, { type: 'turn/start', data: {} })
check('ignores unrelated events by reference', unrelated === folded)
check('wire view round-trips', projection.wire.view(folded) === folded)

console.log('\n5. Every tool executes against the real Config')
{
  // Registration being green says nothing about execution. The flat/nested vision
  // configuration mismatch crashed gear_identify and gear_knowledge at CALL time
  // — in production, on the first photo — while every check above still passed,
  // because nothing here had ever invoked a tool. Calling each one once with the
  // same Config-derived config the loader passes is the cheap pin for that class
  // of bug.
  const calls = {
    gear_checklist: { kind: 'belt', hasBox: true },
    gear_decide_edition: {},
    gear_identify: { images: [], kind: 'belt' },
    gear_knowledge: { mode: 'stats' },
  }
  for (const tool of tools) {
    let error
    let value
    try {
      value = await tool.execute(calls[tool.name] ?? {}, {})
    } catch (thrown) {
      error = thrown instanceof Error ? thrown.message : String(thrown)
    }
    check(`${tool.name}: executes without throwing`, error === undefined, error)
    check(`${tool.name}: returns a value`, value !== undefined && value !== null, typeof value)
  }
  const stats = await tools.find((tool) => tool.name === 'gear_knowledge').execute({ mode: 'stats' }, {})
  check('stats reports the vision setting from the flat config', stats.vision.enabled === true, stats.vision)
}

console.log(`\n${checks - failures.length}/${checks} checks passed`)

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('Plugin activates correctly against its declared services.')

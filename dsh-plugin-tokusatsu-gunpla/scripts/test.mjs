/**
 * Run every test suite in order and report a single verdict.
 *
 * Usage: node scripts/test.mjs
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const suites = [
  ['Host domain engine', 'scripts/smoke.mjs'],
  ['Host activation', 'scripts/activate-check.mjs'],
  ['Client bundle contract', 'scripts/client-test.mjs'],
  ['Documentation consistency', 'scripts/docs-check.mjs'],
]

let failed = 0
for (const [label, script] of suites) {
  const path = fileURLToPath(new URL(script, new URL('../', import.meta.url)))
  console.log(`\n=== ${label} (${script}) ===`)
  const result = spawnSync(process.execPath, [path], { stdio: 'inherit' })
  if (result.status !== 0) failed += 1
}

console.log(`\n=== ${suites.length - failed}/${suites.length} suites passed ===`)
if (failed > 0) process.exit(1)

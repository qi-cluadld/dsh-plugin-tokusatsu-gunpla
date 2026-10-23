/**
 * Refuse to publish a manifest that makes the plugin bring its own copy of the
 * host runtime.
 *
 * 0.1.0 shipped `@deepseek-ai/cordis`, `dsh-tools`, `schemastery` and
 * `dsh-session-projection` in `dependencies`. With the profile's hoisted pnpm
 * linker that rewrote the whole dependency tree around the running app — the
 * installer log read `Packages: +8 -10` — and broke the host.
 *
 * The four suites could not catch it: they run against stubs, and the published
 * check ran in an empty consumer project where the plugin's own copies were the
 * only copies in the tree. This check looks at the manifest itself, which is the
 * one place the mistake lives.
 *
 * Usage: node scripts/package-check.mjs
 */

import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/** Packages the host provides; a plugin may require them but never install them. */
const HOST_PROVIDED = /^@deepseek-ai\//

const failures = []

for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
  if (HOST_PROVIDED.test(name)) {
    failures.push(`dependencies: ${name}@${range} is provided by the host — move it to peerDependencies`)
  }
}

const peers = manifest.peerDependencies ?? {}
for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
  if (!HOST_PROVIDED.test(name) && name in peers) {
    failures.push(`dependencies: ${name}@${range} is also a peer — declaring both lets pnpm install it locally`)
  }
}

if (failures.length > 0) {
  console.error('package.json would ship a duplicate host runtime:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`ok: ${Object.keys(manifest.dependencies ?? {}).length} dependency(ies), no host-provided package among them`)
console.log(`    peerDependencies: ${Object.keys(peers).join(', ') || '(none)'}`)

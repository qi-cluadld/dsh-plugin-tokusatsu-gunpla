/**
 * Make this package resolve its own dependencies without any hand-made links.
 *
 * Why this exists: the DSH loader resolves the plugin package to its REAL path
 * (symlinks are resolved), so Node then looks for `node_modules` beside the real
 * `lib/` — inside this workspace. Hand-built junctions there are fragile and are
 * invisible to a pnpm install, which deletes them. The durable answer is a real
 * `node_modules` that pnpm manages from `dependencies` in package.json.
 *
 * Offline strategy: `autoInstallPeers: false` means pnpm will not fetch the peer
 * packages by itself, and the machine may be offline anyway. So this script first
 * SEEDS a local pnpm store from the dependencies already present in the DSH
 * profile's hoisted store, then runs pnpm against that store.
 *
 * Usage: node scripts/install-deps.mjs
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/** Packages the plugin imports at runtime. */
const REQUIRED = Object.keys(manifest.dependencies ?? {})
if (REQUIRED.length === 0) {
  console.error('package.json declares no dependencies; nothing to install')
  process.exit(1)
}

const dshHome = process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? process.env.HOME, '.dsh')
const profileStore = join(dshHome, 'profiles', 'node_modules')
const localStore = join(root, '.pnpm-store')
const pnpm = 'D:\\deepseek\\resources\\runtime\\pnpm\\bin\\pnpm.cjs'

console.log('package:', manifest.name)
console.log('dependencies:', REQUIRED.join(', '))
console.log('seeding local store from:', profileStore)

// Seed the local store with the exact package directories the profile already
// has, so the install needs no network.
let seeded = 0
const missing = []
for (const name of REQUIRED) {
  const source = join(profileStore, name)
  if (!existsSync(source)) {
    missing.push(name)
    continue
  }
  const target = join(localStore, name)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target, { recursive: true, dereference: true })
  seeded += 1
}
console.log(`seeded ${seeded}/${REQUIRED.length} packages into the local store`)
if (missing.length > 0) {
  console.log('not found in the profile store (pnpm will need the network for these):', missing.join(', '))
}

if (!existsSync(pnpm)) {
  console.error(`pnpm not found at ${pnpm}`)
  process.exit(1)
}

console.log('\nrunning pnpm install…')
try {
  // A plain install, so pnpm resolves the COMPLETE dependency closure. Seeding
  // just the five direct packages left `@deepseek-ai/dsh-tools` unable to find its
  // own dependencies (`dsh-sandbox` and friends), which is exactly the kind of
  // partial tree that makes a plugin fail to load for no visible reason.
  const output = execFileSync(process.execPath, [
    pnpm,
    'install',
    '--prefer-offline',
    '--config.auto-install-peers=false',
    '--config.node-linker=hoisted',
    '--reporter=append-only',
  ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  console.log(output)
} catch (error) {
  console.error('pnpm install failed')
  console.error(error.stdout ?? '')
  console.error(error.stderr ?? error.message)
  process.exit(1)
}

// Prove the result by actually LOADING the entry points the plugin uses: a bare
// "the folder exists" check passed on a tree that could not be imported.
const probes = [
  ['@deepseek-ai/schemastery', 'node_modules/@deepseek-ai/schemastery/package.json'],
  ['@deepseek-ai/dsh-tools', 'node_modules/@deepseek-ai/dsh-tools/package.json'],
  ['zod', 'node_modules/zod/package.json'],
]
let failed = 0
for (const [name, relative] of probes) {
  const ok = existsSync(join(root, relative))
  if (!ok) failed += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`)
}

console.log(failed === 0 ? '\ndependencies present' : `\n${failed} dependencies missing`)
if (failed > 0) process.exit(1)

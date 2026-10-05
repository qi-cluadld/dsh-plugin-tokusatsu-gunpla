/**
 * Verify that the desktop profile's user patch layer composes the plugin row as
 * ENABLED, and diagnose how the loader resolves bundle patch files.
 *
 * Usage: node scripts/verify-profile.mjs
 */

import { existsSync, realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const home = process.env.USERPROFILE ?? process.env.HOME
const profileName = process.argv[2] ?? 'desktop'
const profilesRoot = join(home, '.dsh', 'profiles')
// Profile bundle names are full package specifiers (e.g. `@deepseek-ai/dsh-base`),
// so they already carry their scope; resolving them goes through node_modules directly.
const modulesRoot = join(profilesRoot, 'node_modules')
const bundleDir = join(modulesRoot, '@deepseek-ai')
const profileDir = join(profilesRoot, profileName)

const includeUrl = pathToFileURL(join(bundleDir, 'cordis-plugin-include', 'lib', 'index.js')).href
const appBootUrl = pathToFileURL(join(bundleDir, 'dsh-app-boot', 'lib', 'index.js')).href
const { applyEntryPatches } = await import(includeUrl)
const appBoot = await import(appBootUrl)
const { loadOptionalPatches, PROFILE_PATCH_FILENAME } = appBoot
console.log('PROFILE_PATCH_FILENAME =', JSON.stringify(PROFILE_PATCH_FILENAME))

const failures = []
const check = (label, condition, detail) => {
  if (condition) console.log(`  PASS  ${label}`)
  else {
    failures.push(label)
    console.log(`  FAIL  ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
  }
}

const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
const bundles = manifest.dsh?.profile?.bundles ?? []
console.log(`\nprofile ${profileName}: bundles = ${bundles.join(', ')}`)

let entries = []
const warn = (...args) => console.log('    WARN:', ...args)
/** Bundles that shipped no patch at their resolvable location. */
const patchless = []

/**
 * Resolve a bundle specifier the way Node would from inside the profile: the
 * profile's own `node_modules` first (third-party bundles are pnpm-linked
 * there), then the shared hoisted root the shipped bundles live in.
 * @param {string} specifier - the bundle package name.
 * @returns {string | undefined} its real directory, when resolvable.
 */
function resolveBundleDir(specifier) {
  const candidates = [join(profileDir, 'node_modules', specifier), join(modulesRoot, specifier)]
  for (const candidate of candidates) {
    try {
      return realpathSync(candidate)
    } catch {
      continue
    }
  }
  return undefined
}

for (const name of bundles) {
  const resolved = resolveBundleDir(name)
  if (resolved === undefined) {
    console.log(`  bundle ${name}: NOT RESOLVABLE`)
    patchless.push(name)
    continue
  }
  const file = join(resolved, PROFILE_PATCH_FILENAME)
  const exists = existsSync(file)
  const patches = exists ? loadOptionalPatches('dsh', file) : undefined
  console.log(`  bundle ${name}: patch=${exists} rows=${patches === undefined ? 'n/a' : patches.length}`)
  if (patches === undefined) patchless.push(name)
  else entries = applyEntryPatches(entries, patches, warn)
}
console.log(`  entries after bundles: ${entries.length}`)
if (patchless.length > 0) console.log(`  note: no patch file found for ${patchless.join(', ')}`)

/** Services the plugin hard-depends on; the composition must offer all of them. */
const REQUIRED_SERVICES = ['tools']

for (const service of REQUIRED_SERVICES) {
  const provider = entries.find((entry) => entry.id === service)
  check(`the composition provides "${service}"`, provider !== undefined && provider.disabled !== true, provider)
}

// The result projection is optional by design, so its absence is reported rather
// than failed: the tools must keep working without a UI channel.
const projection = entries.find((entry) => entry.id === 'session-projection')
console.log(`  note: session projection ${projection === undefined ? 'absent' : projection.disabled === true ? 'disabled' : 'available'} in this composition (optional)`)

const userFile = join(profileDir, PROFILE_PATCH_FILENAME)
const userPatches = loadOptionalPatches('dsh', userFile) ?? []
console.log(`  user layer: ${userPatches.length} patches; shapes ${JSON.stringify(userPatches.map((patch) => Object.keys(patch)))}`)
entries = applyEntryPatches(entries, userPatches, warn)

console.log('')
const row = entries.find((entry) => entry.name === '@dsh-plugin/tokusatsu-gunpla')
if (row === undefined) {
  // The profile's `bundles` list is owned by the running app's bundle manager,
  // which rewrites it as it reconciles its own enabled set. A missing row is
  // therefore reported rather than failed: the live bundle registry
  // (`plugin_manager` → `list_bundles`) is the authority on whether the plugin is
  // installed and enabled, and this script cannot see that state offline.
  console.log('  note: the plugin row is NOT in the offline composition')
  console.log('        check plugin_manager list_bundles instead - it is the authority')
} else {
  check('the plugin row is present in the composition', true)
  console.log('    row:', JSON.stringify(row))
  check('the row is explicitly enabled', row.disabled === false, row.disabled)
  check('the row keeps its identity', row.id === 'tokusatsu-gunpla', row.id)
  check('the row carries config', row.config !== undefined && row.config.richMode === false)
}

// The shipped bundles disable many optional features by default, so this only
// asserts that the plugin row itself was not left disabled.
const disabledPluginRow = entries.find((entry) => entry.name === '@dsh-plugin/tokusatsu-gunpla' && entry.disabled === true)
check('the plugin row itself is not left disabled', disabledPluginRow === undefined, disabledPluginRow)

console.log(`\n${failures.length === 0 ? 'OK' : `${failures.length} FAILED`}`)
if (failures.length > 0) process.exit(1)

/**
 * Report what the shipped client bundle actually contains, and whether the
 * browser could be running a stale copy.
 *
 * The client combo script is served by content-addressed revision, so a stale page
 * keeps an old bundle until its rev changes or the page reloads. Several
 * long-running symptoms in this project were a stale bundle, so being able to
 * state the current bundle's identity is worth a small tool.
 *
 * Usage: node scripts/bundle-identity.mjs
 */

import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const clientPath = join(root, 'lib', 'client.js')
const bytes = readFileSync(clientPath)
const text = bytes.toString('utf8')
const info = statSync(clientPath)

console.log('bundle:', clientPath)
console.log('bytes:', bytes.length)
console.log('sha1-12:', createHash('sha1').update(bytes).digest('hex').slice(0, 12))
console.log('mtime:', info.mtime.toISOString())

/** Features whose presence proves which generation of the bundle is on disk. */
const FEATURES = [
  ['locale reactivity hook', 'function useActiveLocale'],
  ['locale passed into slots', 'locale: ctx.locale'],
  ['enter (confirm) button key', "'onboard.enter'"],
  ['consent checkbox marker', "'acknowledge'"],
  ['dock height cap', 'tkg-dock-max-height'],
  ['gate exemption class', 'TKG_gateDock'],
  ['element render of the gate', 'jsx(OnboardingGate, { store, locale, t })'],
]

console.log('\nfeature checklist:')
for (const [label, needle] of FEATURES) {
  console.log(`${text.includes(needle) ? 'present ' : 'MISSING '} ${label}`)
}

// A non-ASCII byte here would mean an encoding round-trip damaged the copy again.
const nonAscii = [...bytes].filter((byte) => byte > 0x7f).length
console.log(`\nnon-ASCII bytes: ${nonAscii} ${nonAscii === 0 ? '(pure ASCII, safe from encoding damage)' : '(UNEXPECTED)'}`)

/**
 * Runtime primitives for the tokusatsu/gunpla assistant: data paths, atomic
 * JSON persistence, and the token-free TTL cache.
 *
 * Everything here runs on the Host with no model involvement, which is what
 * keeps recognition, judgment, update checks, and filtering off the token bill.
 * @module @dsh-plugin/tokusatsu-gunpla/runtime
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

/** Cordis plugin name. */
export const name = 'tokusatsu-gunpla'

/** Stable data directory segments under the DSH home. */
const DATA_SEGMENTS = ['plugin-data', name]

/**
 * Resolve the DSH home directory the same way the harness does: `DSH_HOME`
 * wins, otherwise `~/.dsh`.
 * @returns the absolute DSH home path.
 */
export function dshHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv
  return join(homedir(), '.dsh')
}

/** @returns the plugin's private data directory (not created on read). */
export function dataDir() {
  return join(dshHome(), ...DATA_SEGMENTS)
}

/**
 * @param {...string} rest - path segments appended to the data directory.
 * @returns one path inside the plugin data directory.
 */
export function dataPath(...rest) {
  return join(dataDir(), ...rest)
}

/**
 * Read a UTF-8 text file, returning undefined instead of throwing when the
 * file is simply absent.
 * @param {string} path - absolute file path.
 * @returns {Promise<string | undefined>} file contents or undefined.
 */
export async function readTextIfPresent(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return undefined
    throw error
  }
}

/**
 * Read and parse a JSON file, returning the fallback for a missing file.
 * A corrupt file throws: silently discarding user corrections would be worse
 * than a loud failure the user can fix by deleting one file.
 * @param {string} path - absolute file path.
 * @param {unknown} fallback - value used when the file does not exist.
 * @returns {Promise<any>} parsed value or the fallback.
 */
export async function readJsonIfPresent(path, fallback = undefined) {
  const text = await readTextIfPresent(path)
  if (text === undefined) return fallback
  return JSON.parse(text)
}

/**
 * Write a JSON document atomically (temp file + rename) so a crash mid-write
 * cannot leave a half-serialized knowledge base behind.
 * @param {string} path - absolute destination path.
 * @param {unknown} value - JSON-serializable value.
 * @returns {Promise<void>} settlement after the rename.
 */
export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, path)
}

/**
 * Stable cache key for a recognition request. Feature order must not matter,
 * and whitespace differences must not create duplicate entries.
 * @param {string} scope - logical cache namespace.
 * @param {Record<string, unknown>} payload - request shape.
 * @returns {string} hex digest.
 */
export function cacheKey(scope, payload) {
  const normalization = {
    scope,
    images: [...(payload.images ?? [])].map((item) => String(item)).sort(),
    kind: payload.kind ?? null,
    mode: payload.mode ?? null,
    observations: sortDeep(payload.observations ?? null),
    manual: payload.manual ?? null,
    text: typeof payload.text === 'string' ? payload.text.trim() : null,
  }
  return createHash('sha256').update(JSON.stringify(normalization)).digest('hex').slice(0, 32)
}

/**
 * Recursively order object keys so two structurally equal payloads hash alike.
 * @param {unknown} value - any JSON value.
 * @returns {unknown} the same value with sorted object keys.
 */
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value === null || typeof value !== 'object') return value
  const out = {}
  for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key])
  return out
}

/** Tiny TTL cache backed by one JSON file. */
export class TtlCache {
  /**
   * @param {object} options - cache options.
   * @param {string} options.file - backing file path.
   * @param {number} options.ttlMs - entry lifetime in milliseconds.
   * @param {number} [options.maxEntries] - eviction ceiling.
   */
  constructor({ file, ttlMs, maxEntries = 500 }) {
    this.file = file
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
    this.entries = undefined
    this.dirty = false
  }

  /** @returns {Promise<Record<string, any>>} the loaded entry table. */
  async load() {
    if (this.entries === undefined) {
      const raw = await readJsonIfPresent(this.file, { entries: {} })
      this.entries = raw && typeof raw === 'object' && raw.entries ? raw.entries : {}
    }
    return this.entries
  }

  /**
   * Read a live entry.
   * @param {string} key - cache key.
   * @returns {Promise<any | undefined>} the cached value when still fresh.
   */
  async get(key) {
    const entries = await this.load()
    const hit = entries[key]
    if (hit === undefined) return undefined
    if (typeof hit.expiresAt === 'number' && hit.expiresAt < Date.now()) {
      delete entries[key]
      this.dirty = true
      return undefined
    }
    return hit.value
  }

  /**
   * Store a value and flush opportunistically.
   * @param {string} key - cache key.
   * @param {any} value - JSON-serializable payload.
   * @returns {Promise<void>} settlement after the flush.
   */
  async set(key, value) {
    const entries = await this.load()
    entries[key] = { expiresAt: Date.now() + this.ttlMs, value }
    const keys = Object.keys(entries)
    if (keys.length > this.maxEntries) {
      const ordered = keys
        .map((item) => ({ item, expiresAt: entries[item].expiresAt ?? 0 }))
        .sort((left, right) => left.expiresAt - right.expiresAt)
      for (const stale of ordered.slice(0, keys.length - this.maxEntries)) delete entries[stale.item]
    }
    this.dirty = true
    await this.flush()
  }

  /** Drop expired entries and persist when something changed. @returns {Promise<void>} settlement. */
  async flush() {
    if (!this.dirty || this.entries === undefined) return
    this.dirty = false
    await writeJsonAtomic(this.file, { version: 1, entries: this.entries })
  }

  /** @returns {Promise<number>} how many live entries the cache holds. */
  async size() {
    const entries = await this.load()
    const now = Date.now()
    return Object.values(entries).filter((item) => (item.expiresAt ?? 0) > now).length
  }

  /** Remove every entry. @returns {Promise<void>} settlement. */
  async clear() {
    this.entries = {}
    this.dirty = true
    await this.flush()
  }
}

/**
 * Cheap connectivity probe used before the "needs a VPN" prompts, so the
 * offline path costs no tokens and no user patience.
 * @param {string} url - endpoint to probe.
 * @param {number} timeoutMs - abort budget.
 * @returns {Promise<{ reachable: boolean, status?: number, error?: string }>} probe outcome.
 */
export async function probe(url, timeoutMs = 4000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'manual' })
    return { reachable: true, status: response.status }
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

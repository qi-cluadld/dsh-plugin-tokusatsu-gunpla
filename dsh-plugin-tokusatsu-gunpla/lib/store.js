/**
 * Layered knowledge store for the tokusatsu/gunpla assistant.
 *
 * Three layers, lowest precedence first:
 *   1. the packaged seed catalog (`data/seed-catalog.json`),
 *   2. records the update mechanism has verified and filed,
 *   3. user corrections, which always win and are never overwritten.
 *
 * Layer 3 is the feedback loop the product depends on: when the user picks the
 * right answer from a "疑似" prompt, that choice must survive every later
 * update, so corrections are written to their own file that updates never touch.
 * @module @dsh-plugin/tokusatsu-gunpla/store
 */

import { fileURLToPath } from 'node:url'
import { dataPath, readJsonIfPresent, writeJsonAtomic } from './runtime.js'

/** Packaged seed catalog, read-only. */
const SEED_URL = new URL('../data/seed-catalog.json', import.meta.url)

/** Parsed seed document cache (immutable for the process lifetime). */
let seedCache

/**
 * @returns {Promise<any>} the packaged taxonomy and seed records.
 */
export async function loadSeed() {
  if (seedCache === undefined) {
    const { readFile } = await import('node:fs/promises')
    seedCache = JSON.parse(await readFile(fileURLToPath(SEED_URL), 'utf8'))
  }
  return seedCache
}

/** @returns {string} path of the verified-records layer. */
export function learnedFile() {
  return dataPath('records.json')
}

/** @returns {string} path of the user-correction layer. */
export function correctionsFile() {
  return dataPath('corrections.json')
}

/**
 * Read one of the mutable layers, tolerating absence.
 * @param {string} file - layer file path.
 * @param {string} key - collection key inside the layer document.
 * @returns {Promise<any[]>} the stored items.
 */
async function readLayer(file, key) {
  const document = await readJsonIfPresent(file, null)
  if (document === null || typeof document !== 'object') return []
  const items = document[key]
  return Array.isArray(items) ? items : []
}

/**
 * Assemble the effective knowledge base: taxonomy plus every record, with user
 * corrections overriding same-id learned and seed records.
 * @returns {Promise<{ taxonomy: any, records: any[], counts: { seed: number, learned: number, corrected: number } }>} the merged view.
 */
export async function loadKnowledge() {
  const seed = await loadSeed()
  const learned = await readLayer(learnedFile(), 'records')
  const corrections = await readLayer(correctionsFile(), 'records')

  const merged = new Map()
  for (const record of seed.records ?? []) merged.set(record.id, { ...record, layer: 'seed' })
  for (const record of learned) merged.set(record.id, { ...record, layer: 'learned' })
  for (const record of corrections) merged.set(record.id, { ...record, layer: 'correction', confidence: 'user-confirmed' })

  return {
    taxonomy: {
      lines: seed.lines,
      kinds: seed.kinds,
      materials: seed.materials,
      sizeClasses: seed.sizeClasses,
      bootlegIndicators: seed.bootlegIndicators,
      regions: seed.regions,
    },
    records: [...merged.values()],
    counts: {
      seed: (seed.records ?? []).length,
      learned: learned.length,
      corrected: corrections.length,
    },
  }
}

/**
 * File a verified record into the learned layer (update mechanism output).
 * @param {any} record - record to upsert; must carry an id.
 * @returns {Promise<{ id: string, total: number }>} the upserted id and layer size.
 */
export async function upsertLearned(record) {
  if (!record || typeof record.id !== 'string' || record.id === '') {
    throw new Error('upsertLearned: record.id is required')
  }
  const file = learnedFile()
  const items = await readLayer(file, 'records')
  const index = items.findIndex((item) => item.id === record.id)
  const next = { ...record, updatedAt: new Date().toISOString() }
  if (index === -1) items.push(next)
  else items[index] = { ...items[index], ...next }
  await writeJsonAtomic(file, { version: 1, records: items })
  return { id: record.id, total: items.length }
}

/**
 * Record a user correction. Corrections are the highest layer and feed both
 * the current answer and the next update pass.
 * @param {object} input - correction payload.
 * @param {string} input.id - target record id.
 * @param {Record<string, unknown>} input.fields - corrected fields.
 * @param {string} [input.origin] - what produced the wrong answer.
 * @returns {Promise<{ id: string, fields: string[], total: number }>} the applied correction summary.
 */
export async function recordCorrection({ id, fields, origin = 'user' }) {
  if (typeof id !== 'string' || id === '') throw new Error('recordCorrection: id is required')
  if (fields === null || typeof fields !== 'object') throw new Error('recordCorrection: fields must be an object')
  const file = correctionsFile()
  const items = await readLayer(file, 'records')
  const existing = items.find((item) => item.id === id)
  const correctedAt = new Date().toISOString()
  if (existing === undefined) {
    items.push({ id, ...fields, origin, correctedAt, layer: 'correction' })
  } else {
    Object.assign(existing, fields, { origin, correctedAt })
  }
  await writeJsonAtomic(file, { version: 1, records: items })
  return { id, fields: Object.keys(fields), total: items.length }
}

/**
 * Fuzzy lookup used before any model call: exact id, then alias, then
 * normalized substring match over model names and aliases.
 * @param {any[]} records - merged records.
 * @param {string} query - free text from the user or the local model.
 * @param {number} [limit] - maximum matches.
 * @returns {Array<{ record: any, score: number, via: string }>} ranked matches.
 */
export function searchRecords(records, query, limit = 8) {
  const needle = normalize(query)
  if (needle === '') return []
  const hits = []
  for (const record of records) {
    const candidates = [record.id, record.model, record.modelEn, ...(record.aliases ?? [])]
      .filter((item) => typeof item === 'string' && item !== '')
      .map((item) => ({ text: item, normalized: normalize(item) }))
    let best = 0
    let via = ''
    for (const candidate of candidates) {
      const score = similarity(needle, candidate.normalized)
      if (score > best) {
        best = score
        via = candidate.text
      }
    }
    if (best > 0) hits.push({ record, score: best, via })
  }
  hits.sort((left, right) => right.score - left.score || left.record.id.localeCompare(right.record.id))
  return hits.slice(0, limit)
}

/**
 * Lowercase, strip punctuation and full-width forms, and collapse whitespace so
 * that "DX デザイア ドライバー" and "dx desire driver" compare usefully.
 * @param {string} value - raw text.
 * @returns {string} normalized text.
 */
export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\-_/\\.,:;!?'"()（）【】\[\]{}<>、。・…~～+|]+/gu, '')
    .trim()
}

/**
 * Token-overlap similarity with a substring bonus. Deliberately simple: it runs
 * on every request for free, and ambiguous hits are meant to fall through to the
 * "疑似" question path rather than to a confident wrong answer.
 * @param {string} needle - normalized query.
 * @param {string} haystack - normalized candidate.
 * @returns {number} score in [0, 1].
 */
export function similarity(needle, haystack) {
  if (needle === '' || haystack === '') return 0
  if (needle === haystack) return 1
  if (haystack.includes(needle) || needle.includes(haystack)) {
    const ratio = Math.min(needle.length, haystack.length) / Math.max(needle.length, haystack.length)
    return 0.55 + 0.4 * ratio
  }
  const needleChunks = bigrams(needle)
  const haystackChunks = new Set(bigrams(haystack))
  if (needleChunks.length === 0) return 0
  let overlap = 0
  for (const chunk of needleChunks) if (haystackChunks.has(chunk)) overlap += 1
  return Math.min(0.54, (2 * overlap) / (needleChunks.length + haystackChunks.size))
}

/**
 * @param {string} value - input text.
 * @returns {string[]} adjacent character pairs (CJK-friendly token proxy).
 */
function bigrams(value) {
  const chunks = []
  for (let index = 0; index + 1 < value.length; index += 1) chunks.push(value.slice(index, index + 2))
  return chunks.length > 0 ? chunks : [value]
}

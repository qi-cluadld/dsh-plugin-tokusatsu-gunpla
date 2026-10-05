/**
 * OpenAI-compatible vision endpoint client.
 *
 * Two deployment shapes are supported, and they differ in what an empty model name
 * means:
 *
 *   - a LOCAL endpoint on loopback (Ollama, LM Studio, llama.cpp server, LocalAI)
 *     advertises a short list of already-downloaded models, so picking the first one
 *     is a reasonable convenience;
 *   - a REMOTE endpoint (Zhipu, for example) is a paid third-party service, and its
 *     `/models` list is the provider's whole catalogue. Auto-picking from it would
 *     send the user's photos to a model they never chose, so a remote endpoint
 *     requires the model to be named explicitly.
 *
 * When no endpoint answers, the plugin does not silently escalate anywhere: it
 * returns an `unavailable` outcome so the caller can fall back to the photo
 * checklist plus manual model entry, which costs nothing.
 * @module @dsh-plugin/tokusatsu-gunpla/vision
 */

import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { probe } from './runtime.js'

/** Common local vision endpoints, tried in order when none is configured. */
export const DEFAULT_ENDPOINTS = [
  'http://127.0.0.1:11434/v1',
  'http://127.0.0.1:1234/v1',
  'http://127.0.0.1:8080/v1',
]

/** MIME types accepted for inference. */
const MIME_BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
}

/**
 * The strict JSON contract handed to the local model. Keeping the field set
 * closed is what lets everything downstream stay rule-based.
 */
export const OBSERVATION_CONTRACT = {
  brandText: 'string|null — 包装/本体上出现的品牌字样原文',
  productLine: 'string|null — 如 DX / CSM / HG / RG / MG / PG / MB / 食玩 / 未知',
  seriesText: 'string|null — 作品名（假面骑士XX / 机动战士高达XX）',
  kana: 'string[] — 日文假名 OCR 结果，逐行',
  latin: 'string[] — 拉丁字母与数字 OCR 结果，逐行',
  jan: 'string|null — 条形码下方数字，尽量完整',
  copyrightYear: 'string|null — 版权年份',
  materials: 'string[] — ABS|PC|PS|PVC|DIECAST|LEATHER|PP|UNKNOWN',
  sizeClass: 'POCKET|HAND|SPAN|LARGE|UNKNOWN — 相对手掌尺寸',
  colorway: 'string|null — 主色调描述',
  partsCount: 'integer|null — 可见板件数量（模型）',
  hasScrews: 'boolean|null — 是否见螺丝',
  hasMetalParts: 'boolean|null — 是否见金属饰件/配重',
  beltStrapMaterial: 'string|null — 带子材质观感',
  buckleSeparable: 'boolean|null — 带扣是否可与带子分离',
  audioEvidence: 'none|beep|voice|bgm|unknown — 音效证据强弱',
  ledColor: 'string|null — 指示灯颜色',
  copyrightMarkShape: 'string|null — 版权标/商标形状与位置描述',
  textSharpness: 'sharp|soft|blurry|unknown — 印刷清晰度',
  packagingFinish: 'string|null — 盒面工艺（哑膜/光膜/烫金/无盒）',
  defects: 'string[] — 可见瑕疵（毛边/缩水/错位/色差）',
  visibleText: 'string[] — 其它有价值文字',
  notes: 'string|null',
  confidence: 'number 0-1 — 对以上判读的整体把握',
}

/**
 * Build the recognition prompt. Kept short on purpose: local models follow a
 * compact contract far better than a long rubric.
 * @param {object} context - what the user already told us.
 * @param {string} context.kind - belt | device | accessory | gunpla | figure | unknown.
 * @param {string} [context.hint] - free-text hint from the user.
 * @returns {string} the system prompt.
 */
export function recognitionPrompt({ kind = 'unknown', hint = '' } = {}) {
  const lines = [
    '你是特摄玩具与高达模型鉴定助手。只根据图像事实输出 JSON，不要解释，不要编造。',
    '看不清的字段填 null，不要用猜测填充。',
    '输出字段：',
    ...Object.entries(OBSERVATION_CONTRACT).map(([key, meaning]) => `- ${key}: ${meaning}`),
    `本次声称的品类：${kind}`,
  ]
  if (hint !== '') lines.push(`用户提示：${hint}`)
  lines.push('只输出一个 JSON 对象，不要 Markdown 代码块。')
  return lines.join('\n')
}

/**
 * Load an image as a data URL for the local endpoint.
 * @param {string} path - absolute image path.
 * @returns {Promise<{ dataUrl: string, bytes: number }>} encoded image.
 */
export async function encodeImage(path) {
  const info = await stat(path)
  if (!info.isFile()) throw new Error(`not a file: ${path}`)
  const bytes = await readFile(path)
  const mime = MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? 'image/png'
  return { dataUrl: `data:${mime};base64,${bytes.toString('base64')}`, bytes: info.size }
}

/**
 * Is this endpoint on this machine?
 *
 * Loopback hosts are trusted to be the user's own server; anything else is treated
 * as a third-party service, which changes whether a model may be picked for them.
 * @param {string} baseUrl - endpoint base URL.
 * @returns {boolean} true when the host is loopback.
 */
export function isLoopbackEndpoint(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl)
    return hostname === 'localhost' || hostname === '::1' || hostname === '[::1]' || /^127\./u.test(hostname)
  } catch {
    // An unparseable address cannot be proven local, so treat it as remote.
    return false
  }
}

/**
 * @param {string} baseUrl - configured endpoint, or undefined to auto-probe.
 * @returns {Promise<{ baseUrl: string, models: string[], local: boolean } | undefined>} the first reachable endpoint.
 */
export async function detectEndpoint(baseUrl) {
  // Both call sites pass a string or undefined. A wrong type used to fail as
  // "candidate.replace is not a function", which says nothing about which value
  // was wrong — the message now names the offending input.
  if (baseUrl !== undefined && typeof baseUrl !== 'string') {
    throw new TypeError(`detectEndpoint expects a string base URL or undefined, received ${typeof baseUrl}: ${JSON.stringify(baseUrl)}`)
  }
  const candidates = baseUrl ? [baseUrl] : DEFAULT_ENDPOINTS
  for (const candidate of candidates) {
    const root = candidate.replace(/\/+$/u, '')
    const result = await probe(`${root}/models`, 2500)
    if (!result.reachable) continue
    try {
      const response = await fetch(`${root}/models`, { signal: AbortSignal.timeout(2500) })
      if (!response.ok) continue
      const body = await response.json()
      const models = Array.isArray(body?.data) ? body.data.map((item) => item?.id).filter((id) => typeof id === 'string') : []
      return { baseUrl: root, models, local: isLoopbackEndpoint(root) }
    } catch {
      continue
    }
  }
  return undefined
}

/**
 * Read the plugin's vision settings out of the flat configuration.
 *
 * The plugin's `Config` schema declares these as FLAT keys (`visionEnabled`,
 * `visionBaseUrl`, `visionModel`, ...), which is also what the settings page tells
 * the assistant to write and what every README documents. Reading a nested
 * `config.vision` object here made every consumer of a vision setting throw
 * `Cannot read properties of undefined (reading 'enabled')` — including the
 * `stats` branch of `gear_knowledge`, which never touches recognition at all.
 * Routing all seven keys through this one function is what keeps that mapping
 * defined exactly once.
 * @param {object} [config] - resolved plugin configuration.
 * @returns {{ enabled: boolean, baseUrl: string | undefined, model: string, apiKey: string, timeoutMs: number, maxImages: number, maxTokens: number }} vision settings, with the schema defaults applied so a partially-populated config (a test fixture, say) still behaves.
 */
export function visionSettings(config) {
  const source = config ?? {}
  const text = (value) => (typeof value === 'string' ? value : '')
  const positive = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback)
  const baseUrl = text(source.visionBaseUrl)
  return {
    enabled: source.visionEnabled !== false,
    baseUrl: baseUrl === '' ? undefined : baseUrl,
    model: text(source.visionModel),
    apiKey: text(source.visionApiKey),
    timeoutMs: positive(source.visionTimeoutMs, 120000),
    maxImages: positive(source.visionMaxImages, 6),
    maxTokens: positive(source.visionMaxTokens, 900),
  }
}

/**
 * Run one local recognition pass.
 *
 * Never throws for an unreachable endpoint — a missing local model is an
 * expected deployment state, and the caller's fallback is a product surface,
 * not an error path.
 * @param {object} config - resolved plugin configuration.
 * @param {object} request - recognition request.
 * @param {string[]} request.images - absolute image paths.
 * @param {string} [request.kind] - claimed category.
 * @param {string} [request.hint] - user hint.
 * @param {AbortSignal} [request.signal] - caller cancellation.
 * @returns {Promise<object>} one of `{ status: 'observed', observations, raw, endpoint, model }`, `{ status: 'unavailable', reason, tried }`, or `{ status: 'failed', error, raw }`.
 */
export async function recognize(config, request) {
  const { images = [], kind = 'unknown', hint = '', signal } = request
  const vision = visionSettings(config)
  if (images.length === 0) return { status: 'unavailable', reason: 'no-images', tried: [] }
  if (!vision.enabled) return { status: 'unavailable', reason: 'disabled', tried: [] }

  const endpoint = await detectEndpoint(vision.baseUrl)
  if (endpoint === undefined) {
    return {
      status: 'unavailable',
      reason: 'no-endpoint',
      tried: vision.baseUrl ? [vision.baseUrl] : DEFAULT_ENDPOINTS,
    }
  }

  let encoded
  try {
    encoded = await Promise.all(images.slice(0, vision.maxImages).map((path) => encodeImage(path)))
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }

  // A remote endpoint must be told which model to use. Falling back to
  // `endpoint.models[0]` here sent photos to whichever model the provider happened
  // to list first, and when the provider advertises nothing the call failed as a
  // vague `no-model` that looked like a broken local setup.
  const requested = vision.model.trim()
  if (requested === '' && endpoint.local === false) {
    return {
      status: 'unavailable',
      reason: 'model-required',
      tried: [endpoint.baseUrl],
      models: endpoint.models,
    }
  }

  const model = requested !== '' ? requested : endpoint.models[0]
  if (typeof model !== 'string' || model === '') {
    return { status: 'unavailable', reason: 'no-model', tried: [endpoint.baseUrl], models: endpoint.models }
  }

  const content = [
    { type: 'text', text: recognitionPrompt({ kind, hint }) },
    ...encoded.map((item) => ({ type: 'image_url', image_url: { url: item.dataUrl } })),
  ]

  try {
    const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(vision.apiKey ? { authorization: `Bearer ${vision.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: vision.maxTokens,
        messages: [{ role: 'user', content }],
      }),
      signal: signal ?? AbortSignal.timeout(vision.timeoutMs),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { status: 'failed', error: `HTTP ${response.status} ${detail.slice(0, 300)}`.trim(), endpoint: endpoint.baseUrl }
    }
    const body = await response.json()
    const text = body?.choices?.[0]?.message?.content
    if (typeof text !== 'string') return { status: 'failed', error: 'endpoint returned no message content', endpoint: endpoint.baseUrl }
    const parsed = parseObservation(text)
    if (parsed === undefined) return { status: 'failed', error: 'endpoint output was not valid observation JSON', raw: text.slice(0, 800), endpoint: endpoint.baseUrl }
    return {
      status: 'observed',
      observations: normalizeObservations(parsed),
      raw: text.slice(0, 2000),
      endpoint: endpoint.baseUrl,
      model,
      imageCount: encoded.length,
    }
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error), endpoint: endpoint.baseUrl }
  }
}

/**
 * Extract the first JSON object from model output, tolerating code fences and
 * any prose a local model insisted on adding.
 * @param {string} text - raw model output.
 * @returns {any | undefined} the parsed object, or undefined when absent.
 */
export function parseObservation(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/u)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return undefined
  try {
    const value = JSON.parse(candidate.slice(start, end + 1))
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
  } catch {
    return undefined
  }
}

/** Fields whose closed value sets make a bad local guess worse than no answer. */
const CLOSED_FIELDS = {
  materials: new Set(['ABS', 'PC', 'PS', 'PVC', 'DIECAST', 'LEATHER', 'PP', 'UNKNOWN']),
  sizeClass: new Set(['POCKET', 'HAND', 'SPAN', 'LARGE', 'UNKNOWN']),
  audioEvidence: new Set(['none', 'beep', 'voice', 'bgm', 'unknown']),
  textSharpness: new Set(['sharp', 'soft', 'blurry', 'unknown']),
  productLine: new Set(['DX', 'CSM', 'CS', 'SHOKUGAN', 'GASHAPON', 'EG', 'HG', 'RG', 'MG', 'MGEX', 'PG', 'RE100', 'FULLMECHANICS', 'HI-RESOLUTION', 'MB', 'KAITAI-SHOKI', 'SD', 'THIRD-PARTY', '未知', 'unknown']),
}

/**
 * Coerce local-model output into the closed contract, dropping anything that
 * does not fit. Dropping is the point: a hallucinated material must not become
 * a confident judgment downstream.
 * @param {any} value - parsed model object.
 * @returns {object} the normalized observation set.
 */
export function normalizeObservations(value) {
  const out = {}
  for (const [key, raw] of Object.entries(value)) {
    if (raw === null || raw === undefined) {
      out[key] = null
      continue
    }
    if (key === 'materials') {
      const list = Array.isArray(raw) ? raw : [raw]
      out.materials = list
        .map((item) => String(item).toUpperCase().trim())
        .map((item) => (CLOSED_FIELDS.materials.has(item) ? item : 'UNKNOWN'))
        .filter((item, index, all) => all.indexOf(item) === index)
      continue
    }
    if (key === 'confidence') {
      const number = Number(raw)
      out.confidence = Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : null
      continue
    }
    if (key === 'partsCount') {
      const number = Number(raw)
      out.partsCount = Number.isInteger(number) ? number : null
      continue
    }
    if (key === 'jan') {
      const digits = String(raw).replace(/\D+/gu, '')
      out.jan = digits.length >= 8 ? digits : null
      continue
    }
    if (key in CLOSED_FIELDS) {
      const text = String(raw).trim()
      out[key] = CLOSED_FIELDS[key].has(text) ? text : 'unknown'
      continue
    }
    if (Array.isArray(raw)) {
      out[key] = raw.map((item) => String(item).trim()).filter((item) => item !== '')
      continue
    }
    out[key] = String(raw).trim()
    if (out[key] === '') out[key] = null
  }
  return out
}

/**
 * Merge user-supplied manual observations over the local model's, so a human
 * correction always beats the machine without discarding the machine's other
 * fields.
 * @param {object | undefined} observed - local model output.
 * @param {object | undefined} manual - user-supplied fields.
 * @returns {object} merged observations.
 */
export function mergeObservations(observed, manual) {
  const base = observed && typeof observed === 'object' ? { ...observed } : {}
  if (manual === null || typeof manual !== 'object') return base
  for (const [key, value] of Object.entries(manual)) {
    if (value === undefined) continue
    if (value === null || value === '') {
      delete base[key]
      continue
    }
    base[key] = value
  }
  return base
}

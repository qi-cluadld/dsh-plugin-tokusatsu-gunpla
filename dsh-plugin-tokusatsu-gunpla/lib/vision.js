/**
 * Local vision endpoint client.
 *
 * Recognition is deliberately a LOCAL capability. The plugin talks to whatever
 * OpenAI-compatible vision endpoint already runs on this machine (Ollama, LM
 * Studio, llama.cpp server, LocalAI, ...). When no endpoint answers, the
 * plugin does not silently escalate to a cloud model: it returns an
 * `unavailable` outcome so the caller can fall back to the photo checklist plus
 * manual model entry, which costs nothing.
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

/** MIME types accepted for local inference. */
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
 * @param {string} baseUrl - configured or candidate endpoint.
 * @returns {Promise<{ baseUrl: string, models: string[] } | undefined>} the first reachable endpoint.
 */
export async function detectEndpoint(baseUrl) {
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
      return { baseUrl: root, models }
    } catch {
      continue
    }
  }
  return undefined
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
  if (images.length === 0) return { status: 'unavailable', reason: 'no-images', tried: [] }
  if (!config.vision.enabled) return { status: 'unavailable', reason: 'disabled', tried: [] }

  const endpoint = await detectEndpoint(config.vision.baseUrl)
  if (endpoint === undefined) {
    return {
      status: 'unavailable',
      reason: 'no-endpoint',
      tried: config.vision.baseUrl ? [config.vision.baseUrl] : DEFAULT_ENDPOINTS,
    }
  }

  let encoded
  try {
    encoded = await Promise.all(images.slice(0, config.vision.maxImages).map((path) => encodeImage(path)))
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }

  const model = config.vision.model || endpoint.models[0]
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
        ...(config.vision.apiKey ? { authorization: `Bearer ${config.vision.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: config.vision.maxTokens,
        messages: [{ role: 'user', content }],
      }),
      signal: signal ?? AbortSignal.timeout(config.vision.timeoutMs),
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

/**
 * 假面骑士DX腰带 & 万代高达识别助手 — Host half.
 *
 * The plugin's design constraint is that only review generation may touch a
 * model. Everything else — photo-requirement enforcement, local vision
 * inference, DX/CSM decision scoring, knowledge lookup, source tiering,
 * cross-source verification, and correction feedback — is implemented here and
 * runs in-process for free.
 *
 * The browser half ships separately as `./client` (declared through
 * `package.json` → `dsh.client`), so the same package provides the onboarding
 * page, capture guide, result panel, and settings section.
 * @module @dsh-plugin/tokusatsu-gunpla
 */

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import z from '@deepseek-ai/schemastery'
import { z as zod } from 'zod'

import { COMPLIANCE, DISCLAIMER, LANGUAGES } from './i18n.js'
import { dataDir, dataPath, TtlCache } from './runtime.js'
import { loadKnowledge } from './store.js'
import { knowledgeAccessor, registerTools, TOOL_NAMES } from './tools.js'
import { detectEndpoint, DEFAULT_ENDPOINTS } from './vision.js'

/** Cordis plugin name. */
export const name = 'tokusatsu-gunpla'

/**
 * Services this plugin consumes.
 *
 * `sessionProjections` is deliberately absent. It is a progressive enhancement —
 * it carries results into the Web UI — and not every composition mounts it (the
 * desktop profile does not). Declaring it here would make the whole plugin fail
 * to activate in those compositions, and the loader would then persist a disable
 * for the row, taking the four local tools down with it for no reason. It is
 * acquired optionally in {@link apply} instead, so the tools always work and the
 * UI lights up wherever the projection service exists.
 */
export const inject = ['tools']

/** Session event type carrying one identification result. */
export const RESULT_EVENT = 'tokusatsu/result'

/** Projection key the browser half reads through `sessions.binding(id).session.projections.faceOf(...)`. */
export const RESULT_PROJECTION_KEY = 'tokusatsuResult'

/**
 * Plugin configuration.
 *
 * Every field has a deliberate default: the plugin must be useful with zero
 * configuration, and the expensive/optional capabilities (local vision, rich
 * mode, Baidu fallback) default to off or auto.
 */
export const Config = z.object({
  /** 富哥模式：also track PG/MB/解体匠机/限定/海外第三方 and CSM/CS/食玩/限定 belts. */
  richMode: z.boolean().default(false),
  /** Let the local vision endpoint be used at all. */
  visionEnabled: z.boolean().default(true),
  /** Base URL of an OpenAI-compatible vision endpoint; empty means auto-detect. */
  visionBaseUrl: z.string().default(''),
  /** Model name at that endpoint; empty means the first model it advertises. */
  visionModel: z.string().default(''),
  /** Optional bearer token for the local endpoint. */
  visionApiKey: z.string().default(''),
  /** Per-request budget for local inference. */
  visionTimeoutMs: z.number().default(120000),
  /** Cap on images sent in one recognition pass. */
  visionMaxImages: z.number().default(6),
  /** Cap on generated tokens from the local endpoint; keeps local inference snappy. */
  visionMaxTokens: z.number().default(900),
  /** Recognition cache lifetime; 0 disables the cache. */
  cacheTtlMs: z.number().default(86400000),
  /** Market language used to build search plans. */
  searchLanguage: z.union(['zh', 'en', 'ja', 'ru']).default('zh'),
  /** Whether the unverified Baidu fallback may be offered alongside Bing. */
  allowBaidu: z.boolean().default(false),
  /** Surface EU GDPR / AI Act notes on the onboarding and settings pages. */
  showCompliance: z.boolean().default(false),
  /** Whether the onboarding acknowledgement is enforced before capture. */
  requireAcknowledgement: z.boolean().default(true),
})

/**
 * Record one activation step, never throwing.
 *
 * The desktop profile exposes no readable log channel, so a plugin that fails to
 * activate leaves no evidence at all — the loader's only outward symptom is an
 * entry that stays `inactive`, which cannot distinguish "never loaded" from
 * "loaded and threw". This file is the difference between those two, so it is kept
 * in production: it costs nothing and turns an unfalsifiable symptom into a
 * readable one. Each activation starts a fresh file, so it always describes the
 * latest one rather than growing without bound.
 * @param {string} message - what happened.
 * @param {boolean} [fresh] - truncate first (the first line of one activation).
 */
function trace(message, fresh = false) {
  try {
    const file = dataPath('boot-trace.log')
    const line = `${new Date().toISOString()} ${message}\n`
    if (fresh) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, line)
    } else {
      appendFileSync(file, line)
    }
  } catch {
    // Tracing must never be the reason a boot fails.
  }
}

/**
 * Register the plugin: the local tools, the runtime status surface, and a
 * startup diagnostic that never blocks activation.
 *
 * Activation failures here are invisible by default: the desktop profile exposes
 * no readable log channel, and the loader's only outward symptom is an entry that
 * stays `inactive` with no fiber. The one thing that reliably distinguishes
 * "never loaded" from "loaded and threw" is recording entry, so this writes a
 * single line to `boot-trace.log` beside the plugin's own data. It is kept in
 * production because it costs nothing and turns an unfalsifiable symptom into a
 * readable one; see docs/INSTALL.md for the three outcomes it can show.
 * @param {object} ctx - plugin context.
 * @param {object} config - validated configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
  trace('apply() entered', true)

  /** Resolved configuration with the local endpoint's detected facts folded in. */
  const resolved = { ...config, richMode: config.richMode === true }

  ctx.logger?.info?.('tokusatsu-gunpla: registering local identification tools', {
    tools: TOOL_NAMES,
    richMode: resolved.richMode,
    dataDir: dataDir(),
  })

  try {
    for (const dispose of registerTools(ctx, { config: resolved, knowledge: knowledgeAccessor() })) {
      ctx.effect(() => dispose, 'tokusatsu-gunpla: tool registration')
    }
  } catch (error) {
    trace(`registerTools threw: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
    throw error
  }
  trace('tools registered')

  try {
    registerResultProjection(ctx)
    trace('result projection registered')
  } catch (error) {
    trace(`result projection threw: ${error instanceof Error ? error.message : String(error)}`)
  }

  // A cached, disposable status probe so the settings page can tell the user
  // whether their local vision endpoint is actually reachable without paying
  // for a model call.
  const statusCache = new TtlCache({ file: dataPath('cache', 'status.json'), ttlMs: 60000 })

  ctx.effect(() => {
    let active = true
    void (async () => {
      const knowledge = await loadKnowledge().catch(() => undefined)
      const endpoint = await detectEndpoint(config.visionBaseUrl || undefined).catch(() => undefined)
      if (!active) return
      await statusCache.set('status', {
        knowledge: knowledge?.counts ?? null,
        endpoint: endpoint ?? null,
        candidates: config.visionBaseUrl ? [config.visionBaseUrl] : DEFAULT_ENDPOINTS,
        languages: LANGUAGES.map((language) => language.id),
        compliance: config.showCompliance ? COMPLIANCE : null,
      })
    })()
    return () => {
      active = false
    }
  }, 'tokusatsu-gunpla: startup status')

  ctx.effect(() => () => {
    ctx.logger?.info?.('tokusatsu-gunpla: disposed')
  }, 'tokusatsu-gunpla: disposal marker')
}

/**
 * Register the session projection that carries the latest identification result
 * to the browser half, when the composition provides the projection service.
 *
 * The tool body appends `tokusatsu/result` with the complete post-change state,
 * which is the projection contract's whole-value rule; this unit is the pure fold
 * that turns those events into the value the result panel renders. Where the
 * service is absent the tools still work and the panel simply has no result to
 * draw, which is the correct degradation: a missing UI channel must not disable a
 * working identification engine.
 * @param {object} ctx - plugin context.
 * @returns {void}
 */
function registerResultProjection(ctx) {
  const stateSchema = zod.object({ result: zod.unknown().nullable(), at: zod.number() }).nullable()

  /**
   * The projection unit. Written as one function so both acquisition paths below
   * register exactly the same definition.
   * @returns {object} the projection definition.
   */
  const definition = {
    key: RESULT_PROJECTION_KEY,
    stateSchema,
    init: () => null,
    apply(state, event) {
      if (event.type === RESULT_EVENT) {
        const data = event.data
        if (data !== null && typeof data === 'object' && 'result' in data) {
          return { result: data.result ?? null, at: typeof data.at === 'number' ? data.at : Date.now() }
        }
      }
      return state
    },
    wire: {
      viewSchema: stateSchema,
      view: (state) => state,
    },
    stateVersion: 1,
  }

  // Preferred path: a scoped context that only materializes once the service
  // exists, so no service is read before it is available.
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['sessionProjections'], (scoped) => {
        scoped.sessionProjections.register(definition)
      })
      return
    } catch {
      // Fall through to the guarded direct attempt.
    }
  }

  try {
    ctx.sessionProjections.register(definition)
  } catch {
    ctx.logger?.info?.('tokusatsu-gunpla: session projection service absent; results stay available through the tools')
  }
}

/**
 * Copy that Host-side surfaces (like a greeting) can render.
 */
export const copy = { disclaimer: DISCLAIMER, compliance: COMPLIANCE, languages: LANGUAGES }

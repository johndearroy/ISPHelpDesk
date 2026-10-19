import type { ZodType } from 'zod'
import type { AiFeature, AiRequestStatus } from '../generated/prisma/client.js'
import { createCache, hashKey } from './cache.js'
import { extractJson } from './json.js'
import { type AiProvider, type ChatMessage, ProviderError } from './openrouter.js'

export type AiRequestLog = {
  feature: AiFeature
  model: string | null
  status: AiRequestStatus
  errorCode: string | null
  latencyMs: number
  promptTokens: number | null
  completionTokens: number | null
  userId: number | null
}

export type FallbackReason = 'no_api_key' | 'auth_failed' | 'quota_exceeded' | 'all_models_failed'

export type ChainResult<T> =
  { ok: true; data: T; model: string } | { ok: false; reason: FallbackReason }

type RunInput<T> = {
  feature: AiFeature
  userId?: number | null
  messages: ChatMessage[]
  schema: ZodType<T>
  temperature?: number
  maxTokens?: number
  cache?: boolean
}

type ChainOptions = {
  provider: AiProvider | null
  log: (entry: AiRequestLog) => Promise<unknown>
  isOverQuota?: (userId: number) => Promise<boolean>
  retryDelayMs?: number
  now?: () => number
}

const RATE_LIMIT_COOLDOWN_MS = 60 * 1000
const UNAVAILABLE_COOLDOWN_MS = 10 * 60 * 1000

type AttemptResult<T> = { status: 'success'; data: T } | { status: 'next' } | { status: 'stop' }

export function createAiChain(options: ChainOptions) {
  const { provider, retryDelayMs = 500 } = options
  const now = options.now ?? Date.now
  const cooldowns = new Map<string, number>()
  const cache = createCache<{ data: unknown; model: string }>()
  let keyRejected = false

  async function log(entry: Partial<AiRequestLog> & Pick<AiRequestLog, 'feature' | 'status'>) {
    try {
      await options.log({
        model: null,
        errorCode: null,
        latencyMs: 0,
        promptTokens: null,
        completionTokens: null,
        userId: null,
        ...entry,
      })
    } catch (error) {
      console.error('Could not log AI request', error)
    }
  }

  async function fallback<T>(input: RunInput<T>, reason: FallbackReason): Promise<ChainResult<T>> {
    await log({
      feature: input.feature,
      userId: input.userId,
      status: 'FALLBACK',
      errorCode: reason,
    })
    return { ok: false, reason }
  }

  async function attempt<T>(model: string, input: RunInput<T>): Promise<AttemptResult<T>> {
    for (let tryNumber = 1; tryNumber <= 2; tryNumber++) {
      const startedAt = now()
      try {
        const completion = await provider!.complete(model, {
          messages: input.messages,
          temperature: input.temperature ?? 0,
          maxTokens: input.maxTokens ?? 500,
        })

        let data: T
        try {
          data = input.schema.parse(extractJson(completion.text))
        } catch {
          throw new ProviderError('invalid_json', `${model} did not return the expected JSON`)
        }

        await log({
          feature: input.feature,
          userId: input.userId,
          model,
          status: 'SUCCESS',
          latencyMs: now() - startedAt,
          promptTokens: completion.promptTokens,
          completionTokens: completion.completionTokens,
        })
        return { status: 'success', data }
      } catch (error) {
        const code = error instanceof ProviderError ? error.code : 'server_error'
        await log({
          feature: input.feature,
          userId: input.userId,
          model,
          status: 'FAILED',
          errorCode: code,
          latencyMs: now() - startedAt,
        })

        if (code === 'auth_failed') {
          // every model uses the same key, so trying the others is pointless
          keyRejected = true
          return { status: 'stop' }
        }
        if (code === 'rate_limited') {
          const retryAfter = error instanceof ProviderError ? error.retryAfterMs : undefined
          cooldowns.set(model, now() + (retryAfter ?? RATE_LIMIT_COOLDOWN_MS))
          return { status: 'next' }
        }
        if (code === 'model_unavailable') {
          cooldowns.set(model, now() + UNAVAILABLE_COOLDOWN_MS)
          return { status: 'next' }
        }
        const transient = code === 'server_error' || code === 'timeout' || code === 'network_error'
        if (transient && tryNumber === 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          continue
        }
        return { status: 'next' }
      }
    }
    return { status: 'next' }
  }

  async function run<T>(input: RunInput<T>): Promise<ChainResult<T>> {
    if (!provider || provider.models.length === 0) return fallback(input, 'no_api_key')
    if (keyRejected) return fallback(input, 'auth_failed')
    if (input.userId && (await options.isOverQuota?.(input.userId))) {
      return fallback(input, 'quota_exceeded')
    }

    const useCache = input.cache ?? true
    const key = hashKey(input.feature, input.messages)
    const cached = useCache ? cache.get(key) : undefined
    if (cached) {
      return { ok: true, data: cached.data as T, model: cached.model }
    }

    for (const model of provider.models) {
      if ((cooldowns.get(model) ?? 0) > now()) continue

      const result = await attempt(model, input)
      if (result.status === 'success') {
        if (useCache) cache.set(key, { data: result.data, model })
        return { ok: true, data: result.data, model }
      }
      if (result.status === 'stop') return fallback(input, 'auth_failed')
    }

    return fallback(input, 'all_models_failed')
  }

  return {
    run,
    coolingDown: () =>
      [...cooldowns.entries()]
        .filter(([, until]) => until > now())
        .map(([model, until]) => ({ model, until: new Date(until) })),
  }
}

export type AiChain = ReturnType<typeof createAiChain>

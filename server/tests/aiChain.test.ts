import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { type AiRequestLog, createAiChain } from '../src/ai/chain.js'
import { type AiProvider, type Completion, ProviderError } from '../src/ai/openrouter.js'

const schema = z.object({ category: z.enum(['Billing', 'Connectivity']) })
const messages = [{ role: 'user' as const, content: 'net nai' }]

type Handler = (model: string) => Completion | Promise<Completion>

function reply(text: string): Completion {
  return { text, promptTokens: 10, completionTokens: 5 }
}

function setup(handler: Handler, models = ['model-a', 'model-b', 'model-c']) {
  const calls: string[] = []
  const logs: AiRequestLog[] = []
  let time = 1_000_000

  const provider: AiProvider = {
    name: 'fake',
    models,
    complete: async (model) => {
      calls.push(model)
      return handler(model)
    },
  }
  const chain = createAiChain({
    provider,
    log: async (entry) => logs.push(entry),
    retryDelayMs: 0,
    now: () => time,
  })

  return {
    chain,
    calls,
    logs,
    advance: (ms: number) => {
      time += ms
    },
    run: (cache = false) => chain.run({ feature: 'TRIAGE', messages, schema, cache }),
  }
}

describe('ai fallback chain', () => {
  it('returns the first model answer', async () => {
    const { run, calls, logs } = setup(() => reply('{"category":"Connectivity"}'))

    expect(await run()).toEqual({ ok: true, data: { category: 'Connectivity' }, model: 'model-a' })
    expect(calls).toEqual(['model-a'])
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ status: 'SUCCESS', model: 'model-a', promptTokens: 10 })
  })

  it('moves to the next model on 429 and skips the first while it cools down', async () => {
    const { run, calls, advance } = setup((model) => {
      if (model === 'model-a') throw new ProviderError('rate_limited', 'slow down', 30_000)
      return reply('{"category":"Billing"}')
    })

    expect(await run()).toMatchObject({ ok: true, model: 'model-b' })
    expect(await run()).toMatchObject({ ok: true, model: 'model-b' })
    expect(calls).toEqual(['model-a', 'model-b', 'model-b'])

    advance(31_000)
    await run()
    expect(calls.at(-2)).toBe('model-a')
  })

  it('moves on when the answer is not valid json or does not match the schema', async () => {
    const { run, calls, logs } = setup((model) => {
      if (model === 'model-a') return reply('Sure! The category is billing.')
      if (model === 'model-b') return reply('{"category":"Weather"}')
      return reply('```json\n{"category":"Billing"}\n```')
    })

    expect(await run()).toMatchObject({ ok: true, model: 'model-c', data: { category: 'Billing' } })
    expect(calls).toEqual(['model-a', 'model-b', 'model-c'])
    expect(logs.map((log) => log.errorCode)).toEqual(['invalid_json', 'invalid_json', null])
  })

  it('retries a timeout once before moving to the next model', async () => {
    const { run, calls } = setup((model) => {
      if (model === 'model-a') throw new ProviderError('timeout', 'too slow')
      return reply('{"category":"Billing"}')
    })

    expect(await run()).toMatchObject({ ok: true, model: 'model-b' })
    expect(calls).toEqual(['model-a', 'model-a', 'model-b'])
  })

  it('succeeds when the retry of a server error works', async () => {
    let failed = false
    const { run, calls } = setup(() => {
      if (!failed) {
        failed = true
        throw new ProviderError('server_error', 'bad gateway')
      }
      return reply('{"category":"Billing"}')
    })

    expect(await run()).toMatchObject({ ok: true, model: 'model-a' })
    expect(calls).toEqual(['model-a', 'model-a'])
  })

  it('stops the chain on an invalid key and does not call the provider again', async () => {
    const { run, calls } = setup(() => {
      throw new ProviderError('auth_failed', 'invalid key')
    })

    expect(await run()).toEqual({ ok: false, reason: 'auth_failed' })
    expect(await run()).toEqual({ ok: false, reason: 'auth_failed' })
    expect(calls).toEqual(['model-a'])
  })

  it('falls back when every model fails and logs the fallback', async () => {
    const { run, logs } = setup(() => {
      throw new ProviderError('bad_request', 'nope')
    })

    expect(await run()).toEqual({ ok: false, reason: 'all_models_failed' })
    expect(logs.at(-1)).toMatchObject({ status: 'FALLBACK', errorCode: 'all_models_failed' })
    expect(logs.filter((log) => log.status === 'FAILED')).toHaveLength(3)
  })

  it('falls back without calling anything when no key is configured', async () => {
    const logs: AiRequestLog[] = []
    const chain = createAiChain({ provider: null, log: async (entry) => logs.push(entry) })

    const result = await chain.run({ feature: 'TRIAGE', messages, schema })
    expect(result).toEqual({ ok: false, reason: 'no_api_key' })
    expect(logs[0]).toMatchObject({ status: 'FALLBACK', errorCode: 'no_api_key' })
  })

  it('falls back when the user is over the daily quota', async () => {
    const handler = vi.fn(() => reply('{"category":"Billing"}'))
    const chain = createAiChain({
      provider: { name: 'fake', models: ['model-a'], complete: async () => handler() },
      log: async () => {},
      isOverQuota: async () => true,
    })

    const result = await chain.run({ feature: 'TRIAGE', messages, schema, userId: 7 })
    expect(result).toEqual({ ok: false, reason: 'quota_exceeded' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('answers repeated requests from the cache', async () => {
    const { run, calls } = setup(() => reply('{"category":"Billing"}'))

    await run(true)
    expect(await run(true)).toMatchObject({ ok: true, data: { category: 'Billing' } })
    expect(calls).toEqual(['model-a'])
  })
})

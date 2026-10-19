import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOpenRouterProvider, ProviderError } from '../src/ai/openrouter.js'

const provider = createOpenRouterProvider({
  apiKey: 'test-key',
  baseUrl: 'https://openrouter.test/api/v1',
  models: ['model-a'],
  timeoutMs: 1000,
})

const request = {
  messages: [{ role: 'user' as const, content: 'hello' }],
  temperature: 0,
  maxTokens: 100,
}

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function expectError(code: string) {
  const error = await provider.complete('model-a', request).catch((err) => err)
  expect(error).toBeInstanceOf(ProviderError)
  expect(error.code).toBe(code)
  return error as ProviderError
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openrouter client', () => {
  it('sends the request and reads the answer and token usage', async () => {
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: ' {"ok":true} ' } }],
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    })

    const result = await provider.complete('model-a', request)
    expect(result).toEqual({ text: '{"ok":true}', promptTokens: 12, completionTokens: 3 })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://openrouter.test/api/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body as string)).toMatchObject({ model: 'model-a', max_tokens: 100 })
  })

  it('maps 429 to rate_limited with the retry-after delay', async () => {
    mockFetch(
      429,
      { error: { code: 429, message: 'Rate limit exceeded' } },
      { 'retry-after': '30' },
    )
    const error = await expectError('rate_limited')
    expect(error.retryAfterMs).toBe(30_000)
  })

  it('maps status codes to error codes', async () => {
    mockFetch(401, { error: { message: 'No auth credentials found' } })
    await expectError('auth_failed')

    mockFetch(404, { error: { message: 'No endpoints found' } })
    await expectError('model_unavailable')

    mockFetch(502, { error: { message: 'Provider returned error' } })
    await expectError('server_error')
  })

  it('treats an error inside a 200 response as a failure', async () => {
    mockFetch(200, { error: { code: 502, message: 'Upstream error' } })
    await expectError('server_error')
  })

  it('treats an empty answer as a failure', async () => {
    mockFetch(200, { choices: [{ message: { content: '' } }] })
    await expectError('empty_response')
  })

  it('reports timeouts and network errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation timed out', 'TimeoutError')
      }),
    )
    await expectError('timeout')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    await expectError('network_error')
  })
})

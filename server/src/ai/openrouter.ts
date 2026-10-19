export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type CompletionRequest = {
  messages: ChatMessage[]
  temperature: number
  maxTokens: number
}

export type Completion = {
  text: string
  promptTokens: number | null
  completionTokens: number | null
}

export type ProviderErrorCode =
  | 'rate_limited'
  | 'auth_failed'
  | 'model_unavailable'
  | 'server_error'
  | 'timeout'
  | 'network_error'
  | 'bad_request'
  | 'empty_response'
  | 'invalid_json'

export class ProviderError extends Error {
  code: ProviderErrorCode
  retryAfterMs?: number

  constructor(code: ProviderErrorCode, message: string, retryAfterMs?: number) {
    super(message)
    this.code = code
    this.retryAfterMs = retryAfterMs
  }
}

export interface AiProvider {
  name: string
  models: string[]
  complete(model: string, request: CompletionRequest): Promise<Completion>
}

type OpenRouterOptions = {
  apiKey: string
  baseUrl: string
  models: string[]
  timeoutMs: number
  appUrl?: string
}

type OpenRouterResponse = {
  choices?: { message?: { content?: string | null } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { code?: number; message?: string }
}

function codeForStatus(status: number): ProviderErrorCode {
  if (status === 429) return 'rate_limited'
  if (status === 401) return 'auth_failed'
  if (status === 402 || status === 404) return 'model_unavailable'
  if (status === 408) return 'timeout'
  if (status >= 500) return 'server_error'
  return 'bad_request'
}

function parseRetryAfter(header: string | null) {
  const seconds = Number(header)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
}

export function createOpenRouterProvider(options: OpenRouterOptions): AiProvider {
  return {
    name: 'openrouter',
    models: options.models,

    async complete(model, request) {
      let response: Response
      try {
        response = await fetch(`${options.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': options.appUrl ?? 'http://localhost:5173',
            'X-Title': 'Helpdesk',
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
          }),
          signal: AbortSignal.timeout(options.timeoutMs),
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new ProviderError('timeout', `No response from ${model} in ${options.timeoutMs}ms`)
        }
        throw new ProviderError('network_error', `Could not reach OpenRouter: ${String(error)}`)
      }

      const body = (await response.json().catch(() => null)) as OpenRouterResponse | null

      if (!response.ok) {
        throw new ProviderError(
          codeForStatus(response.status),
          body?.error?.message ?? `OpenRouter returned ${response.status}`,
          parseRetryAfter(response.headers.get('retry-after')),
        )
      }

      // openrouter can answer 200 and still put an error in the body
      if (body?.error) {
        throw new ProviderError(
          codeForStatus(body.error.code ?? 500),
          body.error.message ?? 'Model returned an error',
        )
      }

      const text = body?.choices?.[0]?.message?.content?.trim()
      if (!text) {
        throw new ProviderError('empty_response', `${model} returned an empty answer`)
      }

      return {
        text,
        promptTokens: body?.usage?.prompt_tokens ?? null,
        completionTokens: body?.usage?.completion_tokens ?? null,
      }
    },
  }
}

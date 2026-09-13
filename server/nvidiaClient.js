const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const NVIDIA_TIMEOUT_MS = 20000

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_NVIDIA_BASE_URL).replace(/\/+$/g, '')
}

function isProbablyNvidiaApiKey(value) {
  return typeof value === 'string' && value.startsWith('nvapi-') && value.length > 'nvapi-'.length
}

function requireNvidiaConfig() {
  const apiKey = process.env.NVIDIA_API_KEY
  const model = process.env.NVIDIA_MODEL

  if (!apiKey || !model) {
    const error = new Error('AI assistant is not configured.')
    error.status = 503
    error.code = 'AI_CONFIG_MISSING'
    throw error
  }

  if (!isProbablyNvidiaApiKey(apiKey)) {
    const error = new Error('AI assistant provider key is not configured correctly.')
    error.status = 503
    error.code = 'AI_PROVIDER_KEY_INVALID'
    throw error
  }

  return {
    apiKey,
    model,
    baseUrl: normalizeBaseUrl(process.env.NVIDIA_BASE_URL),
  }
}

function createProviderError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function normalizeProviderStatus(status) {
  if (status === 401 || status === 403) return 503
  if (status === 404 || status === 410) return 503
  if (status === 429) return 429
  if (status >= 500) return 503
  return 502
}

function getProviderErrorCode(status) {
  if (status === 401 || status === 403) return 'AI_PROVIDER_AUTH_FAILED'
  if (status === 404 || status === 410) return 'AI_PROVIDER_MODEL_UNAVAILABLE'
  if (status === 429) return 'AI_PROVIDER_RATE_LIMITED'
  if (status >= 500) return 'AI_PROVIDER_UNAVAILABLE'
  return 'AI_PROVIDER_FAILED'
}

async function readSafeProviderError(response) {
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) return null

  const payload = await response.json().catch(() => null)
  const detail = payload?.detail || payload?.error?.message || payload?.title

  return typeof detail === 'string' ? detail.slice(0, 180) : null
}

export async function createNvidiaChatCompletion({ messages, user }) {
  const startedAt = Date.now()
  const { apiKey, model, baseUrl } = requireNvidiaConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 700,
        stream: false,
        ...(user ? { user } : {}),
      }),
    })

    if (!response.ok) {
      const providerDetail = await readSafeProviderError(response)
      const error = createProviderError(
        normalizeProviderStatus(response.status),
        getProviderErrorCode(response.status),
        'AI assistant is temporarily unavailable.',
      )
      error.latencyMs = Date.now() - startedAt
      error.providerStatus = response.status
      error.providerDetail = providerDetail
      throw error
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content

    if (!content) {
      const error = createProviderError(
        502,
        'AI_EMPTY_RESPONSE',
        'AI assistant returned an empty response.',
      )
      error.latencyMs = Date.now() - startedAt
      throw error
    }

    return {
      content,
      model,
      baseUrl,
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = createProviderError(
        504,
        'AI_PROVIDER_TIMEOUT',
        'AI assistant is temporarily unavailable.',
      )
      timeoutError.latencyMs = Date.now() - startedAt
      throw timeoutError
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

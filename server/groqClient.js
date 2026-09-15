const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const GROQ_TIMEOUT_MS = 20000

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_GROQ_BASE_URL).replace(/\/+$/g, '')
}

function isProbablyGroqApiKey(value) {
  return typeof value === 'string' && value.startsWith('gsk_') && value.length > 'gsk_'.length
}

function safeProviderMessage(value, fallback = 'Groq request failed') {
  if (typeof value !== 'string' || !value.trim()) return fallback

  return value
    .replace(/gsk_[A-Za-z0-9_-]+/g, '[REDACTED_GROQ_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[REDACTED_TOKEN]')
    .slice(0, 180)
}

export function getGroqConfigStatus() {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || ''

  return {
    hasGroqKey: Boolean(apiKey),
    hasGroqApiKey: Boolean(apiKey),
    groqApiKeyLooksValid: isProbablyGroqApiKey(apiKey),
    hasGroqModel: Boolean(model),
    hasCustomGroqBaseUrl: Boolean(process.env.GROQ_BASE_URL),
    model,
  }
}

function createProviderError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function requireGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL
  const configStatus = getGroqConfigStatus()

  if (!apiKey) {
    const error = createProviderError(500, 'GROQ_KEY_MISSING', 'AI server configuration is missing')
    error.configStatus = configStatus
    error.missingConfig = ['GROQ_API_KEY']
    throw error
  }

  if (!model) {
    const error = createProviderError(500, 'GROQ_MODEL_ERROR', 'Groq model is not configured')
    error.configStatus = configStatus
    error.missingConfig = ['GROQ_MODEL']
    throw error
  }

  if (!isProbablyGroqApiKey(apiKey)) {
    const error = createProviderError(401, 'GROQ_AUTH_ERROR', 'Groq API key format is invalid')
    error.configStatus = configStatus
    throw error
  }

  return {
    apiKey,
    model,
    baseUrl: normalizeBaseUrl(process.env.GROQ_BASE_URL),
  }
}

function normalizeProviderStatus(status) {
  if (status === 401 || status === 403) return 401
  if (status === 404 || status === 410) return 404
  if (status === 429) return 429
  if (status >= 500) return 502
  return 502
}

function getProviderErrorCode(status) {
  if (status === 401 || status === 403) return 'GROQ_AUTH_ERROR'
  if (status === 404 || status === 410) return 'GROQ_MODEL_ERROR'
  if (status === 429) return 'GROQ_RATE_LIMIT'
  if (status >= 500) return 'GROQ_PROVIDER_ERROR'
  return 'GROQ_PROVIDER_ERROR'
}

async function readSafeProviderError(response) {
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '')
    return safeProviderMessage(text, 'Groq request failed')
  }

  const payload = await response.json().catch(() => null)
  const detail = payload?.error?.message || payload?.error?.code || payload?.message
  return safeProviderMessage(detail, 'Groq request failed')
}

export async function createGroqChatCompletion({ messages, user }) {
  const startedAt = Date.now()
  const { apiKey, model, baseUrl } = requireGroqConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)

  console.log('[AI] Sending request to Groq', {
    provider: 'groq',
    model,
  })

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
        max_completion_tokens: 700,
        response_format: { type: 'json_object' },
        stream: false,
        ...(user ? { user } : {}),
      }),
    })

    console.log('[AI] Groq response received', {
      provider: 'groq',
      status: response.status,
      ok: response.ok,
      latencyMs: Date.now() - startedAt,
    })

    if (!response.ok) {
      const providerDetail = await readSafeProviderError(response)
      const code = getProviderErrorCode(response.status)
      const error = createProviderError(
        normalizeProviderStatus(response.status),
        code,
        providerDetail || 'Groq request failed',
      )
      error.latencyMs = Date.now() - startedAt
      error.providerStatus = response.status
      error.providerDetail = providerDetail
      error.providerCode = code

      console.error('[AI GROQ ERROR]', {
        provider: 'groq',
        status: response.status,
        code,
        message: providerDetail,
        latencyMs: error.latencyMs,
      })

      throw error
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content

    if (!content) {
      const error = createProviderError(
        502,
        'GROQ_PROVIDER_ERROR',
        'Groq returned an empty response',
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
        'AI_TIMEOUT',
        'AI provider request timed out',
      )
      timeoutError.latencyMs = Date.now() - startedAt
      console.error('[AI GROQ ERROR]', {
        provider: 'groq',
        status: 504,
        code: timeoutError.code,
        message: timeoutError.message,
        latencyMs: timeoutError.latencyMs,
      })
      throw timeoutError
    }

    if (!error.code) {
      const providerError = createProviderError(
        502,
        'GROQ_PROVIDER_ERROR',
        safeProviderMessage(error.message, 'Groq request failed'),
      )
      providerError.latencyMs = Date.now() - startedAt
      console.error('[AI GROQ ERROR]', {
        provider: 'groq',
        status: providerError.status,
        code: providerError.code,
        message: providerError.message,
        latencyMs: providerError.latencyMs,
      })
      throw providerError
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}
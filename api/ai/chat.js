import { getGroqConfigStatus } from '../../server/groqClient.js'
import {
  assertAiRateLimit,
  handleAiShoppingAssistant,
  verifyOptionalFirebaseRequest,
} from '../../server/aiShoppingAssistant.js'

export const config = {
  maxDuration: 30,
}

function safeLogText(value) {
  if (typeof value !== 'string') return null

  return value
    .replace(/gsk_[A-Za-z0-9_-]+/g, '[REDACTED_GROQ_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[REDACTED_TOKEN]')
    .slice(0, 180)
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function sendSuccess(res, body = {}) {
  return sendJson(res, 200, {
    success: true,
    ...body,
  })
}

async function parseJsonBody(req, { maxBytes = 64 * 1024 } = {}) {
  const contentLength = Number(req.headers['content-length'] || 0)

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    const error = new Error('Request body is too large.')
    error.status = 413
    error.code = 'request/body-too-large'
    throw error
  }

  if (req.body !== undefined) {
    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
      return req.body
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '')

    if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
      const error = new Error('Request body is too large.')
      error.status = 413
      error.code = 'request/body-too-large'
      throw error
    }

    if (!rawBody) return {}

    try {
      return JSON.parse(rawBody)
    } catch {
      const error = new Error('Invalid JSON request body.')
      error.status = 400
      error.code = 'request/invalid-json'
      throw error
    }
  }

  const chunks = []
  let receivedBytes = 0

  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    receivedBytes += buffer.byteLength

    if (receivedBytes > maxBytes) {
      const error = new Error('Request body is too large.')
      error.status = 413
      error.code = 'request/body-too-large'
      throw error
    }

    chunks.push(buffer)
  }

  if (chunks.length === 0) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Invalid JSON request body.')
    error.status = 400
    error.code = 'request/invalid-json'
    throw error
  }
}

function sendAiError(res, status, error, code) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    success: false,
    error,
    code,
  }))
}

function getSafeAiConfigStatus() {
  return {
    ...getGroqConfigStatus(),
    firebaseAdminConfigured: Boolean((process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) && (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL) && (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)),
  }
}

function mapErrorCode(error) {
  const code = error.code || 'INTERNAL_ERROR'

  const codeMap = {
    AI_CONFIG_MISSING: 'GROQ_KEY_MISSING',
    AI_PROVIDER_KEY_INVALID: 'GROQ_AUTH_ERROR',
    AI_PROVIDER_AUTH_FAILED: 'GROQ_AUTH_ERROR',
    AI_PROVIDER_RATE_LIMITED: 'GROQ_RATE_LIMIT',
    AI_PROVIDER_MODEL_UNAVAILABLE: 'GROQ_MODEL_ERROR',
    AI_PROVIDER_TIMEOUT: 'AI_TIMEOUT',
    AI_PROVIDER_UNAVAILABLE: 'GROQ_PROVIDER_ERROR',
    AI_PROVIDER_FAILED: 'GROQ_PROVIDER_ERROR',
    AI_EMPTY_RESPONSE: 'GROQ_PROVIDER_ERROR',
    AI_INVALID_JSON: 'GROQ_PROVIDER_ERROR',
    AI_MESSAGE_REQUIRED: 'INVALID_REQUEST',
    AI_MESSAGE_TOO_LONG: 'INVALID_REQUEST',
    'request/invalid-json': 'INVALID_REQUEST',
    'request/body-too-large': 'INVALID_REQUEST',
    'auth/invalid-token': 'AUTHENTICATION_FAILED',
    auth_invalid_token: 'AUTHENTICATION_FAILED',
  }

  return codeMap[code] || code
}

function getSafeErrorMessage(error, code, status) {
  const message = safeLogText(error.message)

  if (code === 'GROQ_KEY_MISSING') return 'AI server configuration is missing'
  if (code === 'GROQ_AUTH_ERROR') return message || 'Groq authentication failed'
  if (code === 'GROQ_RATE_LIMIT') return message || 'Groq rate limit reached'
  if (code === 'GROQ_MODEL_ERROR') return message || 'Groq model is unavailable or not configured'
  if (code === 'GROQ_PROVIDER_ERROR') return message || 'Groq request failed'
  if (code === 'PRODUCT_CATALOG_ERROR') return message || 'Product catalog could not be loaded'
  if (code === 'AI_TIMEOUT') return 'AI provider request timed out'
  if (code === 'INVALID_REQUEST') return message || 'Invalid AI request'
  if (code === 'METHOD_NOT_ALLOWED') return 'Method not allowed'
  if (code === 'AUTHENTICATION_FAILED') return 'Authentication failed'

  return status >= 500 ? 'Internal AI server error' : message || 'AI request failed'
}

function logAiChatFailure(error, req, status, code, safeMessage) {
  console.error('[AI API ERROR]', {
    stage: error.stage || 'api',
    route: '/api/ai/chat',
    method: req.method,
    status,
    provider: 'groq',
    code,
    providerStatus: error.providerStatus || null,
    message: safeMessage,
    providerDetail: safeLogText(error.providerDetail),
    missingConfig: Array.isArray(error.missingConfig) ? error.missingConfig : [],
    config: error.configStatus || getSafeAiConfigStatus(),
  })
}

export default async function handler(req, res) {
  console.log('[AI] Request received', {
    method: req.method,
    route: '/api/ai/chat',
  })

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendAiError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED')
  }

  const configStatus = getGroqConfigStatus()
  console.log('[AI CONFIG]', {
    hasGroqKey: configStatus.hasGroqKey,
    environment: process.env.VERCEL_ENV || 'local',
    model: configStatus.model || null,
  })

  if (!configStatus.hasGroqKey) {
    return sendAiError(res, 500, 'AI server configuration is missing', 'GROQ_KEY_MISSING')
  }

  if (!configStatus.hasGroqModel) {
    return sendAiError(res, 500, 'Groq model is not configured', 'GROQ_MODEL_ERROR')
  }

  try {
    const decodedToken = await verifyOptionalFirebaseRequest(req)
    assertAiRateLimit(req, decodedToken?.uid)

    const body = await parseJsonBody(req)
    const response = await handleAiShoppingAssistant(body, {
      uid: decodedToken?.uid || '',
      useFirestoreProducts: Boolean(decodedToken?.uid),
    })

    return sendSuccess(res, { response })
  } catch (error) {
    const status = error.status || 500
    const code = mapErrorCode(error)
    const safeMessage = getSafeErrorMessage(error, code, status)

    logAiChatFailure(error, req, status, code, safeMessage)

    return sendAiError(res, status, safeMessage, code)
  }
}
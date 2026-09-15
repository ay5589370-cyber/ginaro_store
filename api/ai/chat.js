import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
} from '../../server/customDesignAssets.js'
import { isFirebaseAdminConfigured } from '../../server/firebaseAdmin.js'
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

function getSafeAiConfigStatus() {
  return {
    ...getGroqConfigStatus(),
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
  }
}

function logAiChatFailure(error, req, status) {
  console.error('GINARO AI chat failed', {
    route: '/api/ai/chat',
    method: req.method,
    status,
    code: error.code || 'AI_CHAT_FAILED',
    errorName: error.name || 'Error',
    providerStatus: error.providerStatus || null,
    providerDetail: safeLogText(error.providerDetail),
    missingConfig: Array.isArray(error.missingConfig) ? error.missingConfig : [],
    config: error.configStatus || getSafeAiConfigStatus(),
  })
}

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyOptionalFirebaseRequest(req)
    assertAiRateLimit(req, decodedToken?.uid)

    const body = await parseJsonBody(req)
    const response = await handleAiShoppingAssistant(body, {
      uid: decodedToken?.uid || '',
    })

    return sendSuccess(res, { response })
  } catch (error) {
    const status = error.status || 500
    const safeMessage = status === 500
      ? "Sorry, I couldn't process that right now."
      : error.message

    logAiChatFailure(error, req, status)

    return sendSafeError(
      res,
      status,
      safeMessage,
      error.code || 'AI_CHAT_FAILED',
    )
  }
}

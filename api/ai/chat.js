import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
} from '../../server/customDesignAssets.js'
import {
  assertAiRateLimit,
  handleAiShoppingAssistant,
  verifyOptionalFirebaseRequest,
} from '../../server/aiShoppingAssistant.js'

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

    return sendSafeError(
      res,
      status,
      safeMessage,
      error.code || 'AI_CHAT_FAILED',
    )
  }
}

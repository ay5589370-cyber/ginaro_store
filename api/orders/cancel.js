import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'
import { sendOrderStatusNotification } from '../../server/emailService.js'
import { cancelOrderWithInventory } from '../../server/orders.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const { orderId } = await parseJsonBody(req)
    const order = await cancelOrderWithInventory({
      uid: decodedToken.uid,
      orderId,
    })
    const emailNotification = await sendOrderStatusNotification(order)

    return sendSuccess(res, { order, emailNotification })
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to cancel this order.' : error.message,
      error.code || 'ORDER_CANCEL_FAILED',
    )
  }
}

import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'
import { sendOrderPlacedNotifications } from '../../server/emailService.js'
import { createOrderWithInventory } from '../../server/orders.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const body = await parseJsonBody(req)
    const order = await createOrderWithInventory({
      uid: decodedToken.uid,
      userEmail: decodedToken.email || '',
      orderData: body.orderData || body,
    })
    const emailNotifications = await sendOrderPlacedNotifications(order)

    return sendSuccess(res, {
      orderId: order.id,
      total: order.total,
      order,
      emailNotifications,
    })
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to place your order.' : error.message,
      error.code || 'ORDER_CREATE_FAILED',
    )
  }
}

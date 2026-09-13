import {
  assertMethod,
  sendSafeError,
  sendSuccess,
} from '../../../server/customDesignAssets.js'
import { parseAdminJsonBody, verifyAdminRequest } from '../../../server/admin.js'
import { sendOrderStatusNotification } from '../../../server/emailService.js'
import { updateOrderStatusAsAdmin } from '../../../server/orders.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    await verifyAdminRequest(req)
    const { orderId, orderStatus } = await parseAdminJsonBody(req)
    const order = await updateOrderStatusAsAdmin({ orderId, orderStatus })
    const emailNotification = order.statusChanged
      ? await sendOrderStatusNotification(order)
      : { status: 'skipped', reason: 'status-unchanged' }

    return sendSuccess(res, { order, emailNotification })
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to update order status.' : error.message,
      error.code || 'ADMIN_ORDER_UPDATE_FAILED',
    )
  }
}

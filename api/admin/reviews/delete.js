import {
  assertMethod,
  sendSafeError,
  sendSuccess,
} from '../../../server/customDesignAssets.js'
import { parseAdminJsonBody, verifyAdminRequest } from '../../../server/admin.js'
import { deleteProductReview } from '../../../server/reviews.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyAdminRequest(req)
    const body = await parseAdminJsonBody(req)
    const result = await deleteProductReview({
      uid: decodedToken.uid,
      productId: body.productId,
      reviewId: body.reviewId,
      isAdmin: true,
    })

    return sendSuccess(res, result)
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to remove review.' : error.message,
      error.code || 'ADMIN_REVIEW_DELETE_FAILED',
    )
  }
}

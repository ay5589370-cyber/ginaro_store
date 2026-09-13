import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'
import { deleteProductReview } from '../../server/reviews.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const body = await parseJsonBody(req)
    const result = await deleteProductReview({
      uid: decodedToken.uid,
      productId: body.productId,
      reviewId: decodedToken.uid,
    })

    return sendSuccess(res, result)
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to delete review.' : error.message,
      error.code || 'REVIEW_DELETE_FAILED',
    )
  }
}

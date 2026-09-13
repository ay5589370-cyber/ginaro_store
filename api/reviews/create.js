import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'
import { createProductReview } from '../../server/reviews.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const body = await parseJsonBody(req)
    const review = await createProductReview({
      uid: decodedToken.uid,
      productId: body.productId,
      orderId: body.orderId,
      rating: body.rating,
      title: body.title,
      comment: body.comment,
    })

    return sendSuccess(res, { review })
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to submit review.' : error.message,
      error.code || 'REVIEW_CREATE_FAILED',
    )
  }
}

import {
  assertMethod,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'
import { updateProductReview } from '../../server/reviews.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const body = await parseJsonBody(req)
    const review = await updateProductReview({
      uid: decodedToken.uid,
      productId: body.productId,
      rating: body.rating,
      title: body.title,
      comment: body.comment,
    })

    return sendSuccess(res, { review })
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to update review.' : error.message,
      error.code || 'REVIEW_UPDATE_FAILED',
    )
  }
}

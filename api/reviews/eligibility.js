import {
  assertMethod,
  sendSafeError,
  sendSuccess,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'
import { getReviewEligibility } from '../../server/reviews.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'GET')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
    const eligibility = await getReviewEligibility({
      uid: decodedToken.uid,
      productId: url.searchParams.get('productId'),
    })

    return sendSuccess(res, eligibility)
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to check review eligibility.' : error.message,
      error.code || 'REVIEW_ELIGIBILITY_FAILED',
    )
  }
}

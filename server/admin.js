import {
  parseJsonBody,
  verifyFirebaseRequest,
} from './customDesignAssets.js'
import { getAdminFirestore } from './firebaseAdmin.js'
import { createHttpError } from './orders.js'

export async function verifyAdminRequest(req) {
  const decodedToken = await verifyFirebaseRequest(req)
  const profileSnapshot = await getAdminFirestore()
    .collection('users')
    .doc(decodedToken.uid)
    .get()

  if (!profileSnapshot.exists || profileSnapshot.data()?.role !== 'admin') {
    throw createHttpError(403, 'ADMIN_REQUIRED', 'Admin access is required.')
  }

  return decodedToken
}

export async function parseAdminJsonBody(req) {
  const body = await parseJsonBody(req)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createHttpError(400, 'INVALID_REQUEST', 'Invalid request body.')
  }

  return body
}

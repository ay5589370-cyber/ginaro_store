import {
  assertMethod,
  collectDesignStoragePaths,
  createSignedCustomDesignUrl,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  SIGNED_URL_EXPIRES_IN,
  validateStoragePathOwnership,
  verifyDesignOwnership,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const { designId, storagePath } = await parseJsonBody(req)
    const normalizedDesignId = String(designId || '')
    const normalizedStoragePath = String(storagePath || '')
    const design = await verifyDesignOwnership(decodedToken.uid, normalizedDesignId)
    const knownPaths = collectDesignStoragePaths(design)

    if (
      !validateStoragePathOwnership(decodedToken.uid, normalizedDesignId, normalizedStoragePath)
      || !knownPaths.includes(normalizedStoragePath)
    ) {
      return sendSafeError(res, 403, 'You do not have permission to view this design artwork.', 'storage/path-not-owned')
    }

    const signedUrl = await createSignedCustomDesignUrl(normalizedStoragePath)

    return sendSuccess(res, {
      signedUrl,
      expiresIn: SIGNED_URL_EXPIRES_IN,
    })
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to create signed URL.' : error.message,
      error.code || 'storage/signed-url-failed',
    )
  }
}

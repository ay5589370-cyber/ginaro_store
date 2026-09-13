import {
  assertMethod,
  collectDesignStoragePaths,
  deleteCustomDesignFiles,
  parseJsonBody,
  sendSafeError,
  sendSuccess,
  validateStoragePathOwnership,
  verifyDesignOwnership,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'DELETE')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const { designId, storagePath } = await parseJsonBody(req)
    const normalizedDesignId = String(designId || '')
    const design = await verifyDesignOwnership(decodedToken.uid, normalizedDesignId)
    const knownPaths = collectDesignStoragePaths(design)
    const requestedPath = typeof storagePath === 'string' ? storagePath : ''
    const pathsToDelete = requestedPath ? [requestedPath] : knownPaths
    const safePaths = pathsToDelete.filter(
      (path) =>
        knownPaths.includes(path)
          && validateStoragePathOwnership(decodedToken.uid, normalizedDesignId, path),
    )

    if (pathsToDelete.length > 0 && safePaths.length !== pathsToDelete.length) {
      return sendSafeError(res, 403, 'You do not have permission to delete this design artwork.', 'storage/path-not-owned')
    }

    const result = await deleteCustomDesignFiles(safePaths)

    return sendSuccess(res, result)
  } catch (error) {
    return sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to delete design artwork.' : error.message,
      error.code || 'storage/delete-failed',
    )
  }
}

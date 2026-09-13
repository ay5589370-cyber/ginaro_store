import {
  assertMethod,
  sendSafeError,
  sendSuccess,
  parseMultipartForm,
  uploadCustomDesignFile,
  verifyDesignOwnership,
  verifyFirebaseRequest,
} from '../../server/customDesignAssets.js'

export default async function handler(req, res) {
  if (!assertMethod(req, res, 'POST')) return

  try {
    const decodedToken = await verifyFirebaseRequest(req)
    const formData = await parseMultipartForm(req)
    const designId = String(formData.get('designId') || '')
    const side = String(formData.get('side') || 'asset')
    const file = formData.get('file')

    await verifyDesignOwnership(decodedToken.uid, designId)
    const result = await uploadCustomDesignFile({
      uid: decodedToken.uid,
      designId,
      file,
      side,
    })

    sendSuccess(res, result)
  } catch (error) {
    sendSafeError(
      res,
      error.status || 500,
      error.status === 500 ? 'Unable to upload design artwork.' : error.message,
      error.code || 'storage/upload-failed',
    )
  }
}

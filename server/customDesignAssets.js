import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { getAdminAuth, getAdminFirestore, isFirebaseAdminConfigured } from './firebaseAdmin.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

export const CUSTOM_DESIGNS_BUCKET = 'custom-designs'
export const CUSTOM_DESIGN_MAX_BYTES = 10 * 1024 * 1024
export const CUSTOM_DESIGN_MAX_REQUEST_BYTES = CUSTOM_DESIGN_MAX_BYTES + 1024 * 1024
export const CUSTOM_DESIGN_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
export const JSON_BODY_MAX_BYTES = 64 * 1024
export const SIGNED_URL_EXPIRES_IN = 10 * 60

function createHttpError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function sendSafeError(res, status, message, code = 'request/error') {
  return sendJson(res, status, {
    success: false,
    error: { code, message },
  })
}

export function sendSuccess(res, body = {}) {
  return sendJson(res, 200, {
    success: true,
    ...body,
  })
}

export function assertMethod(req, res, method) {
  if (req.method === method) return true

  res.setHeader('Allow', method)
  sendSafeError(res, 405, 'Method not allowed.', 'request/method-not-allowed')
  return false
}

export async function verifyFirebaseRequest(req) {
  const header = req.headers.authorization || ''
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || []

  if (!token) {
    const error = new Error('Unauthorized.')
    error.status = 401
    error.code = 'auth/missing-token'
    throw error
  }

  if (!isFirebaseAdminConfigured()) {
    const error = new Error('Server authentication is not configured.')
    error.status = 500
    error.code = 'SERVER_CONFIG_MISSING'
    throw error
  }

  try {
    return await getAdminAuth().verifyIdToken(token)
  } catch {
    const error = new Error('Unauthorized.')
    error.status = 401
    error.code = 'auth/invalid-token'
    throw error
  }
}

export function isSafeDesignId(designId) {
  return typeof designId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(designId)
}

export function sanitizeFileName(fileName = 'design-asset') {
  const sanitized = String(fileName)
    .trim()
    .toLowerCase()
    .replace(/\.[./\\]+/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')

  return sanitized || 'design-asset'
}

function getFileExtension(file) {
  const byType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }

  return byType[file.type] || sanitizeFileName(file.name).split('.').pop() || 'webp'
}

function getUserDesignAssetPrefix(uid, designId) {
  return `${uid}/${designId}/assets/`
}

export function buildStoragePath(uid, designId, file, side = 'asset') {
  const safeName = sanitizeFileName(file.name)
  const baseName = safeName.replace(/\.[a-z0-9]+$/i, '') || 'design-asset'
  const safeSide = sanitizeFileName(side).replace(/\./g, '') || 'asset'
  const extension = getFileExtension(file)

  return `${getUserDesignAssetPrefix(uid, designId)}${safeSide}-${randomUUID()}-${baseName}.${extension}`
}

export function validateStoragePathOwnership(uid, designId, storagePath) {
  if (!isSafeDesignId(designId)) return false
  if (typeof storagePath !== 'string') return false
  if (storagePath.includes('\\') || storagePath.includes('..')) return false

  return storagePath.startsWith(getUserDesignAssetPrefix(uid, designId))
}

export async function verifyDesignOwnership(uid, designId) {
  if (!isSafeDesignId(designId)) {
    const error = new Error('Invalid design ID.')
    error.status = 400
    error.code = 'designs/invalid-id'
    throw error
  }

  const snapshot = await getAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('designs')
    .doc(designId)
    .get()

  if (!snapshot.exists) {
    const error = new Error('Design not found.')
    error.status = 403
    error.code = 'designs/not-owned'
    throw error
  }

  return snapshot.data()
}

export function collectDesignStoragePaths(design = {}) {
  const paths = new Set()
  const candidates = [
    ...(Array.isArray(design.uploadedAssetPaths) ? design.uploadedAssetPaths : []),
    ...(Array.isArray(design.uploadedAssetUrls) ? design.uploadedAssetUrls : []),
    design.previewImagePath,
    design.frontDesign?.upload?.uploadedAssetPath,
    design.frontDesign?.upload?.storagePath,
    design.backDesign?.upload?.uploadedAssetPath,
    design.backDesign?.upload?.storagePath,
  ]

  candidates.forEach((value) => {
    if (typeof value === 'string' && value && !value.startsWith('http') && !value.startsWith('blob:')) {
      paths.add(value)
    }
  })

  return [...paths]
}

export function validateUploadedFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    const error = new Error('Upload an artwork image.')
    error.status = 400
    error.code = 'upload/missing-file'
    throw error
  }

  if (!CUSTOM_DESIGN_ALLOWED_TYPES.has(file.type)) {
    const error = new Error('Upload a PNG, JPEG, or WebP image.')
    error.status = 400
    error.code = 'upload/invalid-type'
    throw error
  }

  if (file.size > CUSTOM_DESIGN_MAX_BYTES) {
    const error = new Error('Image must be 10 MB or smaller.')
    error.status = 413
    error.code = 'upload/file-too-large'
    throw error
  }
}

export async function parseMultipartForm(req) {
  const contentLength = Number(req.headers['content-length'] || 0)

  if (Number.isFinite(contentLength) && contentLength > CUSTOM_DESIGN_MAX_REQUEST_BYTES) {
    throw createHttpError(413, 'upload/request-too-large', 'Image must be 10 MB or smaller.')
  }

  const headers = new Headers()

  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item))
    } else if (value !== undefined) {
      headers.set(key, value)
    }
  })

  const request = new Request(`http://${req.headers.host || 'localhost'}${req.url || ''}`, {
    method: req.method,
    headers,
    body: Readable.toWeb(req),
    duplex: 'half',
  })

  return request.formData()
}

export async function parseJsonBody(req, { maxBytes = JSON_BODY_MAX_BYTES } = {}) {
  const contentLength = Number(req.headers['content-length'] || 0)

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw createHttpError(413, 'request/body-too-large', 'Request body is too large.')
  }

  if (req.body !== undefined) {
    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
      return req.body
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '')

    if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
      throw createHttpError(413, 'request/body-too-large', 'Request body is too large.')
    }

    if (!rawBody) return {}

    try {
      return JSON.parse(rawBody)
    } catch {
      throw createHttpError(400, 'request/invalid-json', 'Invalid JSON request body.')
    }
  }

  const chunks = []
  let receivedBytes = 0

  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    receivedBytes += buffer.byteLength

    if (receivedBytes > maxBytes) {
      throw createHttpError(413, 'request/body-too-large', 'Request body is too large.')
    }

    chunks.push(buffer)
  }

  if (chunks.length === 0) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Invalid JSON request body.')
    error.status = 400
    error.code = 'request/invalid-json'
    throw error
  }
}

export async function uploadCustomDesignFile({ uid, designId, file, side }) {
  validateUploadedFile(file)
  const storagePath = buildStoragePath(uid, designId, file, side)
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const { error } = await getSupabaseAdmin().storage
    .from(CUSTOM_DESIGNS_BUCKET)
    .upload(storagePath, fileBuffer, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    const uploadError = new Error('Unable to upload design artwork.')
    uploadError.status = 500
    uploadError.code = 'storage/upload-failed'
    throw uploadError
  }

  return {
    storagePath,
    mimeType: file.type,
    size: file.size,
  }
}

export async function createSignedCustomDesignUrl(storagePath) {
  const { data, error } = await getSupabaseAdmin().storage
    .from(CUSTOM_DESIGNS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN)

  if (error || !data?.signedUrl) {
    const signedUrlError = new Error('Unable to create signed URL.')
    signedUrlError.status = 500
    signedUrlError.code = 'storage/signed-url-failed'
    throw signedUrlError
  }

  return data.signedUrl
}

export async function deleteCustomDesignFiles(paths) {
  if (!paths.length) return { deleted: 0 }

  const { error } = await getSupabaseAdmin().storage
    .from(CUSTOM_DESIGNS_BUCKET)
    .remove(paths)

  if (error) {
    const deleteError = new Error('Unable to delete design artwork.')
    deleteError.status = 500
    deleteError.code = 'storage/delete-failed'
    throw deleteError
  }

  return { deleted: paths.length }
}

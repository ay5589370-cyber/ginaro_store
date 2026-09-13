import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

export const STORAGE_BUCKETS = Object.freeze({
  PRODUCT_IMAGES: 'product-images',
  TEMPLATES: 'templates',
  CUSTOM_DESIGNS: 'custom-designs',
  PROFILE_IMAGES: 'profile-images',
})

export const IMAGE_UPLOAD_LIMITS = Object.freeze({
  PRODUCT_IMAGE: 5 * 1024 * 1024,
  TEMPLATE_IMAGE: 5 * 1024 * 1024,
  CUSTOM_DESIGN: 10 * 1024 * 1024,
  PROFILE_IMAGE: 5 * 1024 * 1024,
})

export const ALLOWED_IMAGE_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp'])

const PUBLIC_IMAGE_BUCKETS = new Set([
  STORAGE_BUCKETS.PRODUCT_IMAGES,
  STORAGE_BUCKETS.TEMPLATES,
])

function buildStorageError(message, code = 'storage/error') {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}

function requireSupabaseStorage() {
  if (!supabase || !isSupabaseConfigured) {
    return {
      error: buildStorageError(
        'Supabase Storage is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.',
        'storage/configuration-not-ready',
      ),
    }
  }

  return { storage: supabase.storage }
}

function getStorageErrorMessage(error, fallback = 'Storage request failed. Please try again.') {
  const message = String(error?.message || '').toLowerCase()
  const status = error?.statusCode || error?.status

  if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('permission')) {
    return 'You do not have permission to access this storage bucket.'
  }

  if (status === 404 || message.includes('bucket not found') || message.includes('not found')) {
    return 'Storage bucket or file was not found.'
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.'
  }

  if (message.includes('exceeded') || message.includes('too large')) {
    return 'File is too large for this upload.'
  }

  return fallback
}

function getCustomDesignApiErrorMessage(status, fallback = 'Unable to update design artwork.') {
  const messages = {
    400: 'Upload a valid PNG, JPEG, or WebP image.',
    401: 'Please log in to upload design artwork.',
    403: 'You do not have permission to update this design artwork.',
    413: 'Image must be 10 MB or smaller.',
    500: 'Design artwork storage is temporarily unavailable.',
  }

  return messages[status] || fallback
}

async function getFirebaseIdToken(user) {
  if (!user || typeof user.getIdToken !== 'function') {
    return {
      error: buildStorageError('Please log in to upload design artwork.', 'storage/auth-required'),
    }
  }

  try {
    return { token: await user.getIdToken() }
  } catch {
    return {
      error: buildStorageError('Please log in again before uploading design artwork.', 'storage/auth-required'),
    }
  }
}

async function parseApiResponse(response, fallbackMessage) {
  let payload

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.success) {
    return buildStorageError(
      payload?.error?.message || getCustomDesignApiErrorMessage(response.status, fallbackMessage),
      payload?.error?.code || 'storage/api-request-failed',
    )
  }

  return {
    success: true,
    ...payload,
  }
}

function normalizePathPrefix(pathPrefix = '') {
  return String(pathPrefix)
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => sanitizePathSegment(part))
    .filter(Boolean)
    .join('/')
}

function sanitizePathSegment(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\.[./\\]+/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
}

export function sanitizeFileName(fileName = 'image') {
  const cleanName = sanitizePathSegment(fileName)
  return cleanName || 'image'
}

function getFileExtension(file) {
  const extensionFromName = sanitizeFileName(file?.name || '').split('.').pop()

  if (extensionFromName && extensionFromName !== sanitizeFileName(file?.name || '')) {
    return extensionFromName
  }

  const extensionByType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }

  return extensionByType[file?.type] || 'jpg'
}

function buildUniqueStoragePath(file, pathPrefix = '') {
  const sanitizedName = sanitizeFileName(file.name || 'image')
  const extension = getFileExtension(file)
  const baseName = sanitizedName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '') || 'image'
  const uniqueName = `${Date.now()}-${baseName}.${extension}`
  const safePrefix = normalizePathPrefix(pathPrefix)

  return safePrefix ? `${safePrefix}/${uniqueName}` : uniqueName
}

export function validateImageFile(file, { maxSize = IMAGE_UPLOAD_LIMITS.PRODUCT_IMAGE } = {}) {
  if (!file) {
    return buildStorageError('Choose an image file before uploading.', 'storage/invalid-file')
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return buildStorageError('Upload a PNG, JPEG, or WebP image.', 'storage/invalid-image-type')
  }

  if (typeof file.size === 'number' && file.size > maxSize) {
    return buildStorageError(
      `Image must be ${Math.round(maxSize / 1024 / 1024)} MB or smaller.`,
      'storage/file-too-large',
    )
  }

  return { success: true }
}

export function getPublicImageUrl(bucket, path) {
  const { error, storage } = requireSupabaseStorage()

  if (error) return error

  if (!bucket || !path) {
    return buildStorageError('Storage bucket and file path are required.', 'storage/invalid-path')
  }

  if (!PUBLIC_IMAGE_BUCKETS.has(bucket)) {
    return buildStorageError('This bucket is not configured for public image URLs.', 'storage/private-bucket')
  }

  const { data } = storage.from(bucket).getPublicUrl(path)

  if (!data?.publicUrl) {
    return buildStorageError('Unable to create a public image URL.', 'storage/public-url-failed')
  }

  return {
    success: true,
    bucket,
    path,
    publicUrl: data.publicUrl,
  }
}

async function uploadImageToBucket({
  bucket,
  file,
  pathPrefix,
  maxSize,
  isPublic = false,
  cacheControl = '3600',
  upsert = false,
}) {
  const configuration = requireSupabaseStorage()

  if (configuration.error) return configuration.error

  const validation = validateImageFile(file, { maxSize })

  if (!validation.success) return validation

  const path = buildUniqueStoragePath(file, pathPrefix)

  try {
    const { error } = await configuration.storage.from(bucket).upload(path, file, {
      cacheControl,
      contentType: file.type,
      upsert,
    })

    if (error) {
      return buildStorageError(
        getStorageErrorMessage(error, 'Image upload failed. Please try again.'),
        'storage/upload-failed',
      )
    }

    const publicUrlResult = isPublic ? getPublicImageUrl(bucket, path) : null

    if (publicUrlResult && !publicUrlResult.success) return publicUrlResult

    return {
      success: true,
      bucket,
      path,
      publicUrl: publicUrlResult?.publicUrl || null,
    }
  } catch (error) {
    return buildStorageError(
      getStorageErrorMessage(error, 'Image upload failed. Please try again.'),
      'storage/upload-failed',
    )
  }
}

export function uploadProductImage(file, path) {
  return uploadImageToBucket({
    bucket: STORAGE_BUCKETS.PRODUCT_IMAGES,
    file,
    pathPrefix: path,
    maxSize: IMAGE_UPLOAD_LIMITS.PRODUCT_IMAGE,
    isPublic: true,
  })
}

export function uploadTemplateImage(file, path) {
  return uploadImageToBucket({
    bucket: STORAGE_BUCKETS.TEMPLATES,
    file,
    pathPrefix: path,
    maxSize: IMAGE_UPLOAD_LIMITS.TEMPLATE_IMAGE,
    isPublic: true,
  })
}

export async function uploadCustomDesign(user, file, { designId, side = 'asset' } = {}) {
  const validation = validateImageFile(file, { maxSize: IMAGE_UPLOAD_LIMITS.CUSTOM_DESIGN })

  if (!validation.success) return validation

  if (!designId) {
    return buildStorageError('Save the design before uploading artwork.', 'storage/missing-design-id')
  }

  const authResult = await getFirebaseIdToken(user)

  if (authResult.error) return authResult.error

  const formData = new FormData()
  formData.append('designId', String(designId))
  formData.append('side', String(side))
  formData.append('file', file)

  try {
    const response = await fetch('/api/custom-designs/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authResult.token}`,
      },
      body: formData,
    })

    const result = await parseApiResponse(response, 'Unable to upload design artwork.')

    if (!result.success) return result

    return {
      success: true,
      bucket: STORAGE_BUCKETS.CUSTOM_DESIGNS,
      path: result.storagePath,
      storagePath: result.storagePath,
      mimeType: result.mimeType,
      size: result.size,
      publicUrl: null,
    }
  } catch {
    return buildStorageError('Network error. Check your connection and try again.', 'storage/network-error')
  }
}

export async function getCustomDesignSignedUrl(user, designId, storagePath) {
  if (!designId || !storagePath) {
    return buildStorageError('Design ID and storage path are required.', 'storage/invalid-path')
  }

  const authResult = await getFirebaseIdToken(user)

  if (authResult.error) return authResult.error

  try {
    const response = await fetch('/api/custom-designs/signed-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ designId, storagePath }),
    })

    return parseApiResponse(response, 'Unable to load design artwork.')
  } catch {
    return buildStorageError('Network error. Check your connection and try again.', 'storage/network-error')
  }
}

export async function deleteCustomDesignAsset(user, designId, storagePath) {
  if (!designId) {
    return buildStorageError('Design ID is required.', 'storage/invalid-path')
  }

  const authResult = await getFirebaseIdToken(user)

  if (authResult.error) return authResult.error

  try {
    const response = await fetch('/api/custom-designs/file', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ designId, storagePath }),
    })

    return parseApiResponse(response, 'Unable to delete design artwork.')
  } catch {
    return buildStorageError('Network error. Check your connection and try again.', 'storage/network-error')
  }
}

export function uploadProfileImage(file, path) {
  return uploadImageToBucket({
    bucket: STORAGE_BUCKETS.PROFILE_IMAGES,
    file,
    pathPrefix: path,
    maxSize: IMAGE_UPLOAD_LIMITS.PROFILE_IMAGE,
    isPublic: false,
    upsert: true,
  })
}

export async function deleteStorageFile(bucket, path) {
  const configuration = requireSupabaseStorage()

  if (configuration.error) return configuration.error

  if (!bucket || !path) {
    return buildStorageError('Storage bucket and file path are required.', 'storage/invalid-path')
  }

  try {
    const { error } = await configuration.storage.from(bucket).remove([path])

    if (error) {
      return buildStorageError(
        getStorageErrorMessage(error, 'Unable to delete the storage file.'),
        'storage/delete-failed',
      )
    }

    return {
      success: true,
      bucket,
      path,
    }
  } catch (error) {
    return buildStorageError(
      getStorageErrorMessage(error, 'Unable to delete the storage file.'),
      'storage/delete-failed',
    )
  }
}

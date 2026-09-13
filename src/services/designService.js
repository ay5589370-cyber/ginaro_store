import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/firebase.js'

const DESIGNS_COLLECTION = 'designs'
const DESIGN_SIDES = new Set(['front', 'back', 'both'])
const DESIGN_STATUSES = new Set(['draft', 'saved'])

function getConfigurationError() {
  const error = new Error('Firestore saved designs are not configured.')
  error.code = 'designs/configuration-not-ready'
  return error
}

function requireUid(uid) {
  if (!uid) {
    const error = new Error('Sign in before managing saved designs.')
    error.code = 'designs/auth-required'
    throw error
  }
}

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return db
}

function getDesignsCollection(uid) {
  return collection(requireDb(), 'users', uid, DESIGNS_COLLECTION)
}

function getDesignDocument(uid, designId) {
  return doc(requireDb(), 'users', uid, DESIGNS_COLLECTION, String(designId))
}

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function toSafeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeTimestamp(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()

  return null
}

function isPersistentAssetReference(value) {
  const stringValue = toSafeString(value)
  return Boolean(
    stringValue
      && !stringValue.startsWith('blob:')
      && !stringValue.startsWith('data:')
      && !stringValue.startsWith('filesystem:'),
  )
}

function cleanPersistentAssetReference(value) {
  return isPersistentAssetReference(value) ? toSafeString(value) : ''
}

function normalizeAssetList(value) {
  if (!Array.isArray(value)) return []

  return [...new Set(value.map(cleanPersistentAssetReference).filter(Boolean))]
}

function normalizeTemplate(template) {
  if (!template) return null

  const templateId = toSafeString(template.templateId || template.id)
  if (!templateId) return null

  return {
    templateId,
    name: toSafeString(template.name),
    category: toSafeString(template.category),
    previewImage: cleanPersistentAssetReference(template.previewImage),
    fullDesignImage: cleanPersistentAssetReference(template.fullDesignImage),
  }
}

function normalizeUpload(upload) {
  if (!upload) return null

  const uploadedAssetPath = cleanPersistentAssetReference(
    upload.uploadedAssetPath || upload.storagePath || upload.path,
  )
  const uploadedAssetUrl = cleanPersistentAssetReference(upload.uploadedAssetUrl || upload.publicUrl || upload.url)

  return {
    fileName: toSafeString(upload.fileName || upload.name),
    fileType: toSafeString(upload.fileType || upload.type),
    fileSize: Math.max(0, toSafeNumber(upload.fileSize || upload.size)),
    uploadedAssetPath: uploadedAssetPath || null,
    uploadedAssetUrl: uploadedAssetUrl || null,
  }
}

function normalizeText(text) {
  const value = toSafeString(text?.value || text?.text)
  if (!value) return null

  return {
    value,
    fontFamily: toSafeString(text.fontFamily || text.font, 'Georgia, serif'),
    fontSize: Math.max(8, toSafeNumber(text.fontSize, 28)),
    textColor: toSafeString(text.textColor || text.color, '#14110c'),
    bold: Boolean(text.bold),
    italic: Boolean(text.italic),
    alignment: toSafeString(text.alignment || text.align, 'center'),
    visible: text.visible === undefined ? true : Boolean(text.visible),
    x: toSafeNumber(text.x),
    y: toSafeNumber(text.y),
    scale: toSafeNumber(text.scale, 1),
  }
}

function normalizeSideDesign(sideDesign) {
  if (!sideDesign) return null

  const template = normalizeTemplate(sideDesign.template)
  const upload = normalizeUpload(sideDesign.upload)
  const text = normalizeText(sideDesign.text)

  if (!template && !upload && !text) return null

  return {
    template,
    upload,
    text,
    position: toSafeString(sideDesign.position, 'center'),
    size: toSafeString(sideDesign.size, 'medium'),
  }
}

function inferSide(frontDesign, backDesign, requestedSide) {
  if (DESIGN_SIDES.has(requestedSide)) return requestedSide
  if (frontDesign && backDesign) return 'both'
  if (backDesign) return 'back'
  return 'front'
}

function normalizeDesignStatus(status) {
  const normalized = toSafeString(status, 'saved').toLowerCase()
  return DESIGN_STATUSES.has(normalized) ? normalized : 'saved'
}

export function normalizeDesignForFirestore(designData = {}) {
  const frontDesign = normalizeSideDesign(designData.frontDesign)
  const backDesign = normalizeSideDesign(designData.backDesign)
  const uploadedAssetPaths = normalizeAssetList([
    ...(Array.isArray(designData.uploadedAssetPaths) ? designData.uploadedAssetPaths : []),
    frontDesign?.upload?.uploadedAssetPath,
    backDesign?.upload?.uploadedAssetPath,
    designData.previewImagePath,
  ])
  const uploadedAssetUrls = normalizeAssetList([
    ...(Array.isArray(designData.uploadedAssetUrls) ? designData.uploadedAssetUrls : []),
    frontDesign?.upload?.uploadedAssetUrl,
    backDesign?.upload?.uploadedAssetUrl,
  ])

  return {
    productId: toSafeString(designData.productId),
    productName: toSafeString(designData.productName || designData.vestName),
    baseColor: toSafeString(designData.baseColor || designData.color),
    size: toSafeString(designData.size),
    side: inferSide(frontDesign, backDesign, toSafeString(designData.side)),
    frontDesign,
    backDesign,
    previewImagePath: cleanPersistentAssetReference(designData.previewImagePath) || null,
    previewImageUrl: cleanPersistentAssetReference(designData.previewImageUrl) || null,
    uploadedAssetPaths,
    uploadedAssetUrls,
    price: Math.max(0, toSafeNumber(designData.price || designData.pricing?.totalPrice)),
    status: normalizeDesignStatus(designData.status),
  }
}

export function normalizeDesignForClient(designId, designData = {}) {
  const createdAt = normalizeTimestamp(designData.createdAt)
  const updatedAt = normalizeTimestamp(designData.updatedAt)

  return {
    id: String(designData.id || designId),
    productId: toSafeString(designData.productId),
    productName: toSafeString(designData.productName || designData.vestName),
    vestName: toSafeString(designData.productName || designData.vestName),
    baseColor: toSafeString(designData.baseColor || designData.color),
    color: toSafeString(designData.baseColor || designData.color),
    size: toSafeString(designData.size),
    side: DESIGN_SIDES.has(designData.side) ? designData.side : 'front',
    frontDesign: designData.frontDesign || null,
    backDesign: designData.backDesign || null,
    previewImagePath: designData.previewImagePath || null,
    previewImageUrl: designData.previewImageUrl || null,
    uploadedAssetPaths: Array.isArray(designData.uploadedAssetPaths) ? designData.uploadedAssetPaths : [],
    uploadedAssetUrls: Array.isArray(designData.uploadedAssetUrls) ? designData.uploadedAssetUrls : [],
    price: Math.max(0, toSafeNumber(designData.price)),
    status: normalizeDesignStatus(designData.status),
    createdAt,
    updatedAt,
    lastEdited: updatedAt?.slice(0, 10) || createdAt?.slice(0, 10) || '',
  }
}

export function getDesignErrorMessage(error, fallback = 'Unable to save your design. Please try again.') {
  const messages = {
    'designs/auth-required': 'Please log in to save your design.',
    'designs/configuration-not-ready': 'Saved designs are not configured. Please try again later.',
    'designs/invalid-design': 'Please choose a vest, size and color before saving.',
    'designs/not-found': 'Saved design not found.',
    'permission-denied': 'You do not have permission to manage this design.',
    unavailable: 'Saved designs are temporarily unavailable. Please try again.',
  }

  return messages[error?.code] || fallback
}

export function getDesignAssetPaths(design = {}) {
  return [
    ...(Array.isArray(design.uploadedAssetPaths) ? design.uploadedAssetPaths : []),
    design.previewImagePath,
    design.frontDesign?.upload?.uploadedAssetPath,
    design.backDesign?.upload?.uploadedAssetPath,
  ].filter(Boolean)
}

function validateDesignData(designData) {
  const errors = {}

  if (!designData.productId) errors.productId = 'Choose a vest before saving your design.'
  if (!designData.productName) errors.productName = 'Choose a vest before saving your design.'
  if (!designData.baseColor) errors.baseColor = 'Choose a vest color before saving your design.'
  if (!designData.size) errors.size = 'Choose a size before saving your design.'

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

function sortDesigns(designs) {
  return [...designs].sort((a, b) => {
    const aDate = a.updatedAt || a.createdAt || ''
    const bDate = b.updatedAt || b.createdAt || ''
    return bDate.localeCompare(aDate) || a.id.localeCompare(b.id)
  })
}

export async function getSavedDesigns(uid) {
  requireUid(uid)
  const snapshot = await getDocs(getDesignsCollection(uid))

  return sortDesigns(snapshot.docs.map((designDoc) => normalizeDesignForClient(designDoc.id, designDoc.data())))
}

export async function getSavedDesign(uid, designId) {
  requireUid(uid)
  const snapshot = await getDoc(getDesignDocument(uid, designId))

  return snapshot.exists() ? normalizeDesignForClient(snapshot.id, snapshot.data()) : null
}

export async function saveDesign(uid, designData) {
  requireUid(uid)
  const designRef = doc(getDesignsCollection(uid))
  const designId = designRef.id
  const normalizedDesign = normalizeDesignForFirestore(designData)
  const validation = validateDesignData(normalizedDesign)

  if (!validation.isValid) {
    const error = new Error('Design validation failed.')
    error.code = 'designs/invalid-design'
    error.validationErrors = validation.errors
    throw error
  }

  await setDoc(designRef, {
    id: designId,
    ...normalizedDesign,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return normalizeDesignForClient(designId, {
    id: designId,
    ...normalizedDesign,
  })
}

export async function updateDesign(uid, designId, updates) {
  requireUid(uid)
  const designRef = getDesignDocument(uid, designId)
  const snapshot = await getDoc(designRef)

  if (!snapshot.exists()) {
    const error = new Error('Saved design not found.')
    error.code = 'designs/not-found'
    throw error
  }

  const currentDesign = normalizeDesignForClient(snapshot.id, snapshot.data())
  const normalizedDesign = normalizeDesignForFirestore({
    ...currentDesign,
    ...updates,
  })
  const validation = validateDesignData(normalizedDesign)

  if (!validation.isValid) {
    const error = new Error('Design validation failed.')
    error.code = 'designs/invalid-design'
    error.validationErrors = validation.errors
    throw error
  }

  await updateDoc(designRef, {
    id: String(designId),
    ...normalizedDesign,
    updatedAt: serverTimestamp(),
  })

  const nextSnapshot = await getDoc(designRef)
  return nextSnapshot.exists() ? normalizeDesignForClient(nextSnapshot.id, nextSnapshot.data()) : null
}

export async function deleteDesign(uid, designId) {
  requireUid(uid)
  await deleteDoc(getDesignDocument(uid, designId))

  return { success: true, designId: String(designId) }
}

export async function duplicateDesign(uid, designId) {
  requireUid(uid)
  const design = await getSavedDesign(uid, designId)

  if (!design) {
    const error = new Error('Saved design not found.')
    error.code = 'designs/not-found'
    throw error
  }

  return saveDesign(uid, {
    ...design,
    status: 'saved',
  })
}

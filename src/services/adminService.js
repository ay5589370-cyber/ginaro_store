import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase/firebase.js'
import {
  PRODUCT_CATEGORIES,
  normalizeProductForClient,
  normalizeProductForFirestore,
  validateProductData,
} from '../utils/productData.js'
import { normalizeOrderForClient } from './orderService.js'

const PRODUCTS_COLLECTION = 'products'
const ORDERS_COLLECTION = 'orders'
const USERS_COLLECTION = 'users'
export const ADMIN_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

function getConfigurationError() {
  const error = new Error('Admin data is not configured.')
  error.code = 'admin/configuration-not-ready'
  return error
}

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return db
}

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeTimestamp(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()

  return null
}

function normalizeUserForClient(userId, user = {}) {
  return {
    id: String(user.id || user.uid || userId),
    uid: String(user.uid || userId),
    displayName: toSafeString(user.displayName) || [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
    firstName: toSafeString(user.firstName),
    lastName: toSafeString(user.lastName),
    email: toSafeString(user.email),
    phone: toSafeString(user.phone),
    role: user.role === 'admin' ? 'admin' : 'customer',
    createdAt: normalizeTimestamp(user.createdAt),
    updatedAt: normalizeTimestamp(user.updatedAt),
  }
}

function normalizeProductInput(product) {
  const normalized = normalizeProductForFirestore(product)
  const validation = validateProductData(normalized)

  if (!PRODUCT_CATEGORIES.includes(normalized.category) || !validation.isValid) {
    const error = new Error(validation.errors.join(', ') || 'Product data is invalid.')
    error.code = 'admin/invalid-product'
    throw error
  }

  return normalized
}

async function getFirebaseIdToken() {
  const currentUser = auth?.currentUser

  if (!currentUser || typeof currentUser.getIdToken !== 'function') {
    const error = new Error('Admin sign-in is required.')
    error.code = 'admin/auth-required'
    throw error
  }

  return currentUser.getIdToken()
}

async function callAdminApi(endpoint, payload) {
  const token = await getFirebaseIdToken()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    const error = new Error('Admin server is not running.')
    error.code = 'admin/api-unavailable'
    error.status = response.status
    throw error
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.success !== true) {
    const error = new Error(body.error?.message || 'Unable to update admin data.')
    error.code = body.error?.code || 'admin/api-error'
    error.status = response.status
    throw error
  }

  return body
}

export function getAdminErrorMessage(error, fallback = 'Unable to load admin data.') {
  const messages = {
    'admin/auth-required': 'Please log in as an admin.',
    'admin/configuration-not-ready': 'Admin data is not configured.',
    'admin/invalid-product': error?.message || 'Please check the product details.',
    'admin/api-unavailable': 'Admin server is not running. Use vercel dev locally, or deploy the API routes.',
    ADMIN_REQUIRED: 'Admin access is required.',
    INVALID_STATUS: 'Choose a valid order status.',
    INVALID_STATUS_TRANSITION: 'This order cannot move to that status.',
    ORDER_NOT_FOUND: 'Order not found.',
    ORDER_NOT_CANCELLABLE: 'Unable to cancel this order.',
    permission_denied: 'You do not have permission to manage this data.',
    'permission-denied': 'You do not have permission to manage this data.',
  }

  return messages[error?.code] || fallback
}

export async function getAdminProducts() {
  const snapshot = await getDocs(collection(requireDb(), PRODUCTS_COLLECTION))
  return snapshot.docs
    .map((productDoc) => normalizeProductForClient(productDoc.id, productDoc.data()))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAdminProductById(productId) {
  const snapshot = await getDoc(doc(requireDb(), PRODUCTS_COLLECTION, String(productId)))
  return snapshot.exists() ? normalizeProductForClient(snapshot.id, snapshot.data()) : null
}

export async function createAdminProduct(product) {
  const productRef = doc(collection(requireDb(), PRODUCTS_COLLECTION))
  const normalized = normalizeProductInput(product)
  const payload = {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(productRef, payload)
  return normalizeProductForClient(productRef.id, payload)
}

export async function updateAdminProduct(productId, product) {
  const productRef = doc(requireDb(), PRODUCTS_COLLECTION, String(productId))
  const normalized = normalizeProductInput(product)

  await updateDoc(productRef, {
    ...normalized,
    updatedAt: serverTimestamp(),
  })

  return getAdminProductById(productId)
}

export async function updateAdminProductFlags(productId, updates) {
  const allowedUpdates = {}

  ;['active', 'featured', 'bestSeller'].forEach((field) => {
    if (typeof updates[field] === 'boolean') allowedUpdates[field] = updates[field]
  })

  if (Number.isInteger(Number(updates.stock)) && Number(updates.stock) >= 0) {
    allowedUpdates.stock = Number(updates.stock)
  }

  if (Object.keys(allowedUpdates).length === 0) return getAdminProductById(productId)

  await updateDoc(doc(requireDb(), PRODUCTS_COLLECTION, String(productId)), {
    ...allowedUpdates,
    updatedAt: serverTimestamp(),
  })

  return getAdminProductById(productId)
}

export async function getAdminOrders() {
  const snapshot = await getDocs(query(collection(requireDb(), ORDERS_COLLECTION), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((orderDoc) => normalizeOrderForClient(orderDoc.id, orderDoc.data()))
}

export async function getAdminOrderById(orderId) {
  const snapshot = await getDoc(doc(requireDb(), ORDERS_COLLECTION, String(orderId)))
  return snapshot.exists() ? normalizeOrderForClient(snapshot.id, snapshot.data()) : null
}

export async function updateAdminOrderStatus(orderId, orderStatus) {
  const body = await callAdminApi('/api/admin/orders/update-status', { orderId, orderStatus })
  return normalizeOrderForClient(orderId, body.order)
}

export async function getAdminUsers() {
  const snapshot = await getDocs(collection(requireDb(), USERS_COLLECTION))
  return snapshot.docs
    .map((userDoc) => normalizeUserForClient(userDoc.id, userDoc.data()))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

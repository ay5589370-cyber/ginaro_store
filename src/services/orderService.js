import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase/firebase.js'
import { getCouponDiscount } from '../utils/cartCalculations.js'

const ORDERS_COLLECTION = 'orders'
const ORDER_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
const PAYMENT_STATUSES = new Set(['pending', 'paid', 'failed', 'refunded'])
const LEGACY_ONLINE_PAYMENT_METHODS = new Set(['online', 'upi', 'card', 'netbanking'])

function getConfigurationError() {
  const error = new Error('Firestore orders are not configured.')
  error.code = 'orders/configuration-not-ready'
  return error
}

function requireUid(uid) {
  if (!uid) {
    const error = new Error('Sign in before placing or viewing orders.')
    error.code = 'orders/auth-required'
    throw error
  }
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

function toSafeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function toSafeInteger(value, fallback = 0) {
  const number = Math.trunc(toSafeNumber(value, fallback))
  return Number.isFinite(number) ? number : fallback
}

function normalizeTimestamp(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()

  return null
}

function normalizePaymentMethod(method) {
  const normalized = toSafeString(method, 'cod').toLowerCase()

  if (normalized === 'cod') return 'cod'
  if (LEGACY_ONLINE_PAYMENT_METHODS.has(normalized) || normalized.includes('pay')) return 'online'

  return 'cod'
}

function normalizePaymentStatus(status) {
  const normalized = toSafeString(status, 'pending').toLowerCase()
  return PAYMENT_STATUSES.has(normalized) ? normalized : 'pending'
}

function normalizeOrderStatus(status) {
  const normalized = toSafeString(status, 'pending').toLowerCase()
  return ORDER_STATUSES.has(normalized) ? normalized : 'pending'
}

function normalizeShippingAddress(address = {}) {
  return {
    fullName: toSafeString(address.fullName),
    phone: toSafeString(address.phone),
    addressLine1: toSafeString(address.addressLine1 || address.line1),
    addressLine2: toSafeString(address.addressLine2 || address.line2),
    city: toSafeString(address.city),
    state: toSafeString(address.state),
    postalCode: toSafeString(address.postalCode || address.pinCode),
    country: toSafeString(address.country, 'India') || 'India',
    type: toSafeString(address.type, 'home') || 'home',
  }
}

function normalizeCustomization(customization = {}) {
  return {
    frontDesign: customization.frontDesign || null,
    backDesign: customization.backDesign || null,
    customizationPrice: Math.max(0, toSafeNumber(customization.customizationPrice)),
  }
}

function normalizeOrderItem(item = {}) {
  const isCustom = item.type === 'custom'
  const productId = toSafeString(item.productId || item.id)
  const designId = toSafeString(item.designId)

  return {
    type: isCustom ? 'custom' : 'product',
    productId,
    ...(isCustom && designId ? { designId } : {}),
    name: toSafeString(item.name),
    image: toSafeString(item.image),
    price: Math.max(0, toSafeNumber(item.price)),
    quantity: Math.max(1, toSafeInteger(item.quantity, 1)),
    size: toSafeString(item.size || item.selectedSize),
    color: toSafeString(item.color || item.selectedColor),
    ...(isCustom
      ? {
          customization: normalizeCustomization({
            frontDesign: item.frontDesign,
            backDesign: item.backDesign,
            customizationPrice: item.customizationPrice,
          }),
        }
      : {}),
  }
}

export function normalizeOrderForFirestore(uid, orderData = {}) {
  const items = Array.isArray(orderData.items) ? orderData.items.map(normalizeOrderItem) : []
  const totals = orderData.totals || {}
  const couponCode = toSafeString(orderData.couponCode || orderData.coupon).toUpperCase()
  const subtotal = Math.max(0, toSafeNumber(totals.subtotal ?? orderData.subtotal))
  const customizationCharges = Math.max(0, toSafeNumber(totals.customizationCharges ?? orderData.customizationCharges))
  const orderValue = Math.max(0, toSafeNumber(totals.orderValue ?? subtotal + customizationCharges))
  const discount = Math.max(0, getCouponDiscount(orderValue, couponCode))
  const shippingFee = Math.max(0, toSafeNumber(totals.shipping ?? orderData.shippingFee))
  const total = Math.max(0, orderValue - discount + shippingFee)

  return {
    userId: uid,
    userEmail: toSafeString(orderData.userEmail),
    items,
    shippingAddress: normalizeShippingAddress(orderData.shippingAddress || orderData.address),
    subtotal,
    shippingFee,
    discount,
    total,
    couponCode,
    paymentMethod: normalizePaymentMethod(orderData.paymentMethod),
    paymentStatus: normalizePaymentStatus(orderData.paymentStatus),
    orderStatus: normalizeOrderStatus(orderData.orderStatus),
  }
}

export function normalizeOrderForClient(orderId, orderData = {}) {
  const createdAt = normalizeTimestamp(orderData.createdAt)
  const updatedAt = normalizeTimestamp(orderData.updatedAt)
  const items = Array.isArray(orderData.items) ? orderData.items : []

  return {
    id: String(orderData.id || orderId),
    userId: orderData.userId || '',
    userEmail: orderData.userEmail || '',
    items,
    products: items,
    itemCount: items.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    shippingAddress: orderData.shippingAddress || {},
    subtotal: Number(orderData.subtotal) || 0,
    shippingFee: Number(orderData.shippingFee) || 0,
    shippingMethod: orderData.shippingMethod || 'standard',
    discount: Number(orderData.discount) || 0,
    total: Number(orderData.total) || 0,
    couponCode: orderData.couponCode || '',
    paymentMethod: normalizePaymentMethod(orderData.paymentMethod),
    paymentStatus: normalizePaymentStatus(orderData.paymentStatus),
    orderStatus: normalizeOrderStatus(orderData.orderStatus),
    status: normalizeOrderStatus(orderData.orderStatus),
    stage: normalizeOrderStatus(orderData.orderStatus),
    inventoryAdjusted: orderData.inventoryAdjusted === true,
    inventoryRestored: orderData.inventoryRestored === true,
    createdAt,
    updatedAt,
    date: createdAt ? createdAt.slice(0, 10) : '',
  }
}

export function getOrderErrorMessage(error, fallback = 'Unable to place your order.') {
  const messages = {
    'orders/auth-required': 'Please log in to place your order.',
    'orders/configuration-not-ready': 'Orders are not configured. Please try again later.',
    'orders/invalid-order': 'Please check your checkout details and try again.',
    'orders/not-found': 'Order not found.',
    'orders/not-owned': 'Order not found.',
    'orders/not-cancellable': 'Unable to cancel this order.',
    'orders/custom-design-not-found': 'Unable to verify one custom design in your cart.',
    UNAUTHORIZED: 'Please log in to place your order.',
    INVALID_ORDER: 'Please check your checkout details and try again.',
    PRODUCT_NOT_FOUND: 'One or more items are no longer available.',
    PRODUCT_INACTIVE: 'One or more items are currently unavailable.',
    OUT_OF_STOCK: error?.message || 'One or more items are out of stock.',
    PRICE_CHANGED: error?.message || 'Cart prices changed. Please review your cart and try again.',
    CUSTOM_DESIGN_NOT_FOUND: 'Unable to verify one custom design in your cart.',
    ORDER_NOT_FOUND: 'Order not found.',
    ORDER_NOT_CANCELLABLE: 'Unable to cancel this order.',
    SERVER_API_UNAVAILABLE: 'Order server is not running. Use vercel dev locally, or deploy the API routes.',
    SERVER_CONFIG_MISSING: 'Order service is not configured. Add Firebase Admin server environment variables.',
    'auth/missing-token': 'Please log in to place your order.',
    'auth/invalid-token': 'Please log in again before placing your order.',
    'permission-denied': 'You do not have permission to access this order.',
    unavailable: 'Orders are temporarily unavailable. Please try again.',
  }

  return messages[error?.code] || fallback
}

async function getFirebaseIdToken(uid) {
  const currentUser = auth?.currentUser

  if (!currentUser || currentUser.uid !== uid || typeof currentUser.getIdToken !== 'function') {
    const error = new Error('Please log in to place your order.')
    error.code = 'orders/auth-required'
    throw error
  }

  return currentUser.getIdToken()
}

async function callOrderApi(uid, endpoint, payload) {
  const token = await getFirebaseIdToken(uid)
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
    const error = new Error('Order server is not running.')
    error.code = 'SERVER_API_UNAVAILABLE'
    error.status = response.status
    throw error
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.success !== true) {
    const error = new Error(body.error?.message || 'Unable to update this order.')
    error.code = body.error?.code || 'orders/api-error'
    error.status = response.status
    throw error
  }

  return body
}

export async function createOrder(uid, orderData) {
  requireUid(uid)
  const body = await callOrderApi(uid, '/api/orders/create', { orderData })

  return normalizeOrderForClient(body.orderId || body.order?.id, body.order)
}

export async function getUserOrders(uid) {
  requireUid(uid)
  const ordersQuery = query(
    collection(requireDb(), ORDERS_COLLECTION),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snapshot = await getDocs(ordersQuery)

  return snapshot.docs.map((orderDoc) => normalizeOrderForClient(orderDoc.id, orderDoc.data()))
}

export async function getOrderById(uid, orderId) {
  requireUid(uid)
  const snapshot = await getDoc(doc(requireDb(), ORDERS_COLLECTION, String(orderId)))

  if (!snapshot.exists()) return null

  const order = normalizeOrderForClient(snapshot.id, snapshot.data())

  if (order.userId !== uid) {
    const error = new Error('Order not found.')
    error.code = 'orders/not-owned'
    throw error
  }

  return order
}

export async function cancelOrder(uid, orderId) {
  requireUid(uid)
  const body = await callOrderApi(uid, '/api/orders/cancel', { orderId })

  return normalizeOrderForClient(orderId, body.order)
}

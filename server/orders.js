import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './firebaseAdmin.js'

const ORDERS_COLLECTION = 'orders'
const PRODUCTS_COLLECTION = 'products'
const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed'])
const ORDER_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
const PAYMENT_METHODS = new Set(['cod'])
const FREE_SHIPPING_THRESHOLD = 999
const MAX_ORDER_ITEM_QUANTITY = 20
const ADMIN_STATUS_TRANSITIONS = Object.freeze({
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['processing', 'cancelled']),
  processing: new Set(['shipped']),
  shipped: new Set(['delivered']),
  delivered: new Set([]),
  cancelled: new Set([]),
})

const SHIPPING_METHODS = {
  standard: 59,
  express: 149,
}

export function createHttpError(status, code, message, details = {}) {
  const error = new Error(message)
  error.status = status
  error.code = code
  Object.assign(error, details)
  return error
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

function normalizePaymentMethod(method) {
  const normalized = toSafeString(method, 'cod').toLowerCase()
  return PAYMENT_METHODS.has(normalized) ? normalized : 'cod'
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

function validateShippingAddress(address) {
  return Boolean(
    address.fullName
      && address.phone
      && address.addressLine1
      && address.city
      && address.state
      && address.postalCode
      && address.country,
  )
}

function getCouponDiscount(subtotal, coupon) {
  if (coupon === 'WELCOME10') return Math.round(subtotal * 0.1)
  if (coupon === 'SAVE100' && subtotal >= FREE_SHIPPING_THRESHOLD) return 100

  return 0
}

function getShippingCost(methodId, merchandiseTotal, coupon) {
  const normalizedMethod = toSafeString(methodId, 'standard').toLowerCase()
  const method = Object.hasOwn(SHIPPING_METHODS, normalizedMethod) ? normalizedMethod : 'standard'

  if (method === 'standard' && (merchandiseTotal >= FREE_SHIPPING_THRESHOLD || coupon === 'FREESHIP')) {
    return 0
  }

  return SHIPPING_METHODS[method]
}

function normalizeCustomization(item = {}) {
  const source = item.customization || item

  return {
    frontDesign: source.frontDesign || null,
    backDesign: source.backDesign || null,
    customizationPrice: Math.max(0, toSafeNumber(source.customizationPrice)),
  }
}

function normalizeOrderQuantity(value, { strict = true } = {}) {
  const number = Number(value)

  if (strict) {
    if (!Number.isInteger(number) || number < 1 || number > MAX_ORDER_ITEM_QUANTITY) {
      throw createHttpError(400, 'INVALID_QUANTITY', `Choose a quantity between 1 and ${MAX_ORDER_ITEM_QUANTITY}.`)
    }

    return number
  }

  if (!Number.isFinite(number) || number < 1) return 1

  return Math.trunc(number)
}

function getPrimaryProductImage(product = {}) {
  return Array.isArray(product.images) ? product.images[0] || '' : toSafeString(product.image)
}

function normalizeIncomingItems(items, { strictQuantity = true } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, 'INVALID_ORDER', 'Your cart is empty.')
  }

  return items.map((item) => {
    const isCustom = item?.type === 'custom'
    const productId = toSafeString(item?.productId || item?.id)
    const quantity = normalizeOrderQuantity(item?.quantity, { strict: strictQuantity })

    if (!productId) {
      throw createHttpError(400, 'INVALID_ORDER', 'Some cart items are not ready for checkout.')
    }

    return {
      type: isCustom ? 'custom' : 'product',
      productId,
      designId: isCustom ? toSafeString(item?.designId) : '',
      name: toSafeString(item?.name),
      image: toSafeString(item?.image),
      requestedPrice: Math.max(0, toSafeNumber(item?.price)),
      quantity,
      size: toSafeString(item?.size || item?.selectedSize),
      color: toSafeString(item?.color || item?.selectedColor),
      customization: isCustom ? normalizeCustomization(item) : null,
    }
  })
}

function aggregateProductQuantities(items) {
  return items.reduce((quantities, item) => {
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
    return quantities
  }, new Map())
}

async function restoreInventoryForOrder(transaction, db, order) {
  const shouldRestoreInventory = order.inventoryAdjusted === true && order.inventoryRestored !== true

  if (!shouldRestoreInventory) return false

  const productQuantities = aggregateProductQuantities(normalizeIncomingItems(order.items, { strictQuantity: false }))
  const productReads = []

  for (const [productId, restoreQuantity] of productQuantities.entries()) {
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId)
    const productSnapshot = await transaction.get(productRef)

    productReads.push({ productRef, productSnapshot, restoreQuantity })
  }

  for (const { productRef, productSnapshot, restoreQuantity } of productReads) {
    if (productSnapshot.exists) {
      const product = productSnapshot.data()
      const currentStock = Math.max(0, toSafeInteger(product.stock, 0))

      transaction.update(productRef, {
        stock: currentStock + restoreQuantity,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  }

  return true
}

async function verifyCustomDesignOwnership(transaction, db, uid, items) {
  const designIds = [...new Set(items.map((item) => item.designId).filter(Boolean))]

  for (const designId of designIds) {
    const designRef = db.collection('users').doc(uid).collection('designs').doc(designId)
    const designSnapshot = await transaction.get(designRef)

    if (!designSnapshot.exists) {
      throw createHttpError(403, 'CUSTOM_DESIGN_NOT_FOUND', 'Unable to verify one custom design in your cart.')
    }
  }
}

function validateClientPrice(item, canonicalPrice) {
  if (Math.abs(item.requestedPrice - canonicalPrice) <= 1) return

  throw createHttpError(409, 'PRICE_CHANGED', 'Cart prices changed. Please review your cart and try again.')
}

function buildCanonicalOrderItems(items, productsById) {
  return items.map((item) => {
    const product = productsById.get(item.productId)
    const productPrice = Math.max(0, toSafeNumber(product.price))
    const customizationPrice = item.type === 'custom' ? item.customization.customizationPrice : 0
    const canonicalPrice = productPrice + customizationPrice

    validateClientPrice(item, canonicalPrice)
    validateRequestedVariant(item, product)

    return {
      type: item.type,
      productId: item.productId,
      ...(item.type === 'custom' && item.designId ? { designId: item.designId } : {}),
      name: item.type === 'custom'
        ? `${toSafeString(product.name, item.name)} - Custom Design`
        : toSafeString(product.name, item.name),
      image: getPrimaryProductImage(product) || item.image,
      price: canonicalPrice,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      ...(item.type === 'custom' ? { customization: item.customization } : {}),
    }
  })
}

function hasCaseInsensitiveMatch(values, selectedValue) {
  const selected = toSafeString(selectedValue).toLowerCase()

  return values.some((value) => toSafeString(value).toLowerCase() === selected)
}

function validateRequestedVariant(item, product) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : []
  const colors = Array.isArray(product.colors) ? product.colors : []

  if (sizes.length > 0) {
    if (!item.size) {
      throw createHttpError(400, 'VARIANT_REQUIRED', 'Choose a size before checkout.')
    }
    if (!hasCaseInsensitiveMatch(sizes, item.size)) {
      throw createHttpError(409, 'VARIANT_UNAVAILABLE', 'Selected size is no longer available.')
    }
  }

  if (colors.length > 0) {
    if (!item.color) {
      throw createHttpError(400, 'VARIANT_REQUIRED', 'Choose a color before checkout.')
    }
    if (!hasCaseInsensitiveMatch(colors, item.color)) {
      throw createHttpError(409, 'VARIANT_UNAVAILABLE', 'Selected color is no longer available.')
    }
  }
}

function validateOrderDetails({ uid, orderData, shippingAddress, paymentMethod }) {
  if (!uid) throw createHttpError(401, 'UNAUTHORIZED', 'Please log in to place your order.')
  if (!validateShippingAddress(shippingAddress)) {
    throw createHttpError(400, 'INVALID_ORDER', 'Enter a complete shipping address.')
  }
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw createHttpError(400, 'INVALID_ORDER', 'Select a payment method.')
  }
  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw createHttpError(400, 'INVALID_ORDER', 'Your cart is empty.')
  }
}

function buildTotals(items, couponCode, shippingMethod) {
  const subtotal = items.reduce((total, item) => {
    const customizationPrice = item.type === 'custom' ? item.customization.customizationPrice : 0
    return total + Math.max(0, item.price - customizationPrice) * item.quantity
  }, 0)
  const customizationCharges = items.reduce(
    (total, item) =>
      total + (item.type === 'custom' ? item.customization.customizationPrice * item.quantity : 0),
    0,
  )
  const orderValue = subtotal + customizationCharges
  const discount = Math.max(0, getCouponDiscount(orderValue, couponCode))
  const shippingFee = Math.max(0, getShippingCost(shippingMethod, orderValue, couponCode))
  const total = Math.max(0, orderValue - discount + shippingFee)

  return {
    subtotal,
    customizationCharges,
    orderValue,
    discount,
    shippingFee,
    total,
  }
}

function assertClientTotals(orderData, totals) {
  const submittedTotals = orderData.totals || {}
  const submittedTotal = toSafeNumber(submittedTotals.total ?? orderData.total, totals.total)

  if (Math.abs(submittedTotal - totals.total) > 1) {
    throw createHttpError(409, 'PRICE_CHANGED', 'Cart totals changed. Please review your cart and try again.')
  }
}

export function normalizeOrderForResponse(orderId, order) {
  return {
    id: orderId,
    ...order,
    createdAt: null,
    updatedAt: null,
  }
}

async function buildValidatedOrderSnapshot(transaction, db, {
  uid,
  userEmail,
  orderData = {},
}) {
  const incomingItems = normalizeIncomingItems(orderData.items)
  const productQuantities = aggregateProductQuantities(incomingItems)
  const shippingAddress = normalizeShippingAddress(orderData.shippingAddress || orderData.address)
  const paymentMethod = normalizePaymentMethod(orderData.paymentMethod)
  const couponCode = toSafeString(orderData.couponCode || orderData.coupon).toUpperCase()
  const shippingMethod = toSafeString(orderData.shippingMethod, 'standard').toLowerCase()

  validateOrderDetails({ uid, orderData, shippingAddress, paymentMethod })
  await verifyCustomDesignOwnership(transaction, db, uid, incomingItems)

  const productsById = new Map()
  const productReads = []

  for (const [productId, requiredQuantity] of productQuantities.entries()) {
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId)
    const productSnapshot = await transaction.get(productRef)

    productReads.push({ productId, productRef, productSnapshot, requiredQuantity })
  }

  for (const { productId, productSnapshot, requiredQuantity } of productReads) {
    if (!productSnapshot.exists) {
      throw createHttpError(409, 'PRODUCT_NOT_FOUND', 'One or more items are no longer available.')
    }

    const product = productSnapshot.data()
    const stock = toSafeInteger(product.stock, -1)

    if (product.active !== true) {
      throw createHttpError(409, 'PRODUCT_INACTIVE', 'One or more items are currently unavailable.')
    }
    if (stock < 0) {
      throw createHttpError(409, 'INVALID_STOCK', 'One or more items are currently unavailable.')
    }
    if (requiredQuantity > stock) {
      const productName = toSafeString(product.name, 'This item')
      throw createHttpError(
        409,
        'OUT_OF_STOCK',
        `${productName} only has ${stock} left in stock.`,
        { productId, availableStock: stock },
      )
    }

    productsById.set(productId, product)
  }

  const items = buildCanonicalOrderItems(incomingItems, productsById)
  const totals = buildTotals(items, couponCode, shippingMethod)
  assertClientTotals(orderData, totals)

  return {
    order: {
      userId: uid,
      userEmail: toSafeString(userEmail),
      items,
      shippingAddress,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      shippingMethod,
      discount: totals.discount,
      total: totals.total,
      couponCode,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      inventoryAdjusted: true,
      inventoryRestored: false,
    },
    inventoryUpdates: productReads.map(({ productRef, productSnapshot, requiredQuantity }) => ({
      productRef,
      stock: toSafeInteger(productSnapshot.data().stock, 0),
      requiredQuantity,
    })),
  }
}

export async function createOrderWithInventory({ uid, userEmail, orderData = {} }) {
  const db = getAdminFirestore()
  const orderRef = db.collection(ORDERS_COLLECTION).doc()
  let createdOrder = null

  await db.runTransaction(async (transaction) => {
    const { order, inventoryUpdates } = await buildValidatedOrderSnapshot(transaction, db, {
      uid,
      userEmail,
      orderData,
    })

    for (const { productRef, stock, requiredQuantity } of inventoryUpdates) {
      transaction.update(productRef, {
        stock: stock - requiredQuantity,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    createdOrder = {
      id: orderRef.id,
      ...order,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    transaction.set(orderRef, createdOrder)
  })

  return normalizeOrderForResponse(orderRef.id, createdOrder)
}

export async function cancelOrderWithInventory({ uid, orderId }) {
  const db = getAdminFirestore()
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId || ''))
  let cancelledOrder = null

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef)

    if (!orderSnapshot.exists) {
      throw createHttpError(404, 'ORDER_NOT_FOUND', 'Order not found.')
    }

    const order = orderSnapshot.data()

    if (order.userId !== uid) {
      throw createHttpError(404, 'ORDER_NOT_FOUND', 'Order not found.')
    }
    if (!CANCELLABLE_STATUSES.has(order.orderStatus)) {
      throw createHttpError(409, 'ORDER_NOT_CANCELLABLE', 'Unable to cancel this order.')
    }

    const inventoryRestoredNow = await restoreInventoryForOrder(transaction, db, order)

    transaction.update(orderRef, {
      orderStatus: 'cancelled',
      inventoryRestored: inventoryRestoredNow ? true : order.inventoryRestored === true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    cancelledOrder = {
      ...order,
      id: orderRef.id,
      orderStatus: 'cancelled',
      inventoryRestored: inventoryRestoredNow ? true : order.inventoryRestored === true,
      updatedAt: null,
    }
  })

  return cancelledOrder
}

function assertValidAdminStatusTransition(currentStatus, nextStatus) {
  if (!ORDER_STATUSES.has(nextStatus)) {
    throw createHttpError(400, 'INVALID_STATUS', 'Choose a valid order status.')
  }
  if (currentStatus === nextStatus) return

  const allowedNextStatuses = ADMIN_STATUS_TRANSITIONS[currentStatus] || new Set()

  if (!allowedNextStatuses.has(nextStatus)) {
    throw createHttpError(409, 'INVALID_STATUS_TRANSITION', 'This order cannot move to that status.')
  }
}

export async function updateOrderStatusAsAdmin({ orderId, orderStatus }) {
  const db = getAdminFirestore()
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId || ''))
  const nextStatus = toSafeString(orderStatus).toLowerCase()
  let updatedOrder = null

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef)

    if (!orderSnapshot.exists) {
      throw createHttpError(404, 'ORDER_NOT_FOUND', 'Order not found.')
    }

    const order = orderSnapshot.data()
    const currentStatus = ORDER_STATUSES.has(order.orderStatus) ? order.orderStatus : 'pending'
    const statusChanged = currentStatus !== nextStatus

    assertValidAdminStatusTransition(currentStatus, nextStatus)

    const updates = {
      orderStatus: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (nextStatus === 'cancelled') {
      if (!CANCELLABLE_STATUSES.has(currentStatus)) {
        throw createHttpError(409, 'ORDER_NOT_CANCELLABLE', 'Unable to cancel this order.')
      }

      const inventoryRestoredNow = await restoreInventoryForOrder(transaction, db, order)
      updates.inventoryRestored = inventoryRestoredNow ? true : order.inventoryRestored === true
    }

    if (nextStatus === 'delivered' && order.paymentMethod === 'cod') {
      updates.paymentStatus = 'paid'
    }

    transaction.update(orderRef, updates)

    updatedOrder = {
      ...order,
      id: orderRef.id,
      ...updates,
      previousOrderStatus: currentStatus,
      statusChanged,
      updatedAt: null,
    }
  })

  return updatedOrder
}

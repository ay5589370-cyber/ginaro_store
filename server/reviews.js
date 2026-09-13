import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './firebaseAdmin.js'
import { createHttpError } from './orders.js'

const PRODUCTS_COLLECTION = 'products'
const ORDERS_COLLECTION = 'orders'
const USERS_COLLECTION = 'users'
const REVIEW_COMMENT_MIN_LENGTH = 5
const REVIEW_COMMENT_MAX_LENGTH = 1000
const REVIEW_TITLE_MAX_LENGTH = 80

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function toRating(value) {
  const rating = Number(value)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, 'INVALID_RATING', 'Choose a rating from 1 to 5.')
  }

  return rating
}

function assertSafeId(value, code, message) {
  const id = toSafeString(value)

  if (!id || id.length > 180 || id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw createHttpError(400, code, message)
  }

  return id
}

function normalizeReviewInput({ rating, title, comment }) {
  const normalizedRating = toRating(rating)
  const normalizedTitle = toSafeString(title).slice(0, REVIEW_TITLE_MAX_LENGTH)
  const normalizedComment = toSafeString(comment)

  if (
    normalizedComment.length < REVIEW_COMMENT_MIN_LENGTH
    || normalizedComment.length > REVIEW_COMMENT_MAX_LENGTH
  ) {
    throw createHttpError(400, 'INVALID_REVIEW', 'Write a review between 5 and 1000 characters.')
  }

  return {
    rating: normalizedRating,
    title: normalizedTitle,
    comment: normalizedComment,
  }
}

function orderContainsProduct(order = {}, productId) {
  const items = Array.isArray(order.items) ? order.items : []
  return items.some((item) => String(item.productId || '') === productId)
}

function normalizeReviewForResponse(reviewId, review = {}) {
  return {
    id: String(review.id || reviewId),
    productId: String(review.productId || ''),
    userId: String(review.userId || ''),
    userName: toSafeString(review.userName, 'GINARO customer'),
    rating: Number(review.rating) || 0,
    title: toSafeString(review.title),
    comment: toSafeString(review.comment),
    verifiedPurchase: review.verifiedPurchase === true,
    orderId: String(review.orderId || ''),
    createdAt: null,
    updatedAt: null,
  }
}

async function getPublicUserName(db, uid) {
  const profileSnapshot = await db.collection(USERS_COLLECTION).doc(uid).get()
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {}
  const name = toSafeString(profile.displayName)
    || [profile.firstName, profile.lastName].map(toSafeString).filter(Boolean).join(' ')

  return name || 'GINARO customer'
}

async function findDeliveredPurchase(db, uid, productId) {
  const ordersSnapshot = await db
    .collection(ORDERS_COLLECTION)
    .where('userId', '==', uid)
    .get()

  return ordersSnapshot.docs
    .map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }))
    .find((order) => order.orderStatus === 'delivered' && orderContainsProduct(order, productId))
}

async function verifyDeliveredPurchase(transaction, db, uid, productId, orderId) {
  if (orderId) {
    const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId)
    const orderSnapshot = await transaction.get(orderRef)

    if (!orderSnapshot.exists) {
      throw createHttpError(403, 'NOT_ELIGIBLE', 'A delivered purchase is required before reviewing.')
    }

    const order = orderSnapshot.data()

    if (order.userId !== uid) {
      throw createHttpError(403, 'FORBIDDEN', 'A delivered purchase is required before reviewing.')
    }
    if (order.orderStatus !== 'delivered') {
      throw createHttpError(403, 'ORDER_NOT_DELIVERED', 'Reviews are available after delivery.')
    }
    if (!orderContainsProduct(order, productId)) {
      throw createHttpError(403, 'NOT_ELIGIBLE', 'A delivered purchase is required before reviewing.')
    }

    return orderId
  }

  throw createHttpError(403, 'NOT_ELIGIBLE', 'A delivered purchase is required before reviewing.')
}

function calculateAggregate(reviewRows) {
  if (reviewRows.length === 0) {
    return {
      rating: 0,
      reviewCount: 0,
    }
  }

  const total = reviewRows.reduce((sum, review) => sum + toRating(review.rating), 0)

  return {
    rating: Math.round((total / reviewRows.length) * 10) / 10,
    reviewCount: reviewRows.length,
  }
}

async function getExistingReviewRows(transaction, productRef) {
  const reviewsSnapshot = await transaction.get(productRef.collection('reviews'))
  return reviewsSnapshot.docs.map((reviewDoc) => ({
    ...reviewDoc.data(),
    id: reviewDoc.id,
  }))
}

async function assertProductExists(transaction, productRef) {
  const productSnapshot = await transaction.get(productRef)

  if (!productSnapshot.exists) {
    throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.')
  }
}

function updateProductAggregate(transaction, productRef, reviewRows) {
  transaction.update(productRef, {
    ...calculateAggregate(reviewRows),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function getReviewEligibility({ uid, productId }) {
  const db = getAdminFirestore()
  const safeProductId = assertSafeId(productId, 'PRODUCT_NOT_FOUND', 'Product not found.')
  const productSnapshot = await db.collection(PRODUCTS_COLLECTION).doc(safeProductId).get()

  if (!productSnapshot.exists) {
    throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.')
  }

  const [existingReviewSnapshot, deliveredOrder] = await Promise.all([
    db.collection(PRODUCTS_COLLECTION).doc(safeProductId).collection('reviews').doc(uid).get(),
    findDeliveredPurchase(db, uid, safeProductId),
  ])

  return {
    eligible: Boolean(deliveredOrder),
    orderId: deliveredOrder?.id || '',
    existingReview: existingReviewSnapshot.exists
      ? normalizeReviewForResponse(existingReviewSnapshot.id, existingReviewSnapshot.data())
      : null,
  }
}

export async function createProductReview({ uid, productId, orderId, rating, title, comment }) {
  const db = getAdminFirestore()
  const safeProductId = assertSafeId(productId, 'PRODUCT_NOT_FOUND', 'Product not found.')
  const safeOrderId = orderId ? assertSafeId(orderId, 'NOT_ELIGIBLE', 'A delivered purchase is required before reviewing.') : ''
  const candidateOrderId = safeOrderId || (await findDeliveredPurchase(db, uid, safeProductId))?.id || ''
  const input = normalizeReviewInput({ rating, title, comment })
  const userName = await getPublicUserName(db, uid)
  const productRef = db.collection(PRODUCTS_COLLECTION).doc(safeProductId)
  const reviewRef = productRef.collection('reviews').doc(uid)
  let createdReview = null

  await db.runTransaction(async (transaction) => {
    await assertProductExists(transaction, productRef)
    const reviewSnapshot = await transaction.get(reviewRef)

    if (reviewSnapshot.exists) {
      throw createHttpError(409, 'ALREADY_REVIEWED', 'You already reviewed this product.')
    }

    const verifiedOrderId = await verifyDeliveredPurchase(transaction, db, uid, safeProductId, candidateOrderId)
    const existingReviews = await getExistingReviewRows(transaction, productRef)

    createdReview = {
      id: uid,
      productId: safeProductId,
      userId: uid,
      userName,
      ...input,
      verifiedPurchase: true,
      orderId: verifiedOrderId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    transaction.set(reviewRef, createdReview)
    updateProductAggregate(transaction, productRef, [...existingReviews, createdReview])
  })

  return normalizeReviewForResponse(uid, createdReview)
}

export async function updateProductReview({ uid, productId, rating, title, comment }) {
  const db = getAdminFirestore()
  const safeProductId = assertSafeId(productId, 'PRODUCT_NOT_FOUND', 'Product not found.')
  const input = normalizeReviewInput({ rating, title, comment })
  const productRef = db.collection(PRODUCTS_COLLECTION).doc(safeProductId)
  const reviewRef = productRef.collection('reviews').doc(uid)
  let updatedReview = null

  await db.runTransaction(async (transaction) => {
    await assertProductExists(transaction, productRef)
    const reviewSnapshot = await transaction.get(reviewRef)

    if (!reviewSnapshot.exists) {
      throw createHttpError(404, 'REVIEW_NOT_FOUND', 'Review not found.')
    }

    const existingReview = reviewSnapshot.data()
    const existingReviews = await getExistingReviewRows(transaction, productRef)
    const nextReviews = existingReviews.map((review) =>
      review.id === uid ? { ...review, ...input } : review,
    )

    updatedReview = {
      ...existingReview,
      id: uid,
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    }

    transaction.update(reviewRef, {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    })
    updateProductAggregate(transaction, productRef, nextReviews)
  })

  return normalizeReviewForResponse(uid, updatedReview)
}

export async function deleteProductReview({ uid, productId, reviewId, isAdmin = false }) {
  const db = getAdminFirestore()
  const safeProductId = assertSafeId(productId, 'PRODUCT_NOT_FOUND', 'Product not found.')
  const safeReviewId = assertSafeId(reviewId || uid, 'REVIEW_NOT_FOUND', 'Review not found.')

  if (!isAdmin && safeReviewId !== uid) {
    throw createHttpError(403, 'FORBIDDEN', 'You can delete only your own review.')
  }

  const productRef = db.collection(PRODUCTS_COLLECTION).doc(safeProductId)
  const reviewRef = productRef.collection('reviews').doc(safeReviewId)

  await db.runTransaction(async (transaction) => {
    await assertProductExists(transaction, productRef)
    const reviewSnapshot = await transaction.get(reviewRef)

    if (!reviewSnapshot.exists) {
      throw createHttpError(404, 'REVIEW_NOT_FOUND', 'Review not found.')
    }

    const existingReviews = await getExistingReviewRows(transaction, productRef)
    const nextReviews = existingReviews.filter((review) => review.id !== safeReviewId)

    transaction.delete(reviewRef)
    updateProductAggregate(transaction, productRef, nextReviews)
  })

  return { productId: safeProductId, reviewId: safeReviewId }
}

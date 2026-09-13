import {
  collection,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase/firebase.js'

const PRODUCTS_COLLECTION = 'products'
const REVIEWS_COLLECTION = 'reviews'
const DEFAULT_REVIEW_PAGE_SIZE = 6

function getConfigurationError() {
  const error = new Error('Reviews are not configured.')
  error.code = 'reviews/configuration-not-ready'
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

export function normalizeReviewForClient(reviewId, review = {}) {
  const createdAt = normalizeTimestamp(review.createdAt)
  const updatedAt = normalizeTimestamp(review.updatedAt)

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
    createdAt,
    updatedAt,
    date: createdAt ? createdAt.slice(0, 10) : '',
  }
}

async function getFirebaseIdToken() {
  const currentUser = auth?.currentUser

  if (!currentUser || typeof currentUser.getIdToken !== 'function') {
    const error = new Error('Please log in before reviewing.')
    error.code = 'reviews/auth-required'
    throw error
  }

  return currentUser.getIdToken()
}

async function callReviewApi(endpoint, payload, method = 'POST') {
  const token = await getFirebaseIdToken()
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(payload) }),
  })
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    const error = new Error('Review server is not running.')
    error.code = 'reviews/api-unavailable'
    error.status = response.status
    throw error
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.success !== true) {
    const error = new Error(body.error?.message || 'Unable to update review.')
    error.code = body.error?.code || 'reviews/api-error'
    error.status = response.status
    throw error
  }

  return body
}

export function getReviewErrorMessage(error, fallback = 'Unable to update review.') {
  const messages = {
    'reviews/auth-required': 'Please log in before reviewing.',
    'reviews/configuration-not-ready': 'Reviews are not configured.',
    'reviews/api-unavailable': 'Review server is not running. Use vercel dev locally, or deploy the API routes.',
    UNAUTHORIZED: 'Please log in before reviewing.',
    NOT_ELIGIBLE: 'Only delivered purchases can be reviewed.',
    PRODUCT_NOT_FOUND: 'Product not found.',
    ORDER_NOT_DELIVERED: 'Reviews are available after delivery.',
    ALREADY_REVIEWED: 'You already reviewed this product.',
    INVALID_RATING: 'Choose a rating from 1 to 5.',
    INVALID_REVIEW: 'Write a review between 5 and 1000 characters.',
    REVIEW_NOT_FOUND: 'Review not found.',
    FORBIDDEN: 'You do not have permission to update this review.',
    ADMIN_REQUIRED: 'Admin access is required.',
    permission_denied: 'You do not have permission to access reviews.',
    'permission-denied': 'You do not have permission to access reviews.',
  }

  return messages[error?.code] || fallback
}

export async function getProductReviews(productId, { pageSize = DEFAULT_REVIEW_PAGE_SIZE, cursor = null } = {}) {
  const parts = [
    collection(requireDb(), PRODUCTS_COLLECTION, String(productId), REVIEWS_COLLECTION),
    orderBy('createdAt', 'desc'),
    firestoreLimit(pageSize),
  ]

  if (cursor) parts.splice(2, 0, startAfter(cursor))

  const snapshot = await getDocs(query(...parts))

  return {
    reviews: snapshot.docs.map((reviewDoc) => normalizeReviewForClient(reviewDoc.id, reviewDoc.data())),
    cursor: snapshot.docs.at(-1) || null,
    hasMore: snapshot.size === pageSize,
  }
}

export async function getReviewEligibility(productId) {
  const body = await callReviewApi(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`, null, 'GET')

  return {
    eligible: body.eligible === true,
    orderId: body.orderId || '',
    existingReview: body.existingReview
      ? normalizeReviewForClient(body.existingReview.id, body.existingReview)
      : null,
  }
}

export async function createReview(productId, reviewData) {
  const body = await callReviewApi('/api/reviews/create', {
    productId,
    ...reviewData,
  })

  return normalizeReviewForClient(body.review?.id, body.review)
}

export async function updateReview(productId, reviewData) {
  const body = await callReviewApi('/api/reviews/update', {
    productId,
    ...reviewData,
  })

  return normalizeReviewForClient(body.review?.id, body.review)
}

export async function deleteReview(productId) {
  return callReviewApi('/api/reviews/delete', { productId })
}

export async function getAdminReviews(productIds = []) {
  const reviewSnapshots = await Promise.all(
    productIds.map((productId) =>
      getDocs(collection(requireDb(), PRODUCTS_COLLECTION, String(productId), REVIEWS_COLLECTION)),
    ),
  )

  return reviewSnapshots
    .flatMap((snapshot, index) =>
      snapshot.docs.map((reviewDoc) =>
        normalizeReviewForClient(reviewDoc.id, {
          ...reviewDoc.data(),
          productId: reviewDoc.data().productId || String(productIds[index]),
        }),
      ),
    )
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export async function deleteReviewAsAdmin(productId, reviewId) {
  return callReviewApi('/api/admin/reviews/delete', { productId, reviewId })
}

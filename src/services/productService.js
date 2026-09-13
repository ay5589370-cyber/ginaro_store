import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/firebase.js'
import {
  generateProductSlug,
  normalizeProductCategory,
  normalizeProductForClient,
  normalizeProductForFirestore,
  PRODUCT_COLLECTION,
  validateProductData,
} from '../utils/productData.js'
import {
  getRelatedProducts,
  searchProductsLocally,
} from '../utils/productDiscovery.js'

function createProductServiceError(code, message, cause) {
  const error = new Error(message)
  error.code = code
  error.cause = cause
  return error
}

function getConfigurationError() {
  return createProductServiceError(
    'products/configuration-not-ready',
    'Firestore products are not configured.',
  )
}

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return db
}

function getProductsCollection() {
  return collection(requireDb(), PRODUCT_COLLECTION)
}

function getProductDocument(productId) {
  return doc(requireDb(), PRODUCT_COLLECTION, String(productId))
}

function getReadableFirestoreError(error, fallback) {
  const messages = {
    'products/configuration-not-ready': 'Firestore products are not configured. Add the Firebase environment variables and restart the app.',
    'permission-denied': 'You do not have permission to load these products.',
    unavailable: 'Product data is temporarily unavailable. Please try again.',
    unauthenticated: 'Please sign in before managing products.',
    'failed-precondition': 'Firestore needs an index or rule update before this product query can run.',
  }

  return messages[error?.code] || fallback
}

function handleFirestoreError(error, fallback) {
  throw createProductServiceError(
    error?.code || 'products/request-failed',
    getReadableFirestoreError(error, fallback),
    error,
  )
}

function sortByStableProductId(products) {
  return [...products].sort((a, b) => {
    const aNumber = Number(a.id)
    const bNumber = Number(b.id)

    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber
    }

    return String(a.id).localeCompare(String(b.id))
  })
}

function normalizeSnapshot(snapshot) {
  return sortByStableProductId(
    snapshot.docs.map((productDoc) => normalizeProductForClient(productDoc.id, productDoc.data())),
  )
}

export function getProductErrorMessage(error) {
  return getReadableFirestoreError(error, 'Unable to load products right now.')
}

export { generateProductSlug, normalizeProductForFirestore, validateProductData }

export async function getProducts() {
  try {
    const snapshot = await getDocs(getProductsCollection())
    return normalizeSnapshot(snapshot)
  } catch (error) {
    handleFirestoreError(error, 'Unable to load products right now.')
  }
}

export async function getActiveProducts() {
  try {
    const activeProductsQuery = query(
      getProductsCollection(),
      where('active', '==', true),
    )
    const snapshot = await getDocs(activeProductsQuery)
    return normalizeSnapshot(snapshot)
  } catch (error) {
    handleFirestoreError(error, 'Unable to load products right now.')
  }
}

export async function getProductById(productId) {
  if (!productId) return null

  try {
    const snapshot = await getDoc(getProductDocument(productId))

    if (!snapshot.exists()) return null

    const product = normalizeProductForClient(snapshot.id, snapshot.data())
    return product.active ? product : null
  } catch (error) {
    handleFirestoreError(error, 'Unable to load this product right now.')
  }
}

export async function getProductBySlug(slug) {
  const normalizedSlug = generateProductSlug(slug)

  if (!normalizedSlug) return null

  const products = await getActiveProducts()
  return products.find((product) => product.slug === normalizedSlug) || null
}

export async function getProductsByCategory(category) {
  const normalizedCategory = normalizeProductCategory(category)

  if (!normalizedCategory) return []

  const products = await getActiveProducts()
  return products.filter((product) => product.category === normalizedCategory)
}

export async function getFeaturedProducts(limit = 4) {
  const products = await getActiveProducts()
  return products.filter((product) => product.featured).slice(0, limit)
}

export async function getBestSellerProducts(limit = 4) {
  const products = await getActiveProducts()
  return products.filter((product) => product.bestSeller).slice(0, limit)
}

export async function searchProducts(searchTerm, limit = 12) {
  const products = await getActiveProducts()
  return searchProductsLocally(searchTerm, products, { limit })
}

export function getRelatedProductsFromList(product, products, limit = 4) {
  return getRelatedProducts(product, products, limit)
}

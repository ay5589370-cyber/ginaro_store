import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/firebase.js'
import { normalizeProductCategory } from '../utils/productData.js'

const WISHLIST_COLLECTION = 'wishlist'

function getConfigurationError() {
  const error = new Error('Firestore wishlist is not configured.')
  error.code = 'wishlist/configuration-not-ready'
  return error
}

function requireUid(uid) {
  if (!uid) {
    const error = new Error('Sign in before updating your wishlist.')
    error.code = 'wishlist/auth-required'
    throw error
  }
}

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return db
}

function getWishlistCollection(uid) {
  return collection(requireDb(), 'users', uid, WISHLIST_COLLECTION)
}

function getWishlistDocument(uid, productId) {
  return doc(requireDb(), 'users', uid, WISHLIST_COLLECTION, String(productId))
}

function normalizeWishlistItem(snapshot) {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    productId: data.productId || snapshot.id,
    name: data.name || '',
    price: Number(data.price) || 0,
    image: data.image || '',
    category: data.category || '',
    addedAt: data.addedAt || null,
  }
}

export function getWishlistErrorMessage(error) {
  const messages = {
    'wishlist/auth-required': 'Please log in to save items to your wishlist.',
    'wishlist/configuration-not-ready': 'Wishlist is not configured. Please try again later.',
    'permission-denied': 'You do not have permission to update this wishlist.',
    unavailable: 'Wishlist is temporarily unavailable. Please try again.',
  }

  return messages[error?.code] || 'Unable to update wishlist.'
}

export async function getWishlist(uid) {
  requireUid(uid)

  const snapshot = await getDocs(getWishlistCollection(uid))

  return snapshot.docs
    .map(normalizeWishlistItem)
    .sort((a, b) => String(a.productId).localeCompare(String(b.productId), undefined, { numeric: true }))
}

export async function addToWishlist(uid, product) {
  requireUid(uid)

  const productId = String(product?.id || product?.productId || '')

  if (!productId) {
    const error = new Error('A product is required before updating your wishlist.')
    error.code = 'wishlist/invalid-product'
    throw error
  }

  const wishlistItem = {
    productId,
    name: product.name || '',
    price: Number(product.price) || 0,
    image: product.images?.[0] || product.image || '',
    category: normalizeProductCategory(product.category),
    addedAt: serverTimestamp(),
  }

  await setDoc(getWishlistDocument(uid, productId), wishlistItem)

  return {
    id: productId,
    ...wishlistItem,
    addedAt: null,
  }
}

export async function removeFromWishlist(uid, productId) {
  requireUid(uid)
  await deleteDoc(getWishlistDocument(uid, productId))

  return { success: true, productId: String(productId) }
}

export async function isInWishlist(uid, productId) {
  requireUid(uid)
  const snapshot = await getDoc(getWishlistDocument(uid, productId))

  return snapshot.exists()
}

export async function clearWishlist(uid) {
  requireUid(uid)
  const snapshot = await getDocs(getWishlistCollection(uid))
  const batch = writeBatch(requireDb())

  snapshot.docs.forEach((wishlistDoc) => {
    batch.delete(wishlistDoc.ref)
  })

  await batch.commit()

  return { success: true }
}

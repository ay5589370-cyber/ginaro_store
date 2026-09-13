import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/firebase.js'

const USERS_COLLECTION = 'users'

function getConfigurationError() {
  const error = new Error('Firestore user profiles are not configured.')
  error.code = 'firestore/configuration-not-ready'
  return error
}

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return db
}

function getUserRef(uid) {
  return doc(requireDb(), USERS_COLLECTION, uid)
}

function getSafeProfileOverrides(overrides = {}) {
  return {
    firstName: typeof overrides.firstName === 'string' ? overrides.firstName.trim() : undefined,
    lastName: typeof overrides.lastName === 'string' ? overrides.lastName.trim() : undefined,
    displayName: typeof overrides.displayName === 'string' ? overrides.displayName.trim() : undefined,
    email: typeof overrides.email === 'string' ? overrides.email.trim() : undefined,
    phone: typeof overrides.phone === 'string' ? overrides.phone.trim() : undefined,
    photoURL: typeof overrides.photoURL === 'string' ? overrides.photoURL : undefined,
  }
}

function getNameParts(displayName = '') {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

export function getFirestoreErrorMessage(error) {
  const messages = {
    'firestore/configuration-not-ready': 'Firestore is not configured. Add the Firebase environment variables and restart the app.',
    'permission-denied': 'You do not have permission to update this profile.',
    unavailable: 'Profile service is temporarily unavailable. Please try again.',
    'failed-precondition': 'Profile service needs a Firebase configuration update before this can continue.',
    unauthenticated: 'Please sign in before updating your profile.',
    'firestore/missing-auth-user': 'A signed-in Firebase user is required before creating a profile.',
  }

  return messages[error?.code] || 'Unable to update your profile. Please try again.'
}

export function buildUserProfileData(user, overrides = {}) {
  const safeOverrides = getSafeProfileOverrides(overrides)
  const displayName = safeOverrides.displayName || user.displayName || ''
  const fallbackNames = getNameParts(displayName)
  const firstName = safeOverrides.firstName ?? fallbackNames.firstName
  const lastName = safeOverrides.lastName ?? fallbackNames.lastName

  return {
    uid: user.uid,
    firstName,
    lastName,
    displayName: safeOverrides.displayName ?? [firstName, lastName].filter(Boolean).join(' ').trim(),
    email: safeOverrides.email ?? user.email ?? '',
    phone: safeOverrides.phone ?? '',
    role: 'customer',
    photoURL: safeOverrides.photoURL ?? user.photoURL ?? null,
  }
}

export async function userProfileExists(uid) {
  const snapshot = await getDoc(getUserRef(uid))
  return snapshot.exists()
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(getUserRef(uid))

  if (!snapshot.exists()) return null

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

export async function createUserProfile(user, profileData = {}) {
  if (!user?.uid) {
    const error = new Error('A Firebase Auth user is required to create a profile.')
    error.code = 'firestore/missing-auth-user'
    throw error
  }

  const existingProfile = await getUserProfile(user.uid)

  if (existingProfile) return existingProfile

  const profile = buildUserProfileData(user, profileData)
  const profileWithTimestamps = {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(requireDb(), USERS_COLLECTION, user.uid), profileWithTimestamps)

  return {
    id: user.uid,
    ...profile,
  }
}

export async function ensureUserProfile(user, profileData = {}) {
  return createUserProfile(user, profileData)
}

export async function updateUserProfile(uid, updates) {
  const safeUpdates = {
    firstName: updates.firstName,
    lastName: updates.lastName,
    displayName: updates.displayName,
    phone: updates.phone,
    photoURL: updates.photoURL ?? null,
    updatedAt: serverTimestamp(),
  }

  await updateDoc(getUserRef(uid), safeUpdates)

  return getUserProfile(uid)
}

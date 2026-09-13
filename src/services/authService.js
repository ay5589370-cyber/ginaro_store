import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/firebase.js'

function getConfigurationError() {
  const error = new Error('Firebase Authentication is not configured.')
  error.code = 'auth/configuration-not-ready'
  return error
}

function requireAuth() {
  if (!auth || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return auth
}

export function getAuthErrorMessage(error) {
  const code = error?.code

  const messages = {
    'auth/configuration-not-ready': 'Firebase Authentication is not configured. Add the required Vite Firebase environment variables and restart the app.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/requires-recent-login': 'Please sign in again before updating your account.',
  }

  return messages[code] || 'Something went wrong. Please try again.'
}

export async function registerUser({ email, password, displayName }) {
  const firebaseAuth = requireAuth()
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)

  if (displayName) {
    await updateFirebaseProfile(credential.user, { displayName })
  }

  return { user: credential.user }
}

export async function loginUser({ email, password }) {
  const firebaseAuth = requireAuth()
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)

  return credential.user
}

export async function logoutUser() {
  return signOut(requireAuth())
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(requireAuth(), email)
}

export async function updateUserDisplayName(displayName) {
  const firebaseAuth = requireAuth()

  if (!firebaseAuth.currentUser) {
    const error = new Error('No authenticated user is available.')
    error.code = 'auth/no-current-user'
    throw error
  }

  await updateFirebaseProfile(firebaseAuth.currentUser, { displayName })

  return firebaseAuth.currentUser
}

export function subscribeToAuthChanges(onChange, onError) {
  if (!auth || !isFirebaseConfigured) {
    onChange(null)
    return () => {}
  }

  return onAuthStateChanged(auth, onChange, onError)
}

export { auth, isFirebaseConfigured }

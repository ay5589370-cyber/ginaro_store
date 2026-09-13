// SERVER ONLY. Do not import this module from src/ or browser code.
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export function hasFirebaseAdminCredentials() {
  return Boolean(
    (process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID)
      && (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL)
      && (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY),
  )
}

export function canUseApplicationDefaultCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS
      || process.env.FIREBASE_CONFIG
      || process.env.GCLOUD_PROJECT
      || process.env.GOOGLE_CLOUD_PROJECT,
  )
}

export function isFirebaseAdminConfigured() {
  return hasFirebaseAdminCredentials() || canUseApplicationDefaultCredentials()
}

function getFirebaseAdminCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    })
  }

  return applicationDefault()
}

function getFirebaseAdminApp() {
  const existingApp = getApps()[0]
  if (existingApp) return existingApp

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID

  return initializeApp({
    credential: getFirebaseAdminCredential(),
    ...(projectId ? { projectId } : {}),
  })
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}

export function getAdminFirestore() {
  return getFirestore(getFirebaseAdminApp())
}

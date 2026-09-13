import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

function cleanEnvValue(value) {
  return value
    .trim()
    .replace(/,+$/, '')
    .replace(/^['"]|['"]$/g, '')
    .trim()
}

function loadEnvFile(fileName) {
  const envPath = resolve(projectRoot, fileName)

  if (!existsSync(envPath)) return

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) return

    const separatorIndex = trimmed.indexOf('=')

    if (separatorIndex === -1) return

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = cleanEnvValue(trimmed.slice(separatorIndex + 1))

    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

function getFirebaseConfig() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const firebaseConfig = getFirebaseConfig()
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingKeys.length > 0) {
  console.error(`Missing Firebase config values: ${missingKeys.join(', ')}`)
  process.exitCode = 1
} else {
  const app = initializeApp(firebaseConfig)
  const firestore = getFirestore(app)
  const activeProductsQuery = query(
    collection(firestore, 'products'),
    where('active', '==', true),
  )
  const snapshot = await getDocs(activeProductsQuery)
  const firstProduct = snapshot.docs[0]?.data()
  const firstImage = firstProduct?.images?.[0] || ''
  let firstImageStatus = 'not checked'

  if (firstImage) {
    try {
      const response = await fetch(firstImage, { method: 'HEAD' })
      firstImageStatus = `HTTP ${response.status}`
    } catch {
      firstImageStatus = 'request failed'
    }
  }

  console.info(`Active Firestore products: ${snapshot.size}`)
  console.info(`First product image source: ${firstImage.includes('supabase') ? 'Supabase public URL' : 'not Supabase URL'}`)
  console.info(`First product image check: ${firstImageStatus}`)
  await deleteApp(app)
}

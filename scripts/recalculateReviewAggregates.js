import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FieldValue } from 'firebase-admin/firestore'

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

function calculateAggregate(reviews) {
  if (reviews.length === 0) {
    return {
      rating: 0,
      reviewCount: 0,
    }
  }

  const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)

  return {
    rating: Math.round((total / reviews.length) * 10) / 10,
    reviewCount: reviews.length,
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const { getAdminFirestore, isFirebaseAdminConfigured } = await import('../server/firebaseAdmin.js')

if (!isFirebaseAdminConfigured()) {
  console.error('Missing Firebase Admin environment variables.')
  process.exitCode = 1
} else {
  const db = getAdminFirestore()
  const productsSnapshot = await db.collection('products').get()
  const batch = db.batch()
  let updated = 0

  for (const productDoc of productsSnapshot.docs) {
    const reviewsSnapshot = await productDoc.ref.collection('reviews').get()
    const reviews = reviewsSnapshot.docs.map((reviewDoc) => reviewDoc.data())
    const aggregate = calculateAggregate(reviews)

    batch.update(productDoc.ref, {
      ...aggregate,
      updatedAt: FieldValue.serverTimestamp(),
    })
    updated += 1
  }

  await batch.commit()
  console.info(`Recalculated review aggregates for ${updated} product(s).`)
}

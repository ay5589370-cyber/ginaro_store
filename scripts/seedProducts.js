import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { products as localProducts } from '../src/data/products.js'
import {
  normalizeProductForFirestore,
  PRODUCT_COLLECTION,
  validateProductData,
} from '../src/utils/productData.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const args = new Set(process.argv.slice(2))
const isDryRun = args.has('--dry-run')
const shouldUpdateExisting = args.has('--update')

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

function validateSeedProducts(products) {
  const slugs = new Set()
  const failures = []

  const normalizedProducts = products.map((product) => {
    const normalizedProduct = normalizeProductForFirestore(product)
    const validation = validateProductData(normalizedProduct)

    if (slugs.has(normalizedProduct.slug)) {
      failures.push(`${product.name || product.id}: duplicate slug "${normalizedProduct.slug}"`)
    }

    slugs.add(normalizedProduct.slug)

    if (!validation.isValid) {
      failures.push(`${product.name || product.id}: ${validation.errors.join(', ')}`)
    }

    return {
      id: String(product.id),
      sourceProduct: product,
      product: normalizedProduct,
    }
  })

  return {
    normalizedProducts,
    failures,
  }
}

function getImageStatus(products) {
  return products.reduce(
    (summary, product) => {
      product.product.images.forEach((image) => {
        if (image.includes('/storage/v1/object/public/product-images/')) {
          summary.supabasePublicUrls += 1
        } else if (image.startsWith('/')) {
          summary.localPaths += 1
        } else {
          summary.otherUrls += 1
        }
      })

      return summary
    },
    {
      supabasePublicUrls: 0,
      localPaths: 0,
      otherUrls: 0,
    },
  )
}

function assertFirebaseConfig(config) {
  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase config values: ${missingKeys.join(', ')}`)
  }
}

async function seedProducts() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const { normalizedProducts, failures } = validateSeedProducts(localProducts)
  const imageStatus = getImageStatus(normalizedProducts)

  console.info(`Prepared ${normalizedProducts.length} local products for Firestore.`)
  console.info(`Image references: ${imageStatus.supabasePublicUrls} Supabase public URL(s), ${imageStatus.localPaths} local path(s), ${imageStatus.otherUrls} other URL(s).`)

  if (failures.length > 0) {
    console.error('Product validation failed:')
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exitCode = 1
    return
  }

  if (isDryRun) {
    console.info('Dry run complete. No Firestore writes were attempted.')
    return
  }

  const firebaseConfig = getFirebaseConfig()
  assertFirebaseConfig(firebaseConfig)

  const email = process.env.FIREBASE_SEED_EMAIL
  const password = process.env.FIREBASE_SEED_PASSWORD

  if (!email || !password) {
    throw new Error('Set FIREBASE_SEED_EMAIL and FIREBASE_SEED_PASSWORD for an admin-capable Firebase user before seeding.')
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const firestore = getFirestore(app)
  const credential = await signInWithEmailAndPassword(auth, email, password)

  console.info(`Signed in seed user ${credential.user.uid}.`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const item of normalizedProducts) {
    const productRef = doc(firestore, PRODUCT_COLLECTION, item.id)
    const existingSnapshot = await getDoc(productRef)

    if (existingSnapshot.exists() && !shouldUpdateExisting) {
      skipped += 1
      continue
    }

    await setDoc(productRef, {
      ...item.product,
      createdAt: existingSnapshot.exists()
        ? existingSnapshot.data().createdAt || serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    if (existingSnapshot.exists()) {
      updated += 1
    } else {
      created += 1
    }
  }

  console.info(`Seed complete. Created: ${created}. Updated: ${updated}. Skipped existing: ${skipped}.`)
}

seedProducts().catch((error) => {
  console.error(error.message || 'Product seed failed.')
  process.exitCode = 1
})

export const PRODUCT_COLLECTION = 'products'

export const PRODUCT_CATEGORIES = Object.freeze(['vest', 'pajama', 'combo'])

export const PRODUCT_CATEGORY_LABELS = Object.freeze({
  vest: 'Vests',
  pajama: 'Pajamas',
  combo: 'Combo Packs',
})

const CATEGORY_ALIASES = Object.freeze({
  vest: 'vest',
  vests: 'vest',
  pajama: 'pajama',
  pajamas: 'pajama',
  combo: 'combo',
  combos: 'combo',
  'combo-pack': 'combo',
  'combo-packs': 'combo',
})

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function toSafeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function toSafeInteger(value, fallback = 0) {
  const number = Math.trunc(toSafeNumber(value, fallback))
  return Number.isFinite(number) ? number : fallback
}

function toStringArray(value) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => toSafeString(item))
    .filter(Boolean)
}

function normalizeDateForClient(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()

  return value
}

export function normalizeProductCategory(category) {
  const normalized = toSafeString(category)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return CATEGORY_ALIASES[normalized] || normalized
}

export function getProductCategoryLabel(category) {
  const normalized = normalizeProductCategory(category)
  return PRODUCT_CATEGORY_LABELS[normalized] || toSafeString(category, 'Product')
}

export function generateProductSlug(name) {
  return toSafeString(name)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildProductTags(product) {
  const category = normalizeProductCategory(product.category)
  const baseTags = [
    ...toStringArray(product.tags),
    toSafeString(product.material).toLowerCase(),
    ...toStringArray(product.colors).map((color) => color.toLowerCase()),
  ]

  if (category === 'vest') {
    baseTags.push('daily wear', 'breathable')
  }

  if (category === 'pajama') {
    baseTags.push('sleepwear', 'lounge')
  }

  if (category === 'combo') {
    baseTags.push('value pack', 'essentials')
  }

  return [...new Set(baseTags.filter(Boolean))]
}

export function normalizeProductImages(product) {
  const images = [
    ...toStringArray(product.images),
    toSafeString(product.image),
  ].filter(Boolean)

  return [...new Set(images)]
}

export function normalizeProductForFirestore(product) {
  const category = normalizeProductCategory(product.category)
  const price = toSafeNumber(product.price)
  const originalPrice = product.originalPrice === null || product.originalPrice === undefined
    ? null
    : toSafeNumber(product.originalPrice)

  return {
    name: toSafeString(product.name),
    slug: generateProductSlug(product.slug || product.name),
    category,
    price,
    originalPrice,
    description: toSafeString(product.description),
    material: toSafeString(product.material),
    sizes: toStringArray(product.sizes),
    colors: toStringArray(product.colors),
    images: normalizeProductImages(product),
    stock: toSafeInteger(product.stock),
    rating: toSafeNumber(product.rating),
    reviewCount: toSafeInteger(product.reviewCount),
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller),
    active: product.active === undefined ? true : Boolean(product.active),
    customizable: product.customizable === undefined
      ? category === 'vest'
      : Boolean(product.customizable),
    tags: buildProductTags(product),
  }
}

export function normalizeProductForClient(id, product) {
  const normalized = normalizeProductForFirestore(product)

  return {
    id: String(id ?? product.id),
    ...normalized,
    image: normalized.images[0] || '',
    categoryLabel: getProductCategoryLabel(normalized.category),
    createdAt: normalizeDateForClient(product.createdAt),
    updatedAt: normalizeDateForClient(product.updatedAt),
  }
}

export function validateProductData(product) {
  const errors = []

  if (!toSafeString(product.name)) errors.push('name is required')
  if (!PRODUCT_CATEGORIES.includes(normalizeProductCategory(product.category))) {
    errors.push('category must be vest, pajama, or combo')
  }
  if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
    errors.push('price must be a number greater than or equal to 0')
  }
  if (
    product.originalPrice !== null
    && product.originalPrice !== undefined
    && (!Number.isFinite(Number(product.originalPrice)) || Number(product.originalPrice) < Number(product.price))
  ) {
    errors.push('originalPrice must be null or greater than or equal to price')
  }
  if (!Number.isInteger(Number(product.stock)) || Number(product.stock) < 0) {
    errors.push('stock must be an integer greater than or equal to 0')
  }
  if (!Number.isFinite(Number(product.rating)) || Number(product.rating) < 0 || Number(product.rating) > 5) {
    errors.push('rating must be between 0 and 5')
  }
  if (!Array.isArray(product.sizes)) errors.push('sizes must be an array')
  if (!Array.isArray(product.colors)) errors.push('colors must be an array')
  if (!Array.isArray(product.images)) errors.push('images must be an array')
  if (typeof product.active !== 'boolean') errors.push('active must be a boolean')

  return {
    isValid: errors.length === 0,
    errors,
  }
}

import { getProductCategoryLabel, normalizeProductCategory } from './productData.js'

export const RECENT_SEARCHES_KEY = 'ginaro-recent-searches'
export const RECENTLY_VIEWED_KEY = 'ginaro-recently-viewed'

export const defaultDiscoveryFilters = {
  category: 'All',
  priceRanges: [],
  sizes: [],
  colors: [],
  materials: [],
  inStock: false,
}

export function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeComparable(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function getMainImage(product) {
  return product?.images?.[0] || product?.image || ''
}

function getSearchTokens(query) {
  return normalizeComparable(query).split(' ').filter((token) => token.length > 0)
}

function includesNormalized(values, selectedValue) {
  const selected = normalizeComparable(selectedValue)
  return toArray(values).some((value) => normalizeComparable(value) === selected)
}

function hasAnyNormalized(values, selectedValues) {
  if (selectedValues.length === 0) return true
  return selectedValues.some((value) => includesNormalized(values, value))
}

export function isCustomerVisibleProduct(product) {
  return Boolean(product) && product.active !== false
}

export function isProductInStock(product) {
  return Number(product?.stock || 0) > 0
}

export function getProductSearchFields(product) {
  if (!product) return {}

  const categoryLabel = product.categoryLabel || getProductCategoryLabel(product.category)

  return {
    name: normalizeComparable(product.name),
    category: normalizeComparable(product.category),
    categoryLabel: normalizeComparable(categoryLabel),
    material: normalizeComparable(product.material),
    description: normalizeComparable(product.description),
    colors: toArray(product.colors).map(normalizeComparable),
    sizes: toArray(product.sizes).map(normalizeComparable),
    tags: toArray(product.tags).map(normalizeComparable),
  }
}

export function getProductSearchText(product) {
  const fields = getProductSearchFields(product)

  return [
    fields.name,
    fields.category,
    fields.categoryLabel,
    fields.material,
    fields.description,
    ...toArray(fields.colors),
    ...toArray(fields.sizes),
    ...toArray(fields.tags),
  ]
    .filter(Boolean)
    .join(' ')
}

function tokenMatchScore(tokens, value, points) {
  if (tokens.length === 0 || !value) return 0
  return tokens.reduce((score, token) => (value.includes(token) ? score + points : score), 0)
}

export function scoreProductForQuery(product, query) {
  const normalizedQuery = normalizeComparable(query)
  const tokens = getSearchTokens(query)

  if (!isCustomerVisibleProduct(product) || normalizedQuery.length === 0) return 0

  const fields = getProductSearchFields(product)
  let score = 0

  if (fields.name === normalizedQuery) score += 100
  if (fields.name.startsWith(normalizedQuery)) score += 75
  if (fields.name.includes(normalizedQuery)) score += 45

  score += toArray(fields.tags).some((tag) => tag === normalizedQuery) ? 34 : 0
  score += toArray(fields.tags).some((tag) => tag.includes(normalizedQuery)) ? 24 : 0
  score += fields.category === normalizedQuery || fields.categoryLabel === normalizedQuery ? 28 : 0
  score += fields.category.includes(normalizedQuery) || fields.categoryLabel.includes(normalizedQuery) ? 18 : 0
  score += fields.material.includes(normalizedQuery) ? 14 : 0
  score += toArray(fields.colors).some((color) => color.includes(normalizedQuery)) ? 12 : 0
  score += fields.description.includes(normalizedQuery) ? 6 : 0

  score += tokenMatchScore(tokens, fields.name, 8)
  score += tokenMatchScore(tokens, toArray(fields.tags).join(' '), 6)
  score += tokenMatchScore(tokens, `${fields.category} ${fields.categoryLabel}`, 5)
  score += tokenMatchScore(tokens, `${fields.material} ${toArray(fields.colors).join(' ')}`, 4)
  score += tokenMatchScore(tokens, fields.description, 2)

  return score
}

export function searchProductsLocally(query, products, options = {}) {
  const { limit = 12 } = options
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) return []

  return toArray(products)
    .filter(isCustomerVisibleProduct)
    .map((product) => ({
      product,
      score: scoreProductForQuery(product, normalizedQuery),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(isProductInStock(b.product)) - Number(isProductInStock(a.product)) ||
        getPopularProductScore(b.product) - getPopularProductScore(a.product) ||
        String(a.product.name).localeCompare(String(b.product.name)),
    )
    .slice(0, limit)
    .map((item) => item.product)
}

export function matchesPriceRange(price, range) {
  const numericPrice = Number(price) || 0
  if (range === 'under-300') return numericPrice < 300
  if (range === '300-500') return numericPrice >= 300 && numericPrice <= 500
  if (range === '500-800') return numericPrice >= 500 && numericPrice <= 800
  if (range === 'above-800') return numericPrice > 800
  return true
}

export function filterProductsForDiscovery(products, filters = defaultDiscoveryFilters, searchTerm = '') {
  const normalizedQuery = normalizeSearchText(searchTerm)
  const safeFilters = { ...defaultDiscoveryFilters, ...filters }

  return toArray(products).filter((product) => {
    if (!isCustomerVisibleProduct(product)) return false

    const categoryLabel = getProductCategoryLabel(product.category)
    const matchesSearch =
      normalizedQuery.length === 0 || scoreProductForQuery(product, normalizedQuery) > 0
    const matchesCategory =
      safeFilters.category === 'All' || categoryLabel === safeFilters.category
    const matchesPrice =
      safeFilters.priceRanges.length === 0 ||
      safeFilters.priceRanges.some((range) => matchesPriceRange(product.price, range))
    const matchesSizes = hasAnyNormalized(product.sizes, safeFilters.sizes)
    const matchesColors = hasAnyNormalized(product.colors, safeFilters.colors)
    const matchesMaterial =
      safeFilters.materials.length === 0 ||
      safeFilters.materials.some((material) => normalizeComparable(product.material) === normalizeComparable(material))
    const matchesStock = !safeFilters.inStock || isProductInStock(product)

    return (
      matchesSearch &&
      matchesCategory &&
      matchesPrice &&
      matchesSizes &&
      matchesColors &&
      matchesMaterial &&
      matchesStock
    )
  })
}

function getTimeValue(value) {
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export function getRatingConfidenceScore(product) {
  const rating = Number(product?.rating || 0)
  const reviewCount = Number(product?.reviewCount || 0)
  const confidence = reviewCount / (reviewCount + 8)

  return rating * confidence
}

export function getPopularProductScore(product) {
  if (!isCustomerVisibleProduct(product)) return 0

  const reviewCount = Number(product.reviewCount || 0)

  return (
    Number(Boolean(product.bestSeller)) * 4 +
    Number(Boolean(product.featured)) * 2 +
    getRatingConfidenceScore(product) +
    Math.min(reviewCount, 50) / 25 +
    Number(isProductInStock(product)) * 0.4
  )
}

export function sortDiscoveryProducts(products, sortBy = 'relevance', query = '') {
  const sorted = [...toArray(products)]

  if (sortBy === 'price-low') return sorted.sort((a, b) => Number(a.price) - Number(b.price))
  if (sortBy === 'price-high') return sorted.sort((a, b) => Number(b.price) - Number(a.price))
  if (sortBy === 'newest') return sorted.sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt))
  if (sortBy === 'rating' || sortBy === 'best-rated') {
    return sorted.sort(
      (a, b) =>
        getRatingConfidenceScore(b) - getRatingConfidenceScore(a) ||
        Number(b.rating || 0) - Number(a.rating || 0),
    )
  }
  if (sortBy === 'featured') {
    return sorted.sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        getPopularProductScore(b) - getPopularProductScore(a),
    )
  }

  return sorted.sort(
    (a, b) =>
      scoreProductForQuery(b, query) - scoreProductForQuery(a, query) ||
      getPopularProductScore(b) - getPopularProductScore(a) ||
      String(a.name).localeCompare(String(b.name)),
  )
}

export function getPopularProducts(products, limit = 4) {
  return toArray(products)
    .filter(isCustomerVisibleProduct)
    .sort(
      (a, b) =>
        getPopularProductScore(b) - getPopularProductScore(a) ||
        String(a.name).localeCompare(String(b.name)),
    )
    .slice(0, limit)
}

function sharedTagScore(sourceProduct, candidateProduct) {
  const sourceTags = new Set(toArray(sourceProduct?.tags).map(normalizeComparable))
  return toArray(candidateProduct?.tags).reduce(
    (score, tag) => (sourceTags.has(normalizeComparable(tag)) ? score + 2 : score),
    0,
  )
}

export function scoreRelatedProduct(sourceProduct, candidateProduct) {
  if (!sourceProduct || !candidateProduct) return 0
  if (String(sourceProduct.id) === String(candidateProduct.id)) return 0
  if (!isCustomerVisibleProduct(candidateProduct)) return 0

  const sourceCategory = normalizeProductCategory(sourceProduct.category)
  const candidateCategory = normalizeProductCategory(candidateProduct.category)
  const sourcePrice = Number(sourceProduct.price || 0)
  const candidatePrice = Number(candidateProduct.price || 0)
  const similarPrice =
    sourcePrice > 0 && Math.abs(sourcePrice - candidatePrice) / sourcePrice <= 0.25

  return (
    Number(sourceCategory === candidateCategory) * 3 +
    sharedTagScore(sourceProduct, candidateProduct) +
    Number(normalizeComparable(sourceProduct.material) === normalizeComparable(candidateProduct.material)) +
    Number(similarPrice) +
    Number(Boolean(candidateProduct.bestSeller)) * 0.5 +
    getRatingConfidenceScore(candidateProduct) * 0.25 +
    Number(isProductInStock(candidateProduct)) * 0.5
  )
}

export function getRelatedProducts(product, products, limit = 4) {
  if (!product) return []

  return toArray(products)
    .filter((candidate) => String(candidate.id) !== String(product.id))
    .filter(isCustomerVisibleProduct)
    .map((candidate) => ({
      product: candidate,
      score: scoreRelatedProduct(product, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        getPopularProductScore(b.product) - getPopularProductScore(a.product) ||
        String(a.product.name).localeCompare(String(b.product.name)),
    )
    .slice(0, limit)
    .map((item) => item.product)
}

function readStoredArray(key) {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredArray(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getRecentSearches() {
  return readStoredArray(RECENT_SEARCHES_KEY)
    .map((query) => normalizeSearchText(query))
    .filter(Boolean)
    .slice(0, 5)
}

export function saveRecentSearch(query) {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < 2) return getRecentSearches()

  const searches = getRecentSearches()
  const nextSearches = [
    normalizedQuery,
    ...searches.filter((search) => search !== normalizedQuery),
  ].slice(0, 5)

  writeStoredArray(RECENT_SEARCHES_KEY, nextSearches)
  window.dispatchEvent(new Event('ginaro-recent-searches-change'))

  return nextSearches
}

export function clearRecentSearches() {
  writeStoredArray(RECENT_SEARCHES_KEY, [])
  window.dispatchEvent(new Event('ginaro-recent-searches-change'))
}

export function getRecentlyViewedEntries() {
  const entries = readStoredArray(RECENTLY_VIEWED_KEY)

  return entries
    .map((entry) => {
      if (typeof entry === 'string' || typeof entry === 'number') {
        return { id: String(entry), viewedAt: 0 }
      }

      return {
        id: String(entry?.id || entry?.productId || ''),
        viewedAt: Number(entry?.viewedAt || 0),
        name: entry?.name || '',
        category: entry?.category || '',
        image: entry?.image || '',
      }
    })
    .filter((entry) => entry.id)
}

export function getRecentlyViewedIds() {
  return getRecentlyViewedEntries().map((entry) => entry.id)
}

export function addRecentlyViewedProduct(product, limit = 10) {
  if (!product?.id) return getRecentlyViewedEntries()

  const productId = String(product.id)
  const nextEntry = {
    id: productId,
    name: product.name || '',
    category: normalizeProductCategory(product.category),
    image: getMainImage(product),
    viewedAt: Date.now(),
  }
  const entries = getRecentlyViewedEntries()
  const nextEntries = [
    nextEntry,
    ...entries.filter((entry) => String(entry.id) !== productId),
  ].slice(0, limit)

  writeStoredArray(RECENTLY_VIEWED_KEY, nextEntries)
  window.dispatchEvent(new Event('ginaro-recently-viewed-change'))

  return nextEntries
}

export function getRecentlyViewedProducts(products, options = {}) {
  const { excludeProductId = '', limit = 8 } = options
  const productsById = new Map(toArray(products).map((product) => [String(product.id), product]))

  return getRecentlyViewedEntries()
    .map((entry) => productsById.get(String(entry.id)))
    .filter(Boolean)
    .filter(isCustomerVisibleProduct)
    .filter((product) => String(product.id) !== String(excludeProductId))
    .slice(0, limit)
}

function getProductsByIds(ids, products) {
  const productsById = new Map(toArray(products).map((product) => [String(product.id), product]))
  return toArray(ids).map((id) => productsById.get(String(id))).filter(Boolean)
}

function addCategorySignal(signalMap, category, weight) {
  const normalizedCategory = normalizeProductCategory(category)
  if (!normalizedCategory) return
  signalMap.set(normalizedCategory, (signalMap.get(normalizedCategory) || 0) + weight)
}

export function getRecommendedProducts(context = {}, products, limit = 4) {
  const excludeIds = new Set(toArray(context.excludeProductIds).map(String))
  const categorySignals = new Map()
  const searchTerms = toArray(context.recentSearches).map(normalizeSearchText).filter(Boolean)
  const recentlyViewedProducts = getProductsByIds(context.recentlyViewedIds, products)
  const wishlistProducts = getProductsByIds(
    toArray(context.wishlistItems).map((item) => item.productId || item.id),
    products,
  )

  recentlyViewedProducts.forEach((product, index) => addCategorySignal(categorySignals, product.category, Math.max(4 - index, 1)))
  wishlistProducts.forEach((product) => addCategorySignal(categorySignals, product.category, 3))
  toArray(context.wishlistItems).forEach((item) => addCategorySignal(categorySignals, item.category, 2))

  const hasSignals =
    categorySignals.size > 0 || searchTerms.length > 0 || recentlyViewedProducts.length > 0

  const scored = toArray(products)
    .filter(isCustomerVisibleProduct)
    .filter((product) => !excludeIds.has(String(product.id)))
    .map((product) => {
      const category = normalizeProductCategory(product.category)
      const viewedTagScore = recentlyViewedProducts.reduce(
        (score, viewedProduct) => score + sharedTagScore(viewedProduct, product),
        0,
      )
      const searchScore = searchTerms.reduce(
        (score, term) => score + Math.min(scoreProductForQuery(product, term), 40) / 8,
        0,
      )
      const preferenceScore =
        (categorySignals.get(category) || 0) +
        viewedTagScore +
        searchScore

      return {
        product,
        score:
          preferenceScore +
          getPopularProductScore(product) * 0.35 +
          Number(isProductInStock(product)) * 0.8,
        preferenceScore,
      }
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        Number(b.preferenceScore > 0) - Number(a.preferenceScore > 0) ||
        b.score - a.score ||
        String(a.product.name).localeCompare(String(b.product.name)),
    )

  if (!hasSignals || scored.every((item) => item.preferenceScore === 0)) {
    return getPopularProducts(products, limit)
  }

  return scored.slice(0, limit).map((item) => item.product)
}

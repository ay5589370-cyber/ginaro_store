import { getProductCategoryLabel, normalizeProductCategory } from './productData.js'

const colors = ['White', 'Black', 'Grey', 'Navy', 'Brown']
const sizes = ['XXL', 'XL', 'L', 'M', 'S']

const categoryKeywords = [
  { category: 'vest', keywords: ['vest', 'vests'] },
  { category: 'pajama', keywords: ['pajama', 'pajamas', 'nightwear', 'summer'] },
  { category: 'combo', keywords: ['combo', 'combos', 'pack', 'packs'] },
]

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function getTokens(value) {
  return normalize(value).split(' ').filter(Boolean)
}

function includesAny(tokens, keywords) {
  return keywords.some((keyword) => tokens.includes(keyword))
}

function parseFilters(message) {
  const normalized = normalize(message)
  const tokens = getTokens(message)
  const filters = {}

  const categoryMatch = categoryKeywords.find((item) => includesAny(tokens, item.keywords))
  if (categoryMatch) {
    filters.category = categoryMatch.category
  }

  const color = colors.find((item) => tokens.includes(item.toLowerCase()))
  if (color) {
    filters.color = color
  }

  const size = sizes.find((item) => tokens.includes(item.toLowerCase()))
  if (size) {
    filters.size = size
  }

  const priceMatch = normalized.match(/(?:under|below|less than|up to|upto|max|maximum)\s*(?:rs|inr|₹)?\s*(\d+)/)
  if (priceMatch) {
    filters.maxPrice = Number(priceMatch[1])
  }

  if (normalized.includes('premium cotton')) {
    filters.material = 'Premium Cotton'
  } else if (normalized.includes('cotton blend')) {
    filters.material = 'Cotton Blend'
  } else if (tokens.includes('cotton') || normalized.includes('breathable')) {
    filters.materialKeyword = 'cotton'
  }

  if (normalized.includes('best seller') || normalized.includes('best-selling') || normalized.includes('bestseller')) {
    filters.bestSeller = true
  }

  if (tokens.includes('featured')) {
    filters.featured = true
  }

  return filters
}

function matchesFilters(product, filters) {
  if (filters.category && normalizeProductCategory(product.category) !== normalizeProductCategory(filters.category)) return false
  if (filters.color && !product.colors.includes(filters.color)) return false
  if (filters.size && !product.sizes.includes(filters.size)) return false
  if (filters.maxPrice && product.price > filters.maxPrice) return false
  if (filters.material && product.material !== filters.material) return false
  if (filters.materialKeyword && !product.material.toLowerCase().includes(filters.materialKeyword)) return false
  if (filters.bestSeller && !product.bestSeller) return false
  if (filters.featured && !product.featured) return false
  return true
}

export function filterProductsForAssistant(products, filters) {
  return products
    .filter((product) => matchesFilters(product, filters))
    .sort(
      (a, b) =>
        Number(b.bestSeller) - Number(a.bestSeller) ||
        Number(b.featured) - Number(a.featured) ||
        b.rating - a.rating,
    )
}

function findProductMention(message, products, contextProduct = null) {
  const normalized = normalize(message)

  if (contextProduct && /\b(this|it|current product)\b/.test(normalized)) {
    return contextProduct
  }

  const exactMatch = products
    .filter((product) => normalized.includes(normalize(product.name)))
    .sort((a, b) => b.name.length - a.name.length)[0]

  if (exactMatch) {
    return exactMatch
  }

  const messageTokens = new Set(getTokens(message))
  const scored = products
    .map((product) => {
      const nameTokens = getTokens(product.name).filter((token) => token.length > 2)
      const score = nameTokens.filter((token) => messageTokens.has(token)).length
      return { product, score, tokenCount: nameTokens.length }
    })
    .filter((item) => item.score >= Math.min(2, item.tokenCount))
    .sort((a, b) => b.score - a.score || b.tokenCount - a.tokenCount)

  return scored[0]?.product || null
}

function findProductsForComparison(message, products) {
  const normalized = normalize(message)
  const exactProducts = products.filter((product) => normalized.includes(normalize(product.name)))

  if (exactProducts.length >= 2) {
    return exactProducts.slice(0, 2)
  }

  const messageTokens = new Set(getTokens(message))
  return products
    .map((product) => {
      const nameTokens = getTokens(product.name).filter((token) => token.length > 2)
      const score = nameTokens.filter((token) => messageTokens.has(token)).length
      return { product, score, tokenCount: nameTokens.length }
    })
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score || b.tokenCount - a.tokenCount)
    .slice(0, 2)
    .map((item) => item.product)
}

function parseProductFields(message) {
  const normalized = normalize(message)
  const fields = []

  if (normalized.includes('material') || normalized.includes('fabric') || normalized.includes('made of')) {
    fields.push('material')
  }
  if (normalized.includes('price') || normalized.includes('cost') || normalized.includes('how much')) {
    fields.push('price')
  }
  if (normalized.includes('available') || normalized.includes('stock') || normalized.includes('in stock')) {
    fields.push('stock')
  }
  if (normalized.includes('size') || /\b(s|m|l|xl|xxl)\b/.test(normalized)) {
    fields.push('sizes')
  }
  if (normalized.includes('color') || colors.some((color) => normalized.includes(color.toLowerCase()))) {
    fields.push('colors')
  }
  if (normalized.includes('rating') || normalized.includes('rated')) {
    fields.push('rating')
  }
  if (normalized.includes('description') || normalized.includes('tell me about')) {
    fields.push('description')
  }

  return [...new Set(fields)]
}

function parseNavigation(message) {
  const normalized = normalize(message)
  const wantsNavigation = /\b(go|open|take|navigate|show)\b/.test(normalized)

  if (/\b(customize|customise|design)\b/.test(normalized) && /\b(vest|own)\b/.test(normalized)) {
    return { route: '/customize', label: 'Customizer' }
  }

  if (!wantsNavigation) return null

  if (normalized.includes('cart')) {
    return { route: '/cart', label: 'Cart' }
  }

  if (normalized.includes('vest section') || normalized.includes('vests section')) {
    return { route: '/shop?category=vest', label: 'Vest section' }
  }

  if (normalized.includes('pajama section') || normalized.includes('pajamas section')) {
    return { route: '/shop?category=pajama', label: 'Pajama section' }
  }

  if (normalized.includes('combo section') || normalized.includes('combos section')) {
    return { route: '/shop?category=combo', label: 'Combo packs' }
  }

  if (normalized.includes('shop') || normalized.includes('products')) {
    return { route: '/shop', label: 'Shop' }
  }

  return null
}

export function parseShoppingCommand(message, products, context = {}) {
  const normalized = normalize(message)
  const filters = parseFilters(message)
  const product = findProductMention(message, products, context.currentProduct)
  const selectedSize = sizes.find((size) => getTokens(message).includes(size.toLowerCase())) || ''
  const selectedColor = colors.find((color) => getTokens(message).includes(color.toLowerCase())) || ''

  if (normalized.includes('compare')) {
    const comparedProducts = findProductsForComparison(message, products)
    return { intent: 'compare_products', products: comparedProducts }
  }

  if (/\b(add|put)\b/.test(normalized) && /\b(cart|bag)\b/.test(normalized)) {
    return {
      intent: 'add_to_cart',
      product,
      selectedSize,
      selectedColor,
      filters,
    }
  }

  const navigation = parseNavigation(message)
  if (navigation) {
    const customProduct = product?.customizable ? product : context.currentProduct?.customizable ? context.currentProduct : null
    return {
      intent: navigation.route === '/customize' ? 'customize' : 'navigate',
      navigation: customProduct ? { route: `/customize?product=${customProduct.id}`, label: customProduct.name } : navigation,
      product: customProduct,
    }
  }

  const fields = parseProductFields(message)
  if (fields.length > 0 && product) {
    return { intent: 'product_info', product, fields, selectedSize, selectedColor }
  }

  const hasSearchSignal =
    Object.keys(filters).length > 0 ||
    /\b(show|find|search|recommend|best|suggest|looking)\b/.test(normalized)

  if (hasSearchSignal) {
    const results = filterProductsForAssistant(products, filters)
    return {
      intent: 'search_products',
      filters: {
        ...filters,
        categoryLabel: filters.category ? getProductCategoryLabel(filters.category) : '',
      },
      products: results,
    }
  }

  return { intent: 'unknown' }
}

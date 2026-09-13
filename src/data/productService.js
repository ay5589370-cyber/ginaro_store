import { products } from './products.js'
import { normalizeProductForClient } from '../utils/productData.js'

const normalizedProducts = products.map((product) => {
  const normalizedProduct = normalizeProductForClient(product.id, product)

  return {
    ...normalizedProduct,
    categoryKey: normalizedProduct.category,
    category: normalizedProduct.categoryLabel,
  }
})

export function getProducts() {
  return normalizedProducts
}

export function getProductById(productId) {
  return normalizedProducts.find((product) => String(product.id) === String(productId)) || null
}

export function getRelatedProducts(product, limit = 4, catalog = normalizedProducts) {
  if (!product) return []

  const sameCategory = catalog.filter(
    (item) => item.id !== product.id && item.category === product.category,
  )
  const fallback = catalog.filter(
    (item) => item.id !== product.id && item.category !== product.category,
  )

  return [...sameCategory, ...fallback].slice(0, limit)
}

import { useEffect, useMemo, useState } from 'react'
import { useProducts } from '../context/useProducts.js'
import {
  getRecentlyViewedIds,
  isCustomerVisibleProduct,
} from '../utils/productDiscovery.js'
import ProductCard from './ProductCard.jsx'

function RecentlyViewedProducts({
  currentProductId = '',
  limit = 4,
  eyebrow = 'Browsing history',
  title = 'Recently Viewed',
}) {
  const { products } = useProducts()
  const [recentlyViewedIds, setRecentlyViewedIds] = useState(() => getRecentlyViewedIds())

  useEffect(() => {
    const refresh = () => setRecentlyViewedIds(getRecentlyViewedIds())

    window.addEventListener('storage', refresh)
    window.addEventListener('ginaro-recently-viewed-change', refresh)

    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ginaro-recently-viewed-change', refresh)
    }
  }, [])

  const recentlyViewed = useMemo(
    () => {
      const productsById = new Map(products.map((product) => [String(product.id), product]))

      return recentlyViewedIds
        .map((productId) => productsById.get(String(productId)))
        .filter(Boolean)
        .filter(isCustomerVisibleProduct)
        .filter((product) => String(product.id) !== String(currentProductId))
        .slice(0, limit)
    },
    [currentProductId, limit, products, recentlyViewedIds],
  )

  if (recentlyViewed.length === 0) return null

  return (
    <section className="recently-viewed-products section-shell">
      <div className="section-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="product-grid">
        {recentlyViewed.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default RecentlyViewedProducts

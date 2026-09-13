import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import Footer from '../components/Footer.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Navbar from '../components/Navbar.jsx'
import ProductGallery from '../components/ProductGallery.jsx'
import ProductInfo from '../components/ProductInfo.jsx'
import ProductReviews from '../components/reviews/ProductReviews.jsx'
import ProductTabs from '../components/ProductTabs.jsx'
import RecentlyViewedProducts from '../components/RecentlyViewedProducts.jsx'
import RelatedProducts from '../components/RelatedProducts.jsx'
import { getProductById as getLegacyProductById } from '../data/productService.js'
import { useProducts } from '../context/useProducts.js'
import {
  getProductById,
  getProductBySlug,
  getRelatedProductsFromList,
} from '../services/productService.js'
import { addRecentlyViewedProduct } from '../utils/productDiscovery.js'
import { getProductCategoryLabel } from '../utils/productData.js'

const categorySlugs = {
  Vests: 'vest',
  Pajamas: 'pajama',
  'Combo Packs': 'combo',
}

function ProductNotFound() {
  return (
    <div className="page product-page">
      <Navbar />
      <main className="not-found-section section-shell">
        <span className="eyebrow">Product unavailable</span>
        <h1>Product not found</h1>
        <p>This product may have been removed or is no longer available.</p>
        <Link className="button button-primary" to="/shop">
          Back to Shop
        </Link>
      </main>
      <Footer />
    </div>
  )
}

function ProductDetails() {
  const { id } = useParams()
  const { products, loading: productsLoading } = useProducts()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const contextProduct = useMemo(
    () =>
      products.find(
        (product) => String(product.id) === String(id) || product.slug === String(id),
      ) || null,
    [id, products],
  )

  const loadProduct = useCallback(async () => {
    if (contextProduct) {
      setProduct(contextProduct)
      setIsLoading(false)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const firestoreProduct = await getProductById(id)
      const slugProduct = firestoreProduct ? null : await getProductBySlug(id)
      const resolvedProduct = firestoreProduct || slugProduct || getLegacyProductById(id)

      setProduct(resolvedProduct)
    } catch {
      const fallbackProduct = getLegacyProductById(id)
      setProduct(fallbackProduct)

      if (!fallbackProduct) {
        setError('Unable to load this product right now.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [contextProduct, id])

  const relatedProducts = useMemo(
    () => getRelatedProductsFromList(product, products, 4),
    [product, products],
  )
  const categoryLabel = product ? getProductCategoryLabel(product.category) : ''

  useEffect(() => {
    if (productsLoading) return undefined

    const timer = window.setTimeout(loadProduct, 0)

    return () => window.clearTimeout(timer)
  }, [loadProduct, productsLoading])

  useEffect(() => {
    if (!product) return

    document.title = `${product.name} | GINARO`
    addRecentlyViewedProduct(product, 10)
  }, [product])

  if (isLoading || productsLoading) {
    return (
      <div className="page product-page">
        <Navbar />
        <main className="section-shell">
          <LoadingSpinner label="Loading product" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page product-page">
        <Navbar />
        <main className="section-shell">
          <ErrorState
            title="Unable to load products right now."
            message="Please try again in a moment."
            actionLabel="Try Again"
            onAction={loadProduct}
          />
        </main>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return <ProductNotFound />
  }

  return (
    <div className="page product-page">
      <Navbar />
      <main>
        <section className="product-breadcrumb section-shell" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${categorySlugs[categoryLabel]}`}>{categoryLabel}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </section>

        <section className="product-detail-layout section-shell">
          <ProductGallery key={product.id} product={product} />
          <ProductInfo product={product} />
        </section>

        <ProductTabs product={product} />
        <ProductReviews product={product} />
        <RelatedProducts products={relatedProducts} />
        <RecentlyViewedProducts currentProductId={product.id} />
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetails

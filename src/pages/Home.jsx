import { useEffect, useMemo, useState } from 'react'
import AIAssistantBanner from '../components/AIAssistantBanner.jsx'
import Benefits from '../components/Benefits.jsx'
import CategoryCard from '../components/CategoryCard.jsx'
import CustomVestBanner from '../components/CustomVestBanner.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Footer from '../components/Footer.jsx'
import Hero from '../components/Hero.jsx'
import Navbar from '../components/Navbar.jsx'
import Newsletter from '../components/Newsletter.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductCardSkeleton from '../components/ProductCardSkeleton.jsx'
import { useProducts } from '../context/useProducts.js'
import { useWishlist } from '../context/useWishlist.js'
import { categories } from '../data/products.js'
import {
  getRecentSearches,
  getRecentlyViewedIds,
  getRecommendedProducts,
} from '../utils/productDiscovery.js'

function getDiscoveryHistory() {
  return {
    recentlyViewedIds: getRecentlyViewedIds(),
    recentSearches: getRecentSearches(),
  }
}

function ProductSection({ eyebrow, title, products, isLoading }) {
  if (!isLoading && products.length === 0) return null

  return (
    <section className="product-section section-shell">
      <div className="section-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="product-grid">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </section>
  )
}

function Home() {
  const { products, loading, error, refreshProducts } = useProducts()
  const { wishlistItems } = useWishlist()
  const [discoveryHistory, setDiscoveryHistory] = useState(() => getDiscoveryHistory())
  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured).slice(0, 4),
    [products],
  )
  const bestSellers = useMemo(
    () => products.filter((product) => product.bestSeller).slice(0, 4),
    [products],
  )
  const recommendedProducts = useMemo(
    () =>
      getRecommendedProducts(
        {
          recentlyViewedIds: discoveryHistory.recentlyViewedIds,
          recentSearches: discoveryHistory.recentSearches,
          wishlistItems,
        },
        products,
        4,
      ),
    [discoveryHistory, products, wishlistItems],
  )

  useEffect(() => {
    const refreshHistory = () => setDiscoveryHistory(getDiscoveryHistory())

    window.addEventListener('storage', refreshHistory)
    window.addEventListener('ginaro-recent-searches-change', refreshHistory)
    window.addEventListener('ginaro-recently-viewed-change', refreshHistory)

    return () => {
      window.removeEventListener('storage', refreshHistory)
      window.removeEventListener('ginaro-recent-searches-change', refreshHistory)
      window.removeEventListener('ginaro-recently-viewed-change', refreshHistory)
    }
  }, [])

  return (
    <div className="page">
      <Navbar />
      <main>
        <Hero />

        <section className="category-section section-shell">
          <div className="section-heading">
            <span className="eyebrow">Everyday wardrobe</span>
            <h2>Shop by Category</h2>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <CategoryCard key={category.title} category={category} />
            ))}
          </div>
        </section>

        {error && products.length === 0 && (
          <section className="section-shell">
            <ErrorState
              title="Unable to load products right now."
              message="Please try again in a moment."
              actionLabel="Try Again"
              onAction={refreshProducts}
            />
          </section>
        )}

        <ProductSection
          eyebrow="Curated picks"
          title="Featured Products"
          products={featuredProducts}
          isLoading={loading}
        />

        <ProductSection
          eyebrow="For your browsing"
          title="Recommended for You"
          products={recommendedProducts}
          isLoading={loading}
        />

        <Benefits />
        <CustomVestBanner />
        <AIAssistantBanner />

        <ProductSection
          eyebrow="Customer favorites"
          title="Best Sellers"
          products={bestSellers}
          isLoading={loading}
        />

        <section className="brand-story section-shell">
          <div className="story-copy">
            <span className="eyebrow">Our fabric philosophy</span>
            <h2>Made for Everyday Comfort.</h2>
            <p>
              GINARO is built around simple clothing that works hard in daily
              life. We focus on quality fabrics, durable construction, clean
              styling, and comfort that keeps its shape from morning routines to
              relaxed evenings.
            </p>
          </div>
          <div className="story-image">
            <img src="/assets/item7.png" alt="GINARO lifestyle product space" />
          </div>
        </section>

        <Newsletter />
      </main>
      <Footer />
    </div>
  )
}

export default Home

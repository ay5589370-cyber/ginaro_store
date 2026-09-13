import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import MobileFilters from '../components/MobileFilters.jsx'
import Navbar from '../components/Navbar.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductCardSkeleton from '../components/ProductCardSkeleton.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import ShopFilters from '../components/ShopFilters.jsx'
import ShopToolbar from '../components/ShopToolbar.jsx'
import { useProducts } from '../context/useProducts.js'
import { useWishlist } from '../context/useWishlist.js'
import {
  defaultDiscoveryFilters,
  filterProductsForDiscovery,
  getPopularProducts,
  getRecentSearches,
  getRecentlyViewedIds,
  getRecommendedProducts,
  normalizeSearchText,
  saveRecentSearch,
  sortDiscoveryProducts,
} from '../utils/productDiscovery.js'

function getDiscoveryHistory() {
  return {
    recentlyViewedIds: getRecentlyViewedIds(),
    recentSearches: getRecentSearches(),
  }
}

const searchSortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating' },
  { value: 'newest', label: 'Newest' },
]

function DiscoverySection({ eyebrow, title, products, isLoading }) {
  if (!isLoading && products.length === 0) return null

  return (
    <section className="product-section search-suggestion-section">
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

function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { products, loading: productsLoading, error: productsError, refreshProducts } = useProducts()
  const { wishlistItems } = useWishlist()
  const [sortBy, setSortBy] = useState('relevance')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterSelections, setFilterSelections] = useState(defaultDiscoveryFilters)
  const [discoveryHistory, setDiscoveryHistory] = useState(() => getDiscoveryHistory())
  const query = searchParams.get('q') || ''
  const normalizedQuery = normalizeSearchText(query)
  const hasQuery = normalizedQuery.length > 0

  const filteredProducts = useMemo(() => {
    if (!hasQuery) return []

    return sortDiscoveryProducts(
      filterProductsForDiscovery(products, filterSelections, query),
      sortBy,
      query,
    )
  }, [filterSelections, hasQuery, products, query, sortBy])

  const popularProducts = useMemo(() => getPopularProducts(products, 4), [products])
  const bestSellers = useMemo(
    () => products.filter((product) => product.active !== false && product.bestSeller).slice(0, 4),
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
    if (normalizedQuery.length < 2) return undefined

    const timer = window.setTimeout(() => {
      saveRecentSearch(normalizedQuery)
      setDiscoveryHistory(getDiscoveryHistory())
    }, 450)

    return () => window.clearTimeout(timer)
  }, [normalizedQuery])

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

  const updateSearch = (value) => {
    const nextParams = new URLSearchParams(searchParams)

    if (value.trim()) {
      nextParams.set('q', value)
    } else {
      nextParams.delete('q')
    }

    setSearchParams(nextParams, { replace: true })
  }

  const updateCheckboxFilter = (key, value) => {
    setFilterSelections((current) => {
      const isSelected = current[key].includes(value)
      return {
        ...current,
        [key]: isSelected
          ? current[key].filter((selected) => selected !== value)
          : [...current[key], value],
      }
    })
  }

  const clearFilters = () => {
    setSortBy('relevance')
    setFilterSelections(defaultDiscoveryFilters)
  }

  const filterProps = {
    filters: filterSelections,
    onCategoryChange: (category) =>
      setFilterSelections((current) => ({ ...current, category })),
    onCheckboxChange: updateCheckboxFilter,
    onAvailabilityChange: (checked) =>
      setFilterSelections((current) => ({ ...current, inStock: checked })),
    onClear: clearFilters,
  }

  return (
    <div className="page shop-page search-page">
      <Navbar />
      <main>
        <section className="shop-hero section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Search</span>
          </div>
          <h1>Search</h1>
          {hasQuery ? (
            <p>Search results for "{normalizedQuery}"</p>
          ) : (
            <p>Find products by name, category, color, material or tag.</p>
          )}
        </section>

        <section className="shop-controls section-shell">
          <ShopToolbar
            searchTerm={query}
            sortBy={sortBy}
            sortOptions={searchSortOptions}
            onSearchChange={updateSearch}
            onSortChange={setSortBy}
            onOpenFilters={() => setIsFilterOpen(true)}
          />
        </section>

        {hasQuery ? (
          <section className="shop-layout section-shell">
            <div className="desktop-filters">
              <ShopFilters {...filterProps} />
            </div>

            <div className="shop-results">
              {productsError && (
                <div className="product-data-alert" role="status">
                  <span>Unable to load products.</span>
                  <button type="button" onClick={refreshProducts}>
                    Try Again
                  </button>
                </div>
              )}
              <div className="results-summary">
                <span>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
                </span>
                <small>Search results for "{normalizedQuery}"</small>
              </div>
              <ProductGrid
                products={filteredProducts}
                onClearFilters={clearFilters}
                isLoading={productsLoading}
              />
            </div>
          </section>
        ) : (
          <section className="search-empty-discovery section-shell">
            <div className="search-empty-intro">
              <span className="eyebrow">Start discovering</span>
              <h2>Popular Products</h2>
              <p>Try a product name like vest, black, cotton, pajama or combo.</p>
              <Link className="button button-primary" to="/shop">
                Shop All
              </Link>
            </div>

            {productsError && (
              <div className="product-data-alert" role="status">
                <span>Unable to load products.</span>
                <button type="button" onClick={refreshProducts}>
                  Try Again
                </button>
              </div>
            )}

            <DiscoverySection
              eyebrow="Popular right now"
              title="Popular Products"
              products={popularProducts}
              isLoading={productsLoading}
            />
            <DiscoverySection
              eyebrow="For your browsing"
              title="Recommended for You"
              products={recommendedProducts}
              isLoading={productsLoading}
            />
            <DiscoverySection
              eyebrow="Customer favorites"
              title="Best Sellers"
              products={bestSellers}
              isLoading={productsLoading}
            />
          </section>
        )}
      </main>
      <Footer />

      <MobileFilters
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        resultCount={filteredProducts.length}
        {...filterProps}
      />
    </div>
  )
}

export default Search

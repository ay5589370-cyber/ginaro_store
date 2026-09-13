import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import MobileFilters from '../components/MobileFilters.jsx'
import Navbar from '../components/Navbar.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import ShopFilters from '../components/ShopFilters.jsx'
import ShopToolbar from '../components/ShopToolbar.jsx'
import { useProducts } from '../context/useProducts.js'
import {
  defaultDiscoveryFilters,
  filterProductsForDiscovery,
  sortDiscoveryProducts,
} from '../utils/productDiscovery.js'

const categoryParamMap = {
  vest: 'Vests',
  vests: 'Vests',
  pajama: 'Pajamas',
  pajamas: 'Pajamas',
  combo: 'Combo Packs',
  combos: 'Combo Packs',
  'combo-packs': 'Combo Packs',
}

const categoryToParam = {
  Vests: 'vest',
  Pajamas: 'pajama',
  'Combo Packs': 'combo',
}

function getCategoryFromParams(searchParams) {
  const value = searchParams.get('category')?.toLowerCase()
  return categoryParamMap[value] || 'All'
}

function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refreshProducts,
  } = useProducts()
  const [sortBy, setSortBy] = useState('featured')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterSelections, setFilterSelections] = useState(defaultDiscoveryFilters)
  const selectedCategory = getCategoryFromParams(searchParams)
  const searchTerm = searchParams.get('search') || ''
  const filters = useMemo(
    () => ({ ...filterSelections, category: selectedCategory }),
    [filterSelections, selectedCategory],
  )

  const filteredProducts = useMemo(() => {
    return sortDiscoveryProducts(
      filterProductsForDiscovery(products, filters, searchTerm),
      sortBy,
      searchTerm,
    )
  }, [filters, products, searchTerm, sortBy])

  const updateCategory = (category) => {
    const nextParams = new URLSearchParams(searchParams)

    if (category === 'All') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', categoryToParam[category])
    }

    setSearchParams(nextParams, { replace: true })
  }

  const updateSearch = (value) => {
    const nextParams = new URLSearchParams(searchParams)

    if (value.trim()) {
      nextParams.set('search', value)
    } else {
      nextParams.delete('search')
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
    setSortBy('featured')
    setFilterSelections(defaultDiscoveryFilters)
    setSearchParams({}, { replace: true })
  }

  const filterProps = {
    filters,
    onCategoryChange: updateCategory,
    onCheckboxChange: updateCheckboxFilter,
    onAvailabilityChange: (checked) =>
      setFilterSelections((current) => ({ ...current, inStock: checked })),
    onClear: clearFilters,
  }

  return (
    <div className="page shop-page">
      <Navbar />
      <main>
        <section className="shop-hero section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Shop</span>
          </div>
          <h1>Shop</h1>
          <p>Explore everyday essentials designed for comfort, fit and quality.</p>
        </section>

        <section className="shop-controls section-shell">
          <ShopToolbar
            searchTerm={searchTerm}
            sortBy={sortBy}
            onSearchChange={updateSearch}
            onSortChange={setSortBy}
            onOpenFilters={() => setIsFilterOpen(true)}
          />

          <div className="category-shortcuts" aria-label="Category shortcuts">
            {['All Products', 'Vests', 'Pajamas', 'Combos'].map((label) => {
              const category = label === 'All Products' ? 'All' : label === 'Combos' ? 'Combo Packs' : label
              return (
                <button
                  type="button"
                  key={label}
                  className={filters.category === category ? 'is-active' : ''}
                  onClick={() => updateCategory(category)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="shop-layout section-shell">
          <div className="desktop-filters">
            <ShopFilters {...filterProps} />
          </div>

          <div className="shop-results">
            {productsError && (
              <div className="product-data-alert" role="status">
                <span>Unable to load products right now.</span>
                <button type="button" onClick={refreshProducts}>
                  Try Again
                </button>
              </div>
            )}
            <div className="results-summary">
              <span>
                Showing {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'product' : 'products'}
              </span>
              <small>{filters.category === 'All' ? 'All Products' : filters.category}</small>
            </div>
            <ProductGrid
              products={filteredProducts}
              onClearFilters={clearFilters}
              isLoading={productsLoading}
            />
          </div>
        </section>
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

export default Shop

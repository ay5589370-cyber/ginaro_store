import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/useProducts.js'
import { lockBodyScroll } from '../utils/bodyScrollLock.js'
import { formatPrice } from '../utils/formatters.js'
import {
  clearRecentSearches,
  getRecentSearches,
  normalizeSearchText,
  saveRecentSearch,
  searchProductsLocally,
} from '../utils/productDiscovery.js'
import { getProductCategoryLabel } from '../utils/productData.js'
import ProductImage from './ProductImage.jsx'

function SearchOverlay({ isOpen, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const inputRef = useRef(null)
  const previousLocationRef = useRef(`${location.pathname}${location.search}`)
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState(() => getRecentSearches())
  const normalizedQuery = normalizeSearchText(query)
  const canSearch = normalizeSearchText(debouncedQuery).length >= 2

  const suggestions = useMemo(() => {
    if (!canSearch) return []
    return searchProductsLocally(debouncedQuery, products, { limit: 5 })
  }, [canSearch, debouncedQuery, products])

  const showRecentSearches = normalizedQuery.length === 0 && recentSearches.length > 0
  const isExpanded = canSearch || showRecentSearches || Boolean(productsError)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const syncRecentSearches = () => setRecentSearches(getRecentSearches())

    window.addEventListener('storage', syncRecentSearches)
    window.addEventListener('ginaro-recent-searches-change', syncRecentSearches)

    return () => {
      window.removeEventListener('storage', syncRecentSearches)
      window.removeEventListener('ginaro-recent-searches-change', syncRecentSearches)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    const unlockBodyScroll = lockBodyScroll()

    return () => {
      window.clearTimeout(timer)
      unlockBodyScroll()
    }
  }, [isOpen])

  useEffect(() => {
    const nextLocation = `${location.pathname}${location.search}`

    if (isOpen && nextLocation !== previousLocationRef.current) {
      onClose()
    }

    previousLocationRef.current = nextLocation
  }, [isOpen, location.pathname, location.search, onClose])

  if (!isOpen) return null

  const closeSearch = () => {
    onClose()
    setQuery('')
    setActiveIndex(-1)
  }

  const openProduct = (product) => {
    navigate(`/product/${product.id}`)
    closeSearch()
  }

  const openResults = (value = query) => {
    const nextQuery = normalizeSearchText(value)
    if (nextQuery.length >= 2) saveRecentSearch(nextQuery)
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : '/search')
    closeSearch()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSearch()
      return
    }

    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault()
      setActiveIndex((index) => (index < suggestions.length - 1 ? index + 1 : 0))
      return
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault()
      setActiveIndex((index) => (index > 0 ? index - 1 : suggestions.length - 1))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        openProduct(suggestions[activeIndex])
      } else {
        openResults()
      }
    }
  }

  const handleClearRecentSearches = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Product search">
      <button type="button" className="search-backdrop" aria-label="Close search" onClick={closeSearch} />
      <section className="search-panel">
        <div className="search-panel-head">
          <div>
            <span>Search GINARO</span>
            <h2>Find everyday essentials</h2>
          </div>
          <button type="button" onClick={closeSearch}>
            Close
          </button>
        </div>
        <label className="search-modal-field">
          <span className="sr-only">Search products</span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            value={query}
            placeholder="Search products..."
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isExpanded}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(-1)
            }}
            onKeyDown={handleKeyDown}
          />
        </label>

        {isExpanded && (
          <div className="search-results-list" id={listboxId} role="listbox" aria-label="Search suggestions">
            {showRecentSearches && (
              <div className="recent-searches" role="presentation">
                <div className="recent-searches-head">
                  <span>Recent Searches</span>
                  <button type="button" onClick={handleClearRecentSearches}>
                    Clear
                  </button>
                </div>
                {recentSearches.map((search) => (
                  <button type="button" key={search} onClick={() => openResults(search)}>
                    {search}
                  </button>
                ))}
              </div>
            )}

            {canSearch && productsLoading && (
              <div className="search-empty" role="status">
                <h3>Loading products...</h3>
                <p>Finding the best matches.</p>
              </div>
            )}

            {productsError && (
              <div className="search-empty" role="status">
                <h3>Unable to load products.</h3>
                <p>Please try again in a moment.</p>
              </div>
            )}

            {canSearch && !productsLoading && !productsError && suggestions.length === 0 && (
              <div className="search-empty" role="status">
                <h3>No products found.</h3>
                <p>Try another product name, category or material.</p>
              </div>
            )}

            {suggestions.map((product, index) => (
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                id={`${listboxId}-option-${index}`}
                className={activeIndex === index ? 'is-active' : ''}
                key={product.id}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => openProduct(product)}
              >
                <ProductImage src={product.images?.[0] || product.image} alt={product.name} />
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {getProductCategoryLabel(product.category)}
                    {product.stock === 0 ? ' / Out of Stock' : ''}
                  </small>
                </span>
                <em>{formatPrice(product.price)}</em>
              </button>
            ))}
          </div>
        )}

        <button type="button" className="search-all-results" onClick={() => openResults()}>
          View All Results
        </button>
      </section>
    </div>
  )
}

export default SearchOverlay

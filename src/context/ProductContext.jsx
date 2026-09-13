import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProducts as getLegacyProducts } from '../data/productService.js'
import {
  getActiveProducts,
  getProductErrorMessage,
} from '../services/productService.js'
import { ProductContext } from './productContextValue.js'

const legacyProducts = getLegacyProducts()
const canUseLegacyFallback = import.meta.env.DEV

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState('firestore')

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const firestoreProducts = await getActiveProducts()

      setProducts(firestoreProducts)
      setSource('firestore')
    } catch (error) {
      if (canUseLegacyFallback) {
        setProducts(legacyProducts)
        setSource('legacy')
        setError(`${getProductErrorMessage(error)} Showing the legacy catalog in development only.`)
      } else {
        setProducts([])
        setSource('firestore')
        setError(getProductErrorMessage(error))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 0)

    return () => window.clearTimeout(timer)
  }, [loadProducts])

  const value = useMemo(
    () => ({
      products,
      loading,
      error,
      source,
      isUsingLegacyFallback: source === 'legacy',
      productCount: products.length,
      refreshProducts: loadProducts,
    }),
    [error, loadProducts, loading, products, source],
  )

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

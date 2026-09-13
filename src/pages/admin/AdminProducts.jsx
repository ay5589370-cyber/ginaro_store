import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ProductImage from '../../components/ProductImage.jsx'
import { useProducts } from '../../context/useProducts.js'
import { useToast } from '../../context/useToast.js'
import {
  getAdminErrorMessage,
  getAdminProducts,
  updateAdminProductFlags,
} from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatters.js'
import { getProductCategoryLabel } from '../../utils/productData.js'

function getStockLabel(stock) {
  if (stock <= 0) return 'Out of Stock'
  if (stock <= 5) return 'Low Stock'
  return 'In Stock'
}

function AdminProducts() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingProductId, setPendingProductId] = useState('')
  const { refreshProducts } = useProducts()
  const { showToast } = useToast()

  const loadProducts = async () => {
    setLoading(true)
    setError('')

    try {
      setProducts(await getAdminProducts())
    } catch (error) {
      setError(getAdminErrorMessage(error, 'Unable to load products.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    getAdminProducts()
      .then((rows) => {
        if (isMounted) setProducts(rows)
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, 'Unable to load products.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return products

    return products.filter((product) =>
      [product.name, product.category, product.categoryLabel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [products, searchTerm])

  const handleToggleActive = async (product) => {
    setPendingProductId(product.id)

    try {
      const updatedProduct = await updateAdminProductFlags(product.id, { active: !product.active })
      setProducts((current) => current.map((item) => (item.id === product.id ? updatedProduct : item)))
      await refreshProducts()
      showToast(updatedProduct.active ? 'Product activated' : 'Product deactivated')
    } catch (error) {
      showToast(getAdminErrorMessage(error, 'Unable to update product.'), 'error')
    } finally {
      setPendingProductId('')
    }
  }

  if (loading) return <LoadingSpinner label="Loading products" />

  if (error) {
    return (
      <ErrorState
        title="Unable to load products."
        message={error}
        actionLabel="Try Again"
        onAction={loadProducts}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Catalog</span>
          <h1>Products</h1>
        </div>
        <Link className="button button-primary" to="/admin/products/new">
          Add Product
        </Link>
      </div>

      <div className="admin-toolbar">
        <label>
          <span>Search products</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or category"
          />
        </label>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="admin-empty-text">No products found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Active</th>
                <th>Featured</th>
                <th>Best Seller</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-cell">
                      <ProductImage src={product.images?.[0]} alt={product.name} />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getProductCategoryLabel(product.category)}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>
                    <span className={`admin-stock-pill ${product.stock <= 0 ? 'is-out' : product.stock <= 5 ? 'is-low' : 'is-in'}`}>
                      {getStockLabel(product.stock)} / {product.stock}
                    </span>
                  </td>
                  <td>{product.active ? 'Yes' : 'No'}</td>
                  <td>{product.featured ? 'Yes' : 'No'}</td>
                  <td>{product.bestSeller ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link className="button button-secondary" to={`/admin/products/${product.id}/edit`}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={pendingProductId === product.id}
                        onClick={() => handleToggleActive(product)}
                      >
                        {pendingProductId === product.id ? 'Updating...' : product.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminProducts

import { useEffect, useMemo, useState } from 'react'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { useProducts } from '../../context/useProducts.js'
import { useToast } from '../../context/useToast.js'
import { getAdminErrorMessage, getAdminProducts } from '../../services/adminService.js'
import {
  deleteReviewAsAdmin,
  getAdminReviews,
  getReviewErrorMessage,
} from '../../services/reviewService.js'

function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingReviewId, setPendingReviewId] = useState('')
  const { refreshProducts } = useProducts()
  const { showToast } = useToast()

  const loadReviews = async () => {
    setLoading(true)
    setError('')

    try {
      const productRows = await getAdminProducts()
      const reviewRows = await getAdminReviews(productRows.map((product) => product.id))
      setReviews(reviewRows)
      setProducts(productRows)
    } catch (error) {
      setError(getAdminErrorMessage(error, getReviewErrorMessage(error, 'Unable to load reviews.')))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    getAdminProducts()
      .then(async (productRows) => {
        const reviewRows = await getAdminReviews(productRows.map((product) => product.id))
        return [reviewRows, productRows]
      })
      .then(([reviewRows, productRows]) => {
        if (!isMounted) return
        setReviews(reviewRows)
        setProducts(productRows)
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, getReviewErrorMessage(error, 'Unable to load reviews.')))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const productNames = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products],
  )

  const filteredReviews = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return reviews

    return reviews.filter((review) => {
      const productName = productNames.get(review.productId) || review.productId

      return [productName, review.userName, review.title, review.comment]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    })
  }, [productNames, reviews, searchTerm])

  const handleRemove = async (review) => {
    setPendingReviewId(`${review.productId}-${review.id}`)

    try {
      await deleteReviewAsAdmin(review.productId, review.id)
      setReviews((current) => current.filter((item) => !(item.productId === review.productId && item.id === review.id)))
      await refreshProducts()
      showToast('Review removed successfully.')
    } catch (error) {
      showToast(getReviewErrorMessage(error, 'Unable to remove review.'), 'error')
    } finally {
      setPendingReviewId('')
    }
  }

  if (loading) return <LoadingSpinner label="Loading reviews" />

  if (error) {
    return (
      <ErrorState
        title="Unable to load reviews."
        message={error}
        actionLabel="Try Again"
        onAction={loadReviews}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Moderation</span>
          <h1>Reviews</h1>
        </div>
      </div>

      <div className="admin-toolbar">
        <label>
          <span>Search reviews</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by product, customer, or text"
          />
        </label>
      </div>

      {filteredReviews.length === 0 ? (
        <p className="admin-empty-text">No reviews found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Title</th>
                <th>Comment</th>
                <th>Verified</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review) => {
                const pendingId = `${review.productId}-${review.id}`

                return (
                  <tr key={pendingId}>
                    <td>{productNames.get(review.productId) || review.productId}</td>
                    <td>{review.userName || 'GINARO customer'}</td>
                    <td>★ {review.rating}</td>
                    <td>{review.title || 'No title'}</td>
                    <td>{review.comment}</td>
                    <td>{review.verifiedPurchase ? 'Yes' : 'No'}</td>
                    <td>{review.date || 'Recent'}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={pendingReviewId === pendingId}
                        onClick={() => handleRemove(review)}
                      >
                        {pendingReviewId === pendingId ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminReviews

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { useProducts } from '../../context/useProducts.js'
import { useToast } from '../../context/useToast.js'
import {
  createReview,
  deleteReview,
  getProductReviews,
  getReviewEligibility,
  getReviewErrorMessage,
  updateReview,
} from '../../services/reviewService.js'

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest Rating' },
  { value: 'lowest', label: 'Lowest Rating' },
]

function ReviewStars({ rating, onChange, disabled = false }) {
  return (
    <div className="review-star-control" role="radiogroup" aria-label="Review rating">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={rating === value}
          aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
          className={value <= rating ? 'is-selected' : ''}
          disabled={disabled}
          onClick={() => onChange(value)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ initialReview, orderId, productId, onCancel, onSaved }) {
  const { showToast } = useToast()
  const [rating, setRating] = useState(initialReview?.rating || 5)
  const [title, setTitle] = useState(initialReview?.title || '')
  const [comment, setComment] = useState(initialReview?.comment || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEditing = Boolean(initialReview)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const review = isEditing
        ? await updateReview(productId, { rating, title, comment })
        : await createReview(productId, { orderId, rating, title, comment })

      showToast(isEditing ? 'Review updated successfully.' : 'Review submitted successfully.')
      onSaved(review)
    } catch (error) {
      const message = getReviewErrorMessage(error, isEditing ? 'Unable to update review.' : 'Unable to submit review.')
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <ReviewStars rating={rating} onChange={setRating} disabled={saving} />
      <label>
        <span>Title</span>
        <input
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Short summary"
          disabled={saving}
        />
      </label>
      <label>
        <span>Review</span>
        <textarea
          value={comment}
          minLength={5}
          maxLength={1000}
          rows="5"
          onChange={(event) => setComment(event.target.value)}
          placeholder="Tell other customers about the fit, feel, and quality."
          disabled={saving}
          required
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="review-form-actions">
        <button type="submit" className="button button-primary" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update Review' : 'Submit Review'}
        </button>
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function ReviewCard({ review }) {
  return (
    <article className="review-card">
      <div className="review-card-head">
        <div>
          <strong>{review.userName || 'GINARO customer'}</strong>
          {review.verifiedPurchase && <span>Verified Purchase</span>}
        </div>
        <em>★ {review.rating}</em>
      </div>
      {review.title && <h3>{review.title}</h3>}
      <p>{review.comment}</p>
      <small>{review.date || 'Recently'}</small>
    </article>
  )
}

function ProductReviews({ product }) {
  const { authLoading, currentUser, isLoggedIn } = useAuth()
  const { refreshProducts } = useProducts()
  const { showToast } = useToast()
  const [reviews, setReviews] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const [eligibility, setEligibility] = useState(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [formMode, setFormMode] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [deleting, setDeleting] = useState(false)

  const loadReviews = async ({ append = false, nextCursor = null } = {}) => {
    setReviewsLoading(!append)
    setReviewsError('')

    try {
      const result = await getProductReviews(product.id, { cursor: nextCursor })
      setReviews((current) => (append ? [...current, ...result.reviews] : result.reviews))
      setCursor(result.cursor)
      setHasMore(result.hasMore)
    } catch (error) {
      setReviewsError(getReviewErrorMessage(error, 'Unable to load reviews.'))
    } finally {
      setReviewsLoading(false)
    }
  }

  const loadEligibility = async () => {
    if (authLoading || !isLoggedIn) {
      setEligibility(null)
      return
    }

    setEligibilityLoading(true)

    try {
      setEligibility(await getReviewEligibility(product.id))
    } catch {
      setEligibility({ eligible: false, orderId: '', existingReview: null })
    } finally {
      setEligibilityLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => {
      setReviewsLoading(true)
      getProductReviews(product.id)
        .then((result) => {
          if (!isMounted) return
          setReviews(result.reviews)
          setCursor(result.cursor)
          setHasMore(result.hasMore)
          setReviewsError('')
        })
        .catch((error) => {
          if (isMounted) setReviewsError(getReviewErrorMessage(error, 'Unable to load reviews.'))
        })
        .finally(() => {
          if (isMounted) setReviewsLoading(false)
        })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [product.id])

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => {
      if (authLoading || !isLoggedIn) {
        setEligibility(null)
        setEligibilityLoading(false)
        return
      }

      setEligibilityLoading(true)
      getReviewEligibility(product.id)
        .then((result) => {
          if (isMounted) setEligibility(result)
        })
        .catch(() => {
          if (isMounted) setEligibility({ eligible: false, orderId: '', existingReview: null })
        })
        .finally(() => {
          if (isMounted) setEligibilityLoading(false)
        })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [authLoading, isLoggedIn, product.id, currentUser?.uid])

  const sortedReviews = useMemo(() => {
    const nextReviews = [...reviews]

    if (sortBy === 'highest') return nextReviews.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'lowest') return nextReviews.sort((a, b) => a.rating - b.rating)

    return nextReviews
  }, [reviews, sortBy])

  const handleSaved = async () => {
    setFormMode('')
    await Promise.all([loadReviews(), loadEligibility(), refreshProducts()])
  }

  const handleDeleteReview = async () => {
    setDeleting(true)

    try {
      await deleteReview(product.id)
      showToast('Review deleted successfully.')
      setFormMode('')
      await Promise.all([loadReviews(), loadEligibility(), refreshProducts()])
    } catch (error) {
      showToast(getReviewErrorMessage(error, 'Unable to delete review.'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const existingReview = eligibility?.existingReview
  const canCreateReview = eligibility?.eligible && !existingReview

  return (
    <section className="product-reviews section-shell">
      <div className="review-section-head">
        <div>
          <span className="eyebrow">Customer Reviews</span>
          <h2>Reviews & Ratings</h2>
          <p>
            ★ {Number(product.rating || 0).toFixed(1)} average from {product.reviewCount || 0}
            {' '}{product.reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        <label>
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="review-action-panel">
        {authLoading || eligibilityLoading ? (
          <p>Checking review eligibility...</p>
        ) : !isLoggedIn ? (
          <p>
            <Link to="/login">Log in</Link> after your delivered purchase to write a review.
          </p>
        ) : existingReview ? (
          <div>
            <p>You have reviewed this product.</p>
            <div className="review-form-actions">
              <button type="button" className="button button-primary" onClick={() => setFormMode('edit')}>
                Edit Your Review
              </button>
              <button type="button" className="button button-secondary" onClick={handleDeleteReview} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        ) : canCreateReview ? (
          <button type="button" className="button button-primary" onClick={() => setFormMode('create')}>
            Write a Review
          </button>
        ) : (
          <p>Only delivered purchases can be reviewed.</p>
        )}
      </div>

      {formMode && (
        <ReviewForm
          productId={product.id}
          orderId={eligibility?.orderId}
          initialReview={formMode === 'edit' ? existingReview : null}
          onCancel={() => setFormMode('')}
          onSaved={handleSaved}
        />
      )}

      {reviewsLoading ? (
        <div className="review-loading">Loading reviews...</div>
      ) : reviewsError ? (
        <div className="review-action-panel">
          <p>{reviewsError}</p>
          <button type="button" className="button button-secondary" onClick={() => loadReviews()}>
            Try Again
          </button>
        </div>
      ) : sortedReviews.length === 0 ? (
        <div className="review-empty">
          <h3>No reviews yet.</h3>
          <p>{canCreateReview ? 'Be the first to review this product.' : 'Reviews will appear here after delivery.'}</p>
        </div>
      ) : (
        <>
          <div className="review-list">
            {sortedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {hasMore && sortBy === 'newest' && (
            <button
              type="button"
              className="button button-secondary review-load-more"
              onClick={() => loadReviews({ append: true, nextCursor: cursor })}
            >
              Load More
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default ProductReviews

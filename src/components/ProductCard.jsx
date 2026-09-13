import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useToast } from '../context/useToast.js'
import { useWishlist } from '../context/useWishlist.js'
import { formatPrice, getDiscountPercent } from '../utils/formatters.js'
import { getProductCategoryLabel } from '../utils/productData.js'
import Icon from './Icon.jsx'
import ProductImage from './ProductImage.jsx'

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const { isWishlisted, isWishlistUpdating, toggleWishlist } = useWishlist()
  const isOutOfStock = product.stock === 0
  const wishlisted = isWishlisted(product.id)
  const isWishlistPending = isWishlistUpdating(product.id)
  const discountPercent = getDiscountPercent(product.price, product.originalPrice || product.price)
  const categoryLabel = getProductCategoryLabel(product.category)
  const mainImage = product.images?.[0] || product.image

  const handleWishlistClick = async () => {
    const result = await toggleWishlist(product)
    showToast(result.message, result.status === 'error' || result.status === 'auth-required' ? 'error' : 'success')
  }

  const handleAddToCart = () => {
    if (isOutOfStock) return

    addToCart({
      id: product.id,
      name: product.name,
      productId: product.id,
      image: mainImage,
      selectedSize: product.sizes[0],
      selectedColor: product.colors[0],
      price: product.price,
      originalPrice: product.originalPrice,
      category: categoryLabel,
      quantity: 1,
      stock: product.stock,
    })
    showToast(`${product.name} added to cart.`)
  }

  return (
    <article className={`product-card ${isOutOfStock ? 'is-out-of-stock' : ''}`}>
      <button
        type="button"
        className={`wishlist-button ${wishlisted ? 'is-active' : ''}`}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={wishlisted}
        onClick={handleWishlistClick}
        disabled={isWishlistPending}
      >
        <Icon name="heart" size={19} />
      </button>
      {isOutOfStock && <span className="stock-badge">Out of Stock</span>}
      <Link className="product-image" to={`/product/${product.id}`} aria-label={`View ${product.name}`}>
        <ProductImage src={mainImage} alt={product.name} />
      </Link>
      <div className="product-details">
        <div className="product-meta">
          <span>{categoryLabel}</span>
          <span>★ {product.rating} ({product.reviewCount || 0})</span>
        </div>
        <h3>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.originalPrice && <span>{formatPrice(product.originalPrice)}</span>}
          {discountPercent > 0 && <em>{discountPercent}% off</em>}
        </div>
        <button type="button" className="add-cart-button" disabled={isOutOfStock} onClick={handleAddToCart}>
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </article>
  )
}

export default ProductCard

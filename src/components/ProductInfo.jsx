import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useToast } from '../context/useToast.js'
import { useWishlist } from '../context/useWishlist.js'
import { formatPrice, getDiscountPercent } from '../utils/formatters.js'
import { getProductCategoryLabel, normalizeProductCategory } from '../utils/productData.js'
import ColorSelector from './ColorSelector.jsx'
import DeliveryChecker from './DeliveryChecker.jsx'
import Icon from './Icon.jsx'
import QuantitySelector from './QuantitySelector.jsx'
import SizeGuideModal from './SizeGuideModal.jsx'
import SizeSelector from './SizeSelector.jsx'

const benefitItems = [
  ['Premium Fabric', 'Soft and breathable material.'],
  ['Easy Returns', 'Hassle-free return support.'],
  ['Secure Shopping', 'Safe and protected shopping experience.'],
  ['Quality Checked', 'Every product is checked before shipping.'],
]

function ProductInfo({ product }) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const { isWishlisted, isWishlistUpdating, toggleWishlist } = useWishlist()
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [validationMessage, setValidationMessage] = useState('')
  const [cartMessage, setCartMessage] = useState('')
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const isOutOfStock = product.stock === 0
  const wishlisted = isWishlisted(product.id)
  const isWishlistPending = isWishlistUpdating(product.id)
  const discountPercent = getDiscountPercent(product.price, product.originalPrice || product.price)
  const categoryLabel = getProductCategoryLabel(product.category)
  const canCustomize = product.customizable ?? (normalizeProductCategory(product.category) === 'vest')
  const mainImage = product.images?.[0] || product.image

  const stockText = isOutOfStock
    ? 'Out of Stock'
    : product.stock <= 3
      ? `Only ${product.stock} left`
      : `In Stock - ${product.stock} available`

  const validateSelection = () => {
    if (isOutOfStock) return false

    if (!selectedSize || !selectedColor) {
      setValidationMessage('Please select a size and color before continuing.')
      return false
    }

    setValidationMessage('')
    return true
  }

  const buildCartItem = () => ({
    id: product.id,
    productId: product.id,
    name: product.name,
    image: mainImage,
    selectedSize,
    selectedColor,
    price: product.price,
    originalPrice: product.originalPrice,
    category: categoryLabel,
    quantity,
    stock: product.stock,
  })

  const handleAddToCart = () => {
    if (!validateSelection()) return

    addToCart(buildCartItem())
    setCartMessage('Added to cart.')
    showToast(`${product.name} added to cart.`)
  }

  const handleBuyNow = () => {
    if (!validateSelection()) return

    addToCart(buildCartItem())
    showToast(`${product.name} added to cart.`)
    navigate('/checkout')
  }

  return (
    <section className="product-info-panel">
      <div className="product-title-row">
        <div>
          <span className="eyebrow">{categoryLabel}</span>
          <h1>{product.name}</h1>
        </div>
        <button
          type="button"
          className={`detail-wishlist ${wishlisted ? 'is-active' : ''}`}
          onClick={async () => {
            const result = await toggleWishlist(product)
            showToast(result.message, result.status === 'error' || result.status === 'auth-required' ? 'error' : 'success')
          }}
          disabled={isWishlistPending}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Icon name="heart" />
        </button>
      </div>

      <div className="detail-rating">
        <span>★ {product.rating}</span>
        <span>{product.reviewCount} reviews</span>
      </div>

      <div className="detail-price">
        <strong>{formatPrice(product.price)}</strong>
        {product.originalPrice && <span>{formatPrice(product.originalPrice)}</span>}
        {discountPercent > 0 && <em>{discountPercent}% OFF</em>}
      </div>

      <p className="detail-description">{product.description}</p>

      <div className={`stock-status ${isOutOfStock ? 'is-out' : ''}`}>{stockText}</div>

      <SizeSelector
        availableSizes={product.sizes}
        selectedSize={selectedSize}
        onSelect={(size) => {
          setSelectedSize(size)
          setValidationMessage('')
        }}
        onOpenGuide={() => setIsSizeGuideOpen(true)}
      />

      <ColorSelector
        colors={product.colors}
        selectedColor={selectedColor}
        onSelect={(color) => {
          setSelectedColor(color)
          setValidationMessage('')
        }}
      />

      <QuantitySelector quantity={quantity} stock={product.stock} onChange={setQuantity} />

      {(validationMessage || cartMessage) && (
        <p className={`selection-message ${validationMessage ? 'is-error' : 'is-success'}`}>
          {validationMessage || cartMessage}
        </p>
      )}

      <div className="purchase-actions">
        <button type="button" className="button button-primary" onClick={handleAddToCart} disabled={isOutOfStock}>
          Add to Cart
        </button>
        <button type="button" className="button button-secondary" onClick={handleBuyNow} disabled={isOutOfStock}>
          Buy Now
        </button>
      </div>

      <div className="detail-benefits">
        {benefitItems.map(([title, text]) => (
          <div key={title}>
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <DeliveryChecker />

      {canCustomize && (
        <section className="vest-customize-callout">
          <h2>Want to make this vest your own?</h2>
          <p>Add your logo, artwork or custom text using our Customize Vest studio.</p>
          <Link className="button button-primary" to={`/customize?product=${product.id}`}>
            Customize This Vest
          </Link>
        </section>
      )}

      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </section>
  )
}

export default ProductInfo

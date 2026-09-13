import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useToast } from '../context/useToast.js'
import { getItemSubtotal, getVariantKey } from '../utils/cartCalculations.js'
import { formatPrice } from '../utils/formatters.js'
import ProductImage from './ProductImage.jsx'

function CartItem({ item, product }) {
  const { updateCartQuantity, removeFromCart } = useCart()
  const { showToast } = useToast()
  const variantKey = getVariantKey(item)
  const productPath = `/product/${item.productId || item.id}`
  const stock = product?.stock ?? item.stock ?? 1
  const quantity = Math.min(item.quantity, Math.max(1, stock))
  const isAtStockLimit = quantity >= stock
  const hasStockWarning = item.hasStockWarning || item.originalQuantity > stock
  const originalPrice = item.type === 'custom' ? item.originalPrice : item.originalPrice || product?.originalPrice

  return (
    <article className="cart-item">
      <Link className="cart-item-image" to={productPath}>
        <ProductImage src={item.image} alt={item.name} />
      </Link>

      <div className="cart-item-main">
        <div>
          <span className="cart-item-category">{item.category || product?.category}</span>
          <h2>
            <Link to={productPath}>{item.name}</Link>
          </h2>
          <p>
            Size: {item.selectedSize} <span>/</span> Color: {item.selectedColor}
          </p>
          {hasStockWarning && (
            <small>Quantity adjusted to the available stock limit.</small>
          )}
        </div>

        <div className="cart-price">
          <strong>{formatPrice(item.price)}</strong>
          {originalPrice && <span>{formatPrice(originalPrice)}</span>}
        </div>
      </div>

      <div className="cart-item-controls">
        <div className="cart-quantity" aria-label={`Quantity for ${item.name}`}>
          <button
            type="button"
            aria-label={`Decrease quantity for ${item.name}`}
            disabled={quantity <= 1}
            onClick={() => updateCartQuantity(variantKey, quantity - 1, stock)}
          >
            -
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity for ${item.name}`}
            disabled={isAtStockLimit}
            onClick={() => updateCartQuantity(variantKey, quantity + 1, stock)}
          >
            +
          </button>
        </div>
        <div className="cart-subtotal">
          <span>Subtotal</span>
          <strong>{formatPrice(getItemSubtotal({ ...item, quantity }))}</strong>
        </div>
        <button
          type="button"
          className="cart-remove"
          aria-label={`Remove ${item.name} from cart`}
          onClick={() => {
            removeFromCart(variantKey)
            showToast('Removed from cart.')
          }}
        >
          Remove
        </button>
      </div>
    </article>
  )
}

export default CartItem

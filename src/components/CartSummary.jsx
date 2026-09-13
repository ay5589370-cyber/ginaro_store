import { Link, useNavigate } from 'react-router-dom'
import CouponBox from './CouponBox.jsx'
import FreeShippingProgress from './FreeShippingProgress.jsx'
import { formatPrice } from '../utils/formatters.js'

function CartSummary({ totals, coupon, onApplyCoupon, hasStockIssue }) {
  const navigate = useNavigate()

  return (
    <aside className="cart-summary" aria-label="Order summary">
      <h2>Order Summary</h2>
      <FreeShippingProgress totals={totals} />
      <CouponBox subtotal={totals.subtotal} coupon={coupon} onApplyCoupon={onApplyCoupon} />

      <div className="summary-lines">
        <div>
          <span>Subtotal</span>
          <strong>{formatPrice(totals.subtotal)}</strong>
        </div>
        <div>
          <span>Discount</span>
          <strong>{totals.discount > 0 ? `-${formatPrice(totals.discount)}` : formatPrice(0)}</strong>
        </div>
        {totals.productSavings > 0 && (
          <div>
            <span>Product Savings</span>
            <strong>-{formatPrice(totals.productSavings)}</strong>
          </div>
        )}
        <div>
          <span>Shipping</span>
          <strong>{totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}</strong>
        </div>
      </div>

      <div className="summary-total">
        <span>Estimated Total</span>
        <strong>{formatPrice(totals.total)}</strong>
      </div>

      {hasStockIssue && (
        <p className="summary-warning">
          Please update or remove items with stock changes before checkout.
        </p>
      )}

      <button
        type="button"
        className="button button-primary"
        disabled={hasStockIssue}
        onClick={() => navigate('/checkout')}
      >
        Proceed to Checkout
      </button>
      <Link className="button button-secondary" to="/shop">
        Continue Shopping
      </Link>
    </aside>
  )
}

export default CartSummary

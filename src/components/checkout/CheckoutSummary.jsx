import { Link } from 'react-router-dom'
import CouponBox from '../CouponBox.jsx'
import CheckoutOrderItem from './CheckoutOrderItem.jsx'
import { getCheckoutItemCount } from '../../utils/checkoutCalculations.js'
import { formatPrice } from '../../utils/formatters.js'

function CheckoutSummary({
  items,
  totals,
  coupon,
  errors,
  termsAccepted,
  hasStockIssue,
  isPlacingOrder = false,
  onApplyCoupon,
  onRemoveCoupon,
  onTermsChange,
  onPlaceOrder,
  onViewDesign,
}) {
  return (
    <aside className="checkout-summary" aria-label="Checkout order summary">
      <div className="checkout-summary-head">
        <div>
          <span>Order Summary</span>
          <h2>{getCheckoutItemCount(items)} items</h2>
        </div>
        <Link to="/cart">Back to Cart</Link>
      </div>

      <div className="checkout-order-items">
        {items.map((item) => (
          <CheckoutOrderItem
            item={item}
            key={item.cartKey}
            onViewDesign={onViewDesign}
          />
        ))}
      </div>

      <CouponBox subtotal={totals.orderValue} coupon={coupon} onApplyCoupon={onApplyCoupon} />
      {coupon && (
        <div className="applied-coupon">
          <span>Applied coupon: {coupon}</span>
          <button type="button" onClick={onRemoveCoupon}>
            Remove
          </button>
        </div>
      )}

      <div className="summary-lines checkout-summary-lines">
        <div>
          <span>Subtotal</span>
          <strong>{formatPrice(totals.subtotal)}</strong>
        </div>
        <div>
          <span>Customization</span>
          <strong>{totals.customizationCharges > 0 ? formatPrice(totals.customizationCharges) : formatPrice(0)}</strong>
        </div>
        <div>
          <span>Discount</span>
          <strong>{totals.discount > 0 ? `-${formatPrice(totals.discount)}` : formatPrice(0)}</strong>
        </div>
        <div>
          <span>Shipping</span>
          <strong>{totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}</strong>
        </div>
      </div>

      <p className="checkout-tax-note">{totals.taxesNote}</p>

      <div className="summary-total checkout-summary-total">
        <span>Total</span>
        <strong>{formatPrice(totals.total)}</strong>
      </div>

      <label className="check-option checkout-terms">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) => onTermsChange(event.target.checked)}
        />
        <span>I agree to the Terms & Conditions and Privacy Policy.</span>
      </label>
      {errors.terms && <p className="checkout-error">{errors.terms}</p>}
      {errors.stock && <p className="checkout-error">{errors.stock}</p>}

      <button
        type="button"
        className="button button-primary"
        disabled={hasStockIssue || isPlacingOrder}
        onClick={onPlaceOrder}
      >
        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
      </button>

      <div className="checkout-trust">
        <strong>Secure Checkout</strong>
        <span>Your payment details are not stored by us.</span>
      </div>
    </aside>
  )
}

export default CheckoutSummary

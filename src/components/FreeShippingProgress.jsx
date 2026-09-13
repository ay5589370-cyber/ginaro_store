import { FREE_SHIPPING_THRESHOLD } from '../utils/cartCalculations.js'
import { formatPrice } from '../utils/formatters.js'

function FreeShippingProgress({ totals }) {
  return (
    <section className="free-shipping-box">
      <div className="free-shipping-copy">
        <strong>{totals.hasFreeShipping ? 'Free Shipping' : `Add ${formatPrice(totals.freeShippingRemaining)} more to unlock free shipping.`}</strong>
        <span>
          {formatPrice(Math.min(totals.subtotal, FREE_SHIPPING_THRESHOLD))} / {formatPrice(FREE_SHIPPING_THRESHOLD)} for Free Shipping
        </span>
      </div>
      <div className="shipping-progress" aria-hidden="true">
        <span style={{ width: `${totals.freeShippingProgress}%` }} />
      </div>
    </section>
  )
}

export default FreeShippingProgress

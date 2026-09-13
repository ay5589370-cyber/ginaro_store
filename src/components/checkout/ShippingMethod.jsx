import { getDeliveryEstimate, shippingMethods } from '../../utils/checkoutCalculations.js'
import { formatPrice } from '../../utils/formatters.js'

function ShippingMethod({ selectedMethod, orderValue, coupon, onChange }) {
  return (
    <section className="checkout-panel">
      <fieldset className="checkout-fieldset">
        <legend>Shipping Method</legend>
        <div className="shipping-options">
          {shippingMethods.map((method) => {
            const isFreeStandard = method.id === 'standard' && (orderValue >= 999 || coupon === 'FREESHIP')
            const priceLabel = isFreeStandard ? 'FREE' : formatPrice(method.price)

            return (
              <label className={selectedMethod === method.id ? 'is-selected' : ''} key={method.id}>
                <input
                  type="radio"
                  name="shipping-method"
                  checked={selectedMethod === method.id}
                  onChange={() => onChange(method.id)}
                />
                <span>
                  <strong>{method.name}</strong>
                  {method.description}
                </span>
                <em>{priceLabel}</em>
              </label>
            )
          })}
        </div>
      </fieldset>
      <p className="delivery-estimate">
        Estimated delivery: {getDeliveryEstimate(selectedMethod)}
      </p>
    </section>
  )
}

export default ShippingMethod

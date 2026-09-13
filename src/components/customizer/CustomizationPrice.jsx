import { formatPrice } from '../../utils/formatters.js'

function CustomizationPrice({ pricing }) {
  return (
    <section className="customizer-card customization-price">
      <div className="customizer-section-head">
        <h2>Estimated Price</h2>
      </div>
      <div className="price-breakdown">
        <div>
          <span>Base Vest</span>
          <strong>{formatPrice(pricing.basePrice)}</strong>
        </div>
        <div>
          <span>Front Custom Print</span>
          <strong>{formatPrice(pricing.frontCustomPrint)}</strong>
        </div>
        <div>
          <span>Back Custom Print</span>
          <strong>{formatPrice(pricing.backCustomPrint)}</strong>
        </div>
        <div>
          <span>Premium Options</span>
          <strong>{formatPrice(pricing.premiumOptions)}</strong>
        </div>
      </div>
      <div className="custom-total">
        <span>Estimated Total</span>
        <strong>{formatPrice(pricing.totalPrice)}</strong>
      </div>
    </section>
  )
}

export default CustomizationPrice

import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/formatters.js'
import ProductImage from '../ProductImage.jsx'

function hasCustomSideDesign(design) {
  if (design === true) return true
  return Boolean(design?.hasDesign || design?.template || design?.upload || design?.text)
}

function CheckoutOrderItem({ item, onViewDesign }) {
  const productPath = `/product/${item.productId || item.id}`
  const isCustom = item.type === 'custom'
  const frontDesign = hasCustomSideDesign(item.frontDesign)
  const backDesign = hasCustomSideDesign(item.backDesign)

  return (
    <article className="checkout-order-item">
      <Link to={productPath} className="checkout-order-image">
        <ProductImage src={item.image} alt={item.name} />
      </Link>
      <div>
        <div className="checkout-order-title-row">
          <h3>
            <Link to={productPath}>{item.name}</Link>
          </h3>
          {isCustom && <span>Customized</span>}
        </div>
        <p>
          Size: {item.selectedSize || 'Not selected'} / Color: {item.selectedColor || 'Not selected'}
        </p>
        <p>
          Qty {item.quantity} x {formatPrice(item.price)}
        </p>
        {isCustom && (
          <div className="checkout-custom-lines">
            <small>Front customization: {frontDesign ? 'Yes' : 'No'}</small>
            <small>Back customization: {backDesign ? 'Yes' : 'No'}</small>
            <small>Customization charge: {formatPrice((item.customizationPrice || 0) * item.quantity)}</small>
            <button type="button" onClick={() => onViewDesign(item)}>
              View Design
            </button>
          </div>
        )}
      </div>
      <strong>{formatPrice(item.price * item.quantity)}</strong>
    </article>
  )
}

export default CheckoutOrderItem

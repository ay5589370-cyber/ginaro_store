import ProductImage from '../ProductImage.jsx'
import { formatPrice } from '../../utils/formatters.js'
import { getProductCategoryLabel } from '../../utils/productData.js'

function AIProductCard({ product, onViewProduct, onAddProduct, onCustomize }) {
  const isOutOfStock = product.stock === 0
  const mainImage = product.images?.[0] || product.image

  return (
    <article className={`ai-product-card ${isOutOfStock ? 'is-out-of-stock' : ''}`}>
      <ProductImage src={mainImage} alt={product.name} />
      <div className="ai-product-info">
        <span>{getProductCategoryLabel(product.category)}</span>
        <h3>{product.name}</h3>
        <div className="ai-product-price">
          <strong>{formatPrice(product.price)}</strong>
          {product.originalPrice && <em>{formatPrice(product.originalPrice)}</em>}
          <small>★ {product.rating}</small>
        </div>
        <p>Sizes: {product.sizes.join(', ')}</p>
        <div className="ai-product-actions">
          <button type="button" onClick={() => onViewProduct(product)}>
            View Product
          </button>
          <button type="button" onClick={() => onAddProduct(product)} disabled={isOutOfStock}>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          {product.customizable && (
            <button type="button" onClick={() => onCustomize(product)}>
              Customize
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default AIProductCard

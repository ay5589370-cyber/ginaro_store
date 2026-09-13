import ProductImage from '../ProductImage.jsx'
import { formatPrice } from '../../utils/formatters.js'

function AIComparison({ products }) {
  if (products.length < 2) return null

  return (
    <div className="ai-comparison">
      {products.map((product) => (
        <article key={product.id}>
          <ProductImage src={product.images?.[0] || product.image} alt={product.name} />
          <h3>{product.name}</h3>
          <dl>
            <div>
              <dt>Price</dt>
              <dd>{formatPrice(product.price)}</dd>
            </div>
            <div>
              <dt>Material</dt>
              <dd>{product.material}</dd>
            </div>
            <div>
              <dt>Sizes</dt>
              <dd>{product.sizes.join(', ')}</dd>
            </div>
            <div>
              <dt>Colors</dt>
              <dd>{product.colors.join(', ')}</dd>
            </div>
            <div>
              <dt>Rating</dt>
              <dd>★ {product.rating}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>{product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}

export default AIComparison

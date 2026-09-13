import { useState } from 'react'
import { normalizeProductCategory } from '../utils/productData.js'

const tabs = ['Description', 'Material & Care', 'Product Details']

function getFit(product) {
  const category = normalizeProductCategory(product.category)

  if (category === 'pajama') return 'Relaxed Fit'
  if (category === 'combo') return 'Comfort Fit'
  return 'Regular Fit'
}

function getMaterialLine(product) {
  if (product.material === 'Premium Cotton') return 'Premium cotton selected for softness and breathability.'
  if (product.material === 'Cotton Blend') return 'Cotton blend fabric with an easy stretch feel.'
  return 'Cotton fabric made for dependable everyday comfort.'
}

function ProductTabs({ product }) {
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <section className="product-tabs section-shell">
      <div className="tab-list" role="tablist" aria-label="Product information">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? 'is-active' : ''}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {activeTab === 'Description' && (
          <p>
            {product.description} Designed with the clean GINARO everyday
            wardrobe in mind, this piece balances comfort, durability and a
            polished finish for repeat wear.
          </p>
        )}

        {activeTab === 'Material & Care' && (
          <div className="detail-list">
            <div>
              <span>Material</span>
              <strong>{product.material}</strong>
            </div>
            <div>
              <span>Care</span>
              <strong>Machine wash cold. Do not bleach. Dry in shade.</strong>
            </div>
            <div>
              <span>Fabric Note</span>
              <strong>{getMaterialLine(product)}</strong>
            </div>
          </div>
        )}

        {activeTab === 'Product Details' && (
          <div className="detail-list">
            <div>
              <span>Fit</span>
              <strong>{getFit(product)}</strong>
            </div>
            <div>
              <span>Available Sizes</span>
              <strong>{product.sizes.join(', ')}</strong>
            </div>
            <div>
              <span>Available Colors</span>
              <strong>{product.colors.join(', ')}</strong>
            </div>
            <div>
              <span>Stock</span>
              <strong>{product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}</strong>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ProductTabs

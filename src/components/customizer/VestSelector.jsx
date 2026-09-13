import { formatPrice } from '../../utils/formatters.js'
import ProductImage from '../ProductImage.jsx'

function VestSelector({ vests, selectedVest, onSelectVest }) {
  return (
    <section className="customizer-card">
      <div className="customizer-section-head">
        <h2>Choose Your Vest</h2>
      </div>
      <div className="vest-selector-list">
        {vests.map((vest) => (
          <button
            type="button"
            className={selectedVest?.id === vest.id ? 'is-selected' : ''}
            key={vest.id}
            onClick={() => onSelectVest(vest)}
          >
            <ProductImage src={vest.image} alt={vest.name} />
            <span>
              <strong>{vest.name}</strong>
              <em>{formatPrice(vest.price)}</em>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default VestSelector

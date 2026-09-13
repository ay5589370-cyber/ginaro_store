import Icon from './Icon.jsx'
import ShopFilters from './ShopFilters.jsx'

function MobileFilters({ isOpen, onClose, resultCount, ...filterProps }) {
  return (
    <div className={`filter-drawer ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen}>
      <button
        type="button"
        className="filter-backdrop"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div className="filter-sheet" role="dialog" aria-modal="true" aria-label="Product filters">
        <div className="filter-sheet-head">
          <div>
            <span>Refine Products</span>
            <strong>{resultCount} found</strong>
          </div>
          <button type="button" aria-label="Close filters" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="filter-sheet-body">
          <ShopFilters {...filterProps} />
        </div>
        <div className="filter-sheet-actions">
          <button type="button" onClick={onClose}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export default MobileFilters

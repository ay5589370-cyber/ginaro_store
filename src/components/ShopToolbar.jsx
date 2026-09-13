import Icon from './Icon.jsx'

const defaultSortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'best-rated', label: 'Best Rated' },
]

function ShopToolbar({
  searchTerm,
  sortBy,
  onSearchChange,
  onSortChange,
  onOpenFilters,
  sortOptions = defaultSortOptions,
}) {
  return (
    <section className="shop-toolbar" aria-label="Shop controls">
      <div className="shop-search">
        <Icon name="search" size={20} />
        <label className="sr-only" htmlFor="shop-search">
          Search products
        </label>
        <input
          id="shop-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products..."
        />
      </div>

      <div className="shop-sort-row">
        <button type="button" className="mobile-filter-trigger" onClick={onOpenFilters}>
          Filters
        </button>
        <label htmlFor="shop-sort">Sort</label>
        <select
          id="shop-sort"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {sortOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

export default ShopToolbar

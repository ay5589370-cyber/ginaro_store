const filterGroups = [
  {
    title: 'Price',
    key: 'priceRanges',
    options: [
      { label: 'Under ₹300', value: 'under-300' },
      { label: '₹300 - ₹500', value: '300-500' },
      { label: '₹500 - ₹800', value: '500-800' },
      { label: 'Above ₹800', value: 'above-800' },
    ],
  },
  {
    title: 'Size',
    key: 'sizes',
    options: ['S', 'M', 'L', 'XL', 'XXL'].map((value) => ({ label: value, value })),
  },
  {
    title: 'Color',
    key: 'colors',
    options: ['White', 'Black', 'Grey', 'Navy', 'Brown'].map((value) => ({ label: value, value })),
  },
  {
    title: 'Material',
    key: 'materials',
    options: ['Cotton', 'Cotton Blend', 'Premium Cotton'].map((value) => ({ label: value, value })),
  },
]

const categoryOptions = ['All', 'Vests', 'Pajamas', 'Combo Packs']

function ShopFilters({
  filters,
  onCategoryChange,
  onCheckboxChange,
  onAvailabilityChange,
  onClear,
}) {
  return (
    <aside className="shop-filter-panel" aria-label="Shop filters">
      <div className="filter-panel-head">
        <h2>Filters</h2>
        <button type="button" onClick={onClear}>
          Clear Filters
        </button>
      </div>

      <div className="filter-group">
        <h3>Category</h3>
        <div className="filter-options">
          {categoryOptions.map((category) => (
            <label className="filter-option" key={category}>
              <input
                type="radio"
                name="category"
                checked={filters.category === category}
                onChange={() => onCategoryChange(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </div>

      {filterGroups.map((group) => (
        <div className="filter-group" key={group.key}>
          <h3>{group.title}</h3>
          <div className="filter-options">
            {group.options.map((option) => (
              <label className="filter-option" key={option.value}>
                <input
                  type="checkbox"
                  checked={filters[group.key].includes(option.value)}
                  onChange={() => onCheckboxChange(group.key, option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="filter-group">
        <h3>Availability</h3>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => onAvailabilityChange(event.target.checked)}
          />
          <span>In Stock</span>
        </label>
      </div>
    </aside>
  )
}

export default ShopFilters

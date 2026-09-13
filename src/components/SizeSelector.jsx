const allSizes = ['S', 'M', 'L', 'XL', 'XXL']

function SizeSelector({ availableSizes, selectedSize, onSelect, onOpenGuide }) {
  return (
    <div className="option-block">
      <div className="option-head">
        <h3>Select Size</h3>
        <button type="button" onClick={onOpenGuide}>
          Size Guide
        </button>
      </div>
      <div className="size-options" role="radiogroup" aria-label="Select product size">
        {allSizes.map((size) => {
          const isAvailable = availableSizes.includes(size)
          return (
            <button
              type="button"
              key={size}
              className={selectedSize === size ? 'is-selected' : ''}
              disabled={!isAvailable}
              onClick={() => onSelect(size)}
              role="radio"
              aria-checked={selectedSize === size}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SizeSelector

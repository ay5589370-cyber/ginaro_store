const swatchColors = {
  White: '#f7f4eb',
  Black: '#11100d',
  Grey: '#8f8a82',
  Navy: '#202b3b',
  Brown: '#6f4b32',
}

function ColorSelector({ colors, selectedColor, onSelect }) {
  return (
    <div className="option-block">
      <div className="option-head">
        <h3>Select Color</h3>
        {selectedColor && <span>{selectedColor}</span>}
      </div>
      <div className="color-options" role="radiogroup" aria-label="Select product color">
        {colors.map((color) => (
          <button
            type="button"
            key={color}
            className={selectedColor === color ? 'is-selected' : ''}
            onClick={() => onSelect(color)}
            role="radio"
            aria-checked={selectedColor === color}
          >
            <span style={{ background: swatchColors[color] }} />
            <em>{color}</em>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ColorSelector

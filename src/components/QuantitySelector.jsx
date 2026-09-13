function QuantitySelector({ quantity, stock, onChange }) {
  const decrease = () => onChange(Math.max(1, quantity - 1))
  const increase = () => onChange(Math.min(stock, quantity + 1))

  return (
    <div className="option-block quantity-block">
      <div className="option-head">
        <h3>Quantity</h3>
      </div>
      <div className="quantity-selector" aria-label="Select quantity">
        <button type="button" onClick={decrease} disabled={quantity <= 1 || stock === 0}>
          -
        </button>
        <span aria-live="polite">{quantity}</span>
        <button type="button" onClick={increase} disabled={quantity >= stock || stock === 0}>
          +
        </button>
      </div>
    </div>
  )
}

export default QuantitySelector

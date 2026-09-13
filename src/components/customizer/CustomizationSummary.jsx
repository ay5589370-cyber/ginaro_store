import CustomizationPrice from './CustomizationPrice.jsx'

function sideLabel(sideDesign) {
  const parts = []
  if (sideDesign.template) parts.push(sideDesign.template.name)
  if (sideDesign.upload) parts.push(sideDesign.upload.fileName)
  if (sideDesign.text.value.trim()) parts.push(`Text: ${sideDesign.text.value.trim()}`)
  return parts.length ? parts.join(', ') : 'No design added'
}

function CustomizationSummary({
  selectedVest,
  selectedColor,
  selectedSize,
  quantity,
  designState,
  pricing,
  validationMessage,
  successMessage,
  onSelectSize,
  onChangeQuantity,
  onAddToCart,
  onSaveDesign,
  onResetDesign,
  isSavingDesign = false,
}) {
  const maxQuantity = selectedVest?.stock || 1

  return (
    <aside className="customizer-summary">
      <section className="customizer-card">
        <div className="customizer-section-head">
          <h2>Design Summary</h2>
        </div>
        <div className="summary-detail-list">
          <div>
            <span>Selected Vest</span>
            <strong>{selectedVest?.name || 'Not selected'}</strong>
          </div>
          <div>
            <span>Vest Color</span>
            <strong>{selectedColor || 'Select color'}</strong>
          </div>
          <div>
            <span>Front Design</span>
            <strong>{sideLabel(designState.front)}</strong>
          </div>
          <div>
            <span>Back Design</span>
            <strong>{sideLabel(designState.back)}</strong>
          </div>
        </div>

        <div className="summary-option-block">
          <h3>Size</h3>
          <div className="summary-size-row" role="radiogroup" aria-label="Select customized vest size">
            {['S', 'M', 'L', 'XL', 'XXL'].map((size) => {
              const available = selectedVest?.sizes.includes(size)
              return (
                <button
                  type="button"
                  key={size}
                  disabled={!available}
                  className={selectedSize === size ? 'is-selected' : ''}
                  onClick={() => onSelectSize(size)}
                  role="radio"
                  aria-checked={selectedSize === size}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>

        <div className="summary-option-block">
          <h3>Quantity</h3>
          <div className="cart-quantity custom-quantity" aria-label="Customized vest quantity">
            <button
              type="button"
              aria-label="Decrease customized vest quantity"
              disabled={quantity <= 1}
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
            >
              -
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase customized vest quantity"
              disabled={quantity >= maxQuantity}
              onClick={() => onChangeQuantity(Math.min(maxQuantity, quantity + 1))}
            >
              +
            </button>
          </div>
        </div>
      </section>

      <CustomizationPrice pricing={pricing} />

      {(validationMessage || successMessage) && (
        <p className={`customizer-message ${validationMessage ? 'is-error' : 'is-success'}`}>
          {validationMessage || successMessage}
        </p>
      )}

      <div className="customizer-actions">
        <button type="button" className="button button-primary" onClick={onAddToCart}>
          Add Customized Vest to Cart
        </button>
        <button type="button" className="button button-secondary" onClick={onSaveDesign} disabled={isSavingDesign}>
          {isSavingDesign ? 'Saving...' : 'Save Design'}
        </button>
        <button type="button" className="reset-design-button" onClick={onResetDesign}>
          Reset Design
        </button>
      </div>
    </aside>
  )
}

export default CustomizationSummary

const positions = [
  { label: 'Center', value: 'center' },
  { label: 'Left Chest', value: 'leftChest' },
  { label: 'Right Chest', value: 'rightChest' },
  { label: 'Upper Center', value: 'upperCenter' },
  { label: 'Lower Center', value: 'lowerCenter' },
]

const sizes = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
]

function DesignControls({ position, size, onChangePosition, onChangeSize }) {
  return (
    <section className="customizer-card">
      <div className="customizer-section-head">
        <h2>Design Placement</h2>
      </div>

      <div className="placement-group">
        <h3>Position</h3>
        <div className="placement-options">
          {positions.map((positionOption) => (
            <button
              type="button"
              className={position === positionOption.value ? 'is-active' : ''}
              key={positionOption.value}
              onClick={() => onChangePosition(positionOption.value)}
            >
              {positionOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="placement-group">
        <h3>Size</h3>
        <div className="placement-options">
          {sizes.map((sizeOption) => (
            <button
              type="button"
              className={size === sizeOption.value ? 'is-active' : ''}
              key={sizeOption.value}
              onClick={() => onChangeSize(sizeOption.value)}
            >
              {sizeOption.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DesignControls

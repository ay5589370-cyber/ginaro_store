import ViewSwitcher from './ViewSwitcher.jsx'

const positionClasses = {
  center: 'pos-center',
  leftChest: 'pos-left-chest',
  rightChest: 'pos-right-chest',
  upperCenter: 'pos-upper-center',
  lowerCenter: 'pos-lower-center',
}

const sizeClasses = {
  small: 'design-small',
  medium: 'design-medium',
  large: 'design-large',
}

function VestPreview({ selectedVest, selectedColor, activeView, onChangeView, sideDesign }) {
  if (!selectedVest) {
    return (
      <section className="vest-preview-shell is-empty">
        <p>Choose a vest to start designing.</p>
        <a href="#choose-vest">Choose Vest</a>
      </section>
    )
  }

  const placementClass = positionClasses[sideDesign.position]
  const scaleClass = sizeClasses[sideDesign.size]
  const hasText = sideDesign.text.visible && sideDesign.text.value.trim()

  return (
    <section className="vest-preview-shell">
      <div className="preview-topbar">
        <div>
          <span>{selectedColor || 'Select color'}</span>
          <strong>{selectedVest.name}</strong>
        </div>
        <ViewSwitcher activeView={activeView} onChangeView={onChangeView} />
      </div>

      <div className="vest-preview-stage">
        <div className="vest-mockup">
          <img src={selectedVest.image} alt={`${selectedVest.name} ${activeView} preview`} />
          <div className="printable-region" aria-label="Printable area">
            {sideDesign.template?.visible && (
              <img
                className={`design-layer template-layer ${placementClass} ${scaleClass}`}
                src={sideDesign.template.fullDesignImage}
                alt={sideDesign.template.name}
              />
            )}
            {sideDesign.upload?.visible && (
              <img
                className={`design-layer upload-layer ${placementClass} ${scaleClass}`}
                src={sideDesign.upload.previewUrl}
                alt={sideDesign.upload.fileName}
              />
            )}
            {hasText && (
              <span
                className={`design-text-layer ${placementClass} ${scaleClass}`}
                style={{
                  color: sideDesign.text.color,
                  fontFamily: sideDesign.text.font,
                  fontSize: `${sideDesign.text.fontSize}px`,
                  fontWeight: sideDesign.text.bold ? 800 : 500,
                  fontStyle: sideDesign.text.italic ? 'italic' : 'normal',
                  textAlign: sideDesign.text.align,
                }}
              >
                {sideDesign.text.value}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default VestPreview

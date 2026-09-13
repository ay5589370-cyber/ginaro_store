import { useEffect } from 'react'
import { formatPrice } from '../../utils/formatters.js'
import ProductImage from '../ProductImage.jsx'

function CustomDesignPreviewModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [item, onClose])

  if (!item) return null

  const frontDesign = item.frontDesign === true || Boolean(item.frontDesign?.hasDesign || item.frontDesign?.template || item.frontDesign?.upload || item.frontDesign?.text)
  const backDesign = item.backDesign === true || Boolean(item.backDesign?.hasDesign || item.backDesign?.template || item.backDesign?.upload || item.backDesign?.text)

  return (
    <div className="design-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="design-preview-title">
      <button type="button" className="modal-backdrop-button" aria-label="Close design preview" onClick={onClose} />
      <div className="design-preview-modal">
        <div className="modal-head">
          <div>
            <span>Custom Vest Design</span>
            <h2 id="design-preview-title">{item.name}</h2>
          </div>
          <button type="button" aria-label="Close design preview" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="design-preview-body">
          <ProductImage src={item.previewImage || item.image} alt={`${item.name} design preview`} />
          <div>
            <p>Size: {item.selectedSize}</p>
            <p>Color: {item.selectedColor}</p>
            <p>Front customization: {frontDesign ? 'Yes' : 'No'}</p>
            <p>Back customization: {backDesign ? 'Yes' : 'No'}</p>
            <p>Customization charge: {formatPrice((item.customizationPrice || 0) * item.quantity)}</p>
            <small>Cloud design previews will be connected with storage later.</small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomDesignPreviewModal

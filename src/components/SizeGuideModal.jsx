import { useEffect } from 'react'

function SizeGuideModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined

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
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-layer" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close size guide"
        onClick={onClose}
      />
      <section className="size-guide-modal" role="dialog" aria-modal="true" aria-label="Size Guide">
        <div className="modal-head">
          <h2>Size Guide</h2>
          <button type="button" onClick={onClose} aria-label="Close size guide">
            Close
          </button>
        </div>
        <div className="size-table" role="table" aria-label="Basic size guide">
          <div role="row">
            <strong role="columnheader">Size</strong>
            <strong role="columnheader">Chest</strong>
            <strong role="columnheader">Waist</strong>
          </div>
          {[
            ['S', '34-36 in', '28-30 in'],
            ['M', '38-40 in', '32-34 in'],
            ['L', '42-44 in', '36-38 in'],
            ['XL', '46-48 in', '40-42 in'],
            ['XXL', '50-52 in', '44-46 in'],
          ].map((row) => (
            <div role="row" key={row[0]}>
              {row.map((cell) => (
                <span role="cell" key={cell}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
        <p>Measurements are a general guide. Choose the larger size for a relaxed fit.</p>
      </section>
    </div>
  )
}

export default SizeGuideModal

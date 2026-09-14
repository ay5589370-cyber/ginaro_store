import { useEffect, useMemo, useRef, useState } from 'react'
import ViewSwitcher from './ViewSwitcher.jsx'

const MIN_BOX_SIZE = 12
const MAX_BOX_SIZE = 96

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getTransform(sideDesign = {}) {
  const width = clamp(toNumber(sideDesign.width, 45), MIN_BOX_SIZE, MAX_BOX_SIZE)
  const height = clamp(toNumber(sideDesign.height, 28), MIN_BOX_SIZE, MAX_BOX_SIZE)

  return {
    x: clamp(toNumber(sideDesign.x, 27.5), 0, 100 - width),
    y: clamp(toNumber(sideDesign.y, 36), 0, 100 - height),
    width,
    height,
  }
}

function getPointPercent(event, element) {
  const rect = element.getBoundingClientRect()

  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
  }
}

function getDraggedTransform(startTransform, startPoint, point) {
  return {
    ...startTransform,
    x: clamp(startTransform.x + point.x - startPoint.x, 0, 100 - startTransform.width),
    y: clamp(startTransform.y + point.y - startPoint.y, 0, 100 - startTransform.height),
  }
}

function getResizedTransform(handle, startTransform, point) {
  const isWest = handle.includes('w')
  const isNorth = handle.includes('n')
  const anchorX = isWest ? startTransform.x + startTransform.width : startTransform.x
  const anchorY = isNorth ? startTransform.y + startTransform.height : startTransform.y
  const horizontalDistance = isWest ? anchorX - point.x : point.x - anchorX
  const verticalDistance = isNorth ? anchorY - point.y : point.y - anchorY
  const widthScale = horizontalDistance / startTransform.width
  const heightScale = verticalDistance / startTransform.height
  const maxWidth = isWest ? anchorX : 100 - anchorX
  const maxHeight = isNorth ? anchorY : 100 - anchorY
  const minScale = Math.max(MIN_BOX_SIZE / startTransform.width, MIN_BOX_SIZE / startTransform.height)
  const maxScale = Math.min(
    MAX_BOX_SIZE / startTransform.width,
    MAX_BOX_SIZE / startTransform.height,
    maxWidth / startTransform.width,
    maxHeight / startTransform.height,
  )
  const scale = clamp(Math.max(widthScale, heightScale), minScale, maxScale)
  const width = startTransform.width * scale
  const height = startTransform.height * scale

  return {
    width,
    height,
    x: isWest ? anchorX - width : anchorX,
    y: isNorth ? anchorY - height : anchorY,
  }
}

function hasVisibleDesign(sideDesign) {
  return Boolean(
    sideDesign.template?.visible ||
      sideDesign.upload?.visible ||
      (sideDesign.text?.visible && sideDesign.text?.value?.trim()),
  )
}

function VestPreview({ selectedVest, selectedColor, activeView, onChangeView, sideDesign, onChangeTransform }) {
  const printableRef = useRef(null)
  const designRef = useRef(null)
  const interactionRef = useRef(null)
  const [selectedView, setSelectedView] = useState('')
  const isSelected = selectedView === activeView
  const transform = useMemo(() => getTransform(sideDesign), [sideDesign])
  const hasDesign = hasVisibleDesign(sideDesign)
  const hasText = sideDesign.text?.visible && sideDesign.text?.value?.trim()

  useEffect(() => {
    if (!isSelected) return undefined

    const handleOutsidePointerDown = (event) => {
      if (interactionRef.current) return
      if (designRef.current?.contains(event.target)) return

      setSelectedView('')
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)

    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [isSelected])

  useEffect(() => {
    const handlePointerMove = (event) => {
      const interaction = interactionRef.current
      if (!interaction || !printableRef.current) return

      event.preventDefault()
      const point = getPointPercent(event, printableRef.current)
      const nextTransform = interaction.type === 'drag'
        ? getDraggedTransform(interaction.startTransform, interaction.startPoint, point)
        : getResizedTransform(interaction.handle, interaction.startTransform, point)

      onChangeTransform(nextTransform)
    }

    const endInteraction = () => {
      interactionRef.current = null
    }

    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', endInteraction)
    document.addEventListener('pointercancel', endInteraction)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', endInteraction)
      document.removeEventListener('pointercancel', endInteraction)
    }
  }, [onChangeTransform])

  if (!selectedVest) {
    return (
      <section className="vest-preview-shell is-empty">
        <p>Choose a vest to start designing.</p>
        <a href="#choose-vest">Choose Vest</a>
      </section>
    )
  }

  const startInteraction = (event, type, handle = '') => {
    if (!printableRef.current) return

    event.preventDefault()
    event.stopPropagation()
    setSelectedView(activeView)
    interactionRef.current = {
      type,
      handle,
      startPoint: getPointPercent(event, printableRef.current),
      startTransform: transform,
    }
  }

  const designStyle = {
    left: `${transform.x}%`,
    top: `${transform.y}%`,
    width: `${transform.width}%`,
    height: `${transform.height}%`,
  }

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
          <div
            className={`printable-region ${isSelected ? 'is-editing' : ''}`}
            aria-label="Printable area"
            ref={printableRef}
            onPointerDown={() => setSelectedView('')}
          >
            {hasDesign && (
              <div
                className={`manual-design-box ${isSelected ? 'is-selected' : ''}`}
                ref={designRef}
                style={designStyle}
                role="button"
                tabIndex={0}
                aria-label="Selected vest design. Drag to move, resize from corners."
                onPointerDown={(event) => startInteraction(event, 'drag')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelectedView(activeView)
                  if (event.key === 'Escape') setSelectedView('')
                }}
              >
                {sideDesign.template?.visible && (
                  <img
                    className="manual-design-layer template-layer"
                    src={sideDesign.template.fullDesignImage}
                    alt={sideDesign.template.name}
                    draggable="false"
                  />
                )}
                {sideDesign.upload?.visible && (
                  <img
                    className="manual-design-layer upload-layer"
                    src={sideDesign.upload.previewUrl}
                    alt={sideDesign.upload.fileName}
                    draggable="false"
                  />
                )}
                {hasText && (
                  <span
                    className="manual-design-text-layer"
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
                {isSelected && (
                  <>
                    {['nw', 'ne', 'sw', 'se'].map((handle) => (
                      <button
                        type="button"
                        key={handle}
                        className={`resize-handle handle-${handle}`}
                        aria-label={`Resize design from ${handle.toUpperCase()} corner`}
                        onPointerDown={(event) => startInteraction(event, 'resize', handle)}
                      />
                    ))}
                    <span className="design-edit-hint">Drag to move • Resize from corners</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default VestPreview



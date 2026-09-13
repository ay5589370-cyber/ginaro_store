const fonts = [
  { label: 'Classic Serif', value: 'Georgia, serif' },
  { label: 'Modern Sans', value: 'Inter, Arial, sans-serif' },
  { label: 'Clean Condensed', value: 'Arial Narrow, Arial, sans-serif' },
]

function TextEditor({ textDesign, onChangeText, onClearText }) {
  const updateText = (key, value) => {
    onChangeText({ ...textDesign, [key]: value })
  }

  return (
    <section className="customizer-card">
      <div className="customizer-section-head">
        <h2>Add Text</h2>
        {textDesign.value && (
          <button type="button" onClick={onClearText}>
            Remove Text
          </button>
        )}
      </div>

      <label className="input-label" htmlFor="custom-text">
        Text
      </label>
      <input
        id="custom-text"
        className="custom-text-input"
        placeholder="Enter your text"
        value={textDesign.value}
        onChange={(event) => updateText('value', event.target.value)}
      />

      <div className="text-control-grid">
        <label>
          <span>Font</span>
          <select value={textDesign.font} onChange={(event) => updateText('font', event.target.value)}>
            {fonts.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Font Size</span>
          <input
            type="number"
            min="14"
            max="64"
            value={textDesign.fontSize}
            onChange={(event) => updateText('fontSize', Number(event.target.value))}
          />
        </label>
        <label>
          <span>Color</span>
          <input
            type="color"
            value={textDesign.color}
            onChange={(event) => updateText('color', event.target.value)}
          />
        </label>
      </div>

      <div className="text-toggle-row" aria-label="Text styling">
        <button
          type="button"
          className={textDesign.bold ? 'is-active' : ''}
          onClick={() => updateText('bold', !textDesign.bold)}
        >
          B
        </button>
        <button
          type="button"
          className={textDesign.italic ? 'is-active' : ''}
          onClick={() => updateText('italic', !textDesign.italic)}
        >
          I
        </button>
        {['left', 'center', 'right'].map((align) => (
          <button
            type="button"
            key={align}
            className={textDesign.align === align ? 'is-active' : ''}
            onClick={() => updateText('align', align)}
          >
            {align}
          </button>
        ))}
        <button
          type="button"
          className={!textDesign.visible ? 'is-active' : ''}
          onClick={() => updateText('visible', !textDesign.visible)}
        >
          {textDesign.visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </section>
  )
}

export default TextEditor

import { useMemo, useState } from 'react'
import { customTemplates, templateCategories } from '../../data/customTemplates.js'

function TemplateSelector({ selectedTemplate, onApplyTemplate, onRemoveTemplate }) {
  const [category, setCategory] = useState('All')
  const filteredTemplates = useMemo(
    () =>
      category === 'All'
        ? customTemplates
        : customTemplates.filter((template) => template.category === category),
    [category],
  )

  return (
    <section className="customizer-card">
      <div className="customizer-section-head">
        <h2>Free Templates</h2>
        {selectedTemplate && (
          <button type="button" onClick={onRemoveTemplate}>
            Remove Template
          </button>
        )}
      </div>

      <div className="template-categories" aria-label="Template categories">
        {templateCategories.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? 'is-active' : ''}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="template-grid">
        {filteredTemplates.map((template) => (
          <button
            type="button"
            className={selectedTemplate?.id === template.id ? 'is-selected' : ''}
            key={template.id}
            onClick={() => onApplyTemplate(template)}
          >
            <img src={template.previewImage} alt={`${template.name} template preview`} />
            <span>{template.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default TemplateSelector

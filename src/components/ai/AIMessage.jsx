import AIComparison from './AIComparison.jsx'
import AIOptionSelector from './AIOptionSelector.jsx'
import AIProductResults from './AIProductResults.jsx'

function AIMessage({ message, onAction, onOptionSelect, onViewProduct, onAddProduct, onCustomize }) {
  return (
    <article className={`ai-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>
      <div className="ai-message-body">
        {message.text && <p>{message.text}</p>}

        {message.products?.length > 0 && (
          <AIProductResults
            products={message.products}
            onViewProduct={onViewProduct}
            onAddProduct={onAddProduct}
            onCustomize={onCustomize}
          />
        )}

        {message.comparison?.length > 0 && <AIComparison products={message.comparison} />}

        {message.options?.length > 0 && (
          <AIOptionSelector
            label={message.optionLabel || 'Choose an option'}
            options={message.options}
            onSelect={onOptionSelect}
          />
        )}

        {message.actions?.length > 0 && (
          <div className="ai-message-actions">
            {message.actions.map((action) => (
              <button type="button" key={action.label} onClick={() => onAction(action)}>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export default AIMessage

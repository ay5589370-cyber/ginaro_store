import Icon from '../Icon.jsx'

function AIFloatingButton({ isOpen, onOpen, isRaised }) {
  if (isOpen) return null

  return (
    <button
      type="button"
      className={`ai-floating-button ${isRaised ? 'is-raised' : ''}`}
      onClick={onOpen}
      aria-label="Open GINARO shopping assistant"
    >
      <Icon name="message" size={20} />
      <span>Ask AI</span>
    </button>
  )
}

export default AIFloatingButton

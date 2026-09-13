import Icon from '../Icon.jsx'

function AIChatInput({ value, onChange, onSend, isTyping, inputRef }) {
  const canSend = value.trim().length > 0 && !isTyping

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        onSend(value)
      }
    }
  }

  return (
    <form
      className="ai-chat-input"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSend) {
          onSend(value)
        }
      }}
    >
      <label className="sr-only" htmlFor="ai-chat-field">
        Ask about products, sizes, prices
      </label>
      <textarea
        id="ai-chat-field"
        ref={inputRef}
        rows="1"
        value={value}
        maxLength={1500}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about products, sizes, prices..."
      />
      <button type="submit" aria-label="Send assistant message" disabled={!canSend}>
        <Icon name="message" size={18} />
        <span>Send</span>
      </button>
    </form>
  )
}

export default AIChatInput

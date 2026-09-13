import Icon from '../Icon.jsx'

function AIChatHeader({ onClose, onClear }) {
  return (
    <header className="ai-chat-header">
      <div className="ai-header-brand">
        <img src="/assets/logo.png" alt="GINARO official logo" />
        <div>
          <h2>GINARO Assistant</h2>
          <span>Your personal shopping assistant</span>
        </div>
      </div>

      <div className="ai-header-actions">
        <button type="button" aria-label="Start a new assistant chat" onClick={onClear}>
          New Chat
        </button>
        <button type="button" aria-label="Close assistant" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </div>
    </header>
  )
}

export default AIChatHeader

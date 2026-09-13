import Icon from './Icon.jsx'

const questions = [
  'Show me white cotton vests under ₹500.',
  'Which pajama is best for summer?',
  'Find XL vests available right now.',
]

function AIAssistantBanner() {
  return (
    <section className="section-shell feature-banner assistant-banner">
      <div>
        <span className="feature-kicker">
          <Icon name="message" size={18} />
          Coming Soon
        </span>
        <h2>Need Help Finding the Right Product?</h2>
        <p>
          Soon, customers will be able to ask simple shopping questions and get
          product guidance tailored to their size, budget, and comfort needs.
        </p>
        <div className="prompt-row">
          {questions.map((question) => (
            <span key={question}>{question}</span>
          ))}
        </div>
      </div>
      <button className="button button-secondary dark" type="button">
        Ask AI Assistant
      </button>
    </section>
  )
}

export default AIAssistantBanner

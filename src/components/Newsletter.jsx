import Icon from './Icon.jsx'

function Newsletter() {
  return (
    <section className="newsletter-section section-shell">
      <div>
        <span className="newsletter-icon">
          <Icon name="mail" />
        </span>
        <h2>Stay in the Loop</h2>
        <p>Get new arrivals, offers and exclusive drops directly in your inbox.</p>
      </div>
      <form className="newsletter-form">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
        />
        <button type="button">Subscribe</button>
      </form>
    </section>
  )
}

export default Newsletter

function ContactForm({ contact, errors, onChange }) {
  return (
    <section className="checkout-panel">
      <h2>Contact Information</h2>
      <div className="checkout-form-grid two-columns">
        <div className="form-field">
          <label htmlFor="checkout-email">Email</label>
          <input
            id="checkout-email"
            type="email"
            value={contact.email}
            onChange={(event) => onChange('email', event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <small>{errors.email}</small>}
        </div>
        <div className="form-field">
          <label htmlFor="checkout-phone">Phone Number</label>
          <input
            id="checkout-phone"
            type="tel"
            value={contact.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <small>{errors.phone}</small>}
        </div>
      </div>
    </section>
  )
}

export default ContactForm

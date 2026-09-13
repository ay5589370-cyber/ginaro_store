function PaymentMethod({ method = 'cod', errors, onMethodChange }) {
  return (
    <section className="checkout-panel">
      <fieldset className="checkout-fieldset">
        <legend>Payment Method</legend>
        <div className="payment-options">
          <label className={method === 'cod' ? 'is-selected' : ''}>
            <input
              type="radio"
              name="payment-method"
              checked={method === 'cod'}
              onChange={() => onMethodChange('cod')}
            />
            <span>Cash on Delivery (COD)</span>
          </label>
        </div>
      </fieldset>

      <div className="payment-detail-panel">
        <p>Pay when your order is delivered.</p>
      </div>
      {errors.paymentMethod && <p className="checkout-error">{errors.paymentMethod}</p>}
    </section>
  )
}

export default PaymentMethod

const steps = ['Cart', 'Address', 'Payment', 'Review']

function CheckoutProgress() {
  return (
    <div className="checkout-progress" aria-label="Checkout progress">
      {steps.map((step, index) => (
        <div className="is-active" key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  )
}

export default CheckoutProgress

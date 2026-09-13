import { useState } from 'react'

function DeliveryChecker() {
  const [pinCode, setPinCode] = useState('')
  const [message, setMessage] = useState('')

  const checkDelivery = () => {
    if (/^\d{6}$/.test(pinCode)) {
      setMessage('Delivery details will be available during checkout.')
      return
    }

    setMessage('Please enter a valid 6-digit PIN code.')
  }

  return (
    <section className="delivery-checker">
      <h3>Check Delivery</h3>
      <div className="delivery-row">
        <label className="sr-only" htmlFor="pin-code">
          Enter PIN code
        </label>
        <input
          id="pin-code"
          inputMode="numeric"
          maxLength="6"
          placeholder="Enter PIN code"
          value={pinCode}
          onChange={(event) => setPinCode(event.target.value.replace(/\D/g, ''))}
        />
        <button type="button" onClick={checkDelivery}>
          Check
        </button>
      </div>
      {message && <p aria-live="polite">{message}</p>}
    </section>
  )
}

export default DeliveryChecker

import { useState } from 'react'
import { useToast } from '../context/useToast.js'
import { validateCoupon } from '../utils/cartCalculations.js'

function CouponBox({ subtotal, coupon, onApplyCoupon }) {
  const { showToast } = useToast()
  const [couponInput, setCouponInput] = useState(coupon)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const applyCoupon = () => {
    const result = validateCoupon(couponInput, subtotal)
    setMessage(result.message)
    setMessageType(result.valid ? 'success' : 'error')

    if (result.valid) {
      onApplyCoupon(result.coupon)
      showToast(result.message)
    } else {
      onApplyCoupon('')
      showToast(result.message, 'error')
    }
  }

  return (
    <section className="coupon-box">
      <h3>Have a coupon?</h3>
      <div className="coupon-row">
        <label className="sr-only" htmlFor="coupon-code">
          Enter coupon code
        </label>
        <input
          id="coupon-code"
          placeholder="Enter coupon code"
          value={couponInput}
          onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
        />
        <button type="button" onClick={applyCoupon}>
          Apply
        </button>
      </div>
      {message && <p className={messageType}>{message}</p>}
    </section>
  )
}

export default CouponBox

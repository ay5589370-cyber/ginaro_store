import { Link } from 'react-router-dom'
import { useState } from 'react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import { getAuthErrorMessage } from '../services/authService.js'
import { isValidEmail } from '../utils/authValidation.js'

function ForgotPassword() {
  const { authError, authLoading, resetPassword } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      setMessage('')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setMessage('If an account is eligible, password reset instructions have been sent.')
      showToast('Password reset instructions sent.')
    } catch (firebaseError) {
      if (firebaseError?.code === 'auth/user-not-found') {
        setMessage('If an account is eligible, password reset instructions have been sent.')
        showToast('Password reset instructions sent.')
        setSubmitting(false)
        return
      }

      setError(getAuthErrorMessage(firebaseError))
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Forgot Your Password?"
      text="Enter your email and we'll send you instructions to reset your password."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
              setMessage('')
            }}
            autoComplete="email"
            aria-invalid={Boolean(error)}
          />
          {error && <small>{error}</small>}
        </div>

        {authError && <p className="form-error" aria-live="polite">{authError}</p>}
        {message && <p className="form-success">{message}</p>}

        <button type="submit" className="button button-primary" disabled={submitting || authLoading}>
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="auth-switch">
          Remembered your password? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import PasswordField from '../components/auth/PasswordField.jsx'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import { getAuthErrorMessage } from '../services/authService.js'
import { isValidEmail } from '../utils/authValidation.js'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authError, authLoading, isLoggedIn, login, profileLoading, userProfile } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const from = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/account'

  useEffect(() => {
    if (!authLoading && isLoggedIn && !profileLoading && !submitting) {
      navigate(userProfile?.role === 'admin' ? '/admin' : '/account', { replace: true })
    }
  }, [authLoading, isLoggedIn, navigate, profileLoading, submitting, userProfile?.role])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!form.password) nextErrors.password = 'Enter your password.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await login({ email: form.email.trim(), password: form.password })
      showToast('Signed in successfully.')
      navigate(from, { replace: true })
    } catch (error) {
      setErrors({ form: getAuthErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account access"
      title="Welcome Back"
      text="Sign in to access your orders, wishlist and saved designs."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <small>{errors.email}</small>}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={form.password}
          onChange={(value) => updateField('password', value)}
          error={errors.password}
        />

        <div className="auth-form-row">
          <label className="check-option">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => updateField('remember', event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password">Forgot Password</Link>
        </div>

        {(errors.form || authError) && <p className="form-error" aria-live="polite">{errors.form || authError}</p>}

        <button type="submit" className="button button-primary" disabled={submitting || authLoading}>
          {submitting ? 'Signing In...' : 'Login'}
        </button>

        <div className="future-auth-option">
          <span>Continue with Google</span>
          <small>Google sign-in will be connected later.</small>
        </div>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/signup">Create Account</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login



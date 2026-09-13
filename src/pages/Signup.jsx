import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import PasswordField from '../components/auth/PasswordField.jsx'
import PasswordStrength from '../components/auth/PasswordStrength.jsx'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import { getAuthErrorMessage } from '../services/authService.js'
import { getFirestoreErrorMessage } from '../services/userService.js'
import { getPasswordIssues, isValidEmail, isValidPhone } from '../utils/authValidation.js'

function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authError, authLoading, isLoggedIn, signup } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agrees: false,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [redirectBlocked, setRedirectBlocked] = useState(false)
  const from = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/account'

  useEffect(() => {
    if (!authLoading && isLoggedIn && !submitting && !redirectBlocked) {
      navigate('/account', { replace: true })
    }
  }, [authLoading, isLoggedIn, navigate, redirectBlocked, submitting])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setRedirectBlocked(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.firstName.trim()) nextErrors.firstName = 'Enter your first name.'
    if (!form.lastName.trim()) nextErrors.lastName = 'Enter your last name.'
    if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!isValidPhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.'
    if (getPasswordIssues(form.password).length > 0) {
      nextErrors.password = getPasswordIssues(form.password)[0]
    }
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords must match.'
    if (!form.agrees) nextErrors.agrees = 'Please agree before creating an account.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await signup({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      })
      showToast('Account created successfully.')
      navigate(from, { replace: true })
    } catch (error) {
      if (!error?.code?.startsWith('auth/')) {
        setRedirectBlocked(true)
      }
      setErrors({
        form: error?.code?.startsWith('auth/')
          ? getAuthErrorMessage(error)
          : getFirestoreErrorMessage(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Join GINARO"
      title="Create Your Account"
      text="Create an account to keep your everyday essentials, saved designs and addresses together."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-two-fields">
          <div className="form-field">
            <label htmlFor="first-name">First Name</label>
            <input
              id="first-name"
              value={form.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
            />
            {errors.firstName && <small>{errors.firstName}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="last-name">Last Name</label>
            <input
              id="last-name"
              value={form.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
            />
            {errors.lastName && <small>{errors.lastName}</small>}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <small>{errors.email}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="signup-phone">Phone Number</label>
          <input
            id="signup-phone"
            type="tel"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <small>{errors.phone}</small>}
        </div>

        <PasswordField
          id="signup-password"
          label="Password"
          value={form.password}
          onChange={(value) => updateField('password', value)}
          autoComplete="new-password"
          error={errors.password}
        />
        <PasswordStrength password={form.password} />

        <PasswordField
          id="confirm-password"
          label="Confirm Password"
          value={form.confirmPassword}
          onChange={(value) => updateField('confirmPassword', value)}
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        <label className="check-option">
          <input
            type="checkbox"
            checked={form.agrees}
            onChange={(event) => updateField('agrees', event.target.checked)}
          />
          <span>I agree to the Terms & Conditions and Privacy Policy</span>
        </label>
        {errors.agrees && <small className="form-error">{errors.agrees}</small>}
        {(errors.form || authError) && <p className="form-error" aria-live="polite">{errors.form || authError}</p>}

        <button type="submit" className="button button-primary" disabled={submitting || authLoading}>
          {submitting ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Signup

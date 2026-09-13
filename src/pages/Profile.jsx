import { useMemo, useState } from 'react'
import AccountLayout from '../components/account/AccountLayout.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import { getAuthErrorMessage } from '../services/authService.js'
import { getFirestoreErrorMessage } from '../services/userService.js'
import { isValidPhone } from '../utils/authValidation.js'

function getNameParts(displayName = '') {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function getInitials(firstName, lastName, fallback = '') {
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  if (initials) return initials

  return fallback.charAt(0).toUpperCase() || 'G'
}

function ProfileForm({ currentUser, userProfile, updateProfile }) {
  const { showToast } = useToast()
  const firebaseName = useMemo(() => getNameParts(currentUser?.displayName), [currentUser?.displayName])
  const profileName = useMemo(() => getNameParts(userProfile?.displayName), [userProfile?.displayName])
  const [form, setForm] = useState({
    firstName: userProfile?.firstName || profileName.firstName || firebaseName.firstName,
    lastName: userProfile?.lastName || profileName.lastName || firebaseName.lastName,
    email: userProfile?.email || currentUser?.email || '',
    phone: userProfile?.phone || '',
    avatar: userProfile?.photoURL || currentUser?.photoURL || '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.firstName.trim()) nextErrors.firstName = 'Enter your first name.'
    if (!form.lastName.trim()) nextErrors.lastName = 'Enter your last name.'
    if (form.phone.trim() && !isValidPhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        photoURL: userProfile?.photoURL || currentUser?.photoURL || null,
      })
      setMessage('Profile updated successfully.')
      showToast('Profile updated successfully.')
    } catch (error) {
      setErrors({
        form: error?.code?.startsWith('auth/')
          ? getAuthErrorMessage(error)
          : getFirestoreErrorMessage(error),
      })
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="profile-photo-row">
        <div className="profile-avatar">
          {form.avatar ? (
            <img src={form.avatar} alt="Profile preview" />
          ) : (
            <span>{getInitials(form.firstName, form.lastName, form.email)}</span>
          )}
        </div>
        <button type="button" className="button button-secondary" disabled>
          Photo Upload Later
        </button>
      </div>
      <form className="account-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-two-fields">
          <div className="form-field">
            <label htmlFor="profile-first-name">First Name</label>
            <input id="profile-first-name" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
            {errors.firstName && <small>{errors.firstName}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="profile-last-name">Last Name</label>
            <input id="profile-last-name" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
            {errors.lastName && <small>{errors.lastName}</small>}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" type="email" value={form.email} readOnly />
        </div>
        <div className="form-field">
          <label htmlFor="profile-phone">Phone</label>
          <input id="profile-phone" type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
          {errors.phone && <small>{errors.phone}</small>}
        </div>
        {errors.form && <p className="form-error" aria-live="polite">{errors.form}</p>}
        {message && <p className="form-success">{message}</p>}
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </>
  )
}

function Profile() {
  const { currentUser, profileError, profileLoading, updateProfile, userProfile } = useAuth()

  return (
    <AccountLayout title="Profile" text="Update the profile information used across your GINARO account.">
      <section className="account-panel">
        <h2>Profile Information</h2>
        {profileLoading ? (
          <LoadingSpinner label="Loading profile" />
        ) : (
          <>
            {profileError && <p className="form-error" aria-live="polite">{profileError}</p>}
            <ProfileForm
              key={userProfile?.uid || currentUser?.uid}
              currentUser={currentUser}
              userProfile={userProfile}
              updateProfile={updateProfile}
            />
          </>
        )}
      </section>
    </AccountLayout>
  )
}

export default Profile

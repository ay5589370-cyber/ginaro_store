import { useState } from 'react'

function PasswordField({ id, label, value, onChange, autoComplete = 'current-password', error }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <small>{error}</small>}
    </div>
  )
}

export default PasswordField

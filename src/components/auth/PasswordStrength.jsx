import { getPasswordStrength } from '../../utils/authValidation.js'

function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password)

  return (
    <div className={`password-strength strength-${strength.toLowerCase()}`}>
      <span>Password strength</span>
      <strong>{strength}</strong>
      <div aria-hidden="true">
        <i />
      </div>
    </div>
  )
}

export default PasswordStrength

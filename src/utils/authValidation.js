export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPhone(phone) {
  return phone.replace(/\D/g, '').length >= 10
}

export function getPasswordIssues(password) {
  const issues = []

  if (password.length < 8) issues.push('Use at least 8 characters.')
  if (!/[A-Z]/.test(password)) issues.push('Add one uppercase letter.')
  if (!/[a-z]/.test(password)) issues.push('Add one lowercase letter.')
  if (!/\d/.test(password)) issues.push('Add one number.')

  return issues
}

export function getPasswordStrength(password) {
  const passed = 4 - getPasswordIssues(password).length

  if (!password || passed <= 1) return 'Weak'
  if (passed <= 3) return 'Medium'
  return 'Strong'
}

import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { useToast } from '../../context/useToast.js'
import { getAuthErrorMessage } from '../../services/authService.js'

const navItems = [
  { label: 'Profile', to: '/account/profile' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Wishlist', to: '/account/wishlist' },
  { label: 'Saved Designs', to: '/account/designs' },
  { label: 'Addresses', to: '/account/addresses' },
]

function AccountNavigation() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()
  const { showToast } = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Signed out.')
      navigate('/')
    } catch (error) {
      showToast(getAuthErrorMessage(error), 'error')
    }
  }

  return (
    <nav className="account-navigation" aria-label="Account navigation">
      {navItems.map((item) => (
        <NavLink key={item.label} to={item.to}>
          {item.label}
        </NavLink>
      ))}
      {isLoggedIn && (
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      )}
    </nav>
  )
}

export default AccountNavigation

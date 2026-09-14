import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useCart } from '../context/useCart.js'
import { useWishlist } from '../context/useWishlist.js'
import { lockBodyScroll } from '../utils/bodyScrollLock.js'
import Icon from './Icon.jsx'
import SearchOverlay from './SearchOverlay.jsx'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Vests', to: '/shop?category=vest' },
  { label: 'Pajamas', to: '/shop?category=pajama' },
  { label: 'Combos', to: '/shop?category=combo' },
  { label: 'Customize Vest', to: '/customize' },
]

function getProfileDisplayName(userProfile, currentUser) {
  return userProfile?.firstName || userProfile?.displayName || currentUser?.displayName || userProfile?.email || currentUser?.email || 'Profile'
}

function getProfileInitials(nameOrEmail = '') {
  const value = String(nameOrEmail).trim()
  if (!value) return 'P'

  const source = value.includes('@') ? value.split('@')[0] : value
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'P'
}

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const location = useLocation()
  const { cartCount } = useCart()
  const { currentUser, isLoggedIn, profileLoading, userProfile } = useAuth()
  const { wishlistCount } = useWishlist()
  const profileDisplayName = getProfileDisplayName(userProfile, currentUser)
  const profileInitials = getProfileInitials(profileDisplayName)
  const profileButtonText = userProfile?.role === 'admin' ? 'Admin' : profileDisplayName.split(/\s+/)[0] || 'Profile'
  const accountHref = isLoggedIn && userProfile?.role === 'admin' ? '/admin' : isLoggedIn ? '/account/profile' : '/login'
  const accountLabel = isLoggedIn && userProfile?.role === 'admin' ? 'Admin dashboard' : isLoggedIn ? 'Edit profile for ' + profileDisplayName : 'Login'

  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    if (!isMenuOpen) return undefined

    return lockBodyScroll()
  }, [isMenuOpen])

  const getNavClassName = (item) => {
    if (item.to === '/') return location.pathname === '/' ? 'active' : ''
    if (item.to === '/customize') return location.pathname.startsWith('/customize') ? 'active' : ''
    if (item.to === '/shop') return location.pathname === '/shop' && !location.search.includes('category=') ? 'active' : ''

    const [, query = ''] = item.to.split('?')
    return location.pathname === '/shop' && location.search.includes(query) ? 'active' : ''
  }

  return (
    <>
      <div className="announcement-bar">Free Shipping on Orders Above ₹999</div>
      <header className="site-header">
        <nav className="navbar section-shell" aria-label="Main navigation">
          <div className="brand-cluster">
            <button
              type="button"
              className="menu-button"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setIsMenuOpen((value) => !value)}
            >
              <Icon name={isMenuOpen ? 'x' : 'menu'} />
            </button>
            <Link className="brand-mark" to="/" onClick={closeMenu}>
              <img src="/assets/logo.png" alt="GINARO official logo" />
              <span>GINARO</span>
            </Link>
          </div>

          <div className={`nav-links ${isMenuOpen ? 'is-open' : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={closeMenu}
                className={getNavClassName(item)}
              >
                {item.label}
              </Link>
            ))}
            {userProfile?.role === 'admin' && (
              <Link to="/admin" onClick={closeMenu} className={location.pathname.startsWith('/admin') ? 'active' : ''}>
                Admin Dashboard
              </Link>
            )}
          </div>

          <div className="nav-actions" aria-label="Store actions">
            <button type="button" className="search-action" aria-label="Search" onClick={() => setIsSearchOpen(true)}>
              <Icon name="search" />
            </button>
            <Link className="wishlist-nav-button" to="/account/wishlist" aria-label={`Wishlist with ${wishlistCount} items`} onClick={closeMenu}>
              <Icon name="heart" />
              {wishlistCount > 0 && <span>{wishlistCount}</span>}
            </Link>
            <Link
              className={`account-nav-button ${isLoggedIn ? 'is-profile' : ''}`}
              to={accountHref}
              aria-label={accountLabel}
              aria-busy={isLoggedIn && profileLoading ? 'true' : undefined}
              onClick={closeMenu}
            >
              {isLoggedIn && userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="" />
              ) : isLoggedIn ? (
                <span className="account-nav-initials" aria-hidden="true">{profileInitials}</span>
              ) : (
                <Icon name="user" />
              )}
              {isLoggedIn && <span className="account-nav-text">{profileButtonText}</span>}
            </Link>
            <Link className="cart-button" to="/cart" aria-label={`Cart with ${cartCount} items`} onClick={closeMenu}>
              <Icon name="cart" />
              {cartCount > 0 && <span>{cartCount}</span>}
            </Link>
          </div>
        </nav>
      </header>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

export default Navbar






import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import Icon from '../Icon.jsx'

const adminNavItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Products', to: '/admin/products' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Reviews', to: '/admin/reviews' },
  { label: 'Customers', to: '/admin/users' },
]

function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <Link to="/admin" onClick={() => setMenuOpen(false)}>
            GINARO
          </Link>
          <span>Admin</span>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <p>{userProfile?.displayName || userProfile?.email || 'Admin'}</p>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Back to Store
          </Link>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-content-shell">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-button"
            aria-label={menuOpen ? 'Close admin menu' : 'Open admin menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
          </button>
          <div>
            <span>Admin Dashboard</span>
            <strong>Manage GINARO operations</strong>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

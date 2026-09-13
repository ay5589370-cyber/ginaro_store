import { Link } from 'react-router-dom'
import AccountLayout from '../components/account/AccountLayout.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAddresses } from '../context/useAddresses.js'
import { useAuth } from '../context/useAuth.js'
import { useDesigns } from '../context/useDesigns.js'
import { useOrders } from '../context/useOrders.js'
import { useWishlist } from '../context/useWishlist.js'

function formatProfileDate(value) {
  if (!value) return ''
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getInitials(nameOrEmail = '') {
  const source = nameOrEmail.trim()
  if (!source) return 'G'

  const words = source.includes('@') ? [source.charAt(0)] : source.split(/\s+/)
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

function Account() {
  const { currentUser, profileError, profileLoading, userProfile } = useAuth()
  const { wishlistCount } = useWishlist()
  const { addresses } = useAddresses()
  const { designCount } = useDesigns()
  const { orders } = useOrders()
  const latestOrder = orders[0]
  const customerName = userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'GINARO customer'
  const email = userProfile?.email || currentUser?.email || ''
  const memberSince = formatProfileDate(userProfile?.createdAt)
  const initials = getInitials(customerName)
  const summaryCards = [
    ...(userProfile?.role === 'admin'
      ? [{ label: 'Admin Dashboard', value: 'Manage Store', to: '/admin' }]
      : []),
    { label: 'Recent Orders', value: `${orders.length} Orders`, to: '/account/orders' },
    { label: 'Wishlist Items', value: `${wishlistCount} Items`, to: '/account/wishlist' },
    { label: 'Saved Designs', value: `${designCount} Designs`, to: '/account/designs' },
    { label: 'Saved Addresses', value: `${addresses.length} Addresses`, to: '/account/addresses' },
  ]

  return (
    <AccountLayout title="My Account" text="Manage your orders, wishlist, saved designs and delivery details.">
      <div className="account-summary-grid">
        {summaryCards.map((card) => (
          <Link className="account-summary-card" key={card.label} to={card.to}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>
      <section className="account-panel">
        {profileLoading ? (
          <LoadingSpinner label="Loading profile" />
        ) : (
          <>
            <div className="profile-photo-row">
              <div className="profile-avatar">
                {userProfile?.photoURL ? <img src={userProfile.photoURL} alt={`${customerName} profile`} /> : <span>{initials}</span>}
              </div>
              <div>
                <h2>Welcome, {customerName}</h2>
                {email && <p>{email}</p>}
                {memberSince && <p>Member since {memberSince}</p>}
              </div>
            </div>
            {profileError && <p className="form-error" aria-live="polite">{profileError}</p>}
          </>
        )}
      </section>
      <section className="account-panel">
        <h2>Recent Activity</h2>
        <p>
          {latestOrder
            ? `Your latest order is ${latestOrder.orderStatus}.`
            : 'Your recent orders will appear here after checkout.'}
          {' '}Your saved vest designs are ready whenever you want to customize or reorder.
        </p>
        <Link className="button button-primary" to="/shop">
          Continue Shopping
        </Link>
      </section>
    </AccountLayout>
  )
}

export default Account

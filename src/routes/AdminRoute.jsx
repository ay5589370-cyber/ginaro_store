import { Navigate, useLocation } from 'react-router-dom'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAuth } from '../context/useAuth.js'

function AdminRoute({ children }) {
  const location = useLocation()
  const { authLoading, isLoggedIn, profileLoading, userProfile } = useAuth()

  if (authLoading || (isLoggedIn && profileLoading)) {
    return (
      <main className="section-shell page-loading">
        <LoadingSpinner label="Checking admin access" />
      </main>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (userProfile?.role !== 'admin') {
    return (
      <main className="section-shell page-loading">
        <ErrorState
          title="Access denied."
          message="This area is available only to GINARO admins."
          actionLabel="Back to Store"
          onAction={() => window.location.assign('/')}
        />
      </main>
    )
  }

  return children
}

export default AdminRoute

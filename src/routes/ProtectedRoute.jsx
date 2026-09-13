import { Navigate, useLocation } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAuth } from '../context/useAuth.js'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const { authLoading, isLoggedIn, profileLoading } = useAuth()

  if (authLoading || (isLoggedIn && profileLoading)) {
    return (
      <main className="section-shell page-loading">
        <LoadingSpinner label="Checking account" />
      </main>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute

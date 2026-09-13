import { useLocation } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary.jsx'

function RouteErrorBoundary({ children }) {
  const location = useLocation()

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      {children}
    </ErrorBoundary>
  )
}

export default RouteErrorBoundary

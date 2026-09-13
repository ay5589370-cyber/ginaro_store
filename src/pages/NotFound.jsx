import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

function NotFound() {
  return (
    <div className="page not-found-page">
      <Navbar />
      <main className="not-found-section section-shell">
        <span className="eyebrow">GINARO</span>
        <h1>Page Not Found</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <div className="not-found-actions">
          <Link className="button button-primary" to="/">
            Go Home
          </Link>
          <Link className="button button-secondary" to="/shop">
            Shop Products
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound

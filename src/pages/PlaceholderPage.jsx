import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

function PlaceholderPage({ title, text }) {
  return (
    <div className="page placeholder-page">
      <Navbar />
      <main>
        <section className="placeholder-section section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>{title}</span>
          </div>
          <span className="eyebrow">GINARO care</span>
          <h1>{title}</h1>
          <p>{text}</p>
          <div className="placeholder-actions">
            <Link className="button button-primary" to="/shop">
              Shop Products
            </Link>
            <Link className="button button-secondary" to="/">
              Go Home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default PlaceholderPage

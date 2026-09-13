import { Link } from 'react-router-dom'
import Footer from '../Footer.jsx'
import Navbar from '../Navbar.jsx'

function AuthLayout({ eyebrow, title, text, children }) {
  return (
    <div className="page auth-page">
      <Navbar />
      <main className="auth-shell section-shell">
        <section className="auth-brand-panel">
          <Link className="auth-logo" to="/">
            <img src="/assets/logo.png" alt="GINARO official logo" />
            <span>GINARO</span>
          </Link>
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{text}</p>
          </div>
          <div className="auth-visual">
            <img src="/assets/item1.png" alt="Premium GINARO clothing preview" />
          </div>
        </section>

        <section className="auth-form-panel">{children}</section>
      </main>
      <Footer />
    </div>
  )
}

export default AuthLayout

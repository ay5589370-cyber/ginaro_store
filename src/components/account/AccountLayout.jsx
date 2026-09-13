import { Link } from 'react-router-dom'
import Footer from '../Footer.jsx'
import Navbar from '../Navbar.jsx'
import AccountNavigation from './AccountNavigation.jsx'

function AccountLayout({ eyebrow = 'Customer account', title, text, children }) {
  return (
    <div className="page account-page">
      <Navbar />
      <main>
        <section className="account-header section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Account</span>
          </div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {text && <p>{text}</p>}
        </section>

        <section className="account-layout section-shell">
          <AccountNavigation />
          <div className="account-content">{children}</div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default AccountLayout

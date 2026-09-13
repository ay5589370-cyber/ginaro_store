import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'

function CheckoutPlaceholder() {
  return (
    <div className="page checkout-page">
      <Navbar />
      <main className="not-found-section section-shell">
        <span className="eyebrow">Checkout coming soon</span>
        <h1>Checkout will be available in the next phase.</h1>
        <p>
          Your selected product has been added to the cart. Payment and checkout
          flow will be connected later.
        </p>
        <Link className="button button-primary" to="/shop">
          Continue Shopping
        </Link>
      </main>
      <Footer />
    </div>
  )
}

export default CheckoutPlaceholder

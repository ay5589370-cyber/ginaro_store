import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

function EmptyCart() {
  return (
    <section className="empty-cart section-shell">
      <span className="empty-cart-icon">
        <Icon name="cart" size={30} />
      </span>
      <h1>Your cart is empty.</h1>
      <p>Looks like you haven't added anything yet.</p>
      <Link className="button button-primary" to="/shop">
        Start Shopping
      </Link>
    </section>
  )
}

export default EmptyCart

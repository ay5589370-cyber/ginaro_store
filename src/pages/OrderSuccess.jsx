import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/useAuth.js'
import { useOrders } from '../context/useOrders.js'
import { formatPrice } from '../utils/formatters.js'
import { formatOrderAddress, getOrderStatusLabel, getPaymentMethodLabel } from '../utils/orderDisplay.js'

function OrderSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')
  const { authLoading, isLoggedIn } = useAuth()
  const { loadOrder } = useOrders()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => {
      if (!orderId) {
        setLoading(false)
        setError('Order ID is missing.')
        return
      }

      if (authLoading) return

      if (!isLoggedIn) {
        setLoading(false)
        setError('Please log in to view this order.')
        return
      }

      setLoading(true)
      setError('')
      loadOrder(orderId)
        .then((result) => {
          if (!isMounted) return

          if (!result.order) {
            setError(result.message || 'Order not found.')
            setOrder(null)
            return
          }

          setOrder(result.order)
        })
        .catch(() => {
          if (isMounted) setError('Unable to load this order.')
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [authLoading, isLoggedIn, loadOrder, orderId])

  return (
    <div className="page checkout-page">
      <Navbar />
      <main>
        <section className="checkout-page-header section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/cart">Cart</Link>
            <span>/</span>
            <span>Order Success</span>
          </div>
          <h1>Order Placed</h1>
          <p>Your order has been saved. Please keep the payment ready for delivery.</p>
        </section>

        {loading ? (
          <section className="section-shell">
            <LoadingSpinner label="Loading order" />
          </section>
        ) : error ? (
          <div className="section-shell">
            <ErrorState
              title="Unable to load order."
              message={error}
              actionLabel="View Orders"
              onAction={() => navigate('/account/orders')}
            />
          </div>
        ) : (
          <section className="order-success-card section-shell">
            <div className="order-success-kicker">Order Ready for Confirmation</div>
            <div className="order-success-grid">
              <div>
                <span>Order ID</span>
                <strong>{order.id}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>{getPaymentMethodLabel(order.paymentMethod)}</strong>
              </div>
              <div>
                <span>Order Status</span>
                <strong>{getOrderStatusLabel(order.orderStatus)}</strong>
              </div>
            </div>

            <div className="order-success-address">
              <span>Delivery Address</span>
              <p>{formatOrderAddress(order.shippingAddress)}</p>
            </div>

            <div className="order-success-actions">
              <Link className="button button-primary" to="/shop">
                Continue Shopping
              </Link>
              <Link className="button button-secondary" to="/account/orders">
                View Orders
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default OrderSuccess

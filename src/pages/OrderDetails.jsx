import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AccountLayout from '../components/account/AccountLayout.jsx'
import OrderTimeline from '../components/account/OrderTimeline.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductImage from '../components/ProductImage.jsx'
import { useAuth } from '../context/useAuth.js'
import { useOrders } from '../context/useOrders.js'
import { useProducts } from '../context/useProducts.js'
import { useToast } from '../context/useToast.js'
import { formatPrice } from '../utils/formatters.js'
import {
  formatOrderAddress,
  getOrderStatusLabel,
  getOrderTimelineStage,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '../utils/orderDisplay.js'

const cancellableStatuses = new Set(['pending', 'confirmed'])

function OrderDetails() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { authLoading, isLoggedIn } = useAuth()
  const { cancelOrder, loadOrder, pendingOrderId } = useOrders()
  const { refreshProducts } = useProducts()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => {
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

  const handleCancelOrder = async () => {
    const result = await cancelOrder(order.id)
    showToast(result.message, result.status === 'error' ? 'error' : 'success')

    if (result.order) {
      setOrder((current) => ({ ...current, ...result.order }))
      refreshProducts()
    }
  }

  if (loading) {
    return (
      <AccountLayout title="Loading Order" text="Loading your order details.">
        <LoadingSpinner label="Loading order" />
      </AccountLayout>
    )
  }

  if (error || !order) {
    return (
      <AccountLayout title="Order Not Found" text="This order could not be found.">
        <ErrorState
          title="Order not found."
          message={error || 'Please check your order history and try again.'}
          actionLabel="Back to Orders"
          onAction={() => navigate('/account/orders')}
        />
      </AccountLayout>
    )
  }

  const canCancel = cancellableStatuses.has(order.orderStatus)

  return (
    <AccountLayout title={order.id} text={`Order placed on ${order.date || 'recently'}.`}>
      <section className="account-panel order-details-panel">
        <div className="order-detail-head">
          <h2>Order Status</h2>
          <span>{getOrderStatusLabel(order.orderStatus)}</span>
        </div>
        <OrderTimeline currentStage={getOrderTimelineStage(order.orderStatus)} />
        {canCancel && (
          <button
            type="button"
            className="button button-secondary"
            disabled={pendingOrderId === order.id}
            onClick={handleCancelOrder}
          >
            {pendingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </section>

      <section className="account-panel">
        <h2>Products</h2>
        <div className="order-product-list">
          {order.items.map((product) => (
            <article key={`${product.productId}-${product.size}-${product.color}-${product.name}`}>
              <ProductImage src={product.image} alt={product.name} />
              <div>
                <h3>{product.name}</h3>
                {product.type === 'custom' && <span>Customized Product</span>}
                <p>
                  Qty {product.quantity} / Size {product.size} / Color {product.color}
                </p>
                {product.designId && <p>Design ID: {product.designId}</p>}
              </div>
              <strong>{formatPrice(product.price)}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="account-panel order-meta-grid">
        <div>
          <h2>Delivery Address</h2>
          <p>{formatOrderAddress(order.shippingAddress)}</p>
        </div>
        <div>
          <h2>Payment Summary</h2>
          <p>Method: {getPaymentMethodLabel(order.paymentMethod)}</p>
          <p>Payment: {getPaymentStatusLabel(order.paymentStatus)}</p>
          <p>Subtotal: {formatPrice(order.subtotal)}</p>
          <p>Shipping: {order.shippingFee === 0 ? 'FREE' : formatPrice(order.shippingFee)}</p>
          <p>Discount: {order.discount > 0 ? `-${formatPrice(order.discount)}` : formatPrice(0)}</p>
          <strong>Total: {formatPrice(order.total)}</strong>
        </div>
      </section>
    </AccountLayout>
  )
}

export default OrderDetails

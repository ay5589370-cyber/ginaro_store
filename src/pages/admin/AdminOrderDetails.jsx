import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ProductImage from '../../components/ProductImage.jsx'
import { useProducts } from '../../context/useProducts.js'
import { useToast } from '../../context/useToast.js'
import {
  ADMIN_ORDER_STATUSES,
  getAdminErrorMessage,
  getAdminOrderById,
  updateAdminOrderStatus,
} from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatters.js'
import {
  formatOrderAddress,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '../../utils/orderDisplay.js'

const statusTransitions = {
  pending: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['confirmed', 'processing', 'cancelled'],
  processing: ['processing', 'shipped'],
  shipped: ['shipped', 'delivered'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
}

function AdminOrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshProducts } = useProducts()
  const { showToast } = useToast()
  const [order, setOrder] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminOrderById(id)
      .then((result) => {
        if (!isMounted) return
        if (!result) {
          setError('Order not found.')
          return
        }
        setOrder(result)
        setSelectedStatus(result.orderStatus)
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, 'Unable to load order.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const allowedStatuses = useMemo(() => {
    if (!order) return ADMIN_ORDER_STATUSES
    return statusTransitions[order.orderStatus] || [order.orderStatus]
  }, [order])

  const handleUpdateStatus = async () => {
    if (!order || selectedStatus === order.orderStatus) return
    setSaving(true)
    setError('')

    try {
      const updatedOrder = await updateAdminOrderStatus(order.id, selectedStatus)
      setOrder(updatedOrder)
      setSelectedStatus(updatedOrder.orderStatus)
      await refreshProducts()
      showToast('Order status updated')
    } catch (error) {
      const message = getAdminErrorMessage(error, 'Unable to update order status.')
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading order" />

  if (error === 'Order not found.' || !order) {
    return (
      <ErrorState
        title="Order not found."
        message="Check the order list and try again."
        actionLabel="Back to Orders"
        onAction={() => navigate('/admin/orders')}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Order Details</span>
          <h1>{order.id}</h1>
        </div>
        <Link className="button button-secondary" to="/admin/orders">
          Back to Orders
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span>Customer</span>
              <h2>{order.userEmail || 'Customer'}</h2>
            </div>
            <span className={`admin-status is-${order.orderStatus}`}>{getOrderStatusLabel(order.orderStatus)}</span>
          </div>
          <p>Order date: {order.date || 'Recent'}</p>
          <p>Payment method: {getPaymentMethodLabel(order.paymentMethod)}</p>
          <p>Payment status: {getPaymentStatusLabel(order.paymentStatus)}</p>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span>Fulfillment</span>
              <h2>Update Status</h2>
            </div>
          </div>
          <div className="admin-status-control">
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              {allowedStatuses.map((status) => (
                <option key={status} value={status}>
                  {getOrderStatusLabel(status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button-primary"
              disabled={saving || selectedStatus === order.orderStatus}
              onClick={handleUpdateStatus}
            >
              {saving ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </article>
      </section>

      <section className="admin-panel">
        <h2>Items</h2>
        <div className="admin-order-item-list">
          {order.items.map((item, index) => (
            <article key={`${item.productId}-${item.designId || index}`}>
              <ProductImage src={item.image} alt={item.name} />
              <div>
                <h3>{item.name}</h3>
                <p>
                  Qty {item.quantity} / Size {item.size || 'N/A'} / Color {item.color || 'N/A'}
                </p>
                {item.type === 'custom' && <p>Custom design item</p>}
                {item.designId && <p>Design ID: {item.designId}</p>}
              </div>
              <strong>{formatPrice(item.price)}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Shipping Address</h2>
          <p>{formatOrderAddress(order.shippingAddress)}</p>
        </article>
        <article className="admin-panel">
          <h2>Payment Summary</h2>
          <p>Subtotal: {formatPrice(order.subtotal)}</p>
          <p>Shipping: {order.shippingFee === 0 ? 'FREE' : formatPrice(order.shippingFee)}</p>
          <p>Discount: {order.discount > 0 ? `-${formatPrice(order.discount)}` : formatPrice(0)}</p>
          <strong>Total: {formatPrice(order.total)}</strong>
        </article>
      </section>
    </div>
  )
}

export default AdminOrderDetails

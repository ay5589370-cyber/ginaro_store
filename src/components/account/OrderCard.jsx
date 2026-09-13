import { Link } from 'react-router-dom'
import ProductImage from '../ProductImage.jsx'
import { formatPrice } from '../../utils/formatters.js'
import { getOrderStatusLabel, getPaymentStatusLabel } from '../../utils/orderDisplay.js'

function OrderCard({ order }) {
  const firstItem = order.items?.[0] || order.products?.[0] || {}

  return (
    <article className="order-card">
      <div className="order-card-head">
        <div>
          <span>Order ID</span>
          <strong>{order.id}</strong>
        </div>
        <em>{getOrderStatusLabel(order.orderStatus || order.status)}</em>
      </div>
      <div className="order-card-body">
        <ProductImage src={firstItem.image} alt={`${firstItem.name || 'Order'} preview`} />
        <div>
          <h2>{firstItem.name || 'Order items'}</h2>
          <p>
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} / {order.date || 'recently'}
          </p>
          <p>Payment: {getPaymentStatusLabel(order.paymentStatus)}</p>
          <strong>{formatPrice(order.total)}</strong>
        </div>
      </div>
      <Link className="button button-secondary" to={`/account/orders/${order.id}`}>
        View Details
      </Link>
    </article>
  )
}

export default OrderCard

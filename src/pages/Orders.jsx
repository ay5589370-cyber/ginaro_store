import { Link } from 'react-router-dom'
import AccountLayout from '../components/account/AccountLayout.jsx'
import OrderCard from '../components/account/OrderCard.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useOrders } from '../context/useOrders.js'

function Orders() {
  const { orders, ordersLoading, ordersError, refreshOrders } = useOrders()

  return (
    <AccountLayout title="Orders" text="Track current orders and review past purchases.">
      {ordersLoading ? (
        <LoadingSpinner label="Loading orders" />
      ) : ordersError ? (
        <ErrorState
          title="Unable to load your orders."
          message="Please try again in a moment."
          actionLabel="Try Again"
          onAction={refreshOrders}
        />
      ) : orders.length === 0 ? (
        <section className="account-empty-state">
          <h2>No orders yet.</h2>
          <p>Your order history will appear here after checkout.</p>
          <Link className="button button-primary" to="/shop">
            Go to Shop
          </Link>
        </section>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </AccountLayout>
  )
}

export default Orders

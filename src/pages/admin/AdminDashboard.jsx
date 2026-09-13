import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import {
  getAdminErrorMessage,
  getAdminOrders,
  getAdminProducts,
  getAdminUsers,
} from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatters.js'
import { getOrderStatusLabel } from '../../utils/orderDisplay.js'

function AdminDashboard() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [productRows, orderRows, userRows] = await Promise.all([
        getAdminProducts(),
        getAdminOrders(),
        getAdminUsers(),
      ])

      setProducts(productRows)
      setOrders(orderRows)
      setUsers(userRows)
    } catch (error) {
      setError(getAdminErrorMessage(error, 'Unable to load dashboard.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    Promise.all([getAdminProducts(), getAdminOrders(), getAdminUsers()])
      .then(([productRows, orderRows, userRows]) => {
        if (!isMounted) return
        setProducts(productRows)
        setOrders(orderRows)
        setUsers(userRows)
        setError('')
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, 'Unable to load dashboard.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const ordersByStatus = orders.reduce((totals, order) => {
      totals[order.orderStatus] = (totals[order.orderStatus] || 0) + 1
      return totals
    }, {})

    return [
      { label: 'Total Products', value: products.length },
      { label: 'Active Products', value: products.filter((product) => product.active).length },
      { label: 'Out of Stock Products', value: products.filter((product) => product.stock <= 0).length },
      { label: 'Total Orders', value: orders.length },
      { label: 'Pending Orders', value: ordersByStatus.pending || 0 },
      { label: 'Confirmed Orders', value: ordersByStatus.confirmed || 0 },
      { label: 'Delivered Orders', value: ordersByStatus.delivered || 0 },
      { label: 'Total Customers', value: users.length },
    ]
  }, [orders, products, users])

  if (loading) return <LoadingSpinner label="Loading dashboard" />

  if (error) {
    return (
      <ErrorState
        title="Unable to load dashboard."
        message={error}
        actionLabel="Try Again"
        onAction={loadDashboard}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Overview</span>
          <h1>Dashboard</h1>
        </div>
      </div>

      <section className="admin-stat-grid">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <span>Latest activity</span>
            <h2>Recent Orders</h2>
          </div>
          <Link className="button button-secondary" to="/admin/orders">
            View All Orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="admin-empty-text">No orders found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => (
                  <tr key={order.id}>
                    <td><Link to={`/admin/orders/${order.id}`}>{order.id}</Link></td>
                    <td>{order.userEmail || 'Customer'}</td>
                    <td>{order.date || 'Recent'}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td><span className={`admin-status is-${order.orderStatus}`}>{getOrderStatusLabel(order.orderStatus)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminDashboard

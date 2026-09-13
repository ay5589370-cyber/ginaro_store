import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import {
  ADMIN_ORDER_STATUSES,
  getAdminErrorMessage,
  getAdminOrders,
} from '../../services/adminService.js'
import { formatPrice } from '../../utils/formatters.js'
import {
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '../../utils/orderDisplay.js'

const filters = ['all', ...ADMIN_ORDER_STATUSES]

function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    setError('')

    try {
      setOrders(await getAdminOrders())
    } catch (error) {
      setError(getAdminErrorMessage(error, 'Unable to load orders.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    getAdminOrders()
      .then((rows) => {
        if (isMounted) setOrders(rows)
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, 'Unable to load orders.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.orderStatus === statusFilter
      const matchesSearch = !query
        || order.id.toLowerCase().includes(query)
        || order.userEmail.toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  }, [orders, searchTerm, statusFilter])

  if (loading) return <LoadingSpinner label="Loading orders" />

  if (error) {
    return (
      <ErrorState
        title="Unable to load orders."
        message={error}
        actionLabel="Try Again"
        onAction={loadOrders}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Fulfillment</span>
          <h1>Orders</h1>
        </div>
      </div>

      <div className="admin-toolbar">
        <label>
          <span>Search orders</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by order ID or email"
          />
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {filters.map((filter) => (
              <option key={filter} value={filter}>
                {filter === 'all' ? 'All' : getOrderStatusLabel(filter)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="admin-empty-text">No orders found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Payment Status</th>
                <th>Order Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.userEmail || 'Customer'}</td>
                  <td>{order.itemCount}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>{getPaymentMethodLabel(order.paymentMethod)}</td>
                  <td>{getPaymentStatusLabel(order.paymentStatus)}</td>
                  <td><span className={`admin-status is-${order.orderStatus}`}>{getOrderStatusLabel(order.orderStatus)}</span></td>
                  <td>{order.date || 'Recent'}</td>
                  <td>
                    <Link className="button button-secondary" to={`/admin/orders/${order.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminOrders

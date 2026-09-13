import { useEffect, useState } from 'react'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { getAdminErrorMessage, getAdminUsers } from '../../services/adminService.js'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      setUsers(await getAdminUsers())
    } catch (error) {
      setError(getAdminErrorMessage(error, 'Unable to load customers.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    getAdminUsers()
      .then((rows) => {
        if (isMounted) setUsers(rows)
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, 'Unable to load customers.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) return <LoadingSpinner label="Loading customers" />

  if (error) {
    return (
      <ErrorState
        title="Unable to load customers."
        message={error}
        actionLabel="Try Again"
        onAction={loadUsers}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Customers</span>
          <h1>Users</h1>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="admin-empty-text">No customers found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName || 'GINARO customer'}</td>
                  <td>{user.email || 'Not provided'}</td>
                  <td>{user.phone || 'Not provided'}</td>
                  <td>{user.role}</td>
                  <td>{user.createdAt ? user.createdAt.slice(0, 10) : 'Recent'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminUsers

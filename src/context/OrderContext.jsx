import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelOrder as cancelOrderDocument,
  createOrder as createOrderDocument,
  getOrderById,
  getOrderErrorMessage,
  getUserOrders,
} from '../services/orderService.js'
import { useAuth } from './useAuth.js'
import { OrderContext } from './orderContextValue.js'

export function OrderProvider({ children }) {
  const { currentUser, authLoading } = useAuth()
  const uid = currentUser?.uid
  const userEmail = currentUser?.email || ''
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [pendingOrderId, setPendingOrderId] = useState('')
  const requestIdRef = useRef(0)

  const refreshOrders = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!uid) {
      setOrders([])
      setOrdersLoading(false)
      setOrdersError('')
      return []
    }

    setOrdersLoading(true)
    setOrdersError('')

    try {
      const nextOrders = await getUserOrders(uid)

      if (requestIdRef.current !== requestId) return nextOrders

      setOrders(nextOrders)
      return nextOrders
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setOrders([])
        setOrdersError(getOrderErrorMessage(error, 'Unable to load your orders.'))
      }

      return []
    } finally {
      if (requestIdRef.current === requestId) {
        setOrdersLoading(false)
      }
    }
  }, [uid])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authLoading) return
      refreshOrders()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authLoading, refreshOrders])

  const createOrder = useCallback(async (orderData) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to place your order.' }
    }

    setPendingOrderId('new')

    try {
      const order = await createOrderDocument(uid, {
        ...orderData,
        userEmail: userEmail || orderData.userEmail || '',
      })
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)])
      setOrdersError('')

      return { status: 'created', message: 'Order placed successfully.', order }
    } catch (error) {
      const message = getOrderErrorMessage(error)
      setOrdersError(message)

      return { status: 'error', message, validationErrors: error.validationErrors || {} }
    } finally {
      setPendingOrderId('')
    }
  }, [uid, userEmail])

  const loadOrder = useCallback(async (orderId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to view this order.', order: null }
    }

    try {
      const cachedOrder = orders.find((order) => order.id === orderId)
      const order = cachedOrder || await getOrderById(uid, orderId)

      return order
        ? { status: 'loaded', order }
        : { status: 'not-found', message: 'Order not found.', order: null }
    } catch (error) {
      return { status: 'error', message: getOrderErrorMessage(error, 'Unable to load this order.'), order: null }
    }
  }, [orders, uid])

  const cancelOrder = useCallback(async (orderId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to cancel this order.' }
    }

    setPendingOrderId(String(orderId))

    try {
      const cancelledOrder = await cancelOrderDocument(uid, orderId)
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, ...cancelledOrder } : order)),
      )
      setOrdersError('')

      return { status: 'cancelled', message: 'Order cancelled.', order: cancelledOrder }
    } catch (error) {
      const message = getOrderErrorMessage(error, 'Unable to cancel this order.')
      setOrdersError(message)

      return { status: 'error', message }
    } finally {
      setPendingOrderId('')
    }
  }, [uid])

  const value = useMemo(
    () => ({
      orders,
      ordersLoading,
      ordersError,
      pendingOrderId,
      refreshOrders,
      createOrder,
      loadOrder,
      cancelOrder,
    }),
    [
      cancelOrder,
      createOrder,
      loadOrder,
      orders,
      ordersError,
      ordersLoading,
      pendingOrderId,
      refreshOrders,
    ],
  )

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

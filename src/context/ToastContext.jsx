import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './toastContextValue.js'

function createToast(message, type = 'success') {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    type,
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    const toast = createToast(message, type)
    setToasts((current) => [...current.slice(-2), toast])
    window.setTimeout(() => removeToast(toast.id), 2600)
  }, [removeToast])

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
    }),
    [removeToast, showToast, toasts],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

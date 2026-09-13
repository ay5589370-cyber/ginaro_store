import { useToast } from '../context/useToast.js'

function ToastViewport() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="toast-viewport" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type === 'error' ? 'is-error' : ''}`} key={toast.id}>
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => removeToast(toast.id)}>
            Close
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastViewport

function LoadingSpinner({ label = 'Loading' }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <span />
      <strong>{label}</strong>
    </div>
  )
}

export default LoadingSpinner

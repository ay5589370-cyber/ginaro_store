function ErrorState({ title = 'Something went wrong', message, actionLabel, onAction }) {
  return (
    <section className="error-state">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className="button button-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  )
}

export default ErrorState

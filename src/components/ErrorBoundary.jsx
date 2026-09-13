import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error) {
    console.error('GINARO app error boundary caught an error', {
      name: error?.name,
      message: error?.message,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary" role="alert">
          <div>
            <span className="eyebrow">Something went wrong</span>
            <h1>We couldn't load this part of GINARO.</h1>
            <p>Please refresh the page or return to the shop.</p>
            <div className="error-actions">
              <a className="button button-primary" href="/shop">Shop</a>
              <a className="button button-secondary" href="/">Back Home</a>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary


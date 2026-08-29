import { Component } from 'react'

/**
 * Last-resort guard around the whole app. Without this, any uncaught error
 * during render (or during a top-level module's initialization, such as a
 * misconfigured third-party client) leaves `#root` empty with nothing but a
 * console error — see supabaseClient.js for the concrete case this guards
 * against.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('TidyLine crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-crash-screen">
          <h1>Something went wrong.</h1>
          <p>TidyLine hit an unexpected error and couldn&apos;t continue.</p>
          <p>
            Your tasks are safe in this browser&apos;s local storage. Reloading the page usually
            resolves it.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      )
    }

    return this.props.children
  }
}

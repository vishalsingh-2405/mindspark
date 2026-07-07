import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ margin: 16, textAlign: 'center' }}>
          <h2>Something glitched</h2>
          <p style={{ color: 'var(--muted)' }}>{this.state.error.message}</p>
          <button type="button" className="neon-btn neon-btn--cyan" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          {/* Nav is hidden on /play — a deterministic crash needs an escape besides "Try again".
              Plain anchor: a full reload is fine (arguably desirable) after a crash. */}
          <a className="neon-btn neon-btn--lime" href="/" style={{ marginLeft: 10, display: 'inline-block' }}>
            Home
          </a>
        </div>
      )
    }
    return this.props.children
  }
}

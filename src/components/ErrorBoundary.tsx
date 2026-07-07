import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
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
        </div>
      )
    }
    return this.props.children
  }
}

import { Component } from 'react';

/**
 * Error Boundary — wraps each major feature module.
 * A crash in one feature (globe, map, AI) never blanks the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary: ${this.props.name || 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center p-8 rounded-card bg-surface m-4">
            <div className="text-center">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="font-display text-lg text-accent-ochre mb-2">
                {this.props.name || 'Module'} hit a snag
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                This part of the map is temporarily unavailable.
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-accent-trail text-bg-base rounded-card text-sm font-medium
                  hover:opacity-90 transition-opacity duration-200"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

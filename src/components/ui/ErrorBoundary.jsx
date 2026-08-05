import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.name || 'Component'}] Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center h-full bg-bg-base">
          <div className="glass rounded-card p-6 max-w-sm text-center">
            <div className="text-2xl mb-2">⚠</div>
            <h3 className="font-display text-lg font-bold text-white mb-1">
              {this.props.name || 'Component'} Error
            </h3>
            <p className="text-text-secondary text-sm font-body">
              Something went wrong. Try refreshing the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-accent-sky/20 text-accent-sky rounded-card text-sm
                font-body hover:bg-accent-sky/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

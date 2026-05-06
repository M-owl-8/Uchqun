import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this._reset = this._reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined' && window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }
  }

  _reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (fallback) return fallback;
      return (
        <div role="alert" className="flex flex-col items-center justify-center p-8 text-center gap-4">
          <p className="text-lg font-semibold text-gray-800">Something went wrong</p>
          <p className="text-sm text-gray-500">Please try again or refresh the page.</p>
          <button
            type="button"
            onClick={this._reset}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

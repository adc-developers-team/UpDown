import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-chat-bg text-primary flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <div className="bg-bg-input p-4 rounded-lg max-w-lg w-full mb-4 overflow-auto">
            <p className="text-red-400 font-mono text-sm break-all">
              {this.state.error?.message || 'Unknown error'}
            </p>
            {this.state.error?.stack && (
              <pre className="text-xs text-text-secondary mt-2 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary px-6 py-2 rounded-full font-medium"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';
import { RefreshIcon } from '../../ui/Icons';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Captured unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen theme-bg-main flex items-center justify-center p-6 theme-text-primary">
          <div className="max-w-md w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-xs theme-text-secondary">
                An unexpected error occurred in the application view.
              </p>
            </div>

            {this.state.error && (
              <div className="theme-bg-sub p-3 rounded-xl text-left text-xs font-mono overflow-x-auto max-h-32 theme-border border text-rose-400">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold rounded-xl border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

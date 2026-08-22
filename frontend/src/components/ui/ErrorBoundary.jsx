import React from 'react';
import { RefreshIcon, CheckIcon } from './Icons';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isCopied: false };
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
    this.setState({ hasError: false, error: null, errorInfo: null, isCopied: false });
  };

  handleCopyError = () => {
    const cleanErrorMsg = this.state.error?.message || this.state.error?.toString() || 'Unknown Error';

    navigator.clipboard.writeText(cleanErrorMsg).then(() => {
      this.setState({ isCopied: true });
      setTimeout(() => this.setState({ isCopied: false }), 2500);
    }).catch((err) => {
      console.error('Failed to copy error to clipboard:', err);
    });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || this.state.error?.toString() || 'Unknown error occurred';

      return (
        <div className="min-h-screen theme-bg-main flex items-center justify-center p-6 theme-text-primary select-none">
          <div className="max-w-md w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto text-2xl font-bold border theme-border">
              !
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold theme-text-primary">Something went wrong</h2>
              <p className="text-xs theme-text-secondary">
                An unexpected error occurred in the application view.
              </p>
            </div>

            {this.state.error && (
              <div className="relative group text-left">
                <div 
                  onClick={this.handleCopyError}
                  className="theme-bg-sub p-3 pr-20 rounded-xl text-left text-xs font-mono overflow-x-auto max-h-36 theme-border border theme-accent cursor-pointer hover:opacity-90 transition-opacity select-text"
                  title="Click to copy clean error message"
                >
                  {errorMessage}
                </div>

                {/* 1-Click Copy Button */}
                <button
                  type="button"
                  onClick={this.handleCopyError}
                  className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                    this.state.isCopied
                      ? 'theme-bg-accent theme-accent-text'
                      : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                  }`}
                  title="Copy error message to clipboard"
                >
                  {this.state.isCopied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
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
                <span>Reload Application</span>
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

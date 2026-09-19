import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';

export interface FeatureGuardProps {
  sectionKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FeatureGuard] Caught render / lazy-load error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full max-w-lg mx-auto p-6 my-8 rounded-2xl theme-bg-surface border theme-border shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full theme-bg-accent-soft mx-auto flex items-center justify-center text-amber-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold theme-text-primary">Failed to load module</h3>
            <p className="text-xs theme-text-secondary">
              A temporary network or cache update prevented this section from loading.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow cursor-pointer"
          >
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  sectionKey,
  children,
  fallback = null,
}) => {
  const { isSectionEnabled, loading } = useFeatureControl();
  if (loading) return null;
  return (
    <FeatureErrorBoundary fallback={fallback}>
      {isSectionEnabled(sectionKey) ? children : fallback}
    </FeatureErrorBoundary>
  );
};

export default FeatureGuard;


import React, { ReactNode } from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';
import ErrorBoundary from '../ui/ErrorBoundary';
import AccessDeniedView from './AccessDeniedView';

export interface FeatureGuardProps {
  sectionKey: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

/**
 * FeatureGuard
 * 
 * Enterprise feature toggle wrapper.
 * Checks permissions/sections from FeatureControlContext and wraps enabled
 * components in the project's standard ErrorBoundary.
 * Displays AccessDeniedView when access is restricted and no custom fallback is supplied.
 */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  sectionKey,
  children,
  fallback,
  showAccessDenied = true,
}) => {
  const { isSectionEnabled, loading } = useFeatureControl();
  if (loading) return null;

  const isEnabled = Array.isArray(sectionKey)
    ? sectionKey.some((k) => isSectionEnabled(k))
    : isSectionEnabled(sectionKey);

  if (!isEnabled) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    if (showAccessDenied) {
      return <AccessDeniedView sectionKey={sectionKey} />;
    }
    return null;
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

export default FeatureGuard;


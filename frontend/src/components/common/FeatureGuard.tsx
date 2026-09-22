import React, { ReactNode } from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';
import ErrorBoundary from '../ui/ErrorBoundary';

export interface FeatureGuardProps {
  sectionKey: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * FeatureGuard
 * 
 * Enterprise feature toggle wrapper.
 * Checks permissions/sections from FeatureControlContext and wraps enabled
 * components in the project's standard ErrorBoundary.
 */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  sectionKey,
  children,
  fallback = null,
}) => {
  const { isSectionEnabled, loading } = useFeatureControl();
  if (loading) return null;

  const isEnabled = Array.isArray(sectionKey)
    ? sectionKey.some((k) => isSectionEnabled(k))
    : isSectionEnabled(sectionKey);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

export default FeatureGuard;


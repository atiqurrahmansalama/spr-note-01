import React, { ReactNode } from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';
import ErrorBoundary from '../ui/ErrorBoundary';
import AccessDeniedView from './AccessDeniedView';

export interface FeatureGuardProps {
  sectionKey: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  matchMode?: 'all' | 'any';
}

/**
 * FeatureGuard
 * 
 * Enterprise feature toggle wrapper.
 * Checks permissions/sections from FeatureControlContext and wraps enabled
 * components in the project's standard ErrorBoundary.
 * Displays AccessDeniedView when access is restricted and no custom fallback is supplied.
 * 
 * matchMode defaults to 'all' so composite permissions (e.g. ['student_roster', 'student_roster_view_profile'])
 * strictly require every prerequisite permission to be active.
 */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  sectionKey,
  children,
  fallback,
  showAccessDenied = true,
  matchMode = 'all',
}) => {
  const { isSectionEnabled, loading } = useFeatureControl();
  if (loading) return null;

  const isEnabled = Array.isArray(sectionKey)
    ? matchMode === 'any'
      ? sectionKey.some((k) => isSectionEnabled(k))
      : sectionKey.every((k) => isSectionEnabled(k))
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


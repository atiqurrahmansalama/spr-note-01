import React from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';

export interface FeatureGuardProps {
  sectionKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  sectionKey,
  children,
  fallback = null,
}) => {
  const { isSectionEnabled, loading } = useFeatureControl();
  if (loading) return null;
  return <>{isSectionEnabled(sectionKey) ? children : fallback}</>;
};

export default FeatureGuard;

import React from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';

export const FeatureGuard = ({ sectionKey, children, fallback = null }) => {
  const { isSectionEnabled, loading } = useFeatureControl();
  if (loading) return null;
  return isSectionEnabled(sectionKey) ? children : fallback;
};

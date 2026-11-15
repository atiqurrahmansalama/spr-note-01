import React from 'react';
import { useCanonicalProgressReports } from '../../../hooks/useCanonicalProgressReports';
import { useProgressAnalyticsEngine } from '../../../../learning/daily-classroom/components/progress-analytics/useProgressAnalyticsEngine';
import { ProgressSessionBreakdown } from '../../../../../components/analytics';

export interface RecitationSessionBreakdownWidgetProps {
  reports?: any[];
  className?: string;
}

/**
 * RecitationSessionBreakdownWidget
 * Standalone dashboard widget for Recitation Session Distribution Breakdown & Volume Gauge.
 * Consumes canonical progress reports (Rule 10: Single Source of Truth).
 * Visualizes prayer session distribution (Fajr, Zuhr, Asr, Maghrib, Isha) with AI insights.
 */
export default function RecitationSessionBreakdownWidget({
  reports: propReports,
  className = '',
}: RecitationSessionBreakdownWidgetProps) {
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;
  const analytics = useProgressAnalyticsEngine(effectiveReports);

  return (
    <div className={`@container w-full h-full flex flex-col justify-start select-none ${className}`}>
      <ProgressSessionBreakdown
        sessionBreakdown={analytics.sessionBreakdown}
        aiInsight={analytics.aiInsight}
      />
    </div>
  );
}

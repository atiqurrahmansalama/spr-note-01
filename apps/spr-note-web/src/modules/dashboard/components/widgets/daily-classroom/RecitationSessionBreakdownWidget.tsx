import React from 'react';
import { useCanonicalProgressReports } from '../../../hooks/useCanonicalProgressReports';
import { useRecent7DaysRange } from '../../../hooks/useRecent7DaysRange';
import { useProgressAnalyticsEngine } from '../../../../learning/daily-classroom/components/progress-analytics/useProgressAnalyticsEngine';
import { ProgressSessionBreakdown } from '../../../../learning/daily-classroom/components/progress-analytics';

export interface RecitationSessionBreakdownWidgetProps {
  reports?: any[];
  className?: string;
}

/**
 * RecitationSessionBreakdownWidget
 * Standalone dashboard widget for Recitation Session Distribution Breakdown & Volume Gauge.
 * Consumes canonical progress reports (Rule 10: Single Source of Truth).
 * By default computes session distribution for the last 7 days of recitation reports,
 * ensuring seamless numerical and dimensional sync with the adjacent widgets.
 */
export default function RecitationSessionBreakdownWidget({
  reports: propReports,
  className = '',
}: RecitationSessionBreakdownWidgetProps) {
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;
  const { startDate, endDate } = useRecent7DaysRange(effectiveReports);
  const analytics = useProgressAnalyticsEngine(effectiveReports, 'combined', startDate, endDate);

  return (
    <div className={`@container w-full h-auto @[640px]:h-full flex flex-col justify-start select-none ${className}`}>
      <ProgressSessionBreakdown
        sessionBreakdown={analytics.sessionBreakdown}
        aiInsight={analytics.aiInsight}
        className="h-auto @[640px]:h-full flex-1"
      />
    </div>
  );
}

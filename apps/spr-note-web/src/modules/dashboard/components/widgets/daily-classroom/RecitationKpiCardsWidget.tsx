import React from 'react';
import { useCanonicalProgressReports } from '../../../hooks/useCanonicalProgressReports';
import { useRecent7DaysRange } from '../../../hooks/useRecent7DaysRange';
import { useProgressAnalyticsEngine } from '../../../../learning/daily-classroom/components/progress-analytics/useProgressAnalyticsEngine';
import ProgressSparklineKPIs from '../../../../learning/daily-classroom/components/progress-analytics/ProgressSparklineKPIs';

export interface RecitationKpiCardsWidgetProps {
  reports?: any[];
  cols?: number;
  className?: string;
}

/**
 * RecitationKpiCardsWidget
 * Standalone dashboard widget for Recitation KPI metric cards.
 * Consumes canonical progress reports (Rule 10: Single Source of Truth).
 * By default computes KPIs for the last 7 days of recitation reports,
 * ensuring seamless numerical sync with the adjacent Recitation Trends Chart.
 */
export default function RecitationKpiCardsWidget({
  reports: propReports,
  cols = 4,
  className = '',
}: RecitationKpiCardsWidgetProps) {
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;
  const { startDate, endDate } = useRecent7DaysRange(effectiveReports);
  const analytics = useProgressAnalyticsEngine(effectiveReports, 'combined', startDate, endDate);

  return (
    <div className={`@container w-full h-full flex flex-col justify-start select-none ${className}`}>
      <ProgressSparklineKPIs
        kpis={analytics.kpis}
        cols={cols}
      />
    </div>
  );
}

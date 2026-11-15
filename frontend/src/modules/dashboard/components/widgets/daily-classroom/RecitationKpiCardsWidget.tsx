import React from 'react';
import { useCanonicalProgressReports } from '../../../hooks/useCanonicalProgressReports';
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
 * Displays total recitations, pages recited, recitation accuracy rate, and stucks.
 */
export default function RecitationKpiCardsWidget({
  reports: propReports,
  cols = 4,
  className = '',
}: RecitationKpiCardsWidgetProps) {
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;
  const analytics = useProgressAnalyticsEngine(effectiveReports);

  return (
    <div className={`@container w-full h-full flex flex-col justify-start select-none ${className}`}>
      <ProgressSparklineKPIs
        kpis={analytics.kpis}
        cols={cols}
      />
    </div>
  );
}

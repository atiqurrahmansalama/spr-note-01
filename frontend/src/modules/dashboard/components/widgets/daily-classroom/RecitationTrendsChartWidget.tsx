import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanonicalProgressReports } from '../../../hooks/useCanonicalProgressReports';
import { useRecent7DaysRange } from '../../../hooks/useRecent7DaysRange';
import { useProgressAnalyticsEngine } from '../../../../learning/daily-classroom/components/progress-analytics/useProgressAnalyticsEngine';
import { ProgressTrendsChart } from '../../../../learning/daily-classroom/components/progress-analytics';
import { DocumentTextIcon } from '../../../../../components/ui/Icons';
import type { MetricType } from '../../../../../components/analytics/types';
import type { ActionMenuItem } from '../../../../../components/ui/ActionMenu';

export interface RecitationTrendsChartWidgetProps {
  reports?: any[];
  defaultMetric?: MetricType;
  className?: string;
}

/**
 * RecitationTrendsChartWidget
 * Standalone dashboard widget for Chronological Daily Recitation Trends Chart.
 * Consumes canonical progress reports (Rule 10: Single Source of Truth).
 * By default displays the last 7 days of recitation trends.
 */
export default function RecitationTrendsChartWidget({
  reports: propReports,
  defaultMetric = 'combined',
  className = '',
}: RecitationTrendsChartWidgetProps) {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<MetricType>(defaultMetric);
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;

  // Shared 7-day chronological window
  const { startDate, endDate } = useRecent7DaysRange(effectiveReports);
  const analytics = useProgressAnalyticsEngine(effectiveReports, activeMetric, startDate, endDate);

  const extraMenuItems: ActionMenuItem[] = useMemo(
    () => [
      {
        id: 'view-progress-reports',
        label: 'View Detailed Reports',
        icon: DocumentTextIcon,
        onClick: () => navigate('/studies/progress-reports/records'),
      },
      {
        divider: true,
      },
    ],
    [navigate]
  );

  return (
    <div className={`@container w-full h-full flex flex-col justify-start select-none ${className}`}>
      <ProgressTrendsChart
        trendPoints={analytics.trendPoints}
        activeMetric={activeMetric}
        onMetricChange={setActiveMetric}
        totalPages={analytics.totalPages}
        totalMistakes={analytics.totalMistakes}
        totalStucks={analytics.totalStucks}
        totalErrors={analytics.totalErrors}
        avgPagesPerDay={analytics.avgPagesPerDay}
        peakDayPages={analytics.peakDayPages}
        accuracyRate={analytics.accuracyRate}
        maxMetricValue={analytics.maxMetricValue}
        totalReports={analytics.totalReports}
        extraMenuItems={extraMenuItems}
        className="h-full flex-1"
      />
    </div>
  );
}

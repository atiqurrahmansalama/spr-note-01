import React, { useState } from 'react';
import { useCanonicalProgressReports } from '../../../hooks/useCanonicalProgressReports';
import { useProgressAnalyticsEngine } from '../../../../learning/daily-classroom/components/progress-analytics/useProgressAnalyticsEngine';
import { ProgressTrendsChart } from '../../../../../components/analytics';
import type { MetricType } from '../../../../../components/analytics/types';

export interface RecitationTrendsChartWidgetProps {
  reports?: any[];
  defaultMetric?: MetricType;
  className?: string;
}

/**
 * RecitationTrendsChartWidget
 * Standalone dashboard widget for Chronological Daily Recitation Trends Chart.
 * Consumes canonical progress reports (Rule 10: Single Source of Truth).
 * Provides interactive metric toggling across Pages, Mistakes, Stucks, and Combined.
 */
export default function RecitationTrendsChartWidget({
  reports: propReports,
  defaultMetric = 'combined',
  className = '',
}: RecitationTrendsChartWidgetProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>(defaultMetric);
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;
  const analytics = useProgressAnalyticsEngine(effectiveReports, activeMetric);

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
      />
    </div>
  );
}

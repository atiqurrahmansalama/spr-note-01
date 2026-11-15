import React, { useState, useMemo } from 'react';
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
 * By default displays the last 7 days of recitation trends.
 */
export default function RecitationTrendsChartWidget({
  reports: propReports,
  defaultMetric = 'combined',
  className = '',
}: RecitationTrendsChartWidgetProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>(defaultMetric);
  const { reports: canonicalReports } = useCanonicalProgressReports();
  const effectiveReports = propReports && propReports.length > 0 ? propReports : canonicalReports;

  // Default to the last 7 days for the dashboard
  const { startDate, endDate } = useMemo(() => {
    let anchorEnd = new Date();

    if (effectiveReports && effectiveReports.length > 0) {
      let maxDateStr = '';
      for (const r of effectiveReports) {
        const d = r.isoDateOnly || r.report_date || r.date || '';
        if (d && String(d).substring(0, 10) > maxDateStr) {
          maxDateStr = String(d).substring(0, 10);
        }
      }
      if (maxDateStr) {
        const [y, m, d] = maxDateStr.split('-').map(Number);
        const maxDate = new Date(y, m - 1, d);
        const diffDays = Math.round((anchorEnd.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          anchorEnd = maxDate;
        }
      }
    }

    const anchorStart = new Date(anchorEnd);
    anchorStart.setDate(anchorEnd.getDate() - 6); // 7 days inclusive

    const formatISO = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      startDate: formatISO(anchorStart),
      endDate: formatISO(anchorEnd),
    };
  }, [effectiveReports]);

  const analytics = useProgressAnalyticsEngine(effectiveReports, activeMetric, startDate, endDate);

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

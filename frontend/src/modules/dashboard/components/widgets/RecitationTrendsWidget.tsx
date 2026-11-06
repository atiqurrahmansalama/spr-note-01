import React, { useState, useEffect } from 'react';
import { ProgressAnalyticsDashboard } from '@/modules/learning/daily-classroom/components/progress-analytics';
import { dailyProgressRepository } from '@/offline';

export interface RecitationTrendsWidgetProps {
  reports?: any[];
  showKpis?: boolean;
  showTrendsChart?: boolean;
  showBreakdown?: boolean;
  visibleKpiIds?: string[];
  kpiCols?: 3 | 4;
  className?: string;
}

/**
 * Enterprise Recitation Trends Analytics Widget
 * Reuses the canonical ProgressAnalyticsDashboard directly from Progress Reports (Single Source of Truth).
 * Configurable via Dashboard Customizer (KPIs, Trends Chart, Session Distribution).
 * Zero duplicated calculation or chart logic.
 */
export default function RecitationTrendsWidget({
  reports: propReports,
  showKpis = true,
  showTrendsChart = true,
  showBreakdown = true,
  visibleKpiIds,
  kpiCols,
  className = '',
}: RecitationTrendsWidgetProps) {
  const [reports, setReports] = useState<any[]>(() => propReports || []);

  useEffect(() => {
    if (propReports && propReports.length > 0) {
      setReports(propReports);
      return;
    }

    let isMounted = true;
    const loadReports = async () => {
      try {
        const stored = await dailyProgressRepository.list();
        if (isMounted && stored && Array.isArray(stored)) {
          setReports(stored);
        }
      } catch {
        // Fallback gracefully to empty array
      }
    };

    loadReports();
    return () => {
      isMounted = false;
    };
  }, [propReports]);

  return (
    <div className={`w-full h-full flex flex-col justify-start overflow-hidden ${className}`}>
      <ProgressAnalyticsDashboard
        reports={reports}
        variant="full"
        collapsible={false}
        showKpis={showKpis}
        showTrendsChart={showTrendsChart}
        showBreakdown={showBreakdown}
        visibleKpiIds={visibleKpiIds}
        kpiCols={kpiCols}
        className="w-full"
      />
    </div>
  );
}

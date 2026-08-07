import { useMemo } from "react";
import { SessionsIcon, GroupsIcon } from "../../../components/ui/Icons";

export default function ReportsAnalytics({ filteredReports, reportsList, reports }) {
  const activeReports = filteredReports || reportsList || reports || [];

  const analyticsData = useMemo(() => {
    const totalReports = activeReports.length;
    const totalMistakes = activeReports.reduce((sum, r) => sum + (r.mistakesCount || 0), 0);
    const totalStucks = activeReports.reduce((sum, r) => sum + (r.stucksCount || 0), 0);
    const totalPages = activeReports.reduce((sum, r) => sum + (r.totalPages || 0), 0);
    const uniqueStudents = new Set(activeReports.map((r) => r.student_name)).size;

    const avgPagesPerReport = totalReports > 0 ? (totalPages / totalReports).toFixed(1) : "0";
    const avgMistakesPerReport = totalReports > 0 ? (totalMistakes / totalReports).toFixed(1) : "0";

    const groupMap = {};
    const sessionMap = {};

    activeReports.forEach((r) => {
      groupMap[r.student_group] = (groupMap[r.student_group] || 0) + 1;
      sessionMap[r.session_name] = (sessionMap[r.session_name] || 0) + 1;
    });

    // Score calculation (Overall accuracy rating based on mistake/page ratio)
    const accuracyScore = totalPages > 0 
      ? Math.max(0, 100 - Math.round((totalMistakes / totalPages) * 15))
      : 100;

    return {
      totalReports,
      totalMistakes,
      totalStucks,
      totalPages,
      uniqueStudents,
      avgPagesPerReport,
      avgMistakesPerReport,
      groupMap,
      sessionMap,
      accuracyScore,
    };
  }, [filteredReports]);

  return (
    <div className="w-full space-y-5 animate-fade-in select-none">
      
      {/* 4 Metric Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Total Reports
          </span>
          <div className="text-2xl font-bold theme-accent font-mono">
            {analyticsData.totalReports}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Saved logs in range
          </span>
        </div>

        <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Active Students
          </span>
          <div className="text-2xl font-bold theme-text-primary font-mono">
            {analyticsData.uniqueStudents}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Active profiles
          </span>
        </div>

        <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
            Total Mistakes
          </span>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {analyticsData.totalMistakes}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Avg {analyticsData.avgMistakesPerReport} / report
          </span>
        </div>

        <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            Total Stucks
          </span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {analyticsData.totalStucks}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Hesitation markers
          </span>
        </div>

      </div>

      {/* Progress & Quality Score Gauge */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold theme-text-primary">Overall Recitation Quality Index</h3>
            <p className="text-[11px] theme-text-secondary">Estimated accuracy score based on pages and mistake frequency</p>
          </div>
          <div className="text-xl font-bold font-mono theme-accent px-3 py-1 rounded-xl theme-bg-sub border theme-border">
            {analyticsData.accuracyScore}%
          </div>
        </div>
        <div className="w-full bg-slate-700/40 h-3 rounded-full overflow-hidden">
          <div
            className="theme-bg-accent h-full rounded-full transition-all duration-500"
            style={{ width: `${analyticsData.accuracyScore}%` }}
          />
        </div>
      </div>

      {/* Detailed Analysis Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Recitation Volume */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-2">
              <SessionsIcon className="w-4 h-4 theme-accent" />
              <span>Volume & Session Frequency</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Total Recited Pages:</span>
              <span className="font-bold font-mono theme-accent text-sm">{analyticsData.totalPages} Pages</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Avg Pages Per Report:</span>
              <span className="font-bold font-mono theme-text-primary">{analyticsData.avgPagesPerReport} Pages</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Mistake to Stuck Ratio:</span>
              <span className="font-bold font-mono theme-text-primary">
                {analyticsData.totalStucks > 0 ? (analyticsData.totalMistakes / analyticsData.totalStucks).toFixed(2) : '1.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Group Distribution */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-2">
              <GroupsIcon className="w-4 h-4 theme-accent" />
              <span>Reports Per Group</span>
            </h3>
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {Object.entries(analyticsData.groupMap).length === 0 ? (
              <p className="text-xs theme-text-secondary italic">No group data available.</p>
            ) : (
              Object.entries(analyticsData.groupMap).map(([group, count]) => {
                const pct = analyticsData.totalReports > 0 ? ((count / analyticsData.totalReports) * 100).toFixed(0) : 0;
                return (
                  <div key={group} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="theme-text-primary">{group}</span>
                      <span className="theme-accent font-mono font-bold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                      <div
                        className="theme-bg-accent h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

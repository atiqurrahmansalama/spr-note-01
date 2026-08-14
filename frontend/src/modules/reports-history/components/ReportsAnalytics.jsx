import { useMemo } from "react";

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
    const avgStucksPerReport = totalReports > 0 ? (totalStucks / totalReports).toFixed(1) : "0";

    const avgMistakesPerPage = totalPages > 0 ? (totalMistakes / totalPages).toFixed(2) : "0.00";
    const avgStucksPerPage = totalPages > 0 ? (totalStucks / totalPages).toFixed(2) : "0.00";

    const pagesPerMistake = totalMistakes > 0 ? (totalPages / totalMistakes).toFixed(1) : totalPages.toFixed(1);
    const pagesPerStuck = totalStucks > 0 ? (totalPages / totalStucks).toFixed(1) : totalPages.toFixed(1);

    return {
      totalReports,
      totalMistakes,
      totalStucks,
      totalPages,
      uniqueStudents,
      avgPagesPerReport,
      avgMistakesPerReport,
      avgStucksPerReport,
      avgMistakesPerPage,
      avgStucksPerPage,
      pagesPerMistake,
      pagesPerStuck,
    };
  }, [activeReports]);

  return (
    <div className="w-full space-y-5 animate-fade-in select-none">
      
      {/* 4 Metric Key Stat Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
        
        <div className="theme-bg-surface border theme-border rounded-2xl p-3.5 sm:p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Total Reports
          </span>
          <div className="text-xl sm:text-2xl font-bold theme-accent font-mono">
            {analyticsData.totalReports}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Saved logs in range
          </span>
        </div>

        <div className="theme-bg-surface border theme-border rounded-2xl p-3.5 sm:p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            Active Students
          </span>
          <div className="text-xl sm:text-2xl font-bold theme-text-primary font-mono">
            {analyticsData.uniqueStudents}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Active profiles
          </span>
        </div>

        <div className="theme-bg-surface border theme-border rounded-2xl p-3.5 sm:p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
            Total Mistakes
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 font-mono">
            {analyticsData.totalMistakes}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Avg {analyticsData.avgMistakesPerReport} / report
          </span>
        </div>

        <div className="theme-bg-surface border theme-border rounded-2xl p-3.5 sm:p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
            Total Stucks
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">
            {analyticsData.totalStucks}
          </div>
          <span className="text-[10px] theme-text-secondary block">
            Avg {analyticsData.avgStucksPerReport} / report
          </span>
        </div>

      </div>

      {/* Recitation Mistakes & Stucks Density Progress */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-xs sm:text-sm font-bold theme-text-primary">Recitation Error Density Index</h3>
          <p className="text-[10px] sm:text-[11px] theme-text-secondary">Average mistakes and stucks incurred per recited page</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="theme-text-primary">Average Mistakes Per Page</span>
              <span className="text-rose-400 font-mono font-bold">{analyticsData.avgMistakesPerPage}</span>
            </div>
            <div className="w-full bg-slate-700/40 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, parseFloat(analyticsData.avgMistakesPerPage) * 50)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="theme-text-primary">Average Stucks Per Page</span>
              <span className="text-amber-400 font-mono font-bold">{analyticsData.avgStucksPerPage}</span>
            </div>
            <div className="w-full bg-slate-700/40 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, parseFloat(analyticsData.avgStucksPerPage) * 50)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Mistakes Metrics */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Mistakes Frequency Analysis</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Total Recited Pages:</span>
              <span className="font-bold font-mono theme-accent text-sm">{analyticsData.totalPages} Pages</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Average Mistakes Per Page:</span>
              <span className="font-bold font-mono text-rose-400 text-sm">{analyticsData.avgMistakesPerPage}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Pages Recited Per Mistake:</span>
              <span className="font-bold font-mono theme-text-primary text-sm">
                Every {analyticsData.pagesPerMistake} page(s)
              </span>
            </div>
          </div>
        </div>

        {/* Stucks Metrics */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Stucks Frequency Analysis</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Total Recited Pages:</span>
              <span className="font-bold font-mono theme-accent text-sm">{analyticsData.totalPages} Pages</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Average Stucks Per Page:</span>
              <span className="font-bold font-mono text-amber-400 text-sm">{analyticsData.avgStucksPerPage}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b theme-border">
              <span className="theme-text-secondary font-medium">Pages Recited Per Stuck:</span>
              <span className="font-bold font-mono theme-text-primary text-sm">
                Every {analyticsData.pagesPerStuck} page(s)
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

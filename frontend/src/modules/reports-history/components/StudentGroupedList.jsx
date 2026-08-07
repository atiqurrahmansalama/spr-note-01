import { useState, useMemo } from "react";
import { ChevronIcon } from "../../../components/ui/Icons";
import ReportCardDetail from "./ReportCardDetail";

export default function StudentGroupedList({
  studentGroupedData,
  reportsList = [],
  onContextMenu,
  onStudentContextMenu,
  onEdit,
  onDelete
}) {
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);

  const activeGroupedData = useMemo(() => {
    if (studentGroupedData && Array.isArray(studentGroupedData) && studentGroupedData.length > 0) {
      return studentGroupedData;
    }
    const map = new Map();
    (reportsList || []).forEach((rep) => {
      const name = rep.student_name || "Unnamed Student";
      if (!map.has(name)) {
        map.set(name, {
          student_name: name,
          student_group: rep.student_group || "General Group",
          reports: [],
        });
      }
      map.get(name).reports.push(rep);
    });
    return Array.from(map.values());
  }, [studentGroupedData, reportsList]);

  const getInitials = (name) => {
    if (!name) return "S";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  if (activeGroupedData.length === 0) {
    return (
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-10 text-center space-y-2">
        <p className="text-xs theme-text-secondary italic">
          No student reports found matching the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 select-none">
      {activeGroupedData.map((stu) => {
        const isExpanded = expandedStudent === stu.student_name;
        const initials = getInitials(stu.student_name);
        const totalMistakes = stu.reports.reduce((sum, r) => sum + r.mistakesCount, 0);
        const totalStucks = stu.reports.reduce((sum, r) => sum + r.stucksCount, 0);
        const totalPages = stu.reports.reduce((sum, r) => sum + r.totalPages, 0);

        return (
          <div
            key={stu.student_name}
            onContextMenu={(e) => {
              if (onStudentContextMenu) {
                onStudentContextMenu(e, stu);
              }
            }}
            className="w-full theme-bg-surface border theme-border rounded-2xl overflow-hidden shadow-sm transition-all"
          >
            {/* Student Header Row with Right Click Context Menu Handler */}
            <div
              onClick={() => setExpandedStudent(isExpanded ? null : stu.student_name)}
              className="p-3.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 cursor-pointer hover:theme-bg-sub transition"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold theme-text-primary truncate">
                    {stu.student_name}
                  </h4>
                  <p className="text-[11px] theme-text-secondary mt-0.5">
                    Group: <span className="theme-text-primary font-medium">{stu.student_group}</span> · Total <span className="theme-accent font-bold font-mono">{stu.reports.length}</span> Session Reports
                  </p>
                </div>
              </div>

              {/* Fixed Grid Columns for Student Totals */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="grid grid-cols-3 gap-2 items-center text-center text-[11px] w-[220px] sm:w-[240px]">
                  
                  {/* Col 1: Pages */}
                  <div className="justify-self-center">
                    <span className="px-2.5 py-0.5 rounded-md font-bold font-mono theme-bg-sub theme-text-primary border theme-border block truncate">
                      {totalPages}p Total
                    </span>
                  </div>

                  {/* Col 2: Mistakes */}
                  <div className="justify-self-center">
                    <span className="px-2 py-0.5 rounded-md font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 block truncate">
                      X {totalMistakes}
                    </span>
                  </div>

                  {/* Col 3: Stucks */}
                  <div className="justify-self-center">
                    <span className="px-2 py-0.5 rounded-md font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 block truncate">
                      ST {totalStucks}
                    </span>
                  </div>

                </div>

                <ChevronIcon isOpen={isExpanded} className="w-4 h-4 theme-text-secondary ml-1" />
              </div>
            </div>

            {/* Expanded Recitation Timeline */}
            {isExpanded && (
              <div className="p-4 border-t theme-border theme-bg-sub space-y-3 animate-fade-in">
                <h5 className="text-xs font-bold uppercase tracking-wider theme-text-secondary pb-1 border-b theme-border flex items-center justify-between">
                  <span>Recitation History Timeline for {stu.student_name}</span>
                  <span className="font-mono text-[10px]">{stu.reports.length} Entries</span>
                </h5>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {stu.reports.map((rep) => {
                    const repKey = rep.id || rep.report_unique_id;
                    const isReportDetailExpanded = expandedReportId === repKey;

                    return (
                      <div
                        key={repKey}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                          if (onContextMenu) onContextMenu(e, rep);
                        }}
                        className="theme-bg-surface border theme-border rounded-xl overflow-hidden shadow-sm hover:border-slate-600 transition"
                      >
                        <div
                          onClick={() => setExpandedReportId(isReportDetailExpanded ? null : repKey)}
                          className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold theme-text-primary">
                                {rep.formattedDate}
                              </span>
                              {rep.formattedTime && (
                                <span className="text-[10px] theme-text-secondary font-mono">
                                  {rep.formattedTime}
                                </span>
                              )}
                              <span className="text-[10px] theme-bg-sub px-2 py-0.5 rounded theme-text-primary border theme-border">
                                {rep.session_name}
                              </span>
                            </div>
                            {rep.comment && (
                              <p className="text-[11px] theme-text-secondary italic mt-1 truncate">
                                "{rep.comment}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold font-mono theme-text-primary">
                              {rep.totalPages}p
                            </span>
                            <span className="text-xs font-bold font-mono text-rose-400">
                              X {rep.mistakesCount}
                            </span>
                            <span className="text-xs font-bold font-mono text-amber-400">
                              ST {rep.stucksCount}
                            </span>
                            <ChevronIcon isOpen={isReportDetailExpanded} className="w-3.5 h-3.5 theme-text-secondary ml-1" />
                          </div>
                        </div>

                        {/* Report Detail when clicked in Student View */}
                        {isReportDetailExpanded && (
                          <ReportCardDetail
                            report={rep}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

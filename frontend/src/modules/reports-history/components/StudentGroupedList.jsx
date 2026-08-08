import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronIcon, EditIcon } from "../../../components/ui/Icons";
import ReportCardDetail from "./ReportCardDetail";

export default function StudentGroupedList({
  studentGroupedData,
  reportsList = [],
  selectedIds = new Set(),
  onToggleSelect,
  onBatchSelect,
  onDeselectAll,
  onContextMenu,
  onStudentContextMenu,
  onEdit,
  onDelete
}) {
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const containerRef = useRef(null);
  const itemRefs = useRef(new Map());

  // Marquee Drag Selection State
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragBox, setDragBox] = useState(null);
  const hasDraggedRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

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

  const handleStudentSelectToggle = (e, stuReports) => {
    e.stopPropagation();
    if (!onBatchSelect || !onToggleSelect) return;

    const stuReportIds = stuReports.map((r) => r.id || r.report_unique_id);
    const allSelected = stuReportIds.every((id) => selectedIds.has(id));

    const nextSet = new Set(selectedIds);
    if (allSelected) {
      stuReportIds.forEach((id) => nextSet.delete(id));
    } else {
      stuReportIds.forEach((id) => nextSet.add(id));
    }
    onBatchSelect(nextSet);
  };

  // Marquee Drag Selection Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".report-detail-panel")) {
      return;
    }
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    hasDraggedRef.current = false;
    dragStartPosRef.current = { x, y };

    setIsMouseDown(true);
    setDragBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  useEffect(() => {
    if (!isMouseDown) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const deltaX = Math.abs(currentX - dragStartPosRef.current.x);
      const deltaY = Math.abs(currentY - dragStartPosRef.current.y);

      if (deltaX > 4 || deltaY > 4) {
        hasDraggedRef.current = true;
      }

      const startX = dragStartPosRef.current.x;
      const startY = dragStartPosRef.current.y;

      setDragBox({ startX, startY, currentX, currentY });

      const selLeft = Math.min(startX, currentX);
      const selRight = Math.max(startX, currentX);
      const selTop = Math.min(startY, currentY);
      const selBottom = Math.max(startY, currentY);

      const newlySelected = new Set(selectedIds);

      itemRefs.current.forEach((el, id) => {
        if (!el) return;
        const elRect = el.getBoundingClientRect();
        const elTop = elRect.top - rect.top;
        const elBottom = elRect.bottom - rect.top;
        const elLeft = elRect.left - rect.left;
        const elRight = elRect.right - rect.left;

        const isOverlapping = !(
          elRight < selLeft ||
          elLeft > selRight ||
          elBottom < selTop ||
          elTop > selBottom
        );

        if (isOverlapping) {
          newlySelected.add(id);
        }
      });

      if (onBatchSelect) {
        onBatchSelect(newlySelected);
      }
    };

    const handleMouseUp = () => {
      setIsMouseDown(false);
      setDragBox(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isMouseDown, onBatchSelect, selectedIds]);

  if (activeGroupedData.length === 0) {
    return (
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-10 text-center space-y-2">
        <p className="text-xs theme-text-secondary italic">
          No student reports found matching the filters.
        </p>
      </div>
    );
  }

  const selectionStyle = dragBox ? {
    left: Math.min(dragBox.startX, dragBox.currentX),
    top: Math.min(dragBox.startY, dragBox.currentY),
    width: Math.abs(dragBox.currentX - dragBox.startX),
    height: Math.abs(dragBox.currentY - dragBox.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="w-full space-y-3 relative select-none"
    >
      {/* Marquee Drag Box Overlay */}
      {isMouseDown && selectionStyle && (
        <div
          style={selectionStyle}
          className="absolute z-30 bg-sky-500/20 border border-sky-400/80 pointer-events-none rounded-xl backdrop-blur-[1px]"
        />
      )}

      {activeGroupedData.map((stu) => {
        const isExpanded = expandedStudent === stu.student_name;
        const initials = getInitials(stu.student_name);
        const totalMistakes = stu.reports.reduce((sum, r) => sum + r.mistakesCount, 0);
        const totalStucks = stu.reports.reduce((sum, r) => sum + r.stucksCount, 0);

        const stuReportIds = stu.reports.map((r) => r.id || r.report_unique_id);
        const isStudentFullySelected = stuReportIds.length > 0 && stuReportIds.every((id) => selectedIds.has(id));
        const isStudentPartiallySelected = !isStudentFullySelected && stuReportIds.some((id) => selectedIds.has(id));

        return (
          <div
            key={stu.student_name}
            onContextMenu={(e) => {
              if (onStudentContextMenu) {
                onStudentContextMenu(e, stu);
              }
            }}
            className={`student-grouped-row w-full theme-bg-surface border transition-all duration-150 rounded-2xl overflow-hidden shadow-sm ${
              isStudentFullySelected
                ? "border-[var(--accent-main)] theme-bg-accent-soft"
                : "theme-border hover:border-slate-600"
            }`}
          >
            {/* Student Header Row with Selection Checkbox */}
            <div
              onClick={() => setExpandedStudent(isExpanded ? null : stu.student_name)}
              className="p-3 sm:p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 cursor-pointer hover:theme-bg-sub transition"
            >
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                {/* Selection Checkbox for Student */}
                <div
                  onClick={(e) => handleStudentSelectToggle(e, stu.reports)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isStudentFullySelected
                      ? "theme-bg-accent border-[var(--accent-main)] shadow-sm"
                      : isStudentPartiallySelected
                      ? "bg-amber-500 border-amber-400"
                      : "theme-bg-sub border-slate-600 hover:border-slate-400"
                  }`}
                  title={isStudentFullySelected ? "Deselect All Student Reports" : "Select All Student Reports"}
                >
                  {isStudentFullySelected && (
                    <svg className="w-3 h-3 theme-accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isStudentPartiallySelected && (
                    <span className="w-2 h-0.5 bg-white rounded-full" />
                  )}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {initials}
                </div>

                {/* Student Details */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold theme-text-primary truncate">
                    {stu.student_name}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] theme-text-secondary mt-0.5 truncate">
                    Group: <span className="theme-text-primary font-medium">{stu.student_group}</span> · Total <span className="theme-accent font-bold font-mono">{stu.reports.length}</span> Session Reports
                  </p>
                </div>
              </div>

              {/* Grid Columns for Student Totals */}
              <div className="flex items-center justify-between md:justify-end gap-2.5 sm:gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 theme-border">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 items-center text-center text-[10px] sm:text-[11px] w-full md:w-[240px]">
                  
                  {/* Col 1: Total Reports Count Badge */}
                  <div className="justify-self-center w-full">
                    <span className="px-1.5 sm:px-2.5 py-1 rounded-lg font-bold font-mono theme-bg-sub theme-accent border theme-border block truncate">
                      {stu.reports.length} Reports
                    </span>
                  </div>

                  {/* Col 2: Mistakes */}
                  <div className="justify-self-center w-full">
                    <span className={`px-1.5 sm:px-2 py-1 rounded-lg font-bold font-mono block truncate ${
                      totalMistakes > 0
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "theme-bg-sub theme-text-secondary border theme-border"
                    }`}>
                      M {totalMistakes}
                    </span>
                  </div>

                  {/* Col 3: Stucks */}
                  <div className="justify-self-center w-full">
                    <span className={`px-1.5 sm:px-2 py-1 rounded-lg font-bold font-mono block truncate ${
                      totalStucks > 0
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "theme-bg-sub theme-text-secondary border theme-border"
                    }`}>
                      S {totalStucks}
                    </span>
                  </div>

                </div>

                <ChevronIcon isOpen={isExpanded} className="w-4 h-4 theme-text-secondary ml-1 shrink-0" />
              </div>
            </div>

            {/* Expanded Recitation Timeline */}
            {isExpanded && (
              <div className="p-3 sm:p-4 border-t theme-border theme-bg-sub space-y-3 animate-fade-in">
                <h5 className="text-xs font-bold uppercase tracking-wider theme-text-secondary pb-1 border-b theme-border flex items-center justify-between">
                  <span>Recitation Timeline for {stu.student_name}</span>
                  <span className="font-mono text-[10px]">{stu.reports.length} Entries</span>
                </h5>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {stu.reports.map((rep) => {
                    const repKey = rep.id || rep.report_unique_id;
                    const isReportDetailExpanded = expandedReportId === repKey;
                    const isItemChecked = selectedIds.has(repKey);

                    return (
                      <div
                        key={repKey}
                        ref={(el) => {
                          if (el) itemRefs.current.set(repKey, el);
                          else itemRefs.current.delete(repKey);
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                          if (onContextMenu) onContextMenu(e, rep);
                        }}
                        className={`report-card-row theme-bg-surface border rounded-2xl overflow-hidden shadow-sm transition ${
                          isItemChecked ? "border-[var(--accent-main)] theme-bg-accent-soft" : "theme-border hover:border-slate-600"
                        }`}
                      >
                        <div
                          onClick={() => setExpandedReportId(isReportDetailExpanded ? null : repKey)}
                          className="p-3 sm:p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Checkbox for individual timeline report */}
                            {onToggleSelect && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSelect(repKey);
                                }}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isItemChecked
                                    ? "theme-bg-accent border-[var(--accent-main)] shadow-sm"
                                    : "theme-bg-sub border-slate-600 hover:border-slate-400"
                                }`}
                              >
                                {isItemChecked && (
                                  <svg className="w-3 h-3 theme-accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold theme-text-primary">
                                  {rep.formattedDate}
                                </span>
                                {rep.formattedTime && (
                                  <span className="text-[10px] theme-text-secondary font-mono">
                                    {rep.formattedTime}
                                  </span>
                                )}
                                <span className="text-[10px] theme-bg-sub px-2 py-0.5 rounded-md theme-text-primary border theme-border font-semibold">
                                  {rep.session_name}
                                </span>
                                {(rep.is_edited || rep.edited_at) && (
                                  <span
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border theme-border cursor-pointer select-none shrink-0 flex items-center gap-1 hover:opacity-90 transition"
                                    title={rep.edited_at ? `Edited: ${new Date(rep.edited_at).toLocaleString()}` : "Edited"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const timeStr = rep.edited_at ? new Date(rep.edited_at).toLocaleString() : "Date unavailable";
                                      alert(`Edited on: ${timeStr}`);
                                    }}
                                  >
                                    <EditIcon className="w-2.5 h-2.5 theme-accent" />
                                    <span>Edited</span>
                                  </span>
                                )}
                              </div>
                              {rep.comment && (
                                <p className="text-[11px] theme-text-secondary italic mt-1 truncate">
                                  "{rep.comment}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold font-mono theme-text-primary px-2 py-0.5 rounded-md theme-bg-sub border theme-border">
                              {rep.totalPages}p
                            </span>
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                              rep.mistakesCount > 0
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "theme-bg-sub theme-text-secondary border theme-border"
                            }`}>
                              M {rep.mistakesCount}
                            </span>
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                              rep.stucksCount > 0
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "theme-bg-sub theme-text-secondary border theme-border"
                            }`}>
                              S {rep.stucksCount}
                            </span>
                            <ChevronIcon isOpen={isReportDetailExpanded} className="w-3.5 h-3.5 theme-text-secondary ml-1" />
                          </div>
                        </div>

                        {/* Updated Modern Report Card Detail Component */}
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

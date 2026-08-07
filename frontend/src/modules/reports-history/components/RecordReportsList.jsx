import { useState, useRef, useEffect } from "react";
import { ChevronIcon } from "../../../components/ui/Icons";
import ReportCardDetail from "./ReportCardDetail";

export default function RecordReportsList({
  reports,
  reportsList = [],
  selectedIds = new Set(),
  onToggleSelect,
  onBatchSelect,
  onDeselectAll,
  onContextMenu,
  onEdit,
  onDelete,
}) {
  const activeReportsList = reports || reportsList || [];
  const [expandedId, setExpandedId] = useState(null);
  const containerRef = useRef(null);

  // Marquee Drag Selection State
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragBox, setDragBox] = useState(null); // { startX, startY, currentX, currentY }
  const itemRefs = useRef(new Map());
  const hasDraggedRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  const getInitials = (name) => {
    if (!name) return "S";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Handle Drag Selection Start
  const handleMouseDown = (e) => {
    // Only left click outside interactive buttons/inputs
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".report-detail-panel")) {
      return;
    }

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

      // Calculate intersection rectangle
      const selLeft = Math.min(startX, currentX);
      const selRight = Math.max(startX, currentX);
      const selTop = Math.min(startY, currentY);
      const selBottom = Math.max(startY, currentY);

      const newlySelected = new Set();

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

      if (newlySelected.size > 0 && onBatchSelect) {
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
  }, [isMouseDown, onBatchSelect]);

  // Click outside container to deselect
  const handleContainerClick = (e) => {
    // If a drag operation just finished, do not deselect
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (e.target.closest(".report-card-row") || e.target.closest("button") || e.target.closest("input")) {
      return;
    }
    if (selectedIds.size > 0 && onDeselectAll) {
      onDeselectAll();
    }
  };

  if (activeReportsList.length === 0) {
    return (
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-10 text-center space-y-2">
        <p className="text-xs theme-text-secondary italic">
          No daily reports match your search or date filter.
        </p>
      </div>
    );
  }

  // Calculate box geometry
  const selectionStyle = dragBox ? {
    left: Math.min(dragBox.startX, dragBox.currentX),
    top: Math.min(dragBox.startY, dragBox.currentY),
    width: Math.abs(dragBox.currentX - dragBox.startX),
    height: Math.abs(dragBox.currentY - dragBox.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onMouseDown={handleMouseDown}
      className="w-full space-y-2.5 relative select-none"
    >
      {/* Visual Marquee Drag Box Overlay */}
      {isMouseDown && selectionStyle && (
        <div
          style={selectionStyle}
          className="absolute z-30 bg-sky-500/20 border border-sky-400/80 pointer-events-none rounded-xl backdrop-blur-[1px]"
        />
      )}

      {activeReportsList.map((rep) => {
        const repKey = rep.id || rep.report_unique_id;
        const isExpanded = expandedId === repKey;
        const isChecked = selectedIds.has(repKey);
        const initials = getInitials(rep.student_name);

        return (
          <div
            key={repKey}
            ref={(el) => {
              if (el) itemRefs.current.set(repKey, el);
              else itemRefs.current.delete(repKey);
            }}
            onContextMenu={(e) => onContextMenu(e, rep)}
            className={`report-card-row w-full theme-bg-surface border transition-all duration-150 rounded-2xl overflow-hidden shadow-sm ${
              isChecked ? "border-[var(--accent-main)] theme-bg-accent-soft" : "theme-border hover:border-slate-600"
            }`}
          >
            {/* Row Layout with Fixed Column Alignment for Badges */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : repKey)}
              className="p-3.5 sm:p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 cursor-pointer select-none"
            >
              {/* Left Column: Checkbox + Avatar + Student Name & Group */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Apparent Checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(repKey);
                  }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isChecked
                      ? "theme-bg-accent border-[var(--accent-main)] shadow-sm"
                      : "theme-bg-sub border-slate-600 hover:border-slate-400"
                    }`}
                  >
                  {isChecked && (
                    <svg className="w-3 h-3 theme-accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Avatar Initials */}
                <div className="w-9 h-9 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {initials}
                </div>

                {/* Student Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold theme-text-primary truncate tracking-tight">
                      {rep.student_name}
                    </h4>
                    {rep.sync_status === "PENDING" && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Pending Sync" />
                    )}
                  </div>
                  <p className="text-[11px] theme-text-secondary mt-0.5 truncate font-sans">
                    {rep.formattedDate} {rep.formattedTime && `· ${rep.formattedTime}`} · <span className="theme-text-primary font-medium">{rep.student_group}</span>
                  </p>
                </div>
              </div>

              {/* Right Section: Fixed Column Alignment Grid for Badges */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="grid grid-cols-4 gap-2 items-center text-center text-[11px] w-[310px] sm:w-[340px]">
                  
                  {/* Col 1: Pages */}
                  <div className="justify-self-center">
                    <span className="px-2.5 py-0.5 rounded-md font-bold font-mono theme-bg-sub theme-text-primary border theme-border block truncate">
                      {rep.totalPages}p
                    </span>
                  </div>

                  {/* Col 2: Session Name */}
                  <div className="justify-self-center w-full">
                    <span className="px-2 py-0.5 rounded-md font-semibold theme-bg-elevated theme-text-primary border theme-border block truncate">
                      {rep.session_name}
                    </span>
                  </div>

                  {/* Col 3: Mistakes */}
                  <div className="justify-self-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold font-mono block truncate ${
                      rep.mistakesCount > 0
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "theme-bg-sub theme-text-secondary border theme-border"
                    }`}>
                      M {rep.mistakesCount}
                    </span>
                  </div>

                  {/* Col 4: Stucks */}
                  <div className="justify-self-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold font-mono block truncate ${
                      rep.stucksCount > 0
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "theme-bg-sub theme-text-secondary border theme-border"
                    }`}>
                      S {rep.stucksCount}
                    </span>
                  </div>

                </div>

                {/* Chevron */}
                <ChevronIcon isOpen={isExpanded} className="w-4 h-4 theme-text-secondary shrink-0 ml-1" />
              </div>

            </div>

            {/* Expanded Content Panel */}
            {isExpanded && (
              <div className="report-detail-panel">
                <ReportCardDetail
                  report={rep}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

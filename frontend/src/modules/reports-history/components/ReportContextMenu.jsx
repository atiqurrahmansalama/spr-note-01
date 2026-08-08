import { useEffect, useRef } from "react";
import { CopyIcon, TrashIcon, EditIcon, PrinterIcon, CloudIcon } from "../../../components/ui/Icons";

export default function ReportContextMenu({
  x,
  y,
  report,
  onClose,
  onCopyText,
  onExportCSV,
  onExportJSON,
  onPrintPDF,
  onEdit,
  onDelete,
}) {
  const menuRef = useRef(null);

  // Close context menu on click outside OR window scroll
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleScroll = () => {
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  if (!report) return null;

  // Viewport bounding math to prevent context menu overflow
  const menuWidth = 224; // 14rem = 224px
  const menuHeight = 280; // approximate max height
  const posX = typeof x === "number" ? x : 20;
  const posY = typeof y === "number" ? y : 20;

  const adjustedX = Math.max(10, Math.min(posX, window.innerWidth - menuWidth - 10));
  const adjustedY = Math.max(10, Math.min(posY, window.innerHeight - menuHeight - 10));

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-[9999] w-56 theme-bg-surface border theme-border rounded-2xl shadow-2xl p-1.5 text-xs font-medium theme-text-primary animate-fade-in space-y-0.5 select-none"
    >
      <div className="px-3 py-2 border-b theme-border text-[11px] theme-text-secondary">
        <p className="font-bold theme-text-primary truncate">{report.student_name || "Student Report"}</p>
        <p className="text-[10px] truncate">{report.formattedDate || "Date"} · {report.session_name || "Session"}</p>
      </div>

      {onCopyText && (
        <button
          type="button"
          onClick={() => {
            onCopyText(report);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl hover:theme-bg-elevated hover:theme-accent font-medium flex items-center gap-2.5 transition cursor-pointer text-left"
        >
          <CopyIcon className="w-4 h-4 theme-accent" />
          <span>Copy Summary Text</span>
        </button>
      )}

      {onExportCSV && (
        <button
          type="button"
          onClick={() => {
            onExportCSV(report);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl hover:theme-bg-elevated hover:theme-accent font-medium flex items-center gap-2.5 transition cursor-pointer text-left"
        >
          <CloudIcon className="w-4 h-4 text-emerald-400" />
          <span>Export as CSV / Excel</span>
        </button>
      )}

      {onExportJSON && (
        <button
          type="button"
          onClick={() => {
            onExportJSON(report);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl hover:theme-bg-elevated hover:theme-accent font-medium flex items-center gap-2.5 transition cursor-pointer text-left"
        >
          <CloudIcon className="w-4 h-4 text-amber-400" />
          <span>Export as JSON</span>
        </button>
      )}

      {onPrintPDF && (
        <button
          type="button"
          onClick={() => {
            onPrintPDF(report);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl hover:theme-bg-elevated hover:theme-accent font-medium flex items-center gap-2.5 transition cursor-pointer text-left"
        >
          <PrinterIcon className="w-4 h-4 text-sky-400" />
          <span>Print / Save as PDF</span>
        </button>
      )}

      <div className="border-t theme-border my-1" />

      {onEdit && (
        <button
          type="button"
          onClick={() => {
            onEdit(report);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl hover:theme-bg-elevated hover:theme-accent font-medium flex items-center gap-2.5 transition cursor-pointer text-left"
        >
          <EditIcon className="w-4 h-4 theme-text-secondary" />
          <span>Edit Report</span>
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={() => {
            onDelete(report);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 font-medium flex items-center gap-2.5 transition cursor-pointer text-left"
        >
          <TrashIcon className="w-4 h-4 text-rose-400" />
          <span>Delete Report</span>
        </button>
      )}
    </div>
  );
}

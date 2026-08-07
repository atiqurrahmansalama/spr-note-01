import { CloseIcon } from "../../../components/ui/Icons";

export function ReportHeader({ viewMode, setViewMode, handleAttemptClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b theme-border theme-bg-sub">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-main)] animate-pulse"></span>
        <h2 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
          {viewMode === "PDF" ? "PDF Document Preview" : "Report Preview"}
        </h2>
      </div>

      {/* Mode Switcher & Close Icon */}
      <div className="flex items-center gap-2">
        {viewMode === "PDF" ? (
          <button
            type="button"
            onClick={() => setViewMode("TEXT")}
            className="px-2.5 py-1 rounded-lg theme-bg-elevated hover:opacity-80 theme-text-secondary text-xs font-semibold border theme-border transition-colors"
          >
            Text Mode
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setViewMode("PDF")}
            className="px-2.5 py-1 rounded-lg theme-bg-accent-soft hover:opacity-80 theme-accent text-xs font-semibold border border-[var(--accent-main)]/30 transition-colors"
          >
            PDF Mode
          </button>
        )}

        <button
          type="button"
          onClick={handleAttemptClose}
          className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors"
          title="Close modal"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

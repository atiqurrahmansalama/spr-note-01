import { CloseIcon } from "../../ui/Icons";

export function ReportHeader({ viewMode, setViewMode, handleAttemptClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#1c1e22]">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-serif">
          {viewMode === "PDF" ? "PDF Document Preview" : "Report Preview"}
        </h2>
      </div>

      {/* Mode Switcher & Close Icon */}
      <div className="flex items-center gap-2">
        {viewMode === "PDF" ? (
          <button
            type="button"
            onClick={() => setViewMode("TEXT")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition-colors"
          >
            Text Mode
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setViewMode("PDF")}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
          >
            PDF Mode
          </button>
        )}

        <button
          type="button"
          onClick={handleAttemptClose}
          className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Close modal"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

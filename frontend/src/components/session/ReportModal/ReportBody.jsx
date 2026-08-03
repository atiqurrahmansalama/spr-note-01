import { PdfReportPreview } from "./PdfReportPreview";

export function ReportBody({
  viewMode,
  isEditing,
  currentText,
  setCurrentText,
  reportData,
  includeGroup,
}) {
  return (
    <div className="p-4 overflow-y-auto h-[480px] bg-[#17181a] relative flex flex-col">
      {viewMode === "PDF" ? (
        <PdfReportPreview
          reportData={reportData}
          includeGroup={includeGroup}
        />
      ) : isEditing ? (
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          className="w-full h-full p-4 rounded-xl bg-[#1d1f23] text-slate-100 text-sm font-mono border border-indigo-500/80 focus:outline-none resize-none leading-relaxed shadow-inner"
          placeholder="Edit report text..."
        />
      ) : (
        <pre className="w-full h-full p-4 rounded-xl bg-[#1d1f23] border border-slate-800 text-slate-200 text-sm font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner overflow-y-auto">
          {currentText}
        </pre>
      )}
    </div>
  );
}

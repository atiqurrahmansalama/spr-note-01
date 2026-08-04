import { PdfReportPreview } from "./PdfReportPreview";

export function ReportBody({
  viewMode,
  isEditing,
  currentText,
  setCurrentText,
  reportData,
  includeGroup,
  pdfFont,
  isPdfBold,
  isPdfItalic,
}) {
  return (
    <div className="p-4 overflow-y-auto h-[480px] theme-bg-app relative flex flex-col">
      {viewMode === "PDF" ? (
        <PdfReportPreview
          reportData={reportData}
          includeGroup={includeGroup}
          pdfFont={pdfFont}
          isPdfBold={isPdfBold}
          isPdfItalic={isPdfItalic}
        />
      ) : isEditing ? (
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          className="w-full h-full p-4 rounded-xl theme-bg-sub theme-text-primary text-sm font-mono border border-[var(--accent-main)]/60 focus:outline-none resize-none leading-relaxed shadow-inner"
          placeholder="Edit report text..."
        />
      ) : (
        <pre className="w-full h-full p-4 rounded-xl theme-bg-sub border theme-border theme-text-primary text-sm font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner overflow-y-auto">
          {currentText}
        </pre>
      )}
    </div>
  );
}

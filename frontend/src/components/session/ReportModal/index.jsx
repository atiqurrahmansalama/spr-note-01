import { useReportActions } from "./useReportActions";
import { ReportHeader } from "./ReportHeader";
import { ReportBody } from "./ReportBody";
import { ReportControls } from "./ReportControls";
import { ReportFooter } from "./ReportFooter";
import { DiscardAlertModal } from "./DiscardAlertModal";

export default function ReportModal({ isOpen, onClose, reportData = {} }) {
  const {
    viewMode,
    setViewMode,
    includeGroup,
    setIncludeGroup,
    includeTeacher,
    setIncludeTeacher,
    pdfFont,
    setPdfFont,
    isPdfBold,
    setIsPdfBold,
    isPdfItalic,
    setIsPdfItalic,
    isEditing,
    setIsEditing,
    copied,
    currentText,
    setCurrentText,
    isShareDropdownOpen,
    setIsShareDropdownOpen,
    showDiscardAlert,
    setShowDiscardAlert,
    shareDropdownRef,
    handleAttemptClose,
    handleConfirmDiscard,
    handleCopy,
    handleShareText,
    handleDownloadPdfFile,
    handleExportImage,
  } = useReportActions({ isOpen, onClose, reportData });

  if (!isOpen) return null;

  return (
    <>
      {/* Main Report Modal */}
      <div
        onClick={handleAttemptClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="theme-bg-surface border theme-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary"
        >
          {/* Modal Header */}
          <ReportHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            handleAttemptClose={handleAttemptClose}
          />

          {/* Modal Body */}
          <ReportBody
            viewMode={viewMode}
            isEditing={isEditing}
            currentText={currentText}
            setCurrentText={setCurrentText}
            reportData={reportData}
            includeGroup={includeGroup}
            pdfFont={pdfFont}
            isPdfBold={isPdfBold}
            isPdfItalic={isPdfItalic}
          />

          {/* Controls / Checkboxes & Styling Toolbar */}
          <ReportControls
            includeGroup={includeGroup}
            setIncludeGroup={setIncludeGroup}
            includeTeacher={includeTeacher}
            setIncludeTeacher={setIncludeTeacher}
            pdfFont={pdfFont}
            setPdfFont={setPdfFont}
            isPdfBold={isPdfBold}
            setIsPdfBold={setIsPdfBold}
            isPdfItalic={isPdfItalic}
            setIsPdfItalic={setIsPdfItalic}
          />

          {/* Modal Footer */}
          <ReportFooter
            viewMode={viewMode}
            setViewMode={setViewMode}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            copied={copied}
            handleCopy={handleCopy}
            isShareDropdownOpen={isShareDropdownOpen}
            setIsShareDropdownOpen={setIsShareDropdownOpen}
            shareDropdownRef={shareDropdownRef}
            handleShareText={handleShareText}
            handleExportImage={handleExportImage}
            handleDownloadPdfFile={handleDownloadPdfFile}
          />
        </div>
      </div>

      {/* Confirmation Alert Modal for Unsaved Edits */}
      <DiscardAlertModal
        showDiscardAlert={showDiscardAlert}
        setShowDiscardAlert={setShowDiscardAlert}
        handleConfirmDiscard={handleConfirmDiscard}
      />
    </>
  );
}

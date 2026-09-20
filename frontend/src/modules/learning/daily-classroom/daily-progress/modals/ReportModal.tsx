import React from "react";
import { useReportActions } from "./useReportActions";
import { PdfReportPreview } from "./PdfReportPreview";
import { ShareDropdown } from "./ShareDropdown";
import { DiscardAlertModal } from "./DiscardAlertModal";
import CustomCheckbox from "../../../../../components/ui/CustomCheckbox";
import { CloseIcon, EditIcon, CopyIcon, SleekCheckIcon, ShareIcon } from "../../../../../components/ui/Icons";
import { copyReportSettings as copyStore } from "../../../../../utils/localStore";
import { DailyProgressData } from "../types";

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData?: DailyProgressData;
}

export default function ReportModal({ isOpen, onClose, reportData = {} }: ReportModalProps) {
  // Read which checkboxes are allowed from Copy Report Settings
  const showGroupCheckbox = copyStore.getIncludeGroup !== undefined
    ? copyStore.getIncludeGroup()
    : true;
  const showTeacherCheckbox = copyStore.getIncludeTeacher !== undefined
    ? copyStore.getIncludeTeacher()
    : true;

  const {
    viewMode,
    setViewMode,
    includeGroup,
    setIncludeGroup,
    includeTeacher,
    setIncludeTeacher,
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
          {/* 1. Modal Header */}
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
                  className="px-2.5 py-1 rounded-lg theme-bg-elevated hover:opacity-80 theme-text-secondary text-xs font-semibold border theme-border transition-colors cursor-pointer"
                >
                  Text Mode
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewMode("PDF")}
                  className="px-2.5 py-1 rounded-lg theme-bg-accent-soft hover:opacity-80 theme-accent text-xs font-semibold border border-[var(--accent-main)]/30 transition-colors cursor-pointer"
                >
                  PDF Mode
                </button>
              )}

              <button
                type="button"
                onClick={handleAttemptClose}
                className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
                title="Close modal"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Modal Body */}
          <div className="p-4 overflow-y-auto h-[480px] theme-bg-app relative flex flex-col">
            {viewMode === "PDF" ? (
              <PdfReportPreview
                reportData={reportData}
                includeGroup={includeGroup}
                includeTeacher={includeTeacher}
              />
            ) : isEditing ? (
              <textarea
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                className="w-full h-full p-4 rounded-xl theme-bg-sub theme-text-primary text-sm font-mono border border-[var(--accent-main)]/60 focus:outline-none resize-none leading-relaxed shadow-inner"
                placeholder="Edit report text..."
              />
            ) : (
              <pre className="w-full h-full p-4 rounded-xl theme-bg-sub border theme-border theme-text-primary text-sm font-mono whitespace-pre-wrap select-all leading-relaxed shadow-inner overflow-y-auto text-left">
                {currentText}
              </pre>
            )}
          </div>

          {/* 3. Conditional Checkboxes (Include Group & Mention Teacher) */}
          {(showGroupCheckbox || showTeacherCheckbox) && (
            <div className="flex flex-wrap items-center gap-4 px-5 py-3 theme-bg-sub border-t theme-border text-xs theme-text-secondary select-none">
              {showGroupCheckbox && (
                <CustomCheckbox
                  id="report-include-group"
                  checked={includeGroup}
                  onChange={(checked) => {
                    setIncludeGroup(checked);
                    if (!checked) setIncludeTeacher(false);
                  }}
                  label="Include Group"
                  size="sm"
                />
              )}

              {showTeacherCheckbox && (
                <CustomCheckbox
                  id="report-include-teacher"
                  checked={includeTeacher}
                  disabled={!includeGroup}
                  onChange={(checked) => setIncludeTeacher(checked)}
                  label="Mention Teacher"
                  size="sm"
                />
              )}
            </div>
          )}

          {/* 4. Modal Footer Buttons (Edit, Copy, Export) */}
          <div className="grid grid-cols-3 gap-2 px-5 py-4 border-t theme-border theme-bg-sub select-none">
            {/* Button 1: Edit Text */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === "PDF") {
                  setViewMode("TEXT");
                  setIsEditing(true);
                } else {
                  setIsEditing(!isEditing);
                }
              }}
              className={`h-10 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow border cursor-pointer ${
                isEditing
                  ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 hover:opacity-80"
                  : "theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary theme-border"
              }`}
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>{isEditing ? "Done" : "Edit"}</span>
            </button>

            {/* Button 2: Copy Text */}
            <button
              type="button"
              onClick={handleCopy}
              className={`h-10 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow border cursor-pointer ${
                copied
                  ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40"
                  : "theme-bg-accent hover:opacity-90 theme-accent-text border-[var(--accent-main)]"
              }`}
            >
              {copied ? (
                <SleekCheckIcon className="w-3.5 h-3.5" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>

            {/* Button 3: Export Dropdown */}
            <div ref={shareDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
                className={`w-full h-10 rounded-xl theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary font-semibold text-xs transition-all border theme-border flex items-center justify-center gap-1.5 shadow cursor-pointer ${
                  isShareDropdownOpen ? "border-[var(--accent-main)]" : ""
                }`}
              >
                <ShareIcon className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              {isShareDropdownOpen && (
                <ShareDropdown
                  handleShareText={handleShareText}
                  setViewMode={setViewMode}
                  handleExportImage={handleExportImage}
                  handleDownloadPdfFile={handleDownloadPdfFile}
                  setIsShareDropdownOpen={setIsShareDropdownOpen}
                  viewMode={viewMode}
                />
              )}
            </div>
          </div>
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

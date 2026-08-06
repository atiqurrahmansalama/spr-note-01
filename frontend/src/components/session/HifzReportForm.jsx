import { useState, useEffect } from "react";
import HeaderDateControl from "./HeaderDateControl";
import SessionInput from "./SessionInput";
import ReportModal from "./ReportModal";
import { useReportForm } from "./useReportForm";
import { useToast } from "../../context/ToastContext";
import { useFont } from "../../context/useFont";
import { ClockIcon } from "../ui/Icons";
import { CloseIcon } from "../ui/Icons";

export default function HifzReportForm({ timeZone, dateFormat }) {
  const { showToast } = useToast();
  const { activeFont, activeFontSize } = useFont();

  const {
    selectedDate,
    setSelectedDate,
    studentName,
    setStudentName,
    groupName,
    setGroupName,
    selectedSession,
    setSelectedSession,
    juzPageData,
    setJuzPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
    comment,
    setComment,
    savedComments,
    setSavedComments,
    isPanelOpen,
    setIsPanelOpen,
    pendingName,
    setPendingName,
    studentDatabase,
    availableGroups,
    sessionList,
    isLoading,
    draftInfo,
    recoverDraft,
    discardDraft,
    handleSaveResult,
    handleSaveSession,
    handleSaveRecord,
    handleUndo,
    handleRedo,
  } = useReportForm();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 🎹 Global Undo & Redo Keyboard Listener (Ctrl+Z, Ctrl+Shift+Z, Alt+Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleUndoRedoKeys = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // Undo: Ctrl + Z (without Shift or Alt)
      if (key === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl + Shift + Z OR Alt + Ctrl + Z OR Ctrl + Y
      else if ((key === "z" && (e.shiftKey || e.altKey)) || key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleUndoRedoKeys);
    return () => window.removeEventListener("keydown", handleUndoRedoKeys);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        const studentInput = document.querySelector('input[placeholder*="student"], input[placeholder*="Search"]');
        if (studentInput) {
          studentInput.focus();
        }
      }, 150);
    }
  }, [isLoading]);

  const handleMakeReportClick = () => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return;
    }
    if (!selectedSession.trim()) {
      showToast("Please select a session first", "warning");
      return;
    }
    const hasJuzPageData = juzPageData.some(
      (d) => d.juz.trim() || d.ranges.some((r) => r.start.trim() || r.end.trim())
    );
    if (!hasJuzPageData) {
      showToast("Please enter Juz & Page information first", "warning");
      return;
    }

    setIsReportModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 theme-text-secondary text-xs font-mono">
        Connecting to Backend Database...
      </div>
    );
  }

  return (
    <div 
      style={{ fontFamily: activeFont.css, fontSize: activeFontSize.px }} 
      className="w-full max-w-xl mx-auto space-y-5 pb-12 theme-text-primary relative transition-all"
    >
      {/* 0. Draft Recovery Notification Banner */}
      {draftInfo && (
        <div className="w-full theme-bg-sub border theme-border rounded-xl p-2.5 sm:p-3 shadow-md flex items-center justify-between gap-2.5 animate-fade-in select-none">
          <div className="flex items-center gap-2 min-w-0 text-left">
            <div className="p-0.5 rounded-lg theme-accent shrink-0">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div className="text-xs theme-text-primary truncate">
              Auto-saved Draft Found at {" "}
              <span className="font-bold theme-accent">
                {draftInfo.savedAtTime || "session"}
              </span>
              . Recover?
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={recoverDraft}
              className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs px-2.5 py-1 rounded-lg font-semibold transition shadow cursor-pointer"
            >
              Recover
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated text-xs px-2 py-1 rounded-lg font-medium transition cursor-pointer"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Card (Clean & Minimal with Dynamic Theme) */}
      <div className="theme-bg-surface rounded-2xl p-4 sm:p-5 text-center shadow-lg space-y-1 sm:space-y-2 relative z-10 border theme-border">
        <h1 className="text-lg sm:text-2xl font-bold theme-text-primary tracking-wide">
          Hifz Daily Progress Report
        </h1>
        <HeaderDateControl
          timeZone={timeZone}
          dateFormat={dateFormat}
          onDateChange={(customDate) => setSelectedDate(customDate)}
        />
      </div>

      {/* 2. Student & Session Input Component */}
      <SessionInput
        studentDatabase={studentDatabase}
        studentName={studentName}
        groupName={groupName}
        sessionList={sessionList}
        selectedSession={selectedSession}
        juzPageData={juzPageData}
        setJuzPageData={setJuzPageData}
        mistakeData={mistakeData}
        setMistakeData={setMistakeData}
        stuckData={stuckData}
        setStuckData={setStuckData}
        comment={comment}
        setComment={setComment}
        savedComments={savedComments}
        setSavedComments={setSavedComments}
        isPanelOpen={isPanelOpen}
        pendingName={pendingName}
        availableGroups={availableGroups}
        onStudentSelect={(sel) => {
          if (typeof sel === "object") {
            setStudentName(sel.label);
            if (sel.sub) setGroupName(sel.sub);
          } else {
            setStudentName(sel);
          }
        }}
        onGroupNameChange={setGroupName}
        onSessionChange={setSelectedSession}
        onSaveSession={handleSaveSession}
        onOpenSavePanel={(typed) => {
          setPendingName(typed);
          setIsPanelOpen(true);
        }}
        onCloseSavePanel={() => setIsPanelOpen(false)}
        onSaveResult={handleSaveResult}
        onAddToRecord={handleSaveRecord}
        onMakeReport={handleMakeReportClick}
      />

      {/* 3. Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportData={{
          studentName,
          groupName,
          selectedSession,
          selectedDate,
          juzPageData,
          mistakeData,
          stuckData,
          comment,
        }}
      />
    </div>
  );
}
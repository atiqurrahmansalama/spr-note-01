import { useState } from "react";
import HeaderDateControl from "./HeaderDateControl";
import SessionInput from "./SessionInput";
import ReportModal from "./ReportModal";
import { useReportForm } from "./useReportForm";
import { useToast } from "../../context/ToastContext";
import { useFont } from "../../context/useFont";

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
    handleSaveResult,
    handleSaveRecord,
  } = useReportForm();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleMakeReportClick = () => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
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
      {/* 1. Header Card (Clean & Minimal with Dynamic Theme) */}
      <div className="theme-bg-surface rounded-2xl p-4 sm:p-5 text-center shadow-lg space-y-1.5 sm:space-y-2 relative z-10 border theme-border">
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
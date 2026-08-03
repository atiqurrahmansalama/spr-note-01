import { useState } from "react";
import HeaderDateControl from "./HeaderDateControl";
import SessionInput from "./SessionInput";
import ReportModal from "./ReportModal";
import { useReportForm } from "./useReportForm";
import { generateReportText } from "../../utils/reportGenerator";
import { useToast } from "../../context/ToastContext";

export default function HifzReportForm({ timeZone, dateFormat }) {
  const { showToast } = useToast();

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
  const [reportText, setReportText] = useState("");

  const handleMakeReportClick = () => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return;
    }

    const text = generateReportText({
      studentName,
      groupName,
      selectedSession,
      selectedDate,
      juzPageData,
      mistakeData,
      stuckData,
      comment,
    });

    setReportText(text);
    setIsReportModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs font-mono">
        Connecting to Backend Database...
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-12 font-sans text-slate-200 relative">
      {/* 1. Header Card */}
      <div className="bg-[#212327] rounded-2xl p-6 text-center shadow-lg space-y-3 relative z-10">
        <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
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
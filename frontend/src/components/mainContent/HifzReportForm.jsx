import HeaderDateControl from "./HeaderDateControl";
import SessionInput from "./SessionInput";
import { useReportForm } from "./hooks/useReportForm";

export default function HifzReportForm({ timeZone, dateFormat }) {
  const {
    setSelectedDate, // 👈 selectedDate সরিয়ে দেওয়া হলো
    studentName,
    setStudentName,
    groupName,
    setGroupName,
    selectedSession,
    setSelectedSession,
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
      />

      {/* 3. Action Button */}
      <div className="pt-2">
        <button
          onClick={handleSaveRecord}
          className="w-full bg-[#2c2d31] hover:bg-[#34353a] text-slate-200 font-semibold py-3.5 px-4 rounded-2xl shadow-lg transition"
        >
          Add to Record
        </button>
      </div>
    </div>
  );
}
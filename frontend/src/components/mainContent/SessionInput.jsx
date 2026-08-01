import StudentInput from "./nameInputSection/StudentInput";
import AutocompleteDropdown from "../common/AutocompleteDropdown";

export default function SessionInput({
  studentDatabase,
  studentName,
  groupName,
  sessionList,
  selectedSession,
  isPanelOpen,
  pendingName,
  availableGroups,
  onStudentSelect,
  onGroupNameChange,
  onSessionChange,
  onOpenSavePanel,
  onCloseSavePanel,
  onSaveResult,
}) {
  const sessionOptions = sessionList.map((s) => ({
    label: typeof s === "object" ? (s.name || s.label) : s,
    value: typeof s === "object" ? (s.name || s.value) : s,
  }));

  return (
    <div className="bg-[#212327] rounded-2xl p-5 shadow-lg space-y-4 relative z-0">
      {/* 1. Student Input Section */}
      <StudentInput
        studentDatabase={studentDatabase}
        studentName={studentName}
        groupName={groupName}
        isPanelOpen={isPanelOpen}
        pendingName={pendingName}
        availableGroups={availableGroups}
        onStudentSelect={onStudentSelect}
        onGroupNameChange={onGroupNameChange}
        onOpenSavePanel={onOpenSavePanel}
        onCloseSavePanel={onCloseSavePanel}
        onSaveResult={onSaveResult}
      />

      {/* 2. Session Dropdown Section */}
      <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 w-16">
          SESSION
        </label>
        <div className="flex-1">
          <AutocompleteDropdown
            options={sessionOptions}
            value={selectedSession}
            onChange={(sel) => onSessionChange(typeof sel === "object" ? sel.label : sel)}
            placeholder="Select session..."
          />
        </div>
      </div>
    </div>
  );
}
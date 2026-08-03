import AutocompleteDropdown from "../ui/AutocompleteDropdown";
import StudentSavePanel from "./StudentSavePanel";

export default function StudentInput({
  studentDatabase,
  studentName,
  groupName,
  isPanelOpen,
  pendingName,
  availableGroups,
  onStudentSelect,
  onGroupNameChange,
  onOpenSavePanel,
  onCloseSavePanel,
  onSaveResult,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-4">
      <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary w-full sm:w-20 sm:mt-3 shrink-0">
        STUDENT
      </label>
      <div className="flex-1 w-full min-w-0">
        <AutocompleteDropdown
          options={studentDatabase}
          value={studentName}
          onChange={onStudentSelect}
          onAddNew={onOpenSavePanel}
          placeholder="Search student..."
        />

        <input
          type="text"
          value={groupName}
          onChange={(e) => onGroupNameChange(e.target.value)}
          className="w-full bg-transparent text-[11px] theme-text-secondary mt-1 pl-1 focus:outline-none focus:theme-text-primary transition-colors"
          placeholder="Group Name"
        />

        {/* Save Panel Modal */}
        <StudentSavePanel
          isOpen={isPanelOpen}
          onClose={onCloseSavePanel}
          initialName={pendingName}
          studentOptions={studentDatabase}
          groups={availableGroups}
          onSave={onSaveResult}
        />
      </div>
    </div>
  );
}
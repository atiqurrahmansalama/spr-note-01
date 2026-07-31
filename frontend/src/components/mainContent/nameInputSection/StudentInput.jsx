// 🟢 সঠিক ইমপোর্ট পাথ (AutocompleteDropdown):
import AutocompleteDropdown from "../../common/AutocompleteDropdown";
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
    <div className="flex items-center justify-between gap-4">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 w-16">
        STUDENT
      </label>
      <div className="flex-1">
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
          className="w-full bg-transparent text-[11px] text-slate-500 mt-1 pl-1 focus:outline-none focus:text-slate-300"
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
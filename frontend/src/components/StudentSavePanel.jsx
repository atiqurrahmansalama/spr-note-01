import { useState } from "react";
import AutocompleteDropdown from "./common/AutocompleteDropdown";

export default function StudentSavePanel({ isOpen, onClose, initialName, studentOptions = [], groups = [], onSave }) {
  const [actionType, setActionType] = useState(null); // 'NEW' or 'REPLACE'
  const [selectedGroup, setSelectedGroup] = useState("");
  const [targetReplaceStudent, setTargetReplaceStudent] = useState("");

  if (!isOpen) return null;

  const handleFinalSubmit = () => {
    if (!actionType) return;

    onSave({
      type: actionType,
      name: initialName,
      group: selectedGroup || (groups.length > 0 ? groups[0] : "Default Group"),
      replacedStudent: targetReplaceStudent,
    });

    setActionType(null);
    onClose();
  };

  return (
    <div className="bg-[#1c1d1f] rounded-2xl p-4 mt-2 space-y-4 shadow-xl transition-all">
      {/* Header & Detected Name Inline */}
      <div className="flex justify-between items-center border-b border-slate-800/50 pb-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Detected Name:</span>
          <span className="font-serif font-bold text-indigo-400 text-sm">"{initialName}"</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs px-1">
          ✕
        </button>
      </div>

      {/* Step 1: Mode Selection */}
      {!actionType ? (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setActionType("NEW")}
            className="p-3 bg-[#17181a] hover:bg-indigo-950/30 rounded-xl text-left transition-colors group"
          >
            <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">Create New Record</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Save as a new student entry</p>
          </button>

          <button
            onClick={() => setActionType("REPLACE")}
            className="p-3 bg-[#17181a] hover:bg-indigo-950/30 rounded-xl text-left transition-colors group"
          >
            <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">Replace Existing Name</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Update an existing student</p>
          </button>
        </div>
      ) : (
        /* Step 2: Form with Dynamic Autocomplete Dropdowns */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-indigo-400 uppercase tracking-wider">
              Mode: {actionType === "NEW" ? "New Record" : "Replace Record"}
            </span>
            <button onClick={() => setActionType(null)} className="text-slate-500 hover:text-slate-300">
              Change Mode
            </button>
          </div>

          {/* Replace Target Student Dropdown (Fetches dynamically from backend database) */}
          {actionType === "REPLACE" && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Select Existing Student to Replace
              </label>
              <AutocompleteDropdown
                options={studentOptions}
                value={targetReplaceStudent}
                onChange={(selected) =>
                  setTargetReplaceStudent(typeof selected === "object" ? selected.label : selected)
                }
                placeholder="Choose or search student from database..."
              />
            </div>
          )}

          {/* Assign Group (Dynamic Options or Custom Input) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Assign Group</label>
            <AutocompleteDropdown
              options={groups}
              value={selectedGroup}
              onChange={(selected) => setSelectedGroup(typeof selected === "object" ? selected.label : selected)}
              placeholder="Select or type group name..."
            />
          </div>

          {/* Actions */}
          <div className="pt-1 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#17181a] hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalSubmit}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
            >
              Save Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
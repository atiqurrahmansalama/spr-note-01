import { useState } from "react";

export default function StudentSaveModal({ isOpen, onClose, initialName, groups = [], onSave }) {
  const [actionType, setActionType] = useState(null); // 'NEW' or 'REPLACE'
  const [selectedGroup, setSelectedGroup] = useState(groups[0] || "MI Junaid's Group");
  const [targetReplaceStudent, setTargetReplaceStudent] = useState("");

  if (!isOpen) return null;

  const handleFinalSubmit = () => {
    if (!actionType) return;

    onSave({
      type: actionType,
      name: initialName,
      group: selectedGroup,
      replacedStudent: targetReplaceStudent,
    });

    // Reset & Close
    setActionType(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#212327] border border-slate-700/80 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200 font-sans">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-serif font-bold text-base text-slate-100">
            Student Record Management
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
            ✕
          </button>
        </div>

        {/* Input Name Display */}
        <div className="bg-[#17181a] p-3 rounded-xl border border-slate-800">
          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
            Detected Name
          </p>
          <p className="text-sm font-serif font-semibold text-indigo-300 mt-0.5">
            "{initialName}"
          </p>
        </div>

        {/* Step 1: Option Selection */}
        {!actionType ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-medium text-slate-400">Choose Action Type:</p>
            
            <button
              onClick={() => setActionType("NEW")}
              className="w-full p-3.5 bg-[#17181a] hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
            >
              <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                Create New Student Record
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Save this as a brand new entry in database.
              </p>
            </button>

            <button
              onClick={() => setActionType("REPLACE")}
              className="w-full p-3.5 bg-[#17181a] hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
            >
              <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                Replace Existing Student Name
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Update an existing student's record with this new name.
              </p>
            </button>
          </div>
        ) : (
          /* Step 2: Action Details Form */
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Mode: {actionType === "NEW" ? "New Entry" : "Replace Existing"}
              </span>
              <button
                onClick={() => setActionType(null)}
                className="text-[11px] text-slate-500 hover:underline"
              >
                Change Mode
              </button>
            </div>

            {/* Replace target selection */}
            {actionType === "REPLACE" && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Select Existing Student to Replace
                </label>
                <select
                  value={targetReplaceStudent}
                  onChange={(e) => setTargetReplaceStudent(e.target.value)}
                  className="w-full bg-[#17181a] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Existing Record --</option>
                  <option value="Mehroz Cheema">Mehroz Cheema</option>
                  <option value="Abdullah Al-Mamun">Abdullah Al-Mamun</option>
                  <option value="Hassan Mahmud">Hassan Mahmud</option>
                </select>
              </div>
            )}

            {/* Group Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Assign Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-[#17181a] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {groups.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-[#17181a] hover:bg-slate-800 text-slate-400 font-semibold py-2.5 rounded-xl border border-slate-800 text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg"
              >
                Save Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
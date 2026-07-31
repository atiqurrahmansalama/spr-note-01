import { useState } from "react";
import { useToast } from "../../../context/ToastContext";

export default function StudentSavePanel({
  isOpen,
  onClose,
  initialName,
  studentOptions = [],
  groups = [],
  onSave,
}) {
  const { showToast } = useToast();

  const [mode, setMode] = useState("NEW"); // "NEW" | "REPLACE"
  const [typedName, setTypedName] = useState("");
  const name = typedName || initialName || "";

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedOldStudent, setSelectedOldStudent] = useState("");

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("Student name cannot be empty", "warning");
      return;
    }

    if (mode === "REPLACE" && !selectedOldStudent) {
      showToast("Please select a student to replace", "warning");
      return;
    }

    // 🚀 ১. মূল HifzReportForm-এর handleSaveResult কল করবে যা ব্যাকএন্ড ডাটাবেজে POST রিকোয়েস্ট পাঠাবে
    if (onSave) {
      await onSave({
        mode,
        name,
        group: selectedGroup || "General Group",
        oldStudent: selectedOldStudent,
      });
    }

    setTypedName("");
    onClose();
  };

  return (
    <div className="mt-3 bg-[#18191b] border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span className="text-xs font-semibold text-slate-300">
          Save Student Action
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs px-1"
        >
          ✕
        </button>
      </div>

      {/* Toggle Action Type */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("NEW")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            mode === "NEW"
              ? "bg-slate-800 border-slate-700 text-indigo-300"
              : "bg-[#1c1d1f] border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          + Add as New
        </button>
        <button
          type="button"
          onClick={() => setMode("REPLACE")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            mode === "REPLACE"
              ? "bg-slate-800 border-slate-700 text-indigo-300"
              : "bg-[#1c1d1f] border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          ⇄ Replace Existing
        </button>
      </div>

      {/* Input Name */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase text-slate-500">
          Student Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setTypedName(e.target.value)}
          className="w-full bg-[#1c1d1f] border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-600"
          placeholder="Enter student name..."
        />
      </div>

      {/* Replace Dropdown Mode */}
      {mode === "REPLACE" && (
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-slate-500">
            Select Existing Student to Replace
          </label>
          <select
            value={selectedOldStudent}
            onChange={(e) => setSelectedOldStudent(e.target.value)}
            className="w-full bg-[#1c1d1f] border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-600"
          >
            <option value="">-- Choose Student --</option>
            {studentOptions.map((opt, i) => (
              <option key={i} value={opt.label || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Select Group */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase text-slate-500">
          Group / Course
        </label>
        <input
          type="text"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full bg-[#1c1d1f] border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-slate-600"
          placeholder="e.g. General Group"
          list="group-suggestions"
        />
        {groups.length > 0 && (
          <datalist id="group-suggestions">
            {groups.map((grp, i) => (
              <option key={i} value={grp} />
            ))}
          </datalist>
        )}
      </div>

      {/* Action Submit */}
      <div className="pt-1 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs py-2 rounded-lg font-medium transition"
        >
          Confirm & Save
        </button>
      </div>
    </div>
  );
}
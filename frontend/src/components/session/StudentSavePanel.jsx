import { useState } from "react";
import { useToast } from "../../context/ToastContext";

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
    <div className="mt-3 theme-bg-sub border theme-border rounded-xl p-4 space-y-3 animate-fade-in shadow-inner">
      <div className="flex items-center justify-between border-b theme-border pb-2">
        <span className="text-xs font-semibold theme-text-primary">
          Save Student Action
        </span>
        <button
          onClick={onClose}
          className="theme-text-secondary hover:theme-text-primary text-xs px-1 transition-colors"
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
              ? "theme-bg-elevated theme-border theme-accent"
              : "theme-bg-app theme-border theme-text-secondary hover:theme-text-primary"
          }`}
        >
          + Add as New
        </button>
        <button
          type="button"
          onClick={() => setMode("REPLACE")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            mode === "REPLACE"
              ? "theme-bg-elevated theme-border theme-accent"
              : "theme-bg-app theme-border theme-text-secondary hover:theme-text-primary"
          }`}
        >
          ⇄ Replace Existing
        </button>
      </div>

      {/* Input Name */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase theme-text-secondary">
          Student Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setTypedName(e.target.value)}
          className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          placeholder="Enter student name..."
        />
      </div>

      {/* Replace Dropdown Mode */}
      {mode === "REPLACE" && (
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase theme-text-secondary">
            Select Existing Student to Replace
          </label>
          <select
            value={selectedOldStudent}
            onChange={(e) => setSelectedOldStudent(e.target.value)}
            className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
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
        <label className="text-[10px] font-mono uppercase theme-text-secondary">
          Group / Course
        </label>
        <input
          type="text"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
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
          className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text text-xs py-2.5 rounded-lg font-semibold transition shadow"
        >
          Confirm & Save
        </button>
      </div>
    </div>
  );
}
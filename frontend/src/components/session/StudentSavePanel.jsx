import { useState, useRef, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import AutocompleteDropdown from "../ui/AutocompleteDropdown";

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

  const addBtnRef = useRef(null);
  const replaceBtnRef = useRef(null);
  const nameInputRef = useRef(null);
  const replaceSelectRef = useRef(null);
  const groupInputRef = useRef(null);

  // Auto-focus "+ Add as New" button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (addBtnRef.current) addBtnRef.current.focus();
      }, 60);
    }
  }, [isOpen]);

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

  // Keyboard navigation for mode buttons (+ Add as New / ⇄ Replace Existing)
  const handleModeKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextMode = mode === "NEW" ? "REPLACE" : "NEW";
      setMode(nextMode);
      setTimeout(() => {
        if (nextMode === "NEW" && addBtnRef.current) addBtnRef.current.focus();
        if (nextMode === "REPLACE" && replaceBtnRef.current) replaceBtnRef.current.focus();
      }, 30);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (nameInputRef.current) nameInputRef.current.focus();
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (mode === "REPLACE" && replaceSelectRef.current) {
        replaceSelectRef.current.focus();
      } else if (groupInputRef.current) {
        groupInputRef.current.focus();
      }
    }
  };

  const groupOptions = (groups.length > 0 ? groups : ["General Group"]).map((g) => ({
    label: typeof g === "string" ? g : (g.label || g),
    value: typeof g === "string" ? g : (g.value || g),
  }));

  return (
    <div className="mt-3 theme-bg-sub border theme-border rounded-xl p-4 space-y-3 animate-fade-in shadow-inner">
      <div className="flex items-center justify-between border-b theme-border pb-2">
        <span className="text-xs font-semibold theme-text-primary">
          Save Student Action
        </span>
        <button
          type="button"
          onClick={onClose}
          className="theme-text-secondary hover:theme-text-primary text-xs px-1 transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Toggle Action Type */}
      <div className="flex gap-2 text-xs">
        <button
          ref={addBtnRef}
          type="button"
          onClick={() => setMode("NEW")}
          onKeyDown={handleModeKeyDown}
          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] ${
            mode === "NEW"
              ? "theme-bg-elevated theme-border theme-accent font-bold"
              : "theme-bg-app theme-border theme-text-secondary hover:theme-text-primary"
          }`}
        >
          + Add as New
        </button>
        <button
          ref={replaceBtnRef}
          type="button"
          onClick={() => setMode("REPLACE")}
          onKeyDown={handleModeKeyDown}
          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] ${
            mode === "REPLACE"
              ? "theme-bg-elevated theme-border theme-accent font-bold"
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
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setTypedName(e.target.value)}
          onKeyDown={handleNameKeyDown}
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
            ref={replaceSelectRef}
            value={selectedOldStudent}
            onChange={(e) => setSelectedOldStudent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (groupInputRef.current) groupInputRef.current.focus();
              }
            }}
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

      {/* Select Group / Course Dropdown */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase theme-text-secondary">
          Group / Course
        </label>
        <AutocompleteDropdown
          inputRef={groupInputRef}
          options={groupOptions}
          value={selectedGroup}
          onChange={(val) => setSelectedGroup(typeof val === "object" ? val.label : val)}
          onNextFocus={handleSave}
          placeholder="e.g. General Group"
        />
      </div>

      {/* Action Submit */}
      <div className="pt-1 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text text-xs py-2.5 rounded-lg font-semibold transition shadow cursor-pointer"
        >
          Confirm & Save (Enter)
        </button>
      </div>
    </div>
  );
}
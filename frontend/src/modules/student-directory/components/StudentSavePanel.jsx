import { useState, useRef, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import AutocompleteDropdown from "../../../components/ui/AutocompleteDropdown";

export default function StudentSavePanel({
  isOpen,
  onClose,
  initialName,
  studentOptions = [],
  groups = [],
  onSave,
}) {
  const { showToast } = useToast();

  const [mode, setMode] = useState("NEW");
  const [typedName, setTypedName] = useState("");
  const name = typedName || initialName || "";

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedOldStudent, setSelectedOldStudent] = useState("");

  const addBtnRef = useRef(null);
  const replaceBtnRef = useRef(null);
  const nameInputRef = useRef(null);
  const replaceSelectRef = useRef(null);
  const groupInputRef = useRef(null);

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
        group: selectedGroup || "",
        oldStudent: selectedOldStudent,
      });
    }

    setTypedName("");
    onClose();
  };

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

  const groupOptions = groups.map((g) => ({
    label: typeof g === "string" ? g : (g.label || g.name || g),
    value: typeof g === "string" ? g : (g.value || g.name || g),
  }));

  return (
    <div className="mt-4 theme-bg-surface border theme-border rounded-2xl p-4.5 space-y-4 animate-fade-in shadow-xl relative z-20">
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <span className="text-xs font-bold theme-text-primary tracking-wide">
          Save Student Record
        </span>
        <button
          type="button"
          onClick={onClose}
          className="theme-text-secondary hover:theme-text-primary text-xs p-1 rounded-lg hover:theme-bg-sub transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 text-xs">
        <button
          ref={addBtnRef}
          type="button"
          onClick={() => setMode("NEW")}
          onKeyDown={handleModeKeyDown}
          className={`flex-1 px-3 py-2 rounded-xl border font-semibold transition cursor-pointer focus:outline-none ${
            mode === "NEW"
              ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-accent shadow-sm"
              : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
          }`}
        >
          Add as New
        </button>
        <button
          ref={replaceBtnRef}
          type="button"
          onClick={() => setMode("REPLACE")}
          onKeyDown={handleModeKeyDown}
          className={`flex-1 px-3 py-2 rounded-xl border font-semibold transition cursor-pointer focus:outline-none ${
            mode === "REPLACE"
              ? "theme-bg-elevated border-[var(--accent-main)]/60 theme-accent shadow-sm"
              : "theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
          }`}
        >
          Replace Existing
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
          Student Name
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setTypedName(e.target.value)}
          onKeyDown={handleNameKeyDown}
          className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          placeholder="Enter student name..."
        />
      </div>

      {mode === "REPLACE" && (
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
            Select Existing Student to Replace
          </label>
          <AutocompleteDropdown
            inputRef={replaceSelectRef}
            options={studentOptions}
            value={selectedOldStudent}
            onChange={(sel) => {
              const label = typeof sel === "object" ? (sel.label || sel.name) : sel;
              setSelectedOldStudent(label);
            }}
            onNextFocus={() => {
              if (groupInputRef.current) groupInputRef.current.focus();
            }}
            placeholder="Search or choose student to replace..."
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider theme-text-secondary mb-1">
          Group / Course
        </label>
        <AutocompleteDropdown
          inputRef={groupInputRef}
          options={groupOptions}
          value={selectedGroup}
          onChange={(val) => {
            const groupVal = typeof val === "object" ? (val.label || val.value) : val;
            setSelectedGroup(groupVal);
          }}
          onNextFocus={() => {}}
          placeholder="e.g. General Group"
        />
      </div>

      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 theme-bg-accent hover:opacity-90 theme-accent-text text-xs py-2.5 rounded-xl font-bold transition shadow cursor-pointer active:scale-95"
        >
          Confirm &amp; Save
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  CloseIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  SparklesIcon,
} from "../ui/Icons";
import CustomSelect from "../ui/CustomSelect";
import { calendarEventKindsStore, calendarEventTypesStore } from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { useToast } from "../../context/ToastContext";

export default function ManageEventKindsModal({ isOpen, onClose, onKindsUpdated }) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [kinds, setKinds] = useState([]);
  const [typesList, setTypesList] = useState([]);

  // Adding state
  const [newLabel, setNewLabel] = useState("");

  // Editing state
  const [editingVal, setEditingVal] = useState(null);
  const [editLabel, setEditLabel] = useState("");

  // Deleting & Replacement State
  const [deletingKind, setDeletingKind] = useState(null);
  const [replacementVal, setReplacementVal] = useState("");

  const refreshKinds = () => {
    const kList = calendarEventKindsStore.getKinds(activeTenantId);
    const tList = calendarEventTypesStore.getEventTypes(activeTenantId);
    setKinds(kList || []);
    setTypesList(tList || []);
    if (onKindsUpdated) onKindsUpdated(kList);
  };

  useEffect(() => {
    if (isOpen) {
      refreshKinds();
      setDeletingKind(null);
      setEditingVal(null);
    }
  }, [isOpen, activeTenantId]);

  if (!isOpen) return null;

  // Handle Add
  const handleAddKind = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    try {
      calendarEventKindsStore.addKind(activeTenantId, {
        label: newLabel.trim(),
      });
      setNewLabel("");
      showToast(`Event Type "${newLabel.trim()}" created!`, "success");
      refreshKinds();
    } catch (err) {
      showToast("Failed to add event type", "error");
    }
  };

  // Start Edit
  const handleStartEdit = (k) => {
    setEditingVal(k.value);
    setEditLabel(k.label);
    setDeletingKind(null);
  };

  // Save Edit
  const handleSaveEdit = (oldVal) => {
    if (!editLabel.trim()) return;
    try {
      calendarEventKindsStore.updateKind(activeTenantId, oldVal, {
        label: editLabel.trim(),
      });
      setEditingVal(null);
      showToast(`Event Type updated!`, "success");
      refreshKinds();
    } catch (err) {
      showToast("Failed to update event type", "error");
    }
  };

  // Start Delete prompt
  const handlePromptDelete = (k) => {
    const remaining = kinds.filter((item) => item.value !== k.value);
    if (remaining.length === 0) {
      showToast("Cannot delete the last remaining Event Type.", "warning");
      return;
    }
    setDeletingKind(k);
    setReplacementVal(remaining[0].value);
  };

  // Confirm Delete with Replacement
  const handleConfirmDelete = () => {
    if (!deletingKind || !replacementVal) return;
    try {
      calendarEventKindsStore.deleteKind(activeTenantId, deletingKind.value, replacementVal);
      const repObj = kinds.find((k) => k.value === replacementVal);
      showToast(`Deleted "${deletingKind.label}". Assigned items migrated to "${repObj?.label || replacementVal}".`, "info");
      setDeletingKind(null);
      refreshKinds();
    } catch (err) {
      showToast("Failed to delete event type", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in text-left select-none">
      <div className="w-full max-w-lg rounded-2xl theme-bg-surface border theme-border shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b theme-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl theme-bg-accent-soft theme-accent">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">Manage Event Types</h3>
              <p className="text-xs theme-text-secondary">Add, edit, or delete event categories and types</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Delete & Replace Confirmation Dialog Overlay */}
        {deletingKind ? (
          <div className="p-4 rounded-xl border theme-border theme-bg-sub/80 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 theme-text-primary font-bold text-sm">
              <TrashIcon className="w-4 h-4" />
              <span>Delete Event Type: "{deletingKind.label}"</span>
            </div>
            <p className="text-xs theme-text-secondary">
              Items currently assigned to <strong>"{deletingKind.label}"</strong> will need a replacement type. Please choose which type will replace it:
            </p>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Replacement Event Type <span className="theme-accent">*</span>
              </label>
              <CustomSelect
                value={replacementVal}
                onChange={(val) => setReplacementVal(val)}
                options={kinds.filter((k) => k.value !== deletingKind.value)}
                placeholder="Select replacement..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingKind(null)}
                className="px-3 py-1.5 rounded-xl border theme-border hover:theme-bg-surface text-xs font-semibold theme-text-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm hover:opacity-90"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Confirm & Replace</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* List of Types with Increased Height */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-80 sm:max-h-96 pr-1 custom-scrollbar">
              {kinds.map((k) => {
                const isEditing = editingVal === k.value;
                const assignedCount = typesList.filter((t) => t.type === k.value).length;

                if (isEditing) {
                  return (
                    <div key={k.value} className="p-3 rounded-xl border theme-border theme-bg-sub space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none"
                          placeholder="Type Name"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(k.value)}
                          className="px-3 py-1.5 rounded-lg theme-bg-accent theme-accent-text text-xs font-bold cursor-pointer hover:opacity-90"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingVal(null)}
                          className="px-2.5 py-1.5 rounded-lg border theme-border text-xs font-semibold theme-text-secondary cursor-pointer hover:theme-bg-surface"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={k.value}
                    className="p-3 rounded-xl border theme-border theme-bg-surface hover:theme-bg-elevated transition flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full theme-bg-accent shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold theme-text-primary truncate">{k.label}</h4>
                        <p className="text-[10px] theme-text-secondary font-mono">
                          {assignedCount > 0 ? `${assignedCount} item${assignedCount > 1 ? "s" : ""} linked` : "No items linked"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(k)}
                        className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                        title="Edit Type Name"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePromptDelete(k)}
                        className="p-1.5 rounded-lg border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                        title="Delete Type"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Type Form */}
            <form onSubmit={handleAddKind} className="pt-3 border-t theme-border space-y-2">
              <label className="block text-xs font-semibold theme-text-secondary">
                Add New Event Type
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Workshop / কর্মশালা"
                  className="flex-1 text-xs px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
                />
                <button
                  type="submit"
                  disabled={!newLabel.trim()}
                  className="px-3.5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs hover:opacity-90"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Type</span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* Footer */}
        <div className="pt-2 border-t theme-border flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

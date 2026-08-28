import React, { useState } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import {
  AlertTriangleIcon,
  StudentIcon,
  GroupIcon,
  ShieldIcon,
  TransferIcon,
  CloseIcon,
  ClassIcon,
} from "../../../../components/ui/Icons";
import CustomSelect from "../../../../components/ui/CustomSelect";

export default function ClassMigrationModal({
  isOpen,
  onClose,
  deletingClass,
  availableClasses = [],
  onSuccess,
}) {
  const { showToast } = useToast();
  const [targetClassId, setTargetClassId] = useState("");
  const [migrating, setMigrating] = useState(false);

  if (!isOpen || !deletingClass) return null;

  // Filter out self to ensure Guardrail 1 (Self-Target Prevention)
  const eligibleClasses = availableClasses.filter(
    (c) => c.id !== deletingClass.id && !c.is_deleted
  );

  const handleMigrateAndDelete = async () => {
    if (!targetClassId) {
      showToast("Please select a destination class for migration.", "warning");
      return;
    }

    if (targetClassId === deletingClass.id) {
      showToast("Destination class cannot be the same class (Self-Migration Prohibited).", "error");
      return;
    }

    setMigrating(true);
    try {
      const res = await fetchWithAuth(
        `/api/v1/classes/${deletingClass.id}/delete-with-migration/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_class_id: targetClassId }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        showToast(
          data.message || `Successfully migrated students to ${data.target_class}!`,
          "success"
        );
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to execute class migration.", "error");
      }
    } catch {
      showToast("Network error during class migration.", "error");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl theme-bg-surface border theme-border shadow-2xl p-6 space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Warning Accent */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl theme-bg-amber-soft theme-amber border theme-border">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold theme-text-primary">
                Migrate Students &amp; Delete Class
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Class <span className="font-semibold theme-text-primary">"{deletingClass.name}"</span> has enrolled students.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Impact Warning Banner */}
        <div className="p-4 rounded-xl theme-bg-amber-soft/50 border theme-border-amber space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold theme-amber">
            <ShieldIcon className="w-4 h-4" />
            <span>Zero Data Loss Protection</span>
          </div>
          <p className="theme-text-secondary leading-relaxed">
            All active students currently enrolled in <strong className="theme-text-primary">{deletingClass.name}</strong> will be safely reassigned to your selected destination class before this class is retired.
          </p>
        </div>

        {/* Target Destination Class Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold theme-text-primary block">
            Target Destination Class <span className="text-rose-500">*</span>
          </label>
          <CustomSelect
            value={targetClassId}
            onChange={(val) => setTargetClassId(val)}
            options={eligibleClasses.map((c) => ({
              value: String(c.id),
              label: `${c.name}${c.code ? ` (${c.code})` : ""} — ${c.department_name || "General"}`,
            }))}
            placeholder="Select Destination Class..."
            icon={ClassIcon}
          />
          {eligibleClasses.length === 0 && (
            <p className="text-[11px] text-rose-500 mt-1">
              No alternative classes available in this institution. Please create another class first.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            disabled={migrating}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-sub theme-text-primary hover:opacity-90 border theme-border transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMigrateAndDelete}
            disabled={migrating || !targetClassId || eligibleClasses.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <TransferIcon className="w-3.5 h-3.5" />
            <span>{migrating ? "Migrating..." : "Migrate & Delete"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

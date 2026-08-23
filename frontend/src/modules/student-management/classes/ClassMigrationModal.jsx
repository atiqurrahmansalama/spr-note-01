import React, { useState } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  AlertTriangleIcon,
  StudentIcon,
  GroupIcon,
  ShieldIcon,
  TransferIcon,
  CloseIcon,
  ClassIcon,
} from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";

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
        const err = await res.json();
        const msg =
          err.target_class_id?.[0] ||
          err.error ||
          err.detail ||
          "Failed to migrate and delete class.";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error during class migration.", "error");
    } finally {
      setMigrating(false);
    }
  };

  const studentCount = deletingClass.student_count ?? 0;
  const groupCount = deletingClass.group_count ?? 0;

  const destinationOptions = eligibleClasses.map((c) => ({
    value: String(c.id),
    label: `${c.name}${c.code ? ` (${c.code})` : ""} • ${c.student_count || 0} Students`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-left">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">
                Safe Class Decommission &amp; Migration
              </h3>
              <p className="text-xs theme-text-secondary">
                Decommission "{deletingClass.name}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Affected summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl theme-bg-accent-soft border theme-border flex items-center justify-center shrink-0 theme-accent">
              <StudentIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                Affected Students
              </span>
              <span className="text-base font-extrabold theme-text-primary">
                {studentCount} Students
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl theme-bg-accent-soft border theme-border flex items-center justify-center shrink-0 theme-accent">
              <GroupIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                Assigned Groups
              </span>
              <span className="text-base font-extrabold theme-text-primary">
                {groupCount} Groups
              </span>
            </div>
          </div>
        </div>

        {/* Enterprise Safety Banner */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-xs leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1.5 theme-text-primary">
            <ShieldIcon className="w-4 h-4 theme-accent shrink-0" />
            <span>Atomic Enterprise Guarantee</span>
          </p>
          <p className="theme-text-secondary">
            All enrolled students and groups under <strong className="theme-text-primary">{deletingClass.name}</strong> will be atomically transferred to the destination class selected below. Their historical records will receive closed timestamps and new active movement logs automatically.
          </p>
        </div>

        {/* Destination Class Selector */}
        <div className="space-y-2">
          {eligibleClasses.length > 0 ? (
            <CustomSelect
              label="Select Destination Class *"
              value={targetClassId}
              onChange={(val) => setTargetClassId(val)}
              options={destinationOptions}
              placeholder="Choose Target Destination Class..."
              icon={ClassIcon}
              searchable
            />
          ) : (
            <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-xs flex items-center gap-2 theme-text-secondary">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 theme-accent" />
              <span>No alternative active classes available in system. You must create or activate another class before migrating and decommissioning this class.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={migrating || eligibleClasses.length === 0 || !targetClassId}
            onClick={handleMigrateAndDelete}
            className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <TransferIcon className="w-3.5 h-3.5" />
            <span>{migrating ? "Migrating Students..." : "Migrate Students & Decommission"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

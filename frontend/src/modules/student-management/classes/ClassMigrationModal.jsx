import React, { useState } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  AlertTriangleIcon,
  StudentIcon,
  GroupIcon,
  ShieldIcon,
  TransferIcon,
  CloseIcon
} from "../../../components/ui/Icons";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg theme-bg-surface border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold text-lg">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-400">
                Safe Class Decommission &amp; Migration
              </h3>
              <p className="text-xs theme-text-secondary">
                Decommission "{deletingClass.name}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Affected summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <StudentIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                  Affected Students
                </span>
                <span className="text-lg font-extrabold text-amber-400">
                  {studentCount} Students
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                <GroupIcon className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                  Assigned Groups
                </span>
                <span className="text-lg font-extrabold text-sky-400">
                  {groupCount} Groups
                </span>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Atomic Enterprise Guarantee</span>
            </p>
            <p className="opacity-90">
              All enrolled students and groups under <strong>{deletingClass.name}</strong> will be atomically transferred to the destination class selected below. Their historical records will receive closed timestamps and new active movement logs automatically.
            </p>
          </div>

          {/* Destination Class Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center justify-between">
              <span>Select Destination Class <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-emerald-400 font-normal">Active Classes Only</span>
            </label>
            {eligibleClasses.length > 0 ? (
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-sky-500/30 theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-sky-400"
              >
                <option value="">-- Choose Target Destination Class --</option>
                {eligibleClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || "No Code"}) • Current Students: {c.student_count || 0}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 shrink-0 text-rose-400" />
                <span>No alternative active classes available in system. You must create or activate another class before migrating and decommissioning this class.</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={migrating || eligibleClasses.length === 0 || !targetClassId}
              onClick={handleMigrateAndDelete}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TransferIcon className="w-3.5 h-3.5" />
              <span>{migrating ? "Migrating Students..." : "Migrate Students & Decommission"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

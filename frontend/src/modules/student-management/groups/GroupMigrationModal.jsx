import React, { useState } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  AlertTriangleIcon,
  StudentIcon,
  ShieldIcon,
  TransferIcon,
  CloseIcon
} from "../../../components/ui/Icons";

export default function GroupMigrationModal({
  isOpen,
  onClose,
  deletingGroup,
  availableGroups = [],
  onSuccess,
}) {
  const { showToast } = useToast();
  const [targetGroupId, setTargetGroupId] = useState("");
  const [migrating, setMigrating] = useState(false);

  if (!isOpen || !deletingGroup) return null;

  // Filter out self to ensure Guardrail 1 (Self-Target Prevention)
  const eligibleGroups = availableGroups.filter(
    (g) => g.id !== deletingGroup.id && !g.is_deleted
  );

  const handleMigrateAndDelete = async () => {
    if (!targetGroupId) {
      showToast("Please select a target destination group.", "warning");
      return;
    }

    if (String(targetGroupId) === String(deletingGroup.id)) {
      showToast("Destination group cannot be the same group (Self-Migration Prohibited).", "error");
      return;
    }

    setMigrating(true);
    try {
      const res = await fetchWithAuth(
        `/api/v1/groups/${deletingGroup.id}/delete-with-migration/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_group_id: targetGroupId }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        showToast(
          data.message || `Successfully transferred students to ${data.target_group}!`,
          "success"
        );
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        const msg =
          err.target_group_id?.[0] ||
          err.error ||
          err.detail ||
          "Failed to transfer students and delete group.";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error during group migration.", "error");
    } finally {
      setMigrating(false);
    }
  };

  const studentCount = deletingGroup.student_count ?? 0;

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
                Safe Group Decommission &amp; Migration
              </h3>
              <p className="text-xs theme-text-secondary">
                Decommission "{deletingGroup.name}"
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
          {/* Affected summary */}
          <div className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <StudentIcon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                Affected Enrolled Students
              </span>
              <span className="text-xl font-extrabold text-amber-400">
                {studentCount} Students Currently in this Group
              </span>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Zero-Downtime Safe Transfer</span>
            </p>
            <p className="opacity-90">
              Existing students in <strong>{deletingGroup.name}</strong> will be migrated atomically to the target destination group. Their parent class will sync to the new group's parent class automatically, and student history timelines will be timestamped.
            </p>
          </div>

          {/* Target Group Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center justify-between">
              <span>Select Target Group to transfer existing students <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-emerald-400 font-normal">Active Groups Only</span>
            </label>
            {eligibleGroups.length > 0 ? (
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-sky-500/30 theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-sky-400"
              >
                <option value="">-- Select Target Destination Group --</option>
                {eligibleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} [{g.student_class_name || "No Class"}] ({g.student_count || 0}/{g.capacity || "∞"} seats)
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                No alternative groups exist. Please create an alternative target group first before deleting this group.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMigrateAndDelete}
              disabled={migrating || !targetGroupId || eligibleGroups.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-lg disabled:opacity-40 flex items-center gap-2"
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

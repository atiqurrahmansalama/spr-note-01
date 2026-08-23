import React, { useState } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import {
  AlertTriangleIcon,
  StudentIcon,
  ShieldIcon,
  TransferIcon,
  CloseIcon,
  GroupIcon,
} from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";

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

  const groupOptions = eligibleGroups.map((g) => ({
    value: String(g.id),
    label: `${g.name} [${g.student_class_name || "No Class"}] (${g.student_count || 0}/${g.capacity || "∞"} students)`,
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
                Safe Group Decommission &amp; Migration
              </h3>
              <p className="text-xs theme-text-secondary">
                Decommission "{deletingGroup.name}"
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

        {/* Affected summary */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft border theme-border flex items-center justify-center shrink-0 theme-accent">
            <StudentIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
              Affected Enrolled Students
            </span>
            <span className="text-lg font-extrabold theme-text-primary">
              {studentCount} Students Currently in this Group
            </span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-xs leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1.5 theme-text-primary">
            <ShieldIcon className="w-4 h-4 theme-accent shrink-0" />
            <span>Zero-Downtime Safe Transfer</span>
          </p>
          <p className="theme-text-secondary">
            Existing students in <strong className="theme-text-primary">{deletingGroup.name}</strong> will be migrated atomically to the target destination group. Their parent class will sync to the new group's parent class automatically, and student history timelines will be timestamped.
          </p>
        </div>

        {/* Target Group Selector */}
        <div className="space-y-2">
          {eligibleGroups.length > 0 ? (
            <CustomSelect
              label="Select Target Destination Group *"
              value={targetGroupId}
              onChange={(val) => setTargetGroupId(val)}
              options={groupOptions}
              placeholder="Select Target Destination Group..."
              icon={GroupIcon}
              searchable
            />
          ) : (
            <div className="p-3.5 rounded-xl theme-bg-sub border theme-border text-xs theme-text-secondary">
              No alternative groups exist. Please create an alternative target group first before deleting this group.
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
            onClick={handleMigrateAndDelete}
            disabled={migrating || !targetGroupId || eligibleGroups.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-40 flex items-center gap-2"
          >
            <TransferIcon className="w-3.5 h-3.5" />
            <span>{migrating ? "Migrating Students..." : "Migrate Students & Decommission"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

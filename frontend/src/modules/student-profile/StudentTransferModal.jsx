import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { TransferIcon, ClassIcon, GroupIcon, CalendarIcon } from "../../components/ui/Icons";
import Modal from "../../components/ui/Modal";
import CustomSelect from "../../components/ui/CustomSelect";

export default function StudentTransferModal({
  isOpen,
  onClose,
  student = null,
  studentIds = [],
  onSuccess,
}) {
  const { showToast } = useToast();

  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [transitionDate, setTransitionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transitionReason, setTransitionReason] = useState("Annual Promotion & Advancement");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isBulk = Array.isArray(studentIds) && studentIds.length > 0;
  const activeStudentCount = isBulk ? studentIds.length : student ? 1 : 0;

  useEffect(() => {
    if (isOpen) {
      loadClassesAndGroups();
      setTransitionDate(new Date().toISOString().split("T")[0]);
      setTransitionReason("Annual Promotion & Advancement");
      setCustomReason("");
      setTargetClassId(student?.student_class || "");
      setTargetGroupId(student?.student_group || "");
    }
  }, [isOpen, student]);

  const loadClassesAndGroups = async () => {
    try {
      const [classRes, groupRes] = await Promise.all([
        fetchWithAuth("/api/v1/classes/"),
        fetchWithAuth("/api/v1/groups/"),
      ]);

      if (classRes.ok) {
        const cData = await classRes.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }

      if (groupRes.ok) {
        const gData = await groupRes.json();
        setGroups(Array.isArray(gData) ? gData : gData.results || []);
      }
    } catch {}
  };

  if (!isOpen) return null;

  // Filter groups by selected class if class selected, otherwise all groups
  const eligibleGroups = targetClassId
    ? groups.filter((g) => g.student_class === targetClassId || !g.student_class)
    : groups;

  const handleGroupChange = (gid) => {
    setTargetGroupId(gid);
    if (gid) {
      const selectedGrp = groups.find((g) => String(g.id) === String(gid));
      if (selectedGrp && selectedGrp.student_class && !targetClassId) {
        setTargetClassId(selectedGrp.student_class);
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!targetClassId && !targetGroupId) {
      showToast("Please select at least one destination (Class or Group).", "warning");
      return;
    }

    const finalReason =
      transitionReason === "OTHER"
        ? customReason.trim() || "Administrative Transfer"
        : transitionReason;

    setSubmitting(true);

    try {
      if (isBulk) {
        // Bulk Transfer
        const payload = {
          action: "transfer",
          student_ids: studentIds,
          target_class_id: targetClassId || null,
          target_group_id: targetGroupId ? parseInt(targetGroupId, 10) : null,
          transition_date: transitionDate,
          transition_reason: finalReason,
        };

        const res = await fetchWithAuth("/api/v1/students/bulk-action/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast(
            `Successfully transferred ${studentIds.length} students!`,
            "success"
          );
          onSuccess?.();
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Failed to transfer students.", "error");
        }
      } else if (student) {
        // Single Student Transfer
        const payload = {
          target_class_id: targetClassId || null,
          target_group_id: targetGroupId ? parseInt(targetGroupId, 10) : null,
          transition_date: transitionDate,
          transition_reason: finalReason,
        };

        const res = await fetchWithAuth(
          `/api/v1/students/${student.id}/transfer-academic/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const data = await res.json();
          showToast(
            data.message || `Student transferred successfully!`,
            "success"
          );
          onSuccess?.();
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err.error || err.detail || "Failed to transfer student.";
          showToast(msg, "error");
        }
      }
    } catch {
      showToast("Network error during transfer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const reasonOptions = [
    { value: "Annual Promotion & Advancement", label: "Annual Promotion & Advancement" },
    { value: "Mid-Term Performance Elevation", label: "Mid-Term Performance Elevation" },
    { value: "Halqa Capacity Rebalancing", label: "Halqa Capacity Rebalancing" },
    { value: "Guardian Request / Relocation", label: "Guardian Request / Relocation" },
    { value: "Academic Level Adjustment", label: "Academic Level Adjustment" },
    { value: "OTHER", label: "Custom Reason (Specify Below)" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isBulk
          ? `Bulk Transfer Students (${activeStudentCount} Selected)`
          : `Transfer Student Class & Group`
      }
      subtitle={
        isBulk
          ? "Reassign academic class and group for selected students"
          : `For ${student?.name_en || student?.name || "Student"} (ID: ${student?.uniq_id || student?.id})`
      }
      icon={TransferIcon}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-sub transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (!targetClassId && !targetGroupId)}
            className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <TransferIcon className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? "Processing Transfer..."
                : isBulk
                ? `Transfer ${activeStudentCount} Students`
                : "Confirm Transfer"}
            </span>
          </button>
        </div>
      }
    >
      <div className="p-5 sm:p-6 space-y-4 text-left">
        {/* Single Student Current Info (if applicable) */}
        {!isBulk && student && (
          <div className="p-3 rounded-xl theme-bg-sub border theme-border flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                Current Class &amp; Group
              </span>
              <span className="font-bold theme-text-primary">
                {student.student_class_name || student.class_name || "No Class"} /{" "}
                {student.student_group_name || student.group_name || "General Group"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Active
            </span>
          </div>
        )}

        {/* Destination Class */}
        <div>
          <CustomSelect
            label="Destination Class / Grade Level"
            value={targetClassId}
            onChange={(val) => setTargetClassId(val)}
            options={[
              { value: "", label: "-- Keep Current / No Class Change --" },
              ...classes.map((c) => ({
                value: c.id,
                label: `${c.name} ${c.code ? `(${c.code})` : ""} [${c.department_type || "General"}]`,
              })),
            ]}
            placeholder="Select Destination Class..."
            icon={ClassIcon}
          />
        </div>

        {/* Destination Group */}
        <div>
          <CustomSelect
            label="Destination Group / Halqa"
            value={targetGroupId}
            onChange={handleGroupChange}
            options={[
              { value: "", label: "-- Keep Current / No Group Change --" },
              ...eligibleGroups.map((g) => ({
                value: g.id,
                label: `${g.name} [${g.student_class_name || "No Class"}]`,
              })),
            ]}
            placeholder="Select Destination Group..."
            icon={GroupIcon}
          />
        </div>

        {/* Transition Date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
            Effective Transition Date
          </label>
          <input
            type="date"
            required
            value={transitionDate}
            onChange={(e) => setTransitionDate(e.target.value)}
            className="w-full h-10 px-3.5 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono"
          />
        </div>

        {/* Transfer Reason */}
        <div>
          <CustomSelect
            label="Transfer / Progression Reason"
            value={transitionReason}
            onChange={(val) => setTransitionReason(val)}
            options={reasonOptions}
            placeholder="Select Reason..."
          />
        </div>

        {transitionReason === "OTHER" && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
              Custom Transfer Note
            </label>
            <input
              type="text"
              placeholder="Enter specific transition details..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full h-10 px-3.5 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

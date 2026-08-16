import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { TransferIcon, CloseIcon } from "../../components/ui/Icons";

export default function StudentTransferModal({ isOpen, onClose, student, onSuccess }) {
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
    } catch {
      // Fallback
    }
  };

  if (!isOpen || !student) return null;

  // Filter groups by selected class if class selected, otherwise all groups
  const eligibleGroups = targetClassId
    ? groups.filter((g) => g.student_class === targetClassId || !g.student_class)
    : groups;

  const handleGroupChange = (e) => {
    const gid = e.target.value;
    setTargetGroupId(gid);
    if (gid) {
      const selectedGrp = groups.find((g) => String(g.id) === String(gid));
      if (selectedGrp && selectedGrp.student_class && !targetClassId) {
        setTargetClassId(selectedGrp.student_class);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetClassId && !targetGroupId) {
      showToast("Please select at least one destination (Class or Group).", "warning");
      return;
    }

    const finalReason =
      transitionReason === "OTHER"
        ? customReason.trim() || "Administrative Transfer"
        : transitionReason;

    setSubmitting(true);
    const payload = {
      target_class_id: targetClassId || null,
      target_group_id: targetGroupId ? parseInt(targetGroupId, 10) : null,
      transition_date: transitionDate,
      transition_reason: finalReason,
    };

    try {
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
        const err = await res.json();
        const msg = err.error || err.detail || "Failed to transfer student.";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error during transfer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 border-b theme-border flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl theme-bg-accent/15 theme-accent flex items-center justify-center">
              <TransferIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">
                Transfer Student Class &amp; Group
              </h3>
              <p className="text-xs theme-text-secondary">
                For {student.name_en || student.name} (ID: {student.uniq_id})
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

        {/* Current State Info */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
                Current Class &amp; Group
              </span>
              <span className="font-bold theme-text-primary">
                {student.student_class_name || "No Class"} / {student.student_group_name || student.group_name || "General Group"}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Active Enrolment
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Class */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Destination Class / Grade Level
              </label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              >
                <option value="">-- Keep Current / No Class Change --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ""} [{c.department_type}]
                  </option>
                ))}
              </select>
            </div>

            {/* Target Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Destination Group / Halqa
              </label>
              <select
                value={targetGroupId}
                onChange={handleGroupChange}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              >
                <option value="">-- Keep Current / No Group Change --</option>
                {eligibleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} [{g.student_class_name || "No Class"}] ({g.student_count || 0}/{g.capacity || "∞"} seats)
                  </option>
                ))}
              </select>
            </div>

            {/* Transition Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Effective Transition Date
              </label>
              <input
                type="date"
                required
                value={transitionDate}
                onChange={(e) => setTransitionDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono"
              />
            </div>

            {/* Transition Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Transfer / Progression Reason
              </label>
              <select
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              >
                <option value="Annual Promotion & Advancement">Annual Promotion &amp; Advancement</option>
                <option value="Mid-Term Performance Elevation">Mid-Term Performance Elevation</option>
                <option value="Halqa Capacity Rebalancing">Halqa Capacity Rebalancing</option>
                <option value="Guardian Request / Relocation">Guardian Request / Relocation</option>
                <option value="Academic Level Adjustment">Academic Level Adjustment</option>
                <option value="OTHER">Custom Reason (Specify Below)</option>
              </select>
            </div>

            {transitionReason === "OTHER" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                  Custom Transfer Note
                </label>
                <input
                  type="text"
                  placeholder="Enter specific transition details..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                />
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t theme-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (!targetClassId && !targetGroupId)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                <TransferIcon className="w-3.5 h-3.5" />
                <span>{submitting ? "Processing Transfer..." : "Confirm Transfer & Update Records"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

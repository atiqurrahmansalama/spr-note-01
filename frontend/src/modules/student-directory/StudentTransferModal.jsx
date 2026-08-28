import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { TransferIcon, ClassIcon, SectionIcon, GroupIcon, CalendarIcon } from "../../components/ui/Icons";
import Modal from "../../components/ui/Modal";
import CustomSelect from "../../components/ui/CustomSelect";
import CustomInput from "../../components/ui/CustomInput";
import { ClassSelect, SectionSelect, GroupSelect, DormitoryRoomSelect } from "../../components/selectors";

export default function StudentTransferModal({
  isOpen,
  onClose,
  student = null,
  studentIds = [],
  onSuccess,
}) {
  const { showToast } = useToast();

  const [classes, setClasses] = useState([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetRoomId, setTargetRoomId] = useState("");
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
      loadClasses();
      setTransitionDate(new Date().toISOString().split("T")[0]);
      setTransitionReason("Annual Promotion & Advancement");
      setCustomReason("");
      setTargetClassId(student?.student_class ? String(student.student_class) : "");
      setTargetSectionId(student?.section ? String(student.section) : "");
      setTargetGroupId(student?.student_group ? String(student.student_group) : "");
    }
  }, [isOpen, student]);

  const loadClasses = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/classes/");
      if (res.ok) {
        const cData = await res.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }
    } catch {}
  };

  if (!isOpen) return null;

  const handleClassChange = (cid) => {
    setTargetClassId(cid);
    // Reset section and group if class changes
    setTargetSectionId("");
    setTargetGroupId("");
  };

  const handleSectionChange = (sid) => {
    setTargetSectionId(sid);
    // Reset group if section changes
    setTargetGroupId("");
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!targetClassId && !targetSectionId && !targetGroupId) {
      showToast("Please select at least one destination (Class, Section, or Group).", "warning");
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
          target_section_id: targetSectionId ? parseInt(targetSectionId, 10) : null,
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
          target_section_id: targetSectionId ? parseInt(targetSectionId, 10) : null,
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
    { value: "Group / Section Capacity Rebalancing", label: "Group / Section Capacity Rebalancing" },
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
          : `Transfer Student Academic Placement`
      }
      subtitle={
        isBulk
          ? "Reassign academic class, section, and group for selected students"
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
            disabled={submitting || (!targetClassId && !targetSectionId && !targetGroupId)}
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
                Current Academic Placement
              </span>
              <span className="font-bold theme-text-primary">
                {student.student_class_name || student.class_name || "No Class"}
                {student.section_name ? ` • Section: ${student.section_name}` : ""}
                {student.student_group_name ? ` • Group: ${student.student_group_name}` : ""}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border">
              Active
            </span>
          </div>
        )}

        {/* Destination Class */}
        <div>
          <ClassSelect
            label="Destination Academic Class"
            value={targetClassId}
            onChange={handleClassChange}
            classes={classes}
            allowAll={true}
            allLabel="-- Keep Current / No Class Change --"
            placeholder="Select Destination Class..."
            icon={ClassIcon}
          />
        </div>

        {/* Destination Section */}
        <div>
          <SectionSelect
            label="Destination Section"
            value={targetSectionId}
            onChange={handleSectionChange}
            classId={targetClassId}
            allowAll={true}
            allLabel="-- Keep Current / No Section Change --"
            optional={true}
            optionalLabel="Clear Section (Direct Class Level)"
            placeholder="Select Destination Section..."
            icon={SectionIcon}
          />
        </div>

        {/* Destination Group */}
        <div>
          <GroupSelect
            label="Destination Group"
            value={targetGroupId}
            onChange={(gid) => setTargetGroupId(gid)}
            classId={targetClassId}
            sectionId={targetSectionId}
            allowAll={true}
            allLabel="-- Keep Current / No Group Change --"
            placeholder="Select Destination Group..."
            icon={GroupIcon}
          />
        </div>

        {/* Destination Dormitory Room (Optional) */}
        <div>
          <DormitoryRoomSelect
            label="Residential Dormitory Room (Optional)"
            value={targetRoomId}
            onChange={(rid) => setTargetRoomId(rid)}
            allowAll={true}
            allLabel="-- Keep Current / No Room Change --"
            placeholder="Select Dormitory Room..."
          />
        </div>

        {/* Transition Date */}
        <div>
          <CustomInput
            type="date"
            label="Effective Transition Date"
            required
            value={transitionDate}
            onChange={(val) => setTransitionDate(val)}
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
            <CustomInput
              label="Custom Transfer Note"
              placeholder="Enter specific transition details..."
              value={customReason}
              onChange={(val) => setCustomReason(val)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

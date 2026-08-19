import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { GroupIcon, ClassIcon } from "../../../components/ui/Icons";
import Modal from "../../../components/ui/Modal";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";

export default function GroupFormModal({
  isOpen,
  onClose,
  editingGroup,
  classes = [],
  defaultClassId = "",
  onSuccess,
}) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    student_class: "",
    mentor_teacher: "",
    order_rank: 1,
    is_active: true,
  });

  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      if (editingGroup) {
        setFormData({
          name: editingGroup.name || "",
          student_class: editingGroup.student_class || "",
          mentor_teacher: editingGroup.mentor_teacher || "",
          order_rank: editingGroup.order_rank ?? 1,
          is_active: editingGroup.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          student_class: defaultClassId || "",
          mentor_teacher: "",
          order_rank: 1,
          is_active: true,
        });
      }
    }
  }, [isOpen, editingGroup, defaultClassId]);

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetchWithAuth("/api/v1/users/");
      if (res.ok) {
        const data = await res.json();
        const userList = Array.isArray(data) ? data : data.results || [];
        setTeachers(userList.filter((u) => u.user_type === "TEACHER" || u.user_type === "ADMIN"));
      }
    } catch {
      showToast("Failed to load mentor teachers", "error");
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Group / Halqa Name is required.", "error");
      return;
    }
    if (!formData.student_class) {
      showToast("Parent Academic Class is required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        student_class: formData.student_class,
        mentor_teacher: formData.mentor_teacher || null,
        order_rank: parseInt(formData.order_rank, 10) || 1,
        is_active: formData.is_active,
      };

      const url = editingGroup ? `/api/v1/groups/${editingGroup.id}/` : "/api/v1/groups/";
      const method = editingGroup ? "PATCH" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          editingGroup ? "Group updated successfully!" : "New group created successfully!",
          "success"
        );
        onSuccess?.();
        onClose?.();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.detail || "Failed to save group.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGroup ? "Edit Student Group" : "Create New Group / Halqa"}
      subtitle="Configure academic sub-section and assign mentor teacher"
      icon={GroupIcon}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {submitting ? "Saving Group..." : editingGroup ? "Update Group" : "Create Group"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-left">
        {/* Parent Class Dropdown */}
        <div>
          <CustomSelect
            label="Parent Academic Class"
            value={formData.student_class}
            onChange={(val) => setFormData({ ...formData, student_class: val })}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name}${c.code ? ` (${c.code})` : ""}`,
            }))}
            placeholder="Select Parent Class..."
            icon={ClassIcon}
            required
          />
        </div>

        {/* Group Name & Order Rank */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
              Group / Halqa Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Halqa Abu Bakr (R)"
              className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
              Display Order
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={formData.order_rank}
              onChange={(e) => setFormData({ ...formData, order_rank: e.target.value })}
              className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
            />
          </div>
        </div>

        {/* Halqa Mentor Teacher */}
        <div>
          <CustomSelect
            label="Assigned Halqa Mentor / Ustadh"
            value={formData.mentor_teacher}
            onChange={(val) => setFormData({ ...formData, mentor_teacher: val })}
            options={[
              { value: "", label: "Unassigned / No Mentor" },
              ...teachers.map((t) => ({
                value: t.id,
                label: `${t.name || t.first_name || t.phone_number} (${t.user_type || "Teacher"})`,
              })),
            ]}
            placeholder="Select Mentor Teacher..."
            searchable
          />
        </div>

        {/* Group Status using CustomCheckbox */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
          <CustomCheckbox
            id="group_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData({ ...formData, is_active: checked })}
            label="Group is Active"
            description="Active groups appear in daily attendance rosters and student allocations."
          />
        </div>
      </form>
    </Modal>
  );
}

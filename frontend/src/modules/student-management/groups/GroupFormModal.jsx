import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { GroupIcon, CloseIcon } from "../../../components/ui/Icons";

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
    capacity: 25,
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
          capacity: editingGroup.capacity ?? 25,
          order_rank: editingGroup.order_rank ?? 1,
          is_active: editingGroup.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          student_class: defaultClassId || "",
          mentor_teacher: "",
          capacity: 25,
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
        setTeachers(userList.filter((u) => u.is_active && !u.is_deactivated));
      }
    } catch {
      // Fallback
    } finally {
      setLoadingTeachers(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Group / Halqa Name is required.", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      student_class: formData.student_class ? formData.student_class : null,
      mentor_teacher: formData.mentor_teacher ? formData.mentor_teacher : null,
      capacity: parseInt(formData.capacity, 10) || 0,
      order_rank: parseInt(formData.order_rank, 10) || 1,
      is_active: formData.is_active,
    };

    try {
      const url = editingGroup
        ? `/api/v1/groups/${editingGroup.id}/`
        : "/api/v1/groups/";
      const method = editingGroup ? "PATCH" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          editingGroup
            ? `Group "${formData.name}" updated successfully!`
            : `Group "${formData.name}" created successfully!`,
          "success"
        );
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        const msg = err.name?.[0] || err.detail || err.error || "Failed to save group.";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error while saving group.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b theme-border flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl theme-bg-accent/15 theme-accent flex items-center justify-center">
              <GroupIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">
                {editingGroup ? "Edit Group / Halqa" : "Create New Group / Halqa"}
              </h3>
              <p className="text-xs theme-text-secondary">
                Configure sub-sections, mentors, and seat capacities
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Parent Class / Grade Level
            </label>
            <select
              value={formData.student_class}
              onChange={(e) => setFormData({ ...formData, student_class: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            >
              <option value="">-- Standalone Group (No Parent Class) --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""} - [{c.department_type}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Group / Halqa Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Halqa Abu Bakr, Section A, Junior Batch"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Assigned Halqa Mentor / Teacher
            </label>
            <select
              value={formData.mentor_teacher}
              onChange={(e) => setFormData({ ...formData, mentor_teacher: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            >
              <option value="">-- No Mentor Assigned --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.first_name || t.phone_number} ({t.user_type || t.role_code || "Teacher"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Max Capacity <span className="text-[10px] lowercase text-zinc-400">(0 = unlimited)</span>
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="group_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--accent-main)] border-zinc-700 bg-zinc-800 cursor-pointer"
              />
              <label htmlFor="group_is_active" className="text-xs font-bold theme-text-primary cursor-pointer">
                Group is Active
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t theme-border mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border theme-border hover:theme-bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {submitting ? "Saving Group..." : editingGroup ? "Update Group" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

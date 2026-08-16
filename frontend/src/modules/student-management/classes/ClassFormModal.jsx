import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { ClassIcon, CloseIcon, DepartmentIcon, BookOpenIcon } from "../../../components/ui/Icons";

export default function ClassFormModal({ isOpen, onClose, editingClass, onSuccess }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department: "",
    department_type: "HIFZ",
    class_teacher: "",
    order_rank: 1,
    is_active: true,
  });

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      loadDepartments();
      if (editingClass) {
        setFormData({
          name: editingClass.name || "",
          code: editingClass.code || "",
          department: editingClass.department || "",
          department_type: editingClass.department_type || "HIFZ",
          class_teacher: editingClass.class_teacher || "",
          order_rank: editingClass.order_rank ?? 1,
          is_active: editingClass.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          code: "",
          department: "",
          department_type: "HIFZ",
          class_teacher: "",
          order_rank: 1,
          is_active: true,
        });
      }
    }
  }, [isOpen, editingClass]);

  const loadDepartments = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setDepartments(list.filter((d) => !d.is_deleted && d.is_active));
      }
    } catch {}
  };

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
      showToast("Class Name is required.", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      department: formData.department || null,
      department_type: formData.department_type,
      class_teacher: formData.class_teacher ? formData.class_teacher : null,
      order_rank: parseInt(formData.order_rank, 10) || 1,
      is_active: formData.is_active,
    };

    try {
      const url = editingClass
        ? `/api/v1/classes/${editingClass.id}/`
        : "/api/v1/classes/";
      const method = editingClass ? "PATCH" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          editingClass
            ? `Class "${formData.name}" updated successfully!`
            : `Class "${formData.name}" created successfully!`,
          "success"
        );
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        const msg = err.name?.[0] || err.detail || err.error || "Failed to save class.";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error while saving class.", "error");
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
              <ClassIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base theme-text-primary">
                {editingClass ? "Edit Class / Grade" : "Create New Class / Grade"}
              </h3>
              <p className="text-xs theme-text-secondary">
                Configure grade levels, assigned head teachers, and ordering
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
              Class / Grade Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hifz Division, Class 5, Nazera Section"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Class Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. HIFZ-01, CLS-5"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Academic Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedObj = departments.find((d) => String(d.id) === String(selectedId));
                  let autoType = formData.department_type;
                  if (selectedObj) {
                    if (selectedObj.has_quran_tracker) autoType = "HIFZ";
                    else if (selectedObj.code?.includes("GEN")) autoType = "GENERAL";
                  }
                  setFormData({
                    ...formData,
                    department: selectedId,
                    department_type: autoType,
                  });
                }}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Assigned Class Teacher / Head Ustadh
            </label>
            <select
              value={formData.class_teacher}
              onChange={(e) => setFormData({ ...formData, class_teacher: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            >
              <option value="">-- No Class Teacher Assigned --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.first_name || t.phone_number} ({t.user_type || t.role_code || "Staff"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                Display Order Rank
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={formData.order_rank}
                onChange={(e) => setFormData({ ...formData, order_rank: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub text-sm theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="class_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--accent-main)] border-zinc-700 bg-zinc-800 cursor-pointer"
              />
              <label htmlFor="class_is_active" className="text-xs font-bold theme-text-primary cursor-pointer">
                Class is Active
              </label>
            </div>
          </div>

          {/* Modal Footer */}
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
              {submitting ? "Saving Class..." : editingClass ? "Update Class" : "Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { DepartmentIcon, BookOpenIcon, CloseIcon } from "../../../components/ui/Icons";

export default function DepartmentFormModal({ isOpen, onClose, department = null, onSaved }) {
  const { showToast } = useToast();
  const isEdit = Boolean(department?.id);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department_head: "",
    has_quran_tracker: false,
    order_rank: 1,
    is_active: true,
  });

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      if (department) {
        setFormData({
          name: department.name || "",
          code: department.code || "",
          department_head: department.department_head || "",
          has_quran_tracker: Boolean(department.has_quran_tracker),
          order_rank: department.order_rank ?? 1,
          is_active: department.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          code: "",
          department_head: "",
          has_quran_tracker: false,
          order_rank: 1,
          is_active: true,
        });
      }
    }
  }, [isOpen, department]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/users/");
      if (res.ok) {
        const data = await res.json();
        const userList = Array.isArray(data) ? data : data.results || [];
        setTeachers(userList);
      }
    } catch {
      showToast("Could not load faculty teachers.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Department name is required.", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      department_head: formData.department_head || null,
      has_quran_tracker: formData.has_quran_tracker,
      order_rank: parseInt(formData.order_rank, 10) || 1,
      is_active: formData.is_active,
    };

    try {
      const url = isEdit ? `/api/v1/departments/${department.id}/` : "/api/v1/departments/";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(isEdit ? "Department updated successfully!" : "Department created successfully!", "success");
        onSaved?.();
        onClose();
      } else {
        const err = await res.json();
        showToast(err.name?.[0] || err.error || "Failed to save department.", "error");
      }
    } catch {
      showToast("Network connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="px-6 py-5 border-b theme-border flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <DepartmentIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary">
                {isEdit ? "Edit Academic Department" : "Create New Department"}
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Configure divisional entity, head teacher, and curriculum presets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Department Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Hifz Division or General Academic"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-medium theme-text-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Code / Abbreviation
              </label>
              <input
                type="text"
                placeholder="e.g. HIFZ, NOOR, GEN"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-mono theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Display Order Rank
              </label>
              <input
                type="number"
                min="1"
                value={formData.order_rank}
                onChange={(e) => setFormData({ ...formData, order_rank: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs theme-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Department Head / Divisional Dean
            </label>
            <select
              value={formData.department_head}
              onChange={(e) => setFormData({ ...formData, department_head: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs cursor-pointer theme-text-primary"
            >
              <option value="">-- No Department Head Assigned --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || "Unnamed"} ({t.phone_number || "No Phone"}) {t.role ? `• ${t.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 30 Juz Quran Tracker Toggle */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <input
              type="checkbox"
              id="has_quran_tracker_modal"
              checked={formData.has_quran_tracker}
              onChange={(e) => setFormData({ ...formData, has_quran_tracker: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 theme-bg-surface theme-border cursor-pointer"
            />
            <label htmlFor="has_quran_tracker_modal" className="cursor-pointer">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <BookOpenIcon className="w-4 h-4" />
                <span>30 Juz Quran Progress Tracker Preset</span>
              </div>
              <div className="text-[11px] theme-text-secondary mt-0.5">
                Enable interactive 30 Juz visual progress grids and daily Sabq/Sabqi recitation logs for all classes under this department.
              </div>
            </label>
          </div>

          {/* Active Status */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Department Status
            </label>
            <select
              value={formData.is_active ? "ACTIVE" : "INACTIVE"}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "ACTIVE" })}
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-medium theme-text-primary cursor-pointer"
            >
              <option value="ACTIVE">🟢 Active (Operational & Available)</option>
              <option value="INACTIVE">⚪ Inactive (Archived)</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t theme-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated text-xs font-bold transition-colors cursor-pointer theme-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

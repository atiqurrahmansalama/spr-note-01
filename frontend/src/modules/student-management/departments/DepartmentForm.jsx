import React, { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { BookOpenIcon, SleekCheckIcon } from "../../../components/ui/Icons";

export default function DepartmentForm({ department = null, onSaved, onCancel }) {
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
  }, [department]);

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
    if (e && e.preventDefault) e.preventDefault();
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

  return (
    <div className="p-4 sm:p-5 space-y-4 h-full overflow-y-auto theme-text-primary">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            id="dept_has_quran_tracker"
            checked={formData.has_quran_tracker}
            onChange={(e) => setFormData({ ...formData, has_quran_tracker: e.target.checked })}
            className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 theme-bg-surface theme-border cursor-pointer"
          />
          <label htmlFor="dept_has_quran_tracker" className="cursor-pointer">
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
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="dept_is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 theme-bg-surface theme-border cursor-pointer"
          />
          <label htmlFor="dept_is_active" className="text-xs font-medium theme-text-primary cursor-pointer">
            Department is Active & Available for Class Assignment
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t theme-border flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 shadow cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <SleekCheckIcon className="w-3.5 h-3.5" />
            <span>{submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Department"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

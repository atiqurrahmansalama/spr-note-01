import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { ClassIcon, DepartmentIcon, SaveIcon } from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";

export default function ClassForm({ editingClass, onSaved, onCancel }) {
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
  }, [editingClass]);

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

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
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
    <form onSubmit={handleSubmit} className="space-y-4 text-left animate-fade-in">
      {/* Class Name */}
      <div>
        <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
          Class / Grade Name <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Hifz Division, Class 5, Nazera Section"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all"
        />
      </div>

      {/* Class Code & Academic Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
            Class Code (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. HIFZ-01, CLS-5"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-mono font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all"
          />
        </div>

        <div>
          <CustomSelect
            label="Academic Department"
            value={formData.department}
            onChange={(val) => {
              const selectedObj = departments.find((d) => String(d.id) === String(val));
              let autoType = formData.department_type;
              if (selectedObj) {
                if (selectedObj.has_quran_tracker) autoType = "HIFZ";
                else if (selectedObj.code?.includes("GEN")) autoType = "GENERAL";
              }
              setFormData({
                ...formData,
                department: val,
                department_type: autoType,
              });
            }}
            options={[
              { value: "", label: "No Department (Independent)" },
              ...departments.map((d) => ({
                value: d.id,
                label: `${d.name}${d.code ? ` (${d.code})` : ""}`,
              })),
            ]}
            placeholder="Select Department..."
            icon={DepartmentIcon}
          />
        </div>
      </div>

      {/* Assigned Class Teacher */}
      <div>
        <CustomSelect
          label="Assigned Class Teacher / Head Ustadh"
          value={formData.class_teacher}
          onChange={(val) => setFormData({ ...formData, class_teacher: val })}
          options={[
            { value: "", label: "Unassigned / No Teacher" },
            ...teachers.map((t) => ({
              value: t.id,
              label: `${t.name || t.first_name || t.phone_number} (${t.user_type || "Staff"})`,
            })),
          ]}
          placeholder="Select Class Teacher..."
          searchable
        />
      </div>

      {/* Order Rank & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div>
          <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
            Display Order Rank
          </label>
          <input
            type="number"
            min="1"
            max="999"
            value={formData.order_rank}
            onChange={(e) => setFormData({ ...formData, order_rank: e.target.value })}
            className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all"
          />
        </div>

        <div className="p-3 rounded-2xl theme-bg-sub border theme-border mt-0 sm:mt-5">
          <CustomCheckbox
            id="class_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData({ ...formData, is_active: checked })}
            label="Class is Active"
            description="Active classes are accessible in course listings."
          />
        </div>
      </div>

      {/* Bottom Action Buttons (Flows naturally below form fields) */}
      <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-elevated theme-text-secondary text-sm font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl theme-bg-accent text-white font-bold text-sm uppercase tracking-wider shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <SaveIcon className="w-4 h-4" />
          )}
          <span>{submitting ? "Saving..." : editingClass ? "UPDATE CLASS" : "SAVE CLASS"}</span>
        </button>
      </div>
    </form>
  );
}

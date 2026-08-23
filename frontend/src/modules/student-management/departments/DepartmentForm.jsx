import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";
import { fetchWithAuth } from "../../../utils/authService";
import { BookOpenIcon, SleekCheckIcon, BuildingOfficeIcon, DepartmentIcon } from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";

export default function DepartmentForm({ department = null, onSaved, onCancel }) {
  const { showToast } = useToast();
  const { activeTenantId, institutions, isMultiTenantAdmin, currentInstitution } = useTenant();
  const isEdit = Boolean(department?.id);

  const initialValues = useMemo(() => {
    const defaultInstId = department?.institution || (activeTenantId !== 'ALL' ? activeTenantId : '') || (currentInstitution?.id || '');
    if (department) {
      return {
        institution: defaultInstId,
        branch: department.branch || '',
        name: department.name || '',
        code: department.code || '',
        department_head: department.department_head || '',
        has_quran_tracker: Boolean(department.has_quran_tracker),
        order_rank: department.order_rank ?? 1,
        is_active: department.is_active ?? true,
      };
    }
    return {
      institution: defaultInstId,
      branch: '',
      name: '',
      code: '',
      department_head: '',
      has_quran_tracker: false,
      order_rank: 1,
      is_active: true,
    };
  }, [department, activeTenantId, currentInstitution]);

  const [formData, setFormData] = useState(initialValues);
  const [teachers, setTeachers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  useEffect(() => {
    loadTeachers();
  }, []);

  const selectedInstId = formData.institution || (activeTenantId !== 'ALL' ? activeTenantId : '');

  // Load branches for the selected institution
  useEffect(() => {
    const loadBranches = async () => {
      if (!selectedInstId) {
        setBranches([]);
        return;
      }
      try {
        const url = `/api/v1/branches/?institution=${selectedInstId}`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setBranches(list.filter((b) => !b.is_deleted && b.is_active));
        }
      } catch {
        setBranches([]);
      }
    };
    loadBranches();
  }, [selectedInstId]);

  const loadTeachers = async () => {
    setLoadingLookups(true);
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
      setLoadingLookups(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Department name is required.", "warning");
      return;
    }
    const targetInstId = formData.institution || (activeTenantId !== 'ALL' ? activeTenantId : '');
    if (!targetInstId && institutions.length > 0) {
      showToast("Please select a parent Academy/Institution for this department.", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      institution: targetInstId || undefined,
      branch: formData.branch || null,
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
        showToast(err.name?.[0] || err.branch?.[0] || err.error || "Failed to save department.", "error");
      }
    } catch {
      showToast("Network connection error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const branchOptions = [
    { label: "All Branches / Main Campus (Institution-Wide)", value: "" },
    ...branches.map((b) => ({
      label: `${b.branch_name} (${b.branch_type === 'MAIN_CAMPUS' ? 'Main Campus' : b.branch_type})`,
      value: String(b.id),
    })),
  ];

  const teacherOptions = [
    { label: "-- No Department Head Assigned --", value: "" },
    ...teachers.map((t) => ({
      label: `${t.name || "Unnamed"} (${t.phone_number || "No Phone"}) ${t.role ? `• ${t.role}` : ""}`,
      value: String(t.id),
    })),
  ];

  const statusOptions = [
    { label: "Active (Operational & Available)", value: "ACTIVE" },
    { label: "Inactive (Archived)", value: "INACTIVE" },
  ];

  return (
    <div className="p-4 sm:p-5 space-y-4 h-full overflow-y-auto theme-text-primary">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Parent Academy Selector */}
        {(institutions.length > 1 || activeTenantId === 'ALL' || isMultiTenantAdmin) && (
          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Parent Academy / Institution <span className="text-rose-400">*</span>
            </label>
            <CustomSelect
              options={institutions.map((i) => ({ label: i.name, value: String(i.id) }))}
              value={formData.institution ? String(formData.institution) : ''}
              onChange={(val) => setFormData({ ...formData, institution: val, branch: '' })}
              placeholder="Select Parent Academy"
              disabled={isEdit}
            />
          </div>
        )}

        {/* Branch / Campus Selector */}
        <div>
          <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
            Campus / Branch (Optional)
          </label>
          <CustomSelect
            options={branchOptions}
            value={formData.branch ? String(formData.branch) : ''}
            onChange={(val) => setFormData({ ...formData, branch: val })}
            placeholder="Select Campus / Branch"
          />
          {branches.length === 0 && (
            <p className="text-[11px] theme-text-secondary mt-1 opacity-70">
              No separate branches configured for this academy (defaults to Main Campus / Institution-Wide).
            </p>
          )}
        </div>

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
          <CustomSelect
            options={teacherOptions}
            value={formData.department_head ? String(formData.department_head) : ''}
            onChange={(val) => setFormData({ ...formData, department_head: val })}
            placeholder="Select Department Head"
          />
        </div>

        {/* 30 Juz Quran Tracker Toggle */}
        <div className="p-4 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-start gap-3">
          <CustomCheckbox
            id="dept_has_quran_tracker"
            checked={formData.has_quran_tracker}
            onChange={(checked) => setFormData({ ...formData, has_quran_tracker: checked })}
            size="sm"
          />
          <label htmlFor="dept_has_quran_tracker" className="cursor-pointer">
            <div className="text-xs font-bold theme-accent flex items-center gap-1.5">
              <BookOpenIcon className="w-4 h-4" />
              <span>30 Juz Quran Progress Tracker Preset</span>
            </div>
            <div className="text-[11px] theme-text-secondary mt-0.5">
              Enable interactive 30 Juz visual progress grids and daily Sabq/Sabqi recitation logs for all classes under this department.
            </div>
          </label>
        </div>

        {/* Department Status Select */}
        <div>
          <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
            Department Status
          </label>
          <CustomSelect
            options={statusOptions}
            value={formData.is_active ? "ACTIVE" : "INACTIVE"}
            onChange={(val) => setFormData({ ...formData, is_active: val === "ACTIVE" })}
          />
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

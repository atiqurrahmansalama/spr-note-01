import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";
import { fetchWithAuth } from "../../../utils/authService";
import { BookOpenIcon, SleekCheckIcon, BuildingOfficeIcon, DepartmentIcon } from "../../../components/ui/Icons";
import CustomInput from "../../../components/ui/CustomInput";
import CustomSelect from "../../../components/ui/CustomSelect";
import { TeacherSelect } from "../../../components/selectors";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerFooter } from "../../../components/layout";

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
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Parent Academy & Campus Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {(institutions.length > 1 || activeTenantId === 'ALL' || isMultiTenantAdmin) ? (
            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Parent Academy <span className="text-rose-400">*</span>
              </label>
              <CustomSelect
                options={institutions.map((i) => ({ label: i.name, value: String(i.id) }))}
                value={formData.institution ? String(formData.institution) : ''}
                onChange={(val) => setFormData({ ...formData, institution: val, branch: '' })}
                placeholder="Select Parent Academy"
                disabled={isEdit}
              />
            </div>
          ) : null}

          <div className={(institutions.length > 1 || activeTenantId === 'ALL' || isMultiTenantAdmin) ? '' : 'sm:col-span-2'}>
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
                No separate branches configured (defaults to Main Campus).
              </p>
            )}
          </div>
        </div>

        <div>
          <CustomInput
            label="Department Name"
            required
            placeholder="e.g. Hifz Division or General Academic"
            value={formData.name}
            onChange={(val) => setFormData({ ...formData, name: val })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <CustomInput
              label="Code / Abbreviation"
              placeholder="e.g. HIFZ, NOOR, GEN"
              value={formData.code}
              onChange={(val) => setFormData({ ...formData, code: val.toUpperCase() })}
            />
          </div>
          <div>
            <CustomInput
              type="number"
              label="Display Order Rank"
              min={1}
              max={999}
              step={1}
              value={formData.order_rank}
              onChange={(val) => setFormData({ ...formData, order_rank: val })}
            />
          </div>
        </div>

        <div>
          <TeacherSelect
            label="Department Head / Divisional Dean"
            value={formData.department_head}
            onChange={(val) => setFormData({ ...formData, department_head: val })}
            teachers={teachers}
            allowAll={true}
            allLabel="No Department Head Assigned"
            placeholder="Select Department Head..."
            searchable={true}
            disabled={loadingLookups}
          />
        </div>

        {/* 30 Juz Quran Tracker Toggle */}
        <div className="p-3.5 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-start gap-3">
          <CustomCheckbox
            id="dept_has_quran_tracker"
            checked={formData.has_quran_tracker}
            onChange={(checked) => setFormData({ ...formData, has_quran_tracker: checked })}
            size="md"
          />
          <label htmlFor="dept_has_quran_tracker" className="cursor-pointer select-none">
            <div className="text-xs font-bold theme-accent flex items-center gap-1.5">
              <BookOpenIcon className="w-4 h-4" />
              <span>30 Juz Quran Progress Tracker Preset</span>
            </div>
            <div className="text-[11px] theme-text-secondary mt-0.5 leading-relaxed">
              Enable interactive 30 Juz visual progress grids and daily Sabq/Sabqi recitation logs for all classes under this department.
            </div>
          </label>
        </div>

        {/* Department Status Checkbox */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
          <CustomCheckbox
            id="dept_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            label="Department Active & Operational"
            description="Enables this academic department for classes, groups, and student admissions."
            size="md"
          />
        </div>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          saveLabel={isEdit ? "Save Changes" : "Create Department"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

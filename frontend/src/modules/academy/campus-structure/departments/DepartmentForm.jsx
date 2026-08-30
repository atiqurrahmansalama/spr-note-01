import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../../context/ToastContext";
import { useTenant } from "../../../../context/TenantContext";
import { fetchWithAuth } from "../../../../utils/authService";
import { BookOpenIcon, DepartmentIcon, TeacherIcon } from "../../../../components/ui/Icons";
import CustomInput from "../../../../components/ui/CustomInput";
import { TeacherSelect } from "../../../../components/selectors";
import CustomCheckbox from "../../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../../../components/layout";
import { createDepartment, updateDepartment } from "../../../../api/academy";

export default function DepartmentForm({ department = null, editingDepartment = null, onSaved, onCancel }) {
  const activeDept = department || editingDepartment;
  const { showToast } = useToast();
  const { activeTenantId, institutions, isMultiTenantAdmin, currentInstitution } = useTenant();
  const isEdit = Boolean(activeDept?.id);

  const initialValues = useMemo(() => {
    const defaultInstId =
      activeDept?.institution ||
      (activeTenantId !== 'ALL' ? activeTenantId : '') ||
      (currentInstitution?.id || '');

    if (activeDept) {
      return {
        institution: defaultInstId,
        branch: activeDept.branch || '',
        name: activeDept.name || '',
        code: activeDept.code || '',
        department_head: activeDept.department_head || '',
        has_quran_tracker: Boolean(activeDept.has_quran_tracker),
        order_rank: activeDept.order_rank ?? 1,
        is_active: activeDept.is_active ?? true,
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
  }, [activeDept, activeTenantId, currentInstitution]);

  const [formData, setFormData] = useState(initialValues);
  const [teachers, setTeachers] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  useEffect(() => {
    loadTeachers();
  }, []);

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

  const selectedInst = useMemo(() => {
    if (formData.institution) {
      return institutions.find((i) => String(i.id) === String(formData.institution)) || currentInstitution;
    }
    return currentInstitution;
  }, [formData.institution, institutions, currentInstitution]);

  const deptQuotaLimit = selectedInst?.max_departments || 1;
  const currentDeptCount = selectedInst?.total_departments_count || 0;
  const isQuotaReached = !isEdit && currentDeptCount >= deptQuotaLimit && !isMultiTenantAdmin;

  // Determine if form has been modified by the user
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some((key) => formData[key] !== initialValues[key]);
  }, [formData, initialValues]);

  const isFormValid =
    formData.name.trim().length > 0 &&
    Boolean(formData.institution || activeTenantId !== 'ALL');
  const canSave = isDirty && isFormValid && !submitting && !isQuotaReached;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isQuotaReached) {
      showToast(`Department quota limit of ${deptQuotaLimit} reached for this academy.`, "error");
      return;
    }
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
      if (isEdit) {
        await updateDepartment(activeDept.id, payload);
        showToast("Department updated successfully!", "success");
      } else {
        await createDepartment(payload);
        showToast("Department created successfully!", "success");
      }
      onSaved?.();
    } catch (err) {
      showToast(err.message || "Failed to save department.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Quota Limit Notice */}
        {isQuotaReached && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2.5 animate-fade-in">
            <DepartmentIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Department Quota Limit Reached ({currentDeptCount}/{deptQuotaLimit})</p>
              <p className="opacity-90 text-[11px] mt-0.5">
                This academy has reached its allowed limit of {deptQuotaLimit} departments. Update the institution's department quota to add more.
              </p>
            </div>
          </div>
        )}
        
        {/* Section 1: Department Information */}
        <DrawerSection title="Department Information" icon={DepartmentIcon} className="pt-1">
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Department Name"
                  required
                  placeholder="e.g. Hifzul Quran or Islamic Studies"
                  value={formData.name}
                  onChange={(val) => setFormData({ ...formData, name: val })}
                />
              </div>

              <div>
                <CustomInput
                  label="Code"
                  placeholder="e.g. HIFZ"
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
          </div>
        </DrawerSection>

        {/* Section 2: Leadership */}
        <DrawerSection title="Leadership & Faculty" icon={TeacherIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <TeacherSelect
                  label="Department Head"
                  value={formData.department_head}
                  onChange={(val) => setFormData({ ...formData, department_head: val })}
                  teachers={teachers}
                  allowAll={true}
                  allLabel="No Department Head Assigned"
                  placeholder="Select Department Head..."
                  searchable={false}
                  disabled={loadingLookups}
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Section 3: Academic Tracking Presets */}
        <DrawerSection title="Curriculum & Tracking Presets" icon={BookOpenIcon}>
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
        </DrawerSection>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={isEdit ? "Save Changes" : "Create Department"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

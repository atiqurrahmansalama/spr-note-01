import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../../context/ToastContext";
import { useTenant } from "../../../../context/TenantContext";
import { useAcademicSession } from "../../../../context/AcademicSessionContext";
import { fetchWithAuth } from "../../../../utils/authService";
import {
  BookOpenIcon,
  BuildingIcon,
  DepartmentIcon,
  TrendingUpIcon,
} from "../../../../components/ui/Icons";
import CustomInput from "../../../../components/ui/CustomInput";
import { RadioCard } from "../../../../components/ui";
import { TeacherSelect } from "../../../../components/selectors";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../../../components/layout";
import { createDepartment, updateDepartment } from "../../../../api/academy";
import { useFormAutoSave } from "../../../../hooks";
import { DepartmentFormData, DepartmentFormProps } from "./types";

export default function DepartmentForm({
  department = null,
  editingDepartment = null,
  onSaved,
  onCancel,
}: DepartmentFormProps) {
  const activeDept = department || editingDepartment;
  const { showToast } = useToast();
  const { activeTenantId, institutions, isMultiTenantAdmin, currentInstitution } = useTenant();
  const { activeBranch, branches } = useAcademicSession();
  const isEdit = Boolean(activeDept?.id);

  const initialValues: DepartmentFormData = useMemo(() => {
    const activeSelectedInstId =
      (activeTenantId && activeTenantId !== "ALL" ? String(activeTenantId) : "") ||
      (currentInstitution?.id ? String(currentInstitution.id) : "");

    const defaultInstId =
      activeDept?.institution ||
      activeSelectedInstId ||
      (institutions?.[0]?.id ? String(institutions[0].id) : "");

    const defaultBranchId =
      activeDept?.branch !== undefined && activeDept?.branch !== null
        ? String(activeDept.branch || "")
        : (activeBranch?.id && String(activeBranch.id) !== "ALL" ? String(activeBranch.id) : "");

    if (activeDept) {
      return {
        institution: String(defaultInstId),
        branch: defaultBranchId,
        name: activeDept.name || "",
        code: activeDept.code || "",
        department_head: activeDept.department_head || "",
        has_quran_tracker: Boolean(activeDept.has_quran_tracker),
        order_rank: activeDept.order_rank ?? 1,
        is_active: activeDept.is_active ?? true,
      };
    }
    return {
      institution: String(defaultInstId),
      branch: defaultBranchId,
      name: "",
      code: "",
      department_head: "",
      has_quran_tracker: false,
      order_rank: 1,
      is_active: true,
    };
  }, [activeDept, activeTenantId, activeBranch, currentInstitution, institutions]);

  const [formData, setFormData] = useState<DepartmentFormData>(initialValues);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-Save / Draft Persistence
  const storageKey = isEdit
    ? `dept_edit_${activeDept?.id}`
    : `dept_create_${formData.institution || "default"}`;
  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: true,
  });

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
      // Graceful fallback
    } finally {
      setLoadingLookups(false);
    }
  };

  const selectedInst = useMemo(() => {
    const activeSelectedInstId =
      (activeTenantId && activeTenantId !== "ALL" ? String(activeTenantId) : "") ||
      (currentInstitution?.id ? String(currentInstitution.id) : "");

    const targetId = activeSelectedInstId || formData.institution;
    if (targetId) {
      return (
        institutions.find((i: any) => String(i.id) === String(targetId)) ||
        currentInstitution
      );
    }
    return currentInstitution;
  }, [activeTenantId, currentInstitution, formData.institution, institutions]);

  const deptQuotaLimit = selectedInst?.max_departments || 10;
  const currentDeptCount = selectedInst?.total_departments_count || 0;
  const isQuotaReached = !isEdit && currentDeptCount >= deptQuotaLimit && !isMultiTenantAdmin;

  const resolvedBranchName = useMemo(() => {
    const targetBranchId =
      formData.branch && formData.branch !== "ALL"
        ? String(formData.branch)
        : (activeBranch?.id && String(activeBranch.id) !== "ALL" ? String(activeBranch.id) : "");
    if (!targetBranchId) {
      return "All Campuses (Institution-wide)";
    }
    const matched = branches?.find((b: any) => String(b.id) === String(targetBranchId));
    return (
      matched?.branch_name ||
      matched?.name ||
      (activeBranch && String(activeBranch.id) === String(targetBranchId)
        ? (activeBranch.branch_name || activeBranch.name)
        : "") ||
      "Assigned Campus"
    );
  }, [formData.branch, activeBranch, branches]);

  // Determine if form has been modified by the user
  const isDirty = useMemo(() => {
    return (Object.keys(initialValues) as Array<keyof DepartmentFormData>).some(
      (key) => formData[key] !== initialValues[key]
    );
  }, [formData, initialValues]);

  const isFormValid = formData.name.trim().length > 0;
  const canSave = isDirty && isFormValid && !submitting && !isQuotaReached;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (isQuotaReached) {
      showToast(`Department quota limit of ${deptQuotaLimit} reached for this academy.`, "error");
      return;
    }
    if (!formData.name.trim()) {
      showToast("Department name is required.", "warning");
      return;
    }

    // Strictly resolve target institution to the currently selected active academy
    const targetInstId =
      (activeTenantId && activeTenantId !== "ALL" ? String(activeTenantId) : "") ||
      (currentInstitution?.id ? String(currentInstitution.id) : "") ||
      formData.institution ||
      (institutions?.[0]?.id ? String(institutions[0].id) : undefined);

    // Strictly resolve branch: prioritize activeBranch context for new creation if not explicitly bound
    const targetBranchId =
      formData.branch && formData.branch !== "ALL"
        ? formData.branch
        : (activeBranch?.id && String(activeBranch.id) !== "ALL" ? String(activeBranch.id) : null);

    setSubmitting(true);
    const payload = {
      institution: targetInstId || undefined,
      branch: targetBranchId,
      name: formData.name.trim(),
      code: (formData.code || "").trim().toUpperCase(),
      department_head: formData.department_head && formData.department_head !== "ALL" ? formData.department_head : null,
      has_quran_tracker: formData.has_quran_tracker,
      order_rank: Number(formData.order_rank) || 1,
      is_active: formData.is_active,
    };

    try {
      if (isEdit && activeDept?.id) {
        await updateDepartment(activeDept.id, payload);
        showToast("Department updated successfully.", "success");
      } else {
        await createDepartment(payload);
        showToast("Department created successfully.", "success");
      }
      clearDraft();
      window.dispatchEvent(new CustomEvent("spr_departments_updated"));
      onSaved?.();
    } catch (err: any) {
      showToast(err?.message || "Failed to save department.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Context Scope Indicator */}
        <div className="@container">
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 p-3 rounded-xl theme-bg-surface-secondary border theme-border-subtle text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg theme-bg-surface-highlight flex items-center justify-center shrink-0">
                <BuildingIcon className="w-3.5 h-3.5 theme-text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-semibold tracking-wider theme-text-muted leading-tight">
                  Academy
                </div>
                <div className="font-semibold theme-text-primary truncate text-xs">
                  {selectedInst?.name || "Current Academy"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg theme-bg-surface-highlight flex items-center justify-center shrink-0">
                <DepartmentIcon className="w-3.5 h-3.5 theme-text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-semibold tracking-wider theme-text-muted leading-tight">
                  Campus Scope
                </div>
                <div className="font-semibold theme-text-primary truncate text-xs">
                  {resolvedBranchName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Limit Notice */}
        {isQuotaReached && (
          <div className="p-3.5 rounded-2xl theme-bg-warning-soft border theme-border-warning theme-text-warning text-xs flex items-start gap-2.5 animate-fade-in">
            <DepartmentIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Department Quota Limit Reached ({currentDeptCount}/{deptQuotaLimit})
              </p>
              <p className="opacity-90 text-[11px] mt-0.5">
                This academy has allocated all {deptQuotaLimit} allowed departments. Update the institution's department quota limit to add more.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Department Information */}
        <DrawerSection title="Department Information" icon={DepartmentIcon}>
          <div className="@container">
            <div className="space-y-3.5">
              {/* Department Name & Code */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomInput
                  label="Department Name"
                  required
                  placeholder="e.g. Hifzul Quran or General Studies"
                  value={formData.name}
                  onChange={(val: string) => setFormData({ ...formData, name: val })}
                />
                <CustomInput
                  label="Department Code"
                  placeholder="e.g. HIFZ or GEN"
                  value={formData.code}
                  onChange={(val: string) =>
                    setFormData({ ...formData, code: val.toUpperCase() })
                  }
                />
              </div>

              {/* Department Head */}
              <div>
                <TeacherSelect
                  label="Department Head"
                  value={formData.department_head}
                  onChange={(val: string | number) =>
                    setFormData({ ...formData, department_head: val === "ALL" ? "" : val })
                  }
                  teachers={teachers}
                  allowAll={true}
                  allLabel="No Head Assigned"
                  placeholder="Select Department Head..."
                  searchable={false}
                  disabled={loadingLookups}
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Section 2: Curriculum & Assessment Presets */}
        <DrawerSection title="Curriculum & Tracking Presets" icon={BookOpenIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <RadioCard
                title="Class Assessment"
                description="Standard subject-based syllabus coverage, daily lesson plans, homework dispatch and classroom evaluation."
                icon={BookOpenIcon}
                selected={!formData.has_quran_tracker}
                onClick={() => setFormData((prev) => ({ ...prev, has_quran_tracker: false }))}
              />
              <RadioCard
                title="Progress Assessment"
                description="Individual student milestone tracking, daily progress logs and retention metrics."
                icon={TrendingUpIcon}
                selected={formData.has_quran_tracker}
                onClick={() => setFormData((prev) => ({ ...prev, has_quran_tracker: true }))}
              />
            </div>
          </div>
        </DrawerSection>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
          saveLabel={isEdit ? "Save Changes" : "Create Department"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

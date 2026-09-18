import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../../context/ToastContext";
import { useTenant } from "../../../../context/TenantContext";
import { fetchWithAuth } from "../../../../utils/authService";
import { BookOpenIcon, DepartmentIcon, TrendingUpIcon } from "../../../../components/ui/Icons";
import CustomInput from "../../../../components/ui/CustomInput";
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
  const isEdit = Boolean(activeDept?.id);

  const initialValues: DepartmentFormData = useMemo(() => {
    const defaultInstId =
      activeDept?.institution ||
      (activeTenantId !== "ALL" ? activeTenantId : "") ||
      (currentInstitution?.id || "");

    if (activeDept) {
      return {
        institution: String(defaultInstId),
        branch: String(activeDept.branch || ""),
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
      branch: "",
      name: "",
      code: "",
      department_head: "",
      has_quran_tracker: false,
      order_rank: 1,
      is_active: true,
    };
  }, [activeDept, activeTenantId, currentInstitution]);

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
      showToast("Could not load faculty teachers.", "error");
    } finally {
      setLoadingLookups(false);
    }
  };

  const selectedInst = useMemo(() => {
    if (formData.institution) {
      return (
        institutions.find((i: any) => String(i.id) === String(formData.institution)) ||
        currentInstitution
      );
    }
    return currentInstitution;
  }, [formData.institution, institutions, currentInstitution]);

  const deptQuotaLimit = selectedInst?.max_departments || 1;
  const currentDeptCount = selectedInst?.total_departments_count || 0;
  const isQuotaReached = !isEdit && currentDeptCount >= deptQuotaLimit && !isMultiTenantAdmin;

  // Determine if form has been modified by the user
  const isDirty = useMemo(() => {
    return (Object.keys(initialValues) as Array<keyof DepartmentFormData>).some(
      (key) => formData[key] !== initialValues[key]
    );
  }, [formData, initialValues]);

  const isFormValid =
    formData.name.trim().length > 0 &&
    Boolean(formData.institution || activeTenantId !== "ALL");
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
    const targetInstId = formData.institution || (activeTenantId !== "ALL" ? activeTenantId : "");
    if (!targetInstId && institutions.length > 0) {
      showToast("Please select a parent Academy/Institution for this department.", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      institution: targetInstId || undefined,
      branch: formData.branch || null,
      name: formData.name.trim(),
      code: (formData.code || "").trim().toUpperCase(),
      department_head: formData.department_head || null,
      has_quran_tracker: formData.has_quran_tracker,
      order_rank: Number(formData.order_rank) || 1,
      is_active: formData.is_active,
    };

    try {
      if (isEdit && activeDept?.id) {
        await updateDepartment(activeDept.id, payload);
        showToast("Department updated successfully!", "success");
      } else {
        await createDepartment(payload);
        showToast("Department created successfully!", "success");
      }
      clearDraft();
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
            <div className="grid grid-cols-1 gap-4">
              <div>
                <CustomInput
                  label="Department Name"
                  required
                  placeholder="e.g. Hifzul Quran or Islamic Studies"
                  value={formData.name}
                  onChange={(val: string) => setFormData({ ...formData, name: val })}
                />
              </div>

              <div>
                <TeacherSelect
                  label="Department Head"
                  value={formData.department_head}
                  onChange={(val: string | number) => setFormData({ ...formData, department_head: val })}
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

        {/* Section 2: Academic Tracking Presets */}
        <DrawerSection title="Curriculum & Tracking Presets" icon={BookOpenIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              {/* Option 1: Class Assessment */}
              <div
                role="radio"
                aria-checked={!formData.has_quran_tracker}
                tabIndex={0}
                onClick={() => setFormData((prev) => ({ ...prev, has_quran_tracker: false }))}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setFormData((prev) => ({ ...prev, has_quran_tracker: false }));
                  }
                }}
                className={`p-3.5 rounded-2xl border theme-border transition-all cursor-pointer flex flex-col justify-between gap-3 select-none outline-none focus:outline-none ${
                  !formData.has_quran_tracker
                    ? "theme-bg-accent-soft/35 shadow-xs"
                    : "theme-bg-surface hover:theme-bg-sub/30 opacity-75 hover:opacity-100"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                          !formData.has_quran_tracker
                            ? "theme-bg-accent theme-accent-text"
                            : "theme-bg-sub theme-text-secondary"
                        }`}
                      >
                        <BookOpenIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold theme-text-primary">
                        Class Assessment
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        !formData.has_quran_tracker
                          ? "border-[var(--accent-main)] bg-[var(--accent-main)] text-white"
                          : "theme-border bg-transparent"
                      }`}
                    >
                      {!formData.has_quran_tracker && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    Standard subject-based syllabus coverage, daily lesson plans, homework dispatch, and classroom evaluation.
                  </p>
                </div>
              </div>

              {/* Option 2: Progress Assessment */}
              <div
                role="radio"
                aria-checked={formData.has_quran_tracker}
                tabIndex={0}
                onClick={() => setFormData((prev) => ({ ...prev, has_quran_tracker: true }))}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setFormData((prev) => ({ ...prev, has_quran_tracker: true }));
                  }
                }}
                className={`p-3.5 rounded-2xl border theme-border transition-all cursor-pointer flex flex-col justify-between gap-3 select-none outline-none focus:outline-none ${
                  formData.has_quran_tracker
                    ? "theme-bg-accent-soft/35 shadow-xs"
                    : "theme-border theme-bg-surface hover:theme-bg-sub/30 opacity-75 hover:opacity-100"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                          formData.has_quran_tracker
                            ? "theme-bg-accent theme-accent-text"
                            : "theme-bg-sub theme-text-secondary"
                        }`}
                      >
                        <TrendingUpIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold theme-text-primary">
                        Progress Assessment
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        formData.has_quran_tracker
                          ? "border-[var(--accent-main)] bg-[var(--accent-main)] text-white"
                          : "theme-border bg-transparent"
                      }`}
                    >
                      {formData.has_quran_tracker && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    Individual student milestone tracking, daily progress logs (Sabaq, Sabqi, Daur), and retention metrics.
                  </p>
                </div>
              </div>
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

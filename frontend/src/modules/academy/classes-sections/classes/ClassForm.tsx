import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import { ClassIcon, DepartmentIcon, SectionIcon } from "../../../../components/ui/Icons";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomInput from "../../../../components/ui/CustomInput";
import { TeacherSelect } from "../../../../components/selectors";
import CustomCheckbox from "../../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../../../components/layout";
import { useFormAutoSave } from "../../../../hooks";
import {
  ClassFormProps,
  AcademicDepartment,
  TeacherUser,
  AcademicSection,
  AcademicGroup,
} from "../types";

interface ClassFormState {
  name: string;
  code: string;
  department: string;
  department_type: string;
  class_teacher: string;
  order_rank: number;
  has_sections: boolean;
  has_groups: boolean;
  is_active: boolean;
}

export default function ClassForm({ editingClass, onSaved, onCancel }: ClassFormProps) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ClassFormState>({
    name: "",
    code: "",
    department: "",
    department_type: "HIFZ",
    class_teacher: "",
    order_rank: 1,
    has_sections: true,
    has_groups: true,
    is_active: true,
  });

  // Auto-Save / Draft Persistence
  const storageKey = editingClass ? `class_edit_${editingClass.id}` : `class_create_${formData.department || 'default'}`;
  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: true,
  });

  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [departments, setDepartments] = useState<AcademicDepartment[]>([]);
  const [activeSectionCount, setActiveSectionCount] = useState<number>(editingClass?.sections_count || 0);
  const [activeGroupCount, setActiveGroupCount] = useState<number>(editingClass?.groups_count || 0);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadTeachers();
    loadDepartments();
    if (editingClass) {
      const knownSecCount = Number(editingClass.sections_count) || 0;
      const knownGrpCount = Number(editingClass.groups_count) || 0;
      const computedHasSections = knownSecCount > 0 ? true : (editingClass.has_sections ?? true);
      const computedHasGroups = knownGrpCount > 0 ? true : (editingClass.has_groups ?? true);
      
      setFormData({
        name: editingClass.name || "",
        code: editingClass.code || "",
        department: editingClass.department ? String(editingClass.department) : "",
        department_type: (editingClass as any).department_type || "HIFZ",
        class_teacher: editingClass.class_teacher ? String(editingClass.class_teacher) : "",
        order_rank: editingClass.order_rank ?? 1,
        has_sections: computedHasSections,
        has_groups: computedHasGroups,
        is_active: editingClass.is_active ?? true,
      });

      // Live verification of active sections & groups for this class
      if (editingClass.id) {
        // 1. Sections count
        fetchWithAuth(`/api/v1/academy/sections/?class=${editingClass.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              const list: AcademicSection[] = Array.isArray(data) ? data : data.results || [];
              const count = list.length;
              setActiveSectionCount(count);
              if (count > 0) {
                setFormData((prev) => ({ ...prev, has_sections: true }));
              }
            }
          })
          .catch((err) => console.warn("Could not check live sections count:", err));

        // 2. Groups count
        fetchWithAuth(`/api/v1/groups/?student_class=${editingClass.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              const list: AcademicGroup[] = Array.isArray(data) ? data : data.results || [];
              const count = list.length;
              setActiveGroupCount(count);
              if (count > 0) {
                setFormData((prev) => ({ ...prev, has_groups: true }));
              }
            }
          })
          .catch((err) => console.warn("Could not check live groups count:", err));
      }
    } else {
      setActiveSectionCount(0);
      setActiveGroupCount(0);
      setFormData({
        name: "",
        code: "",
        department: "",
        department_type: "HIFZ",
        class_teacher: "",
        order_rank: 1,
        has_sections: true,
        has_groups: true,
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
        setDepartments(list.filter((d: any) => !d.is_deleted && d.is_active));
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
        setTeachers(userList.filter((u: any) => u.is_active && !u.is_deactivated));
      }
    } catch {
      // Fallback
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleSectionToggle = (checked: boolean) => {
    if (!checked && activeSectionCount > 0) {
      showToast(
        `Cannot disable sections because this class currently has ${activeSectionCount} active section(s). Delete or reassign sections first.`,
        "warning"
      );
      return;
    }
    setFormData((prev) => ({ ...prev, has_sections: checked }));
  };

  const handleGroupToggle = (checked: boolean) => {
    if (!checked && activeGroupCount > 0) {
      showToast(
        `Cannot disable groups because this class currently has ${activeGroupCount} active group(s). Delete or reassign groups first.`,
        "warning"
      );
      return;
    }
    setFormData((prev) => ({ ...prev, has_groups: checked }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Class Name is required.", "warning");
      return;
    }
    if (!formData.department) {
      showToast("Parent Academic Department is strictly required for every class.", "warning");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      department: formData.department,
      department_type: formData.department_type,
      class_teacher: formData.class_teacher ? formData.class_teacher : null,
      order_rank: parseInt(String(formData.order_rank), 10) || 1,
      has_sections: Boolean(activeSectionCount > 0 ? true : formData.has_sections),
      has_groups: Boolean(activeGroupCount > 0 ? true : formData.has_groups),
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
        window.dispatchEvent(new CustomEvent("spr_class_updated"));
        clearDraft();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.has_sections?.[0] || err.has_groups?.[0] || err.department?.[0] || err.name?.[0] || err.detail || err.error || "Failed to save class.";
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error while saving class.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if form has been modified
  const isDirty = useMemo(() => {
    if (!editingClass) {
      return Boolean(formData.name.trim() || formData.code.trim() || formData.department);
    }
    return Boolean(
      formData.name !== (editingClass.name || "") ||
      formData.code !== (editingClass.code || "") ||
      formData.department !== (editingClass.department ? String(editingClass.department) : "") ||
      formData.class_teacher !== (editingClass.class_teacher ? String(editingClass.class_teacher) : "") ||
      formData.order_rank !== (editingClass.order_rank ?? 1) ||
      formData.has_sections !== (editingClass.has_sections ?? true) ||
      formData.has_groups !== (editingClass.has_groups ?? true) ||
      formData.is_active !== (editingClass.is_active ?? true)
    );
  }, [formData, editingClass]);

  const isFormValid = Boolean(formData.name.trim() && formData.department);
  const canSave = isDirty && isFormValid && !submitting;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2 text-left">
        {departments.length === 0 && (
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-xs theme-text-secondary">
            <p className="font-bold theme-text-primary">No Academic Department Found</p>
            <p className="mt-0.5">
              Classes must belong to a Department. Please create a Department under Academies &amp; Departments first.
            </p>
          </div>
        )}

        {/* ─── 1. Class Information ─── */}
        <DrawerSection title="Class Information" icon={ClassIcon}>
          {/* Academic Department Selector */}
          <div>
            <CustomSelect
              label="Academic Department"
              value={formData.department}
              onChange={(val: string) => {
                const selectedObj: any = departments.find((d) => String(d.id) === String(val));
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
              options={departments.map((d) => ({
                value: String(d.id),
                label: `${d.name}${d.code ? ` (${d.code})` : ""}`,
              }))}
              placeholder="Select Academic Department (Required)..."
              icon={DepartmentIcon}
              required={true}
            />
          </div>

          {/* Class / Grade Name & Class Code */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <CustomInput
                label="Class / Grade Name"
                required
                placeholder="e.g. Class 5, Hifz Division, Nazera"
                value={formData.name}
                onChange={(val: string) => setFormData({ ...formData, name: val })}
              />
            </div>

            <div>
              <CustomInput
                label="Class Code"
                placeholder="e.g. HIFZ-01, CLS-5"
                value={formData.code}
                onChange={(val: string) => setFormData({ ...formData, code: val.toUpperCase() })}
              />
            </div>
          </div>

          {/* Assigned Class Teacher */}
          <div>
            <TeacherSelect
              label="Assigned Class Teacher / Head Teacher"
              value={formData.class_teacher}
              onChange={(val: string) => setFormData({ ...formData, class_teacher: val })}
              teachers={teachers}
              allowAll={true}
              allLabel="Unassigned"
              placeholder="Select Class Teacher..."
              searchable={true}
              disabled={loadingTeachers}
            />
          </div>

          {/* Display Order Rank */}
          <div>
            <CustomInput
              type="number"
              label="Display Order Rank"
              min={1}
              max={999}
              value={formData.order_rank}
              onChange={(val: string) => setFormData({ ...formData, order_rank: parseInt(val, 10) || 1 })}
            />
          </div>
        </DrawerSection>

        {/* ─── 2. Structure & Divisions ─── */}
        <DrawerSection title="Structure & Divisions" icon={SectionIcon}>
          <div className="p-3.5 sm:p-4 rounded-2xl theme-bg-sub border theme-border shadow-2xs space-y-3">
            {/* 1. Section Divisions Toggle */}
            <CustomCheckbox
              id="class_has_sections_toggle"
              checked={formData.has_sections}
              disabled={activeSectionCount > 0}
              onChange={handleSectionToggle}
              label={
                <span className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm theme-text-primary">Enable Section Divisions</span>
                  {activeSectionCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20">
                      {activeSectionCount} Section{activeSectionCount > 1 ? 's' : ''} Active
                    </span>
                  )}
                </span>
              }
              description={
                activeSectionCount > 0 ? (
                  <span>
                    This class has <strong className="theme-accent font-semibold">{activeSectionCount} active section(s)</strong>. To disable section divisions, delete or migrate all existing sections under this class first.
                  </span>
                ) : (
                  "Enable if this class will have multiple sections (e.g. Section A, Section B). If disabled, students will belong directly to this class without section division."
                )
              }
            />

            {/* 2. Group Divisions Toggle (Revealed ONLY when Sections are disabled/unchecked) */}
            {!formData.has_sections && (
              <div className="pt-3 border-t theme-border animate-fade-in">
                <CustomCheckbox
                  id="class_has_groups_toggle"
                  checked={formData.has_groups}
                  disabled={activeGroupCount > 0}
                  onChange={handleGroupToggle}
                  label={
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm theme-text-primary">Enable Group Divisions</span>
                      {activeGroupCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20">
                          {activeGroupCount} Group{activeGroupCount > 1 ? 's' : ''} Active
                        </span>
                      )}
                    </span>
                  }
                  description={
                    activeGroupCount > 0 ? (
                      <span>
                        This class has <strong className="theme-accent font-semibold">{activeGroupCount} active group(s)</strong>. To disable group divisions, delete or migrate all existing groups under this class first.
                      </span>
                    ) : (
                      "Enable if this direct class will be divided into study groups, batches, or circles (e.g. Group A, Group B). If disabled, this class operates purely at the single direct level."
                    )
                  }
                />
              </div>
            )}
          </div>
        </DrawerSection>
        
        {/* Bottom Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
          saveLabel={editingClass ? "Save Changes" : "Create Class"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}


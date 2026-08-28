import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import { ClassIcon, DepartmentIcon, GroupIcon, SectionIcon } from "../../../../components/ui/Icons";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomInput from "../../../../components/ui/CustomInput";
import { TeacherSelect } from "../../../../components/selectors";
import CustomCheckbox from "../../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerFooter } from "../../../../components/layout";

export default function ClassForm({ editingClass, onSaved, onCancel }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
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

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeSectionCount, setActiveSectionCount] = useState(editingClass?.section_count || 0);
  const [activeGroupCount, setActiveGroupCount] = useState(editingClass?.group_count || 0);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeachers();
    loadDepartments();
    if (editingClass) {
      const knownSecCount = Number(editingClass.section_count) || 0;
      const knownGrpCount = Number(editingClass.group_count) || 0;
      const computedHasSections = knownSecCount > 0 ? true : (editingClass.has_sections ?? true);
      const computedHasGroups = knownGrpCount > 0 ? true : (editingClass.has_groups ?? true);
      
      setFormData({
        name: editingClass.name || "",
        code: editingClass.code || "",
        department: editingClass.department || "",
        department_type: editingClass.department_type || "HIFZ",
        class_teacher: editingClass.class_teacher || "",
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
              const list = Array.isArray(data) ? data : data.results || [];
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
              const list = Array.isArray(data) ? data : data.results || [];
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

  const handleSectionToggle = (checked) => {
    if (!checked && activeSectionCount > 0) {
      showToast(
        `Cannot disable sections because this class currently has ${activeSectionCount} active section(s). Delete or reassign sections first.`,
        "warning"
      );
      return;
    }
    setFormData((prev) => ({ ...prev, has_sections: checked }));
  };

  const handleGroupToggle = (checked) => {
    if (!checked && activeGroupCount > 0) {
      showToast(
        `Cannot disable groups because this class currently has ${activeGroupCount} active group(s). Delete or reassign groups first.`,
        "warning"
      );
      return;
    }
    setFormData((prev) => ({ ...prev, has_groups: checked }));
  };

  const handleSubmit = async (e) => {
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
      order_rank: parseInt(formData.order_rank, 10) || 1,
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
  const isDirty = Boolean(
    !editingClass
      ? formData.name.trim() || formData.code.trim() || formData.department
      : formData.name !== (editingClass.name || "") ||
        formData.code !== (editingClass.code || "") ||
        formData.department !== (editingClass.department || "") ||
        formData.class_teacher !== (editingClass.class_teacher || "") ||
        formData.order_rank !== (editingClass.order_rank ?? 1) ||
        formData.has_sections !== (editingClass.has_sections ?? true) ||
        formData.has_groups !== (editingClass.has_groups ?? true) ||
        formData.is_active !== (editingClass.is_active ?? true)
  );

  const isFormValid = Boolean(formData.name.trim() && formData.department);
  const canSave = isDirty && isFormValid && !submitting;

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
        {departments.length === 0 && (
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-xs theme-text-secondary">
            <p className="font-bold theme-text-primary">No Academic Department Found</p>
            <p className="mt-0.5">
              Classes must belong to a Department. Please create a Department under Academies &amp; Departments first.
            </p>
          </div>
        )}

        {/* Academic Department Selector */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <CustomInput
              label="Class / Grade Name"
              required
              placeholder="e.g. Class 5, Hifz Division, Nazera"
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
            />
          </div>

          <div>
            <CustomInput
              label="Class Code"
              placeholder="e.g. HIFZ-01, CLS-5"
              value={formData.code}
              onChange={(val) => setFormData({ ...formData, code: val.toUpperCase() })}
            />
          </div>
        </div>

        {/* Assigned Class Teacher */}
        <div>
          <TeacherSelect
            label="Assigned Class Teacher / Head Teacher"
            value={formData.class_teacher}
            onChange={(val) => setFormData({ ...formData, class_teacher: val })}
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
            onChange={(val) => setFormData({ ...formData, order_rank: val })}
          />
        </div>

        {/* Dynamic Section & Group Structure Configuration Card */}
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
        
        {/* Bottom Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={editingClass ? "Save Changes" : "Create Class"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

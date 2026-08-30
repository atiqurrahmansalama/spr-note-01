import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import {
  GroupIcon,
  ClassIcon,
  SectionIcon,
  TeacherIcon,
} from "../../../../components/ui/Icons";
import CustomInput from "../../../../components/ui/CustomInput";
import { ClassSelect, SectionSelect, TeacherSelect } from "../../../../components/selectors";
import { DrawerContainer, DrawerFooter } from "../../../../components/layout";

/**
 * GroupForm Component
 * Enterprise right sidebar drawer form for creating and editing Study Groups / Circles.
 * Adheres to zero hardcoded styling, container query responsiveness, and streamlined section layouts.
 */
export default function GroupForm({
  editingGroup = null,
  classes = [],
  teachers = [],
  defaultClassId = "",
  defaultSectionId = "",
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(editingGroup?.id);

  const initialValues = useMemo(() => {
    if (editingGroup) {
      return {
        name: editingGroup.name || "",
        student_class: editingGroup.student_class ? String(editingGroup.student_class) : "",
        section: editingGroup.section ? String(editingGroup.section) : "",
        mentor_teacher: editingGroup.mentor_teacher ? String(editingGroup.mentor_teacher) : "",
        order_rank: editingGroup.order_rank ?? 1,
        is_active: editingGroup.is_active ?? true,
      };
    }
    return {
      name: "",
      student_class: defaultClassId ? String(defaultClassId) : (classes[0]?.id ? String(classes[0].id) : ""),
      section: defaultSectionId ? String(defaultSectionId) : "",
      mentor_teacher: "",
      order_rank: 1,
      is_active: true,
    };
  }, [editingGroup, defaultClassId, defaultSectionId, classes]);

  const [formData, setFormData] = useState(initialValues);
  const [classList, setClassList] = useState(classes);
  const [teacherList, setTeacherList] = useState(teachers);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  // Load lookups if not passed via props
  useEffect(() => {
    async function loadData() {
      if (classes.length > 0 && teachers.length > 0) return;
      setLoadingLookups(true);
      try {
        const [cRes, tRes] = await Promise.allSettled([
          classes.length === 0 ? fetchWithAuth("/api/v1/classes/?page_size=500&all=true") : Promise.resolve(null),
          teachers.length === 0 ? fetchWithAuth("/api/v1/users/") : Promise.resolve(null),
        ]);

        if (cRes.status === "fulfilled" && cRes.value && cRes.value.ok) {
          const d = await cRes.value.json();
          const list = Array.isArray(d) ? d : d.results || [];
          setClassList(list.filter((c) => !c.is_deleted));
        }
        if (tRes.status === "fulfilled" && tRes.value && tRes.value.ok) {
          const d = await tRes.value.json();
          const list = Array.isArray(d) ? d : d.results || [];
          setTeacherList(list.filter((u) => u.is_active && !u.is_deactivated));
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingLookups(false);
      }
    }
    loadData();
  }, [classes.length, teachers.length]);

  const handleClassChange = (newClassId) => {
    setFormData((prev) => ({
      ...prev,
      student_class: newClassId,
      // Clear section if parent class changed
      section: prev.student_class !== newClassId ? "" : prev.section,
    }));
  };

  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some((key) => formData[key] !== initialValues[key]);
  }, [formData, initialValues]);

  const isValid = Boolean(formData.name.trim() && formData.student_class);
  const canSave = isDirty && isValid && !submitting;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.student_class) {
      showToast("Please select a target Academic Class.", "warning");
      return;
    }
    if (!formData.name.trim()) {
      showToast("Group Name is required.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        student_class: formData.student_class,
        section: formData.section || null,
        mentor_teacher: formData.mentor_teacher || null,
        order_rank: parseInt(formData.order_rank, 10) || 1,
        is_active: formData.is_active,
      };

      const url = isEdit ? `/api/v1/groups/${editingGroup.id}/` : "/api/v1/groups/";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          isEdit ? "Group updated successfully!" : "New group created successfully!",
          "success"
        );
        window.dispatchEvent(new CustomEvent("spr_group_updated"));
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.detail || "Failed to save group.", "error");
      }
    } catch {
      showToast("Network error while saving group.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2 text-left">
        {/* ─── 1. Group Information ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <GroupIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Group Information
            </h4>
          </div>

          {/* Complementary Row: Target Class & Target Section */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <ClassSelect
                label="Target Class"
                value={formData.student_class}
                onChange={handleClassChange}
                classes={classList}
                allowAll={false}
                placeholder="Select Class (Required)..."
                icon={ClassIcon}
                required={true}
              />
            </div>

            <div>
              <SectionSelect
                label="Target Section"
                value={formData.section}
                onChange={(val) => setFormData({ ...formData, section: val })}
                classId={formData.student_class}
                allowAll={false}
                placeholder="All Sections (Optional)..."
                icon={SectionIcon}
                optional={true}
              />
            </div>
          </div>

          {/* Group Name */}
          <div>
            <CustomInput
              label="Group Name"
              required
              placeholder="e.g. Group A, Circle Alpha, Nazera Group"
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
            />
          </div>
        </div>

        {/* ─── 2. Mentorship & Supervision ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <TeacherIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Mentorship &amp; Supervision
            </h4>
          </div>

          <div>
            <TeacherSelect
              label="Assigned Mentor"
              value={formData.mentor_teacher}
              onChange={(val) => setFormData({ ...formData, mentor_teacher: val })}
              teachers={teacherList}
              allowAll={true}
              allLabel="Unassigned"
              placeholder="Select Mentor Teacher..."
              searchable={true}
              disabled={loadingLookups}
            />
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={isEdit ? "Save Changes" : "Create Group"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}


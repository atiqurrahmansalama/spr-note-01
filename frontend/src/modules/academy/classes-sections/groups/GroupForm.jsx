import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import { GroupIcon, ClassIcon, SectionIcon, SaveIcon } from "../../../../components/ui/Icons";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomInput from "../../../../components/ui/CustomInput";
import { ClassSelect, SectionSelect, TeacherSelect } from "../../../../components/selectors";
import CustomCheckbox from "../../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerFooter } from "../../../../components/layout";

export default function GroupForm({
  editingGroup,
  classes = [],
  defaultClassId = "",
  defaultSectionId = "",
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    student_class: "",
    section: "",
    mentor_teacher: "",
    order_rank: 1,
    is_active: true,
  });

  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeachers();
    if (editingGroup) {
      setFormData({
        name: editingGroup.name || "",
        student_class: editingGroup.student_class ? String(editingGroup.student_class) : "",
        section: editingGroup.section ? String(editingGroup.section) : "",
        mentor_teacher: editingGroup.mentor_teacher ? String(editingGroup.mentor_teacher) : "",
        order_rank: editingGroup.order_rank ?? 1,
        is_active: editingGroup.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        student_class: defaultClassId ? String(defaultClassId) : "",
        section: defaultSectionId ? String(defaultSectionId) : "",
        mentor_teacher: "",
        order_rank: 1,
        is_active: true,
      });
    }
  }, [editingGroup, defaultClassId, defaultSectionId]);

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetchWithAuth("/api/v1/users/");
      if (res.ok) {
        const data = await res.json();
        const userList = Array.isArray(data) ? data : data.results || [];
        setTeachers(userList.filter((u) => u.user_type === "TEACHER" || u.user_type === "ADMIN"));
      }
    } catch {
      showToast("Failed to load mentor teachers", "error");
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleClassChange = (newClassId) => {
    setFormData((prev) => ({
      ...prev,
      student_class: newClassId,
      // Clear section if parent class changed
      section: prev.student_class !== newClassId ? "" : prev.section,
    }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Group Name is required.", "error");
      return;
    }
    if (!formData.student_class) {
      showToast("Parent Academic Class is required.", "error");
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

      const url = editingGroup ? `/api/v1/groups/${editingGroup.id}/` : "/api/v1/groups/";
      const method = editingGroup ? "PATCH" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          editingGroup ? "Group updated successfully!" : "New group created successfully!",
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

  const isDirty = Boolean(
    !editingGroup
      ? formData.name.trim() || formData.student_class
      : formData.name !== (editingGroup.name || "") ||
        formData.student_class !== (editingGroup.student_class ? String(editingGroup.student_class) : "") ||
        formData.section !== (editingGroup.section ? String(editingGroup.section) : "") ||
        formData.mentor_teacher !== (editingGroup.mentor_teacher ? String(editingGroup.mentor_teacher) : "") ||
        formData.order_rank !== (editingGroup.order_rank ?? 1) ||
        formData.is_active !== (editingGroup.is_active ?? true)
  );

  const isFormValid = Boolean(formData.name.trim() && formData.student_class);
  const canSave = isDirty && isFormValid && !submitting;

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
        {/* Parent Class Selector */}
        <div>
          <ClassSelect
            label="Parent Academic Class"
            value={formData.student_class}
            onChange={handleClassChange}
            classes={classes}
            allowAll={false}
            placeholder="Select Academic Class (Required)..."
            icon={ClassIcon}
            required={true}
          />
        </div>

        {/* Optional Section Selector */}
        <div>
          <SectionSelect
            label="Class Section / Wing"
            value={formData.section}
            onChange={(val) => setFormData({ ...formData, section: val })}
            classId={formData.student_class}
            allowAll={false}
            placeholder="Select Section / Wing (Optional)..."
            icon={SectionIcon}
            optional={true}
          />
        </div>

        {/* Group Name & Rank */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <CustomInput
              label="Group / Circle Name"
              required
              placeholder="e.g. Circle Alpha, Squad 1, Nazera Group"
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
            />
          </div>

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
        </div>

        {/* Assigned Mentor / Teacher */}
        <div>
          <TeacherSelect
            label="Assigned Group Mentor / Ustadh"
            value={formData.mentor_teacher}
            onChange={(val) => setFormData({ ...formData, mentor_teacher: val })}
            teachers={teachers}
            allowAll={true}
            allLabel="Unassigned"
            placeholder="Select Mentor Teacher..."
            searchable={true}
            disabled={loadingTeachers}
          />
        </div>

        {/* Operational Status */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
          <CustomCheckbox
            id="group_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            label="Group Active & Operational"
            description="Allows students to be enrolled, tracked and assigned to this circle unit."
          />
        </div>

        {/* Bottom Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={editingGroup ? "Save Changes" : "Create Group"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

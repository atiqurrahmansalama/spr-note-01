import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { GroupIcon, ClassIcon, SaveIcon } from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomInput from "../../../components/ui/CustomInput";
import { ClassSelect, TeacherSelect } from "../../../components/selectors";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerFooter } from "../../../components/layout";

export default function GroupForm({
  editingGroup,
  classes = [],
  defaultClassId = "",
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    student_class: "",
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
        student_class: editingGroup.student_class || "",
        mentor_teacher: editingGroup.mentor_teacher || "",
        order_rank: editingGroup.order_rank ?? 1,
        is_active: editingGroup.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        student_class: defaultClassId || "",
        mentor_teacher: "",
        order_rank: 1,
        is_active: true,
      });
    }
  }, [editingGroup, defaultClassId]);

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

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Group / Halqa Name is required.", "error");
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
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.detail || "Failed to save group.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if form has been modified
  const isDirty = Boolean(
    !editingGroup
      ? formData.name.trim() || formData.student_class
      : formData.name !== (editingGroup.name || "") ||
        formData.student_class !== (editingGroup.student_class || "") ||
        formData.mentor_teacher !== (editingGroup.mentor_teacher || "") ||
        formData.order_rank !== (editingGroup.order_rank ?? 1) ||
        formData.is_active !== (editingGroup.is_active ?? true)
  );

  const isFormValid = Boolean(formData.name.trim() && formData.student_class);
  const canSave = isDirty && isFormValid && !submitting;

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
        {classes.length === 0 && (
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-xs theme-text-secondary">
            <p className="font-bold theme-text-primary">No Academic Class Found</p>
            <p className="mt-0.5">
              Groups/Halqas must belong to a Class. Please create a Class first before creating a Group.
            </p>
          </div>
        )}

        {/* Parent Class Dropdown */}
        <div>
          <ClassSelect
            label="Parent Academic Class"
            value={formData.student_class}
            onChange={(val) => setFormData({ ...formData, student_class: val })}
            classes={classes}
            allowAll={false}
            placeholder="Select Parent Class (Required)..."
            icon={ClassIcon}
            required={true}
          />
        </div>

        {/* Group Name & Order Rank */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div className="sm:col-span-2">
            <CustomInput
              label="Group Name"
              required
              value={formData.name}
              onChange={(val) => setFormData({ ...formData, name: val })}
              placeholder="e.g. Group A, Section 1"
            />
          </div>

          <div>
            <CustomInput
              type="number"
              label="Display Order"
              min={1}
              max={999}
              value={formData.order_rank}
              onChange={(val) => setFormData({ ...formData, order_rank: val })}
            />
          </div>
        </div>

        {/* Group Mentor Teacher */}
        <div>
          <TeacherSelect
            label="Assigned Group Mentor"
            value={formData.mentor_teacher}
            onChange={(val) => setFormData({ ...formData, mentor_teacher: val })}
            teachers={teachers}
            allowAll={true}
            allLabel="Unassigned / No Mentor Assigned"
            placeholder="Select Mentor Teacher..."
            searchable={true}
            disabled={loadingTeachers}
          />
        </div>

        {/* Group Status using CustomCheckbox */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
          <CustomCheckbox
            id="group_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData({ ...formData, is_active: checked })}
            label="Group Active & Operational"
            description="Active groups appear in daily attendance rosters and student allocations."
            size="md"
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

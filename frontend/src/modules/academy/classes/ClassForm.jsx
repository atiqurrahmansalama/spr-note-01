import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { ClassIcon, DepartmentIcon, SaveIcon } from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomInput from "../../../components/ui/CustomInput";
import { TeacherSelect } from "../../../components/selectors";
import CustomCheckbox from "../../../components/ui/CustomCheckbox";
import { DrawerContainer, DrawerFooter } from "../../../components/layout";

export default function ClassForm({ editingClass, onSaved, onCancel }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department: "",
    department_type: "HIFZ",
    class_teacher: "",
    order_rank: 1,
    is_active: true,
  });

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeachers();
    loadDepartments();
    if (editingClass) {
      setFormData({
        name: editingClass.name || "",
        code: editingClass.code || "",
        department: editingClass.department || "",
        department_type: editingClass.department_type || "HIFZ",
        class_teacher: editingClass.class_teacher || "",
        order_rank: editingClass.order_rank ?? 1,
        is_active: editingClass.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        department: "",
        department_type: "HIFZ",
        class_teacher: "",
        order_rank: 1,
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
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.department?.[0] || err.name?.[0] || err.detail || err.error || "Failed to save class.";
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
            label="Academic Department *"
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
              optional
              placeholder="e.g. HIFZ-01, CLS-5"
              value={formData.code}
              onChange={(val) => setFormData({ ...formData, code: val.toUpperCase() })}
            />
          </div>
        </div>

        {/* Assigned Class Teacher */}
        <div>
          <TeacherSelect
            label="Assigned Class Teacher / Head Ustadh"
            value={formData.class_teacher}
            onChange={(val) => setFormData({ ...formData, class_teacher: val })}
            teachers={teachers}
            allowAll={true}
            allLabel="Unassigned / No Teacher Assigned"
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

        {/* Operational Status Checkbox */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
          <CustomCheckbox
            id="class_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData({ ...formData, is_active: checked })}
            label="Class Active & Operational"
            description="Active classes are accessible in course listings, schedules and student enrollment."
            size="md"
          />
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

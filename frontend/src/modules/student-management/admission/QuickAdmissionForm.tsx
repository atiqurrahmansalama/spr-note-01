import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomInput from "../../../components/ui/CustomInput";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomButton from "../../../components/ui/CustomButton";
import {
  CheckCircleIcon,
  CalendarIcon,
} from "../../../components/ui/Icons";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import { formatDate } from "../../../utils/reportGenerator";
import { useAcademicData } from "../../../hooks/useAcademicData";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
} from "../../learning/daily-classroom/dailyClassroomUtils";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { students as studentStore } from "../../../utils/localStore";
import { validateBDPhone } from "../../../utils/inputValidators";
import { useTenant } from "../../../context/TenantContext";
import { readJSON, writeJSON } from "../../../stores/coreStore";

export interface QuickAdmissionFormProps {
  onCancel?: () => void;
  onSuccess?: (student: any) => void;
  initialValues?: {
    name?: string;
    department?: string;
    student_class?: string;
    student_section?: string;
    guardian_phone?: string;
    admission_date?: string;
  };
  sharedData?: any;
  setSharedData?: React.Dispatch<React.SetStateAction<any>>;
  editingStudent?: any;
}

/**
 * Enterprise Quick Admission Form
 * Compact 2-section fast-track enrollment with reusable calendar date picker:
 * 1. Student Information (Name, Contact Phone, Admission Date via ReusableCalendar)
 * 2. Academic Placement (Department, Class, Section)
 */
export default function QuickAdmissionForm({
  onCancel,
  onSuccess,
  initialValues,
  sharedData,
  setSharedData,
  editingStudent,
}: QuickAdmissionFormProps) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || "default";

  const isEditing = Boolean(sharedData?.is_editing || editingStudent || sharedData?.edit_student_id);
  const editStudentId = sharedData?.edit_student_id || editingStudent?.id;

  const returnTo = searchParams.get("returnTo") || "";
  const paramName = searchParams.get("name") || initialValues?.name || "";
  const paramDept = searchParams.get("dept") || initialValues?.department || "";
  const paramClass = searchParams.get("class") || initialValues?.student_class || "";
  const paramSection = searchParams.get("section") || initialValues?.student_section || "";

  const buildRedirectUrl = (baseUrl: string, student: any) => {
    const delimiter = baseUrl.includes("?") ? "&" : "?";
    const redirectParams = new URLSearchParams();
    const nameVal = student?.name_en || student?.name || "";
    const idVal = student?.id || "";
    const deptVal = student?.department || student?.department_id || "";
    const classVal = student?.student_class || student?.class_id || "";
    const secVal = student?.student_section || student?.section_id || "";
    const groupVal = student?.group_name || student?.section_name || student?.sub || "";

    if (nameVal) redirectParams.set("selectedStudentName", nameVal);
    if (idVal) redirectParams.set("selectedStudentId", String(idVal));
    if (deptVal) redirectParams.set("dept", String(deptVal));
    if (classVal) redirectParams.set("class", String(classVal));
    if (secVal) redirectParams.set("section", String(secVal));
    if (groupVal) redirectParams.set("group", String(groupVal));

    return `${baseUrl}${delimiter}${redirectParams.toString()}`;
  };

  const injectIntoAcademicCache = (student: any) => {
    try {
      const cacheKey = `spr_students_cache_${activeTenantId}`;
      const cached = readJSON(cacheKey, []);
      const exists = cached.some((s: any) => String(s.id) === String(student.id));
      if (!exists) {
        writeJSON(cacheKey, [student, ...cached]);
      }
    } catch (e) {
      console.warn("Failed to inject student into academic cache:", e);
    }
  };

  const academicData = useAcademicData();
  const {
    departments = [],
    classes = [],
    sections = [],
    refetch: refetchAcademicData,
  } = academicData || {};

  // Form State initialized from sharedData, initialValues, or URL params
  const [formData, setFormData] = useState({
    name: sharedData?.name || paramName,
    department: sharedData?.department || paramDept,
    student_class: sharedData?.student_class || paramClass,
    student_section: sharedData?.student_section || paramSection,
    admission_date: sharedData?.admission_date || new Date().toISOString().split("T")[0],
    guardian_phone: sharedData?.guardian_phone || sharedData?.father_phone || initialValues?.guardian_phone || "",
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync if sharedData or query parameters change
  useEffect(() => {
    if (sharedData) {
      setFormData((prev) => ({
        ...prev,
        name: sharedData.name != null && sharedData.name !== "" ? sharedData.name : (paramName || prev.name),
        department: sharedData.department != null && sharedData.department !== "" ? String(sharedData.department) : (paramDept || prev.department),
        student_class: sharedData.student_class != null && sharedData.student_class !== "" ? String(sharedData.student_class) : (paramClass || prev.student_class),
        student_section: sharedData.student_section != null && sharedData.student_section !== "" ? String(sharedData.student_section) : (paramSection || prev.student_section),
        admission_date: sharedData.admission_date || prev.admission_date,
        guardian_phone: sharedData.guardian_phone || sharedData.father_phone || prev.guardian_phone,
      }));
    } else if (paramName || paramDept || paramClass || paramSection) {
      setFormData((prev) => ({
        ...prev,
        name: paramName || prev.name,
        department: paramDept || prev.department,
        student_class: paramClass || prev.student_class,
        student_section: paramSection || prev.student_section,
      }));
    }
  }, [
    sharedData?.name,
    sharedData?.department,
    sharedData?.student_class,
    sharedData?.student_section,
    sharedData?.admission_date,
    sharedData?.guardian_phone,
    sharedData?.father_phone,
    paramName,
    paramDept,
    paramClass,
    paramSection,
  ]);

  // Handle outside click for date picker popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  const handleFieldChange = (field: string, rawVal: any) => {
    const value =
      rawVal !== null && typeof rawVal === "object" && "target" in rawVal
        ? rawVal.target.value
        : rawVal;
    setFormData((prev) => {
      const next = { ...prev, [field]: value ?? "" };
      if (field === "department") {
        next.student_class = "";
        next.student_section = "";
      } else if (field === "student_class") {
        next.student_section = "";
      }
      return next;
    });

    if (setSharedData) {
      setSharedData((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev, [field]: value ?? "" };
        if (field === "department") {
          next.student_class = "";
          next.student_section = "";
        } else if (field === "student_class") {
          next.student_section = "";
        }
        return next;
      });
    }
  };

  // Cascading Select Options
  const departmentOptions = useMemo(() => {
    return (departments || []).map((d: any) => ({
      value: String(d.id),
      label: d.name || d.department_name || `Department ${d.id}`,
    }));
  }, [departments]);

  const classOptions = useMemo(() => {
    return (classes || [])
      .filter((c: any) => !formData.department || doesStudentMatchDepartment(c, formData.department, departments, classes))
      .map((c: any) => ({
        value: String(c.id),
        label: c.name || c.class_name || `Class ${c.id}`,
      }));
  }, [classes, departments, formData.department]);

  const sectionOptions = useMemo(() => {
    return (sections || [])
      .filter((s: any) => !formData.student_class || doesStudentMatchClass(s, formData.student_class, classes))
      .map((s: any) => ({
        value: String(s.id),
        label: s.section_name || s.name || `Section ${s.id}`,
      }));
  }, [sections, classes, formData.student_class]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else if (returnTo) {
      navigate(returnTo, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Student Name is required", "warning");
      return;
    }

    if (formData.guardian_phone && formData.guardian_phone.trim().length > 0) {
      const phoneStr = formData.guardian_phone.trim();
      const cleanDigits = phoneStr.replace(/\D/g, "");
      const isValid = validateBDPhone(phoneStr) || (cleanDigits.length >= 10 && cleanDigits.length <= 15);
      if (!isValid) {
        showToast("Please enter a valid phone number (e.g. 01XXXXXXXXX)", "warning");
        return;
      }
    }

    setIsSubmitting(true);

    const selectedDeptObj = (departments || []).find((d: any) => String(d.id) === String(formData.department));
    const selectedClassObj = (classes || []).find((c: any) => String(c.id) === String(formData.student_class));
    const selectedSectionObj = (sections || []).find((s: any) => String(s.id) === String(formData.student_section));

    const departmentName = selectedDeptObj?.name || selectedDeptObj?.department_name || "";
    const sectionName = selectedSectionObj?.section_name || selectedSectionObj?.name || "";
    const className = selectedClassObj?.name || selectedClassObj?.class_name || "";

    // ─── 1. EDIT MODE SUBMISSION (PATCH) ──────────────────────────────────
    if (isEditing && editStudentId) {
      const updatePayload = {
        name: formData.name.trim(),
        student_class: formData.student_class || null,
        department: formData.department || null,
        student_section: formData.student_section || null,
        education_status: className,
        admission_date: formData.admission_date,
        academic_data: {
          department: formData.department || null,
          student_class: formData.student_class || null,
          student_section: formData.student_section || null,
          admission_date: formData.admission_date,
        },
        guardian_data: {
          primary_guardian_phone: formData.guardian_phone.trim(),
          guardian_phone: formData.guardian_phone.trim(),
          emergency_contact_phone: formData.guardian_phone.trim(),
        },
      };

      try {
        const res = await fetchWithAuth(`/api/v1/students/${editStudentId}/full-profile/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          const updatedStu = {
            ...editingStudent,
            ...resData,
            name: formData.name.trim(),
            name_en: formData.name.trim(),
            department: formData.department || resData.department,
            department_name: resData.department_name || departmentName,
            student_class: formData.student_class || resData.student_class,
            student_class_name: resData.student_class_name || className,
            class_name: resData.student_class_name || className,
            education_status: resData.education_status || className,
            student_section: formData.student_section || resData.student_section,
            section_name: resData.section_name || sectionName,
            group_name: resData.group_name || resData.student_group_name || sectionName || className || "General Group",
            guardian_phone: formData.guardian_phone.trim(),
            uniq_id: resData.uniq_id || editingStudent?.uniq_id || `ID: ${editStudentId}`,
            student_id_card_number: resData.student_id_card_number || editingStudent?.student_id_card_number || resData.uniq_id,
            id: editStudentId,
            is_editing: true,
          };
          studentStore.update(String(editStudentId), updatedStu);
          injectIntoAcademicCache(updatedStu);
          showToast(`Student "${formData.name}" updated successfully!`, "success");
          window.dispatchEvent(new CustomEvent("spr_students_updated"));
          window.dispatchEvent(new CustomEvent("spr_student_updated", { detail: updatedStu }));
          refetchAcademicData?.();

          if (onSuccess) {
            onSuccess(updatedStu);
          } else if (returnTo) {
            navigate(buildRedirectUrl(returnTo, updatedStu), { replace: true });
          } else {
            navigate("/groups-students");
          }
          return;
        } else {
          // Fallback basic patch
          const fallbackRes = await fetchWithAuth(`/api/v1/students/${editStudentId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.name.trim(),
              name_en: formData.name.trim(),
              student_class: formData.student_class || null,
              department: formData.department || null,
              student_section: formData.student_section || null,
            }),
          });
          if (fallbackRes.ok) {
            const updatedStu = {
              ...editingStudent,
              name: formData.name.trim(),
              name_en: formData.name.trim(),
              department: formData.department,
              department_name: departmentName,
              student_class: formData.student_class,
              student_class_name: className,
              class_name: className,
              education_status: className,
              student_section: formData.student_section,
              section_name: sectionName,
              id: editStudentId,
              is_editing: true,
            };
            showToast(`Student "${formData.name}" updated successfully!`, "success");
            window.dispatchEvent(new CustomEvent("spr_students_updated"));
            refetchAcademicData?.();
            if (onSuccess) onSuccess(updatedStu);
            else navigate("/groups-students");
            return;
          }
          const errData = await res.json().catch(() => ({}));
          showToast(errData?.detail || errData?.message || "Failed to update student profile", "error");
        }
      } catch (err) {
        console.error("Quick admission edit error:", err);
        showToast("Failed to update student profile", "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ─── 2. NEW ADMISSION SUBMISSION (POST) ────────────────────────────────
    const localStudentId = `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const generatedUniqId = `STD-${new Date().getFullYear()}-${localStudentId.slice(-4).toUpperCase()}`;

    const newStudentProfile = {
      id: localStudentId,
      uniq_id: generatedUniqId,
      student_id_card_number: generatedUniqId,
      name: formData.name.trim(),
      name_en: formData.name.trim(),
      label: formData.name.trim(),
      sub: sectionName || className || "General Group",
      department: formData.department || null,
      department_name: departmentName,
      student_class: formData.student_class || null,
      student_class_name: className,
      class_name: className,
      education_status: className,
      student_section: formData.student_section || null,
      section_name: sectionName,
      group_name: sectionName || className || "General Group",
      session_year: "2026-2027",
      admission_date: formData.admission_date,
      admission_mode: "QUICK",
      status: "ACTIVE",
      guardian_phone: formData.guardian_phone.trim(),
      _local: true,
    };

    const admissionPayload = {
      name: formData.name.trim(),
      admission_mode: "QUICK",
      status: "ACTIVE",
      student_class: formData.student_class || null,
      department: formData.department || null,
      student_section: formData.student_section || null,
      education_status: className,
      academic_data: {
        department: formData.department || null,
        student_class: formData.student_class || null,
        student_section: formData.student_section || null,
        admission_date: formData.admission_date,
      },
      guardian_data: {
        guardian_phone: formData.guardian_phone.trim(),
      },
    };

    let savedStudent = newStudentProfile;

    try {
      // 1. Save locally for instant reactivity
      studentStore.add(newStudentProfile);

      // 2. Submit to backend API
      const res = await fetchWithAuth("/api/v1/students/admission/", {
        method: "POST",
        body: JSON.stringify(admissionPayload),
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        if (resData && resData.id) {
          savedStudent = {
            ...newStudentProfile,
            ...resData,
            department: formData.department || resData.department || null,
            department_name: resData.department_name || departmentName,
            student_class: formData.student_class || resData.student_class || null,
            student_class_name: resData.student_class_name || className,
            class_name: resData.student_class_name || className,
            education_status: resData.education_status || className,
            student_section: formData.student_section || resData.student_section || null,
            section_name: resData.section_name || sectionName,
            group_name: resData.group_name || resData.student_group_name || sectionName || className || "General Group",
            uniq_id: resData.uniq_id || resData.student_id_card_number || newStudentProfile.uniq_id,
            student_id_card_number: resData.student_id_card_number || resData.uniq_id || newStudentProfile.student_id_card_number,
            id: String(resData.id),
            _local: false,
          };
          studentStore.add(savedStudent);
        }
        showToast(`Student "${formData.name}" admitted successfully!`, "success");
      } else {
        const fallbackRes = await fetchWithAuth("/students/", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name.trim(),
            group: sectionName || "General Group",
          }),
        }).catch(() => null);

        if (fallbackRes && fallbackRes.ok) {
          showToast(`Student "${formData.name}" admitted successfully!`, "success");
        } else {
          showToast(`"${formData.name}" saved locally. Will sync when online.`, "info");
        }
      }

      injectIntoAcademicCache(savedStudent);
      window.dispatchEvent(new CustomEvent("spr_students_updated"));
      window.dispatchEvent(new CustomEvent("spr_student_admitted", { detail: savedStudent }));
      refetchAcademicData?.();

      if (onSuccess) {
        onSuccess(savedStudent);
      } else if (returnTo) {
        navigate(buildRedirectUrl(returnTo, savedStudent), { replace: true });
      } else {
        navigate("/groups-students");
      }
    } catch (err) {
      console.error("Quick admission error:", err);
      showToast(`Student saved locally (offline mode).`, "info");
      injectIntoAcademicCache(savedStudent);
      window.dispatchEvent(new CustomEvent("spr_students_updated"));
      window.dispatchEvent(new CustomEvent("spr_student_admitted", { detail: savedStudent }));

      if (onSuccess) {
        onSuccess(savedStudent);
      } else if (returnTo) {
        navigate(buildRedirectUrl(returnTo, savedStudent), { replace: true });
      } else {
        navigate("/groups-students");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in text-left font-sans">
      <form
        onSubmit={handleSubmit}
        className="theme-bg-surface rounded-2xl sm:rounded-3xl p-6 sm:p-8 border theme-border shadow-xs space-y-6"
      >
        {/* Clean Responsive Grid for All 6 Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Student Name */}
          <div className="sm:col-span-2 lg:col-span-1">
            <CustomInput
              label="Student Name"
              required={true}
              placeholder="e.g. Abdullah Ibn Omar"
              value={formData.name}
              onChange={(val: any) => handleFieldChange("name", val)}
              autoFocus={true}
            />
          </div>

          {/* 2. Contact Phone */}
          <CustomInput
            label="EMERGENCY NUMBER"
            type="phone"
            placeholder="01XXXXXXXXX"
            value={formData.guardian_phone}
            onChange={(val: any) => handleFieldChange("guardian_phone", val)}
          />

          {/* 3. Reusable Calendar Date Picker */}
          <div ref={calendarContainerRef} className="relative w-full text-left font-sans">
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2 select-none">
              Admission Date
            </label>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 sm:py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary hover:border-[var(--accent-main)]/40 focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all cursor-pointer shadow-xs"
              title="Select Admission Date"
            >
              <span>
                {formData.admission_date
                  ? formatDate(formData.admission_date)
                  : "Select date..."}
              </span>
              <CalendarIcon className="w-4 h-4 theme-text-secondary shrink-0" />
            </button>

            {isCalendarOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 theme-bg-surface border theme-border rounded-2xl p-2 shadow-2xl w-72 animate-fade-in text-left">
                <ReusableCalendar
                  isInline
                  selectedDate={formData.admission_date}
                  onSelectDate={(dateStr: string) => {
                    handleFieldChange("admission_date", dateStr);
                    setIsCalendarOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* 4. Department (if available) */}
          {departmentOptions.length > 0 && (
            <CustomSelect
              label="Department"
              placeholder="Select Department..."
              options={departmentOptions}
              value={formData.department}
              onChange={(val: any) => handleFieldChange("department", val)}
            />
          )}

          {/* 5. Class */}
          <CustomSelect
            label="Class"
            placeholder="Select Class..."
            options={classOptions}
            value={formData.student_class}
            onChange={(val: any) => handleFieldChange("student_class", val)}
          />

          {/* 6. Section */}
          <CustomSelect
            label="Section"
            placeholder="Select Section..."
            options={sectionOptions}
            value={formData.student_section}
            onChange={(val: any) => handleFieldChange("student_section", val)}
            actionLabel="+ Add Section"
            onActionClick={() =>
              navigate("/academy/classes-groups?tab=sections&drawer=section&mode=add")
            }
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t theme-border">
          <CustomButton
            type="button"
            variant="secondary"
            onClick={handleBack}
          >
            Cancel
          </CustomButton>
          <CustomButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            loadingText={isEditing ? "Updating Profile..." : "Completing Admission..."}
            icon={CheckCircleIcon}
          >
            {isEditing ? "Update Profile" : "Save & Return to Classroom"}
          </CustomButton>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomInput from "../../../components/ui/CustomInput";
import CustomSelect from "../../../components/ui/CustomSelect";
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

export interface QuickAdmissionFormProps {
  onCancel?: () => void;
  onSuccess?: (student: any) => void;
  initialValues?: {
    name?: string;
    department?: string;
    student_class?: string;
    student_section?: string;
  };
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
}: QuickAdmissionFormProps) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = searchParams.get("returnTo") || "";
  const paramName = searchParams.get("name") || initialValues?.name || "";
  const paramDept = searchParams.get("dept") || initialValues?.department || "";
  const paramClass = searchParams.get("class") || initialValues?.student_class || "";
  const paramSection = searchParams.get("section") || initialValues?.student_section || "";

  const academicData = useAcademicData();
  const {
    departments = [],
    classes = [],
    sections = [],
    refetch: refetchAcademicData,
  } = academicData || {};

  // Form State
  const [formData, setFormData] = useState({
    name: paramName,
    department: paramDept,
    student_class: paramClass,
    student_section: paramSection,
    admission_date: new Date().toISOString().split("T")[0],
    guardian_phone: "",
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync if query parameters change
  useEffect(() => {
    if (paramName && !formData.name) {
      setFormData((prev) => ({ ...prev, name: paramName }));
    }
  }, [paramName]);

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
      const cleanPhone = formData.guardian_phone.replace(/\D/g, "");
      if (cleanPhone.length !== 11 && cleanPhone.length !== 10) {
        showToast("Please enter a valid 11-digit phone number", "warning");
        return;
      }
    }

    setIsSubmitting(true);

    const selectedClassObj = (classes || []).find((c: any) => String(c.id) === String(formData.student_class));
    const selectedSectionObj = (sections || []).find((s: any) => String(s.id) === String(formData.student_section));

    const sectionName = selectedSectionObj?.section_name || selectedSectionObj?.name || "";
    const className = selectedClassObj?.name || selectedClassObj?.class_name || "";

    const localStudentId = `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newStudentProfile = {
      id: localStudentId,
      name: formData.name.trim(),
      name_en: formData.name.trim(),
      label: formData.name.trim(),
      sub: sectionName || className || "General Group",
      department: formData.department || null,
      student_class: formData.student_class || null,
      student_section: formData.student_section || null,
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

      window.dispatchEvent(new CustomEvent("spr_students_updated"));
      window.dispatchEvent(new CustomEvent("spr_student_admitted", { detail: savedStudent }));
      refetchAcademicData?.();

      if (onSuccess) {
        onSuccess(savedStudent);
      } else if (returnTo) {
        const delimiter = returnTo.includes("?") ? "&" : "?";
        const redirectUrl = `${returnTo}${delimiter}selectedStudentName=${encodeURIComponent(savedStudent.name)}&selectedStudentId=${encodeURIComponent(savedStudent.id)}`;
        navigate(redirectUrl, { replace: true });
      } else {
        navigate("/groups-students");
      }
    } catch (err) {
      console.error("Quick admission error:", err);
      showToast(`Student saved locally (offline mode).`, "info");
      window.dispatchEvent(new CustomEvent("spr_students_updated"));
      window.dispatchEvent(new CustomEvent("spr_student_admitted", { detail: savedStudent }));

      if (onSuccess) {
        onSuccess(savedStudent);
      } else if (returnTo) {
        const delimiter = returnTo.includes("?") ? "&" : "?";
        const redirectUrl = `${returnTo}${delimiter}selectedStudentName=${encodeURIComponent(savedStudent.name)}&selectedStudentId=${encodeURIComponent(savedStudent.id)}`;
        navigate(redirectUrl, { replace: true });
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
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 rounded-xl border theme-border text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
          >
            Cancel &amp; Return
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>{isSubmitting ? "Completing Admission..." : "Save & Return to Classroom"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

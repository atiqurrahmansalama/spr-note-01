import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomInput from "../../../components/ui/CustomInput";
import CustomSelect from "../../../components/ui/CustomSelect";
import CustomButton from "../../../components/ui/CustomButton";
import {
  CheckCircleIcon,
} from "../../../components/ui/Icons";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import { useAcademicData } from "../../../hooks/useAcademicData";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
} from "../../learning/utils/dailyClassroomUtils";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { students as studentStore } from "../../../utils/localStore";
import { validateBDPhone } from "../../../utils/inputValidators";
import { useTenant } from "../../../context/TenantContext";
import { readJSON, writeJSON } from "../../../stores/coreStore";
import { getLocalizedValue, normalizeLocalizedValue, hasAnyLanguageContent, type LocalizedValue } from "@/i18n/localizedEntity";
import { useFormAutoSave } from "../../../hooks";
import AutoSaveBadge from "../../../components/ui/AutoSaveBadge";

export interface QuickAdmissionFormProps {
  onCancel?: () => void;
  onSuccess?: (student: any) => void;
  initialValues?: {
    name?: string | LocalizedValue;
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

  const queryEditId = searchParams.get("edit") || searchParams.get("student_id") || searchParams.get("id") || "";
  const isEditing = Boolean(sharedData?.is_editing || editingStudent || sharedData?.edit_student_id || queryEditId);
  const editStudentId = sharedData?.edit_student_id || editingStudent?.id || queryEditId;

  const returnTo = searchParams.get("returnTo") || "";
  const paramName = searchParams.get("name") || initialValues?.name || "";
  const rawDept = searchParams.get("dept") || initialValues?.department || "";
  const rawClass = searchParams.get("class") || initialValues?.student_class || "";
  const rawSection = searchParams.get("section") || initialValues?.student_section || "";
  const paramDept = rawDept === "ALL" ? "" : rawDept;
  const paramClass = rawClass === "ALL" ? "" : rawClass;
  const paramSection = rawSection === "ALL" ? "" : rawSection;

  const buildRedirectUrl = (baseUrl: string, student: any) => {
    const delimiter = baseUrl.includes("?") ? "&" : "?";
    const redirectParams = new URLSearchParams();
    const nameVal = student?.name_en || student?.name || "";
    const idVal = student?.id || "";
    const deptVal = student?.department || student?.department_id || "";
    const classVal = student?.student_class || student?.class_id || "";
    const secVal =
      student?.student_section ||
      (typeof student?.section === "object" ? student?.section?.id : student?.section) ||
      student?.section_id ||
      "";
    const groupVal = student?.group_name || student?.section_name || student?.sub || "";

    if (nameVal) redirectParams.set("selectedStudentName", nameVal);
    if (idVal) redirectParams.set("selectedStudentId", String(idVal));
    if (deptVal) redirectParams.set("dept", String(deptVal));
    if (classVal) redirectParams.set("class", String(classVal));
    if (secVal) redirectParams.set("section", String(secVal));
    if (groupVal) redirectParams.set("group", String(groupVal));

    return `${baseUrl}${delimiter}${redirectParams.toString()}`;
  };

  const injectIntoAcademicCache = (student: any, tempIdToRemove?: string) => {
    try {
      const cacheKey = `spr_students_cache_${activeTenantId}`;
      const cached = readJSON(cacheKey, []);
      const filtered = cached.filter(
        (s: any) =>
          String(s.id) !== String(student.id) &&
          (!tempIdToRemove || String(s.id) !== String(tempIdToRemove))
      );
      writeJSON(cacheKey, [student, ...filtered]);
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

  const resolveInitialName = (stu: any, shared: any, param: string) => {
    if (stu) {
      if (stu.name_i18n && typeof stu.name_i18n === "object" && Object.keys(stu.name_i18n).length > 0) {
        return stu.name_i18n;
      }
      if (stu.bangla_name || stu.details?.name_bn) {
        return {
          en: stu.name_en || stu.name || "",
          bn: stu.bangla_name || stu.details?.name_bn || "",
        };
      }
      return stu.name_en || stu.name || "";
    }
    if (shared?.name) {
      return shared.name;
    }
    return param || "";
  };

  // Form State initialized from sharedData, editingStudent, initialValues, or URL params
  const [formData, setFormData] = useState(() => ({
    name: resolveInitialName(editingStudent, sharedData, paramName),
    department: sharedData?.department || editingStudent?.department || editingStudent?.department_id || paramDept,
    student_class: sharedData?.student_class || (editingStudent?.student_class != null ? String(editingStudent.student_class) : "") || (editingStudent?.class_id ? String(editingStudent.class_id) : "") || paramClass,
    student_section: sharedData?.student_section || (editingStudent?.student_section != null ? String(editingStudent.student_section) : "") || (editingStudent?.section != null ? String(editingStudent.section) : "") || (editingStudent?.section_id ? String(editingStudent.section_id) : "") || paramSection,
    admission_date: sharedData?.admission_date || editingStudent?.admission_date || new Date().toISOString().split("T")[0],
    guardian_phone: sharedData?.guardian_phone || sharedData?.father_phone || editingStudent?.guardian_phone || editingStudent?.details?.guardian_phone || initialValues?.guardian_phone || "",
  }));

  // Auto-Save / Draft Persistence (Restores and persists form draft across browser refreshes)
  const storageKey = `spr_quick_adm_${activeTenantId || 'default'}`;
  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: !isEditing && !editingStudent && !sharedData?.is_editing && !sharedData?.edit_student_id,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastLoadedStudentIdRef = useRef<string | number | null>(editingStudent?.id || null);

  // Sync ONLY when editing student record changes (by ID) to avoid overwriting typed keystrokes
  useEffect(() => {
    if (editingStudent && editingStudent.id && lastLoadedStudentIdRef.current !== editingStudent.id) {
      lastLoadedStudentIdRef.current = editingStudent.id;
      setFormData({
        name: resolveInitialName(editingStudent, null, ""),
        department: editingStudent.department || editingStudent.department_id || "",
        student_class: editingStudent.student_class != null ? String(editingStudent.student_class) : (editingStudent.class_id ? String(editingStudent.class_id) : ""),
        student_section: editingStudent.student_section != null ? String(editingStudent.student_section) : (editingStudent.section != null ? String(editingStudent.section) : (editingStudent.section_id ? String(editingStudent.section_id) : "")),
        admission_date: editingStudent.admission_date || new Date().toISOString().split("T")[0],
        guardian_phone: editingStudent.guardian_phone || editingStudent.details?.guardian_phone || editingStudent.father_phone || "",
      });
    }
  }, [editingStudent?.id]);

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
      } else if (field === "student_section" && value) {
        const matchedSec = (sections || []).find((s: any) => String(s.id) === String(value));
        if (matchedSec) {
          const secClassId =
            matchedSec.student_class ||
            matchedSec.class_id ||
            (typeof matchedSec.student_class === "object" ? matchedSec.student_class?.id : null);
          if (secClassId && !next.student_class) {
            next.student_class = String(secClassId);
            const matchedCls = (classes || []).find((c: any) => String(c.id) === String(secClassId));
            if (matchedCls) {
              const clsDeptId =
                matchedCls.department ||
                matchedCls.department_id ||
                (typeof matchedCls.department === "object" ? matchedCls.department?.id : null);
              if (clsDeptId && !next.department) {
                next.department = String(clsDeptId);
              }
            }
          }
        }
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
        } else if (field === "student_section" && value) {
          const matchedSec = (sections || []).find((s: any) => String(s.id) === String(value));
          if (matchedSec) {
            const secClassId =
              matchedSec.student_class ||
              matchedSec.class_id ||
              (typeof matchedSec.student_class === "object" ? matchedSec.student_class?.id : null);
            if (secClassId && !next.student_class) {
              next.student_class = String(secClassId);
              const matchedCls = (classes || []).find((c: any) => String(c.id) === String(secClassId));
              if (matchedCls) {
                const clsDeptId =
                  matchedCls.department ||
                  matchedCls.department_id ||
                  (typeof matchedCls.department === "object" ? matchedCls.department?.id : null);
                if (clsDeptId && !next.department) {
                  next.department = String(clsDeptId);
                }
              }
            }
          }
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

    const hasName = typeof formData.name === "object"
      ? hasAnyLanguageContent(formData.name)
      : Boolean(formData.name && String(formData.name).trim().length > 0);

    if (!hasName) {
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
    if (isEditing) {
      if (!editStudentId) {
        showToast("Cannot update student: Student ID is missing. Please select the student again.", "error");
        setIsSubmitting(false);
        return;
      }

      const targetClass = formData.student_class || editingStudent?.student_class || editingStudent?.class_id || null;
      const targetSection = formData.student_section || editingStudent?.student_section || editingStudent?.section || editingStudent?.section_id || null;
      const targetDept = formData.department || editingStudent?.department || editingStudent?.department_id || null;

      const primaryName = (typeof formData.name === "object"
        ? getLocalizedValue(formData.name, "en") || getLocalizedValue(formData.name, "bn") || Object.values(formData.name).find(Boolean) || ""
        : String(formData.name || "")
      ).trim();
      const bnName = typeof formData.name === "object" ? getLocalizedValue(formData.name, "bn") : "";
      const nameI18n = typeof formData.name === "object" ? formData.name : { en: primaryName, bn: bnName };

      const updatePayload: Record<string, any> = {
        name: primaryName,
        name_en: primaryName,
        bangla_name: bnName,
        name_i18n: nameI18n,
        student_class: targetClass || null,
        section: targetSection || null,
        student_section: targetSection || null,
        education_status: className || editingStudent?.education_status || editingStudent?.student_class_name || "",
        admission_date: formData.admission_date || editingStudent?.admission_date || undefined,
        academic_data: {
          admission_date: formData.admission_date || editingStudent?.admission_date || undefined,
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
            name: primaryName,
            name_en: primaryName,
            department: targetDept || resData.department,
            department_name: resData.department_name || departmentName || editingStudent?.department_name,
            student_class: targetClass || resData.student_class,
            student_class_name: resData.student_class_name || className || editingStudent?.student_class_name,
            class_name: resData.student_class_name || className || editingStudent?.class_name,
            education_status: resData.education_status || className || editingStudent?.education_status,
            student_section: targetSection || resData.student_section,
            section_name: resData.section_name || sectionName || editingStudent?.section_name,
            group_name: resData.group_name || resData.student_group_name || sectionName || className || editingStudent?.group_name || "General Group",
            guardian_phone: formData.guardian_phone.trim(),
            uniq_id: resData.uniq_id || editingStudent?.uniq_id || `ID: ${editStudentId}`,
            student_id_card_number: resData.student_id_card_number || editingStudent?.student_id_card_number || resData.uniq_id,
            id: editStudentId,
            is_editing: true,
          };
          try {
            studentStore.update(String(editStudentId), updatedStu);
          } catch (stErr) {
            console.warn("Local studentStore update warning:", stErr);
          }
          injectIntoAcademicCache(updatedStu);
          clearDraft();
          showToast(`Student "${primaryName}" updated successfully!`, "success");
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
              name: primaryName,
              name_en: primaryName,
              student_class: targetClass || null,
              section: targetSection || null,
              student_section: targetSection || null,
            }),
          });
          if (fallbackRes.ok) {
            const resData = await fallbackRes.json().catch(() => ({}));
            const updatedStu = {
              ...editingStudent,
              ...resData,
              name: primaryName,
              name_en: primaryName,
              department: targetDept || resData.department,
              department_name: departmentName || editingStudent?.department_name,
              student_class: targetClass || resData.student_class,
              student_class_name: className || editingStudent?.student_class_name,
              class_name: className || editingStudent?.class_name,
              education_status: className || editingStudent?.education_status,
              student_section: targetSection || resData.student_section,
              section_name: sectionName || editingStudent?.section_name,
              id: editStudentId,
              is_editing: true,
            };
            try {
              studentStore.update(String(editStudentId), updatedStu);
            } catch (stErr) {
              console.warn("Local studentStore update warning:", stErr);
            }
            injectIntoAcademicCache(updatedStu);
            clearDraft();
            showToast(`Student "${primaryName}" updated successfully!`, "success");
            window.dispatchEvent(new CustomEvent("spr_students_updated"));
            window.dispatchEvent(new CustomEvent("spr_student_updated", { detail: updatedStu }));
            refetchAcademicData?.();
            if (onSuccess) onSuccess(updatedStu);
            else navigate("/groups-students");
            return;
          }
          const errData = await res.json().catch(() => ({}));
          let errorMsg = "Failed to update student profile";
          if (errData && typeof errData === "object") {
            if (typeof errData.detail === "string") errorMsg = errData.detail;
            else if (typeof errData.message === "string") errorMsg = errData.message;
            else {
              const firstVal = Object.values(errData)[0];
              if (typeof firstVal === "string") errorMsg = firstVal;
              else if (Array.isArray(firstVal) && firstVal.length > 0) errorMsg = String(firstVal[0]);
            }
          }
          showToast(errorMsg, "error");
        }
      } catch (err: any) {
        console.error("Quick admission edit error:", err);
        showToast(err?.message || "Failed to update student profile", "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ─── 2. NEW ADMISSION SUBMISSION (POST) ────────────────────────────────
    const localStudentId = `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const generatedUniqId = `STD-${new Date().getFullYear()}-${localStudentId.slice(-4).toUpperCase()}`;

    const primaryName = (typeof formData.name === "object"
      ? getLocalizedValue(formData.name, "en") || getLocalizedValue(formData.name, "bn") || Object.values(formData.name).find(Boolean) || ""
      : String(formData.name || "")
    ).trim();
    const bnName = typeof formData.name === "object" ? getLocalizedValue(formData.name, "bn") : "";
    const nameI18n = typeof formData.name === "object" ? formData.name : { en: primaryName, bn: bnName };

    const newStudentProfile = {
      id: localStudentId,
      uniq_id: generatedUniqId,
      student_id_card_number: generatedUniqId,
      name: primaryName,
      name_en: primaryName,
      bangla_name: bnName,
      name_i18n: nameI18n,
      label: primaryName,
      sub: sectionName || className || "General Group",
      department: formData.department || null,
      department_name: departmentName,
      student_class: formData.student_class || null,
      student_class_name: className,
      class_name: className,
      education_status: className,
      student_section: formData.student_section || null,
      section: formData.student_section || null,
      section_id: formData.student_section || null,
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
      name: primaryName,
      name_en: primaryName,
      bangla_name: bnName,
      name_i18n: nameI18n,
      admission_mode: "QUICK",
      status: "ACTIVE",
      student_class: formData.student_class || null,
      department: formData.department || null,
      student_section: formData.student_section || null,
      section: formData.student_section || null,
      education_status: className,
      academic_data: {
        department: formData.department || null,
        student_class: formData.student_class || null,
        student_section: formData.student_section || null,
        section: formData.student_section || null,
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
          studentStore.remove(localStudentId);
          const finalSectionId =
            formData.student_section ||
            (typeof resData.section === "object" ? resData.section?.id : resData.section) ||
            (typeof resData.student_section === "object" ? resData.student_section?.id : resData.student_section) ||
            resData.section_id ||
            null;
          const finalSectionName =
            resData.section_name ||
            resData.student_section_name ||
            sectionName ||
            "";

          savedStudent = {
            ...newStudentProfile,
            ...resData,
            department: formData.department || resData.department || null,
            department_name: resData.department_name || departmentName,
            student_class: formData.student_class || resData.student_class || null,
            student_class_name: resData.student_class_name || className,
            class_name: resData.student_class_name || className,
            education_status: resData.education_status || className,
            student_section: finalSectionId,
            section: finalSectionId,
            section_id: finalSectionId,
            section_name: finalSectionName,
            group_name: resData.group_name || resData.student_group_name || finalSectionName || className || "General Group",
            sub: finalSectionName || className || "General Group",
            uniq_id: resData.uniq_id || resData.student_id_card_number || newStudentProfile.uniq_id,
            student_id_card_number: resData.student_id_card_number || resData.uniq_id || newStudentProfile.student_id_card_number,
            roll_number: resData.roll_number,
            id: String(resData.id),
            _local: false,
          };
          studentStore.add(savedStudent);
        }
        showToast(`Student "${primaryName}" admitted successfully!`, "success");
      } else {
        const fallbackRes = await fetchWithAuth("/students/", {
          method: "POST",
          body: JSON.stringify({
            name: primaryName,
            group: sectionName || "General Group",
          }),
        }).catch(() => null);

        if (fallbackRes && fallbackRes.ok) {
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackData && fallbackData.id) {
            studentStore.remove(localStudentId);
            const fallbackSectionId = formData.student_section || null;
            savedStudent = {
              ...newStudentProfile,
              ...fallbackData,
              student_section: fallbackSectionId,
              section: fallbackSectionId,
              section_id: fallbackSectionId,
              section_name: sectionName || "",
              sub: sectionName || className || "General Group",
              id: String(fallbackData.id),
              roll_number: fallbackData.roll_number,
              _local: false,
            };
            studentStore.add(savedStudent);
          }
          showToast(`Student "${primaryName}" admitted successfully!`, "success");
        } else {
          showToast(`"${primaryName}" saved locally. Will sync when online.`, "info");
        }
      }

      injectIntoAcademicCache(savedStudent, localStudentId);
      clearDraft();
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
      clearDraft();
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
        {/* Form Header & Auto-Save Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b theme-border">
          <div>
            <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
              {isEditing ? "Edit Student Profile" : "Quick Admission"}
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              {isEditing
                ? "Update student academic and contact details"
                : "Fast-track student enrollment with auto-saved drafts"}
            </p>
          </div>
          {!isEditing && (
            <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} />
          )}
        </div>

        {/* Clean Responsive Grid for All 6 Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Student Name */}
          <div className="sm:col-span-2 lg:col-span-1">
            <CustomInput
              id="quick_adm_name"
              name="name"
              label="Student Name"
              required={true}
              multiLanguage={true}
              placeholder="e.g. Abdullah Ibn Omar"
              value={formData.name}
              onChange={(val: any) => handleFieldChange("name", val)}
              autoFocus={true}
            />
          </div>

          {/* 2. Contact Phone */}
          <CustomInput
            id="quick_adm_phone"
            name="guardian_phone"
            label="EMERGENCY NUMBER"
            type="phone"
            placeholder="01XXXXXXXXX"
            value={formData.guardian_phone}
            onChange={(val: any) => handleFieldChange("guardian_phone", val)}
          />

          {/* 3. Reusable Calendar Date Picker */}
          <ReusableCalendar
            id="quick_adm_date"
            name="admission_date"
            label="Admission Date"
            required={true}
            selectedDate={formData.admission_date}
            onSelectDate={(dateStr: string) => handleFieldChange("admission_date", dateStr)}
            size="md"
          />

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

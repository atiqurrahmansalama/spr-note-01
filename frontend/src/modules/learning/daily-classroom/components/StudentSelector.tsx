import React, { useMemo } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import { students as studentStore } from "@/utils/localStore";
import { useAcademicData } from "@/hooks/useAcademicData";

export interface StudentProfileOption {
  id?: string | number;
  label?: string;
  name?: string;
  name_en?: string;
  sub?: string;
  group_name?: string;
  section_name?: string;
  student_class_name?: string;
  department?: string | number;
  department_id?: string | number;
  department_name?: string;
  student_class?: string | number;
  class_id?: string | number;
  student_section?: string | number;
  section_id?: string | number;
  roll_number?: number | string;
  student_id_card_number?: string;
  uniq_id?: string;
  badge?: string;
  originalData?: any;
}

export interface StudentSelectorProps {
  studentDatabase?: any[];
  studentName?: string;
  studentId?: string | number | null;
  departmentId?: string;
  classId?: string;
  sectionId?: string;
  onStudentSelect?: (selected: StudentProfileOption | string) => void;
  placeholder?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showAllOptionsOnFocus?: boolean;
  actionLabel?: string | null;
  actionTo?: string | ((searchTerm: string) => string) | null;
  actionTitle?: string | null;
  disabled?: boolean;
  returnToUrl?: string;
}

/**
 * Enterprise Reusable Student Selector
 * -------------------------------------------------------------
 * Provides smart autocomplete with roll number, student ID card, unique ID,
 * class/section metadata, and quick admission deep-linking.
 * Shared across Daily Progress, Progress Reports, and Analytics.
 */
export default function StudentSelector({
  studentDatabase,
  studentName = "",
  studentId = null,
  departmentId,
  classId,
  sectionId,
  onStudentSelect,
  placeholder = "Enter student name...",
  label = "STUDENT",
  size = "md",
  className = "",
  showAllOptionsOnFocus = true,
  actionLabel = "+ Add Student",
  actionTo,
  actionTitle = "Add new student (Quick Admission)",
  disabled = false,
  returnToUrl,
}: StudentSelectorProps) {
  const { students: academicStudents } = useAcademicData();

  // 1. Resolve effective student dataset with academic + local fallback
  const effectiveStudents = useMemo(() => {
    if (Array.isArray(studentDatabase) && studentDatabase.length > 0) {
      return studentDatabase;
    }

    const result: any[] = [];
    const seen = new Set<string>();

    const append = (s: any) => {
      if (!s) return;
      const key = String(
        s.id ||
        s.student_id ||
        s.uniq_id ||
        s.roll_number ||
        s.name_en ||
        s.name ||
        ""
      );
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    };

    (academicStudents || []).forEach(append);

    try {
      const local = studentStore.getAll?.() || [];
      if (Array.isArray(local)) local.forEach(append);
    } catch {
      // Fallback
    }

    if (result.length === 0) {
      try {
        const tenantId = typeof localStorage !== "undefined"
          ? localStorage.getItem("spr_active_tenant_id") || "default"
          : "default";
        const fromCache = JSON.parse(
          localStorage.getItem(`spr_students_cache_${tenantId}`) || "[]"
        );
        if (Array.isArray(fromCache)) fromCache.forEach(append);
      } catch {
        // Fallback
      }
    }

    return result;
  }, [studentDatabase, academicStudents]);

  // 2. Build enriched autocomplete options
  const options: AutocompleteOption[] = useMemo(() => {
    return (effectiveStudents || []).map((s: any) => {
      const clsName =
        typeof s === "object"
          ? s.student_class_name ||
            s.class_name ||
            (typeof s.class === "object" ? s.class?.name : null) ||
            ""
          : "";
      const secName =
        typeof s === "object"
          ? s.section_name ||
            s.student_section_name ||
            (typeof s.section === "object" ? s.section?.name : null) ||
            ""
          : "";

      let subVal = "";
      if (clsName && secName) {
        subVal = `${clsName} • ${secName}`;
      } else if (secName) {
        subVal = secName;
      } else if (clsName) {
        subVal = clsName;
      } else if (typeof s === "object" && s?.sub) {
        subVal = String(s.sub);
      } else if (typeof s === "object" && (s?.group_name || s?.group)) {
        subVal = String(s.group_name || s.group);
      }

      const deptVal =
        typeof s === "object" && (s.department || s.department_id)
          ? String(s.department || s.department_id)
          : undefined;
      const classVal =
        typeof s === "object" && (s.student_class || s.class_id || s.class)
          ? String(s.student_class || s.class_id || s.class)
          : undefined;
      const secVal =
        typeof s === "object" && (s.student_section || s.section_id || s.section)
          ? String(s.student_section || s.section_id || s.section)
          : undefined;

      const roll =
        typeof s === "object"
          ? s.roll_number ?? s.originalData?.roll_number
          : undefined;
      const cardNo =
        typeof s === "object"
          ? s.student_id_card_number ?? s.originalData?.student_id_card_number
          : undefined;
      const uniq =
        typeof s === "object"
          ? s.uniq_id ?? s.originalData?.uniq_id
          : undefined;
      const rawId =
        typeof s === "object"
          ? s.id ?? s.student_id ?? s.originalData?.id
          : undefined;

      const badge =
        typeof s === "object" && s.badge
          ? s.badge
          : roll != null
          ? `Roll: ${roll}`
          : cardNo
          ? `ID: ${cardNo}`
          : uniq
          ? `ID: ${uniq}`
          : rawId != null
          ? `ID: ${rawId}`
          : undefined;

      return {
        id: rawId != null ? String(rawId) : undefined,
        label:
          typeof s === "object"
            ? s.label || s.name_en || s.name || ""
            : String(s || ""),
        sub: subVal || undefined,
        badge,
        roll_number: roll,
        student_id_card_number: cardNo,
        uniq_id: uniq,
        department: deptVal,
        department_name: typeof s === "object" ? s.department_name : undefined,
        student_class: classVal,
        student_class_name: clsName || undefined,
        student_section: secVal,
        section_name: secName || undefined,
        originalData: s,
      };
    });
  }, [effectiveStudents]);

  // 3. Selection handler
  const handleSelect = (option: any) => {
    if (!onStudentSelect) return;
    if (typeof option === "string") {
      onStudentSelect(option);
      return;
    }
    if (typeof option === "object" && option !== null) {
      const safeSub = typeof option?.sub === "string" ? option.sub : undefined;
      onStudentSelect({
        id: option.id,
        label:
          typeof option.label === "string"
            ? option.label
            : String(option.label || ""),
        name:
          typeof option.label === "string"
            ? option.label
            : String(option.label || ""),
        sub: safeSub,
        group_name: safeSub,
        roll_number: option.roll_number,
        student_id_card_number: option.student_id_card_number,
        uniq_id: option.uniq_id,
        badge: option.badge,
        department: option.department,
        department_name: option.department_name,
        student_class: option.student_class,
        student_class_name: option.student_class_name,
        student_section: option.student_section,
        section_name: option.section_name,
        originalData: option.originalData || option,
      });
    }
  };

  // 4. Default quick admission target builder
  const defaultGetActionUrl = (searchTerm: string) => {
    const effectiveName = (searchTerm || studentName || "").trim();
    const params = new URLSearchParams();
    params.set("tab", "quick");
    if (effectiveName) params.set("name", effectiveName);
    if (departmentId && String(departmentId) !== "ALL")
      params.set("dept", String(departmentId));
    if (classId && String(classId) !== "ALL")
      params.set("class", String(classId));
    if (sectionId && String(sectionId) !== "ALL")
      params.set("section", String(sectionId));

    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const targetReturn =
      returnToUrl ||
      (currentPath ? `${currentPath}${currentSearch || ""}` : "/studies/daily-progress");

    params.set("returnTo", targetReturn);
    return `/admission?${params.toString()}`;
  };

  return (
    <div className={`w-full ${className}`}>
      <AutocompleteDropdown
        options={options}
        value={studentName}
        selectedId={studentId ? String(studentId) : undefined}
        onChange={handleSelect}
        onQueryChange={(val) => onStudentSelect && onStudentSelect(val)}
        placeholder={placeholder}
        label={label}
        actionLabel={actionLabel}
        actionTo={actionTo !== undefined ? actionTo : defaultGetActionUrl}
        actionTitle={actionTitle}
        size={size}
        showAllOptionsOnFocus={showAllOptionsOnFocus}
        disabled={disabled}
      />
    </div>
  );
}

// Re-export alias for seamless compatibility with DailyProgress
export { StudentSelector as StudentInputSection };
export type { StudentSelectorProps as StudentInputSectionProps };

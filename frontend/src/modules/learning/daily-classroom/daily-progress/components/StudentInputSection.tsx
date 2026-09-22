import React, { useMemo } from "react";
import AutocompleteDropdown, { AutocompleteOption } from "../../../../../components/ui/AutocompleteDropdown";

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
  originalData?: any;
}

export interface StudentInputSectionProps {
  studentDatabase?: StudentProfileOption[];
  studentName?: string;
  departmentId?: string;
  classId?: string;
  sectionId?: string;
  onStudentSelect?: (selected: StudentProfileOption | string) => void;
}

/**
 * Enterprise Reusable Student Input Section with Project Design Standard,
 * inline autocomplete with portal support, and student directory integration.
 */
export default function StudentInputSection({
  studentDatabase = [],
  studentName = "",
  departmentId,
  classId,
  sectionId,
  onStudentSelect,
}: StudentInputSectionProps) {
  const options: AutocompleteOption[] = useMemo(() => {
    return (studentDatabase || []).map((s: any) => {
      const subVal =
        typeof s === "object" && typeof s?.section_name === "string" && s.section_name
          ? s.section_name
          : typeof s === "object" && typeof s?.student_section_name === "string" && s.student_section_name
          ? s.student_section_name
          : typeof s === "object" && typeof s?.sub === "string" && s.sub
          ? s.sub
          : typeof s === "object" && (s?.group_name || s?.student_class_name || s?.group)
          ? String(s.group_name || s.student_class_name || s.group)
          : undefined;

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

      return {
        id: typeof s === "object" && s?.id ? String(s.id) : undefined,
        label: typeof s === "object" ? s.label || s.name_en || s.name || "" : String(s || ""),
        sub: subVal,
        department: deptVal,
        department_name: typeof s === "object" ? s.department_name : undefined,
        student_class: classVal,
        student_class_name: typeof s === "object" ? s.student_class_name || s.class_name : undefined,
        student_section: secVal,
        section_name: typeof s === "object" ? s.section_name || s.student_section_name : undefined,
        originalData: s,
      };
    });
  }, [studentDatabase]);

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
        label: typeof option.label === "string" ? option.label : String(option.label || ""),
        name: typeof option.label === "string" ? option.label : String(option.label || ""),
        sub: safeSub,
        group_name: safeSub,
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

  const handleQueryChange = (val: string) => {
    if (onStudentSelect) {
      onStudentSelect(val);
    }
  };

  const getActionUrl = (searchTerm: string) => {
    const effectiveName = (searchTerm || studentName || "").trim();
    const params = new URLSearchParams();
    params.set("tab", "quick");
    if (effectiveName) {
      params.set("name", effectiveName);
    }
    if (departmentId) {
      params.set("dept", String(departmentId));
    }
    if (classId) {
      params.set("class", String(classId));
    }
    if (sectionId) {
      params.set("section", String(sectionId));
    }
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const returnToUrl = currentPath ? `${currentPath}${currentSearch || ""}` : "/studies/progress-management";
    params.set("returnTo", returnToUrl);
    return `/admission?${params.toString()}`;
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={options}
        value={studentName}
        onChange={handleSelect}
        onQueryChange={handleQueryChange}
        placeholder="Enter student name..."
        label="STUDENT"
        actionLabel="+ Add Student"
        actionTo={getActionUrl}
        actionTitle="Add new student (Quick Admission)"
        size="md"
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}


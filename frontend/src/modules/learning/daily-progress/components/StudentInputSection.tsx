import React, { useMemo } from "react";
import AutocompleteDropdown, { AutocompleteOption } from "../../../../components/ui/AutocompleteDropdown";

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
  student_class?: string | number;
  class_id?: string | number;
  student_section?: string | number;
  section_id?: string | number;
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
    return studentDatabase.map((s) => ({
      id: s.id ? String(s.id) : undefined,
      label: s.label || s.name_en || s.name || "",
      sub: s.sub || s.group_name || s.section_name || s.student_class_name || undefined,
      department: s.department || s.department_id ? String(s.department || s.department_id) : undefined,
      student_class: s.student_class || s.class_id ? String(s.student_class || s.class_id) : undefined,
      student_section: s.student_section || s.section_id ? String(s.student_section || s.section_id) : undefined,
    }));
  }, [studentDatabase]);

  const handleSelect = (option: AutocompleteOption) => {
    if (onStudentSelect) {
      onStudentSelect({
        id: option.id,
        label: option.label,
        name: option.label,
        sub: option.sub,
        group_name: option.sub,
        department: option.department,
        student_class: option.student_class,
        student_section: option.student_section,
      });
    }
  };

  const handleQueryChange = (val: string) => {
    if (onStudentSelect) {
      onStudentSelect(val);
    }
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
        size="md"
      />
    </div>
  );
}

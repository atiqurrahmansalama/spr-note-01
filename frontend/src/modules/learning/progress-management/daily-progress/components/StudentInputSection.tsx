import React, { useMemo } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import type { StudentProfileOption } from "../types";

export function StudentInputSection({
  studentDatabase = [],
  studentName = "",
  studentId = null,
  departmentId,
  classId,
  sectionId,
  onStudentSelect,
}: {
  studentDatabase?: StudentProfileOption[];
  studentName?: string;
  studentId?: string | number | null;
  departmentId?: string;
  classId?: string;
  sectionId?: string;
  onStudentSelect?: (selected: StudentProfileOption | string) => void;
}) {
  const options: AutocompleteOption[] = useMemo(() => {
    return (studentDatabase || []).map((s: any) => {
      const clsName =
        typeof s === "object"
          ? s.student_class_name || s.class_name || (typeof s.class === "object" ? s.class?.name : null) || ""
          : "";
      const secName =
        typeof s === "object"
          ? s.section_name || s.student_section_name || (typeof s.section === "object" ? s.section?.name : null) || ""
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

      const roll = typeof s === "object" ? (s.roll_number ?? s.originalData?.roll_number) : undefined;
      const cardNo = typeof s === "object" ? (s.student_id_card_number ?? s.originalData?.student_id_card_number) : undefined;
      const uniq = typeof s === "object" ? (s.uniq_id ?? s.originalData?.uniq_id) : undefined;
      const rawId = typeof s === "object" ? (s.id ?? s.student_id ?? s.originalData?.id) : undefined;
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
        label: typeof s === "object" ? s.label || s.name_en || s.name || "" : String(s || ""),
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

  const getActionUrl = (searchTerm: string) => {
    const effectiveName = (searchTerm || studentName || "").trim();
    const params = new URLSearchParams();
    params.set("tab", "quick");
    if (effectiveName) params.set("name", effectiveName);
    if (departmentId && String(departmentId) !== "ALL") params.set("dept", String(departmentId));
    if (classId && String(classId) !== "ALL") params.set("class", String(classId));
    if (sectionId && String(sectionId) !== "ALL") params.set("section", String(sectionId));
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const returnToUrl = currentPath ? `${currentPath}${currentSearch || ""}` : "/studies/daily-progress";
    params.set("returnTo", returnToUrl);
    return `/admission?${params.toString()}`;
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={options}
        value={studentName}
        selectedId={studentId ? String(studentId) : undefined}
        onChange={handleSelect}
        onQueryChange={(val) => onStudentSelect && onStudentSelect(val)}
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

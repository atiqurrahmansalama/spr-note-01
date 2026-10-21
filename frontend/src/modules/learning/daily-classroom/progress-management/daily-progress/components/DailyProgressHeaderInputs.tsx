import React, { useMemo, useState, useEffect } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import { curriculumStore } from "@/stores";
import { useTenant } from "@/context/TenantContext";
import type { StudentProfileOption, SessionItem } from "../types";

// ══════════════════════════════════════════════════════════════════════════════
// 1. STUDENT INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface StudentInputSectionProps {
  studentDatabase?: StudentProfileOption[];
  studentName?: string;
  studentId?: string | number | null;
  departmentId?: string;
  classId?: string;
  sectionId?: string;
  onStudentSelect?: (selected: StudentProfileOption | string) => void;
}

export function StudentInputSection({
  studentDatabase = [],
  studentName = "",
  studentId = null,
  departmentId,
  classId,
  sectionId,
  onStudentSelect,
}: StudentInputSectionProps) {
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

// ══════════════════════════════════════════════════════════════════════════════
// 2. SESSION INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface SessionInputSectionProps {
  sessionList?: (string | SessionItem)[];
  selectedSession?: string;
  onSessionChange?: (val: string) => void;
}

export function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
}: SessionInputSectionProps) {
  const sessionOptions: AutocompleteOption[] = useMemo(() => {
    return sessionList.map((s) => ({
      label: typeof s === "object" ? (s.name || s.label || "") : String(s),
      value: typeof s === "object" ? (s.name || s.value || "") : String(s),
    }));
  }, [sessionList]);

  const handleSelectOption = (option: any) => {
    if (!onSessionChange) return;
    if (typeof option === "string") {
      onSessionChange(option);
    } else if (typeof option === "object" && option !== null) {
      onSessionChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={sessionOptions}
        value={selectedSession}
        onChange={handleSelectOption}
        onQueryChange={(val) => onSessionChange && onSessionChange(val || "")}
        placeholder="e.g. Sobok, Dour..."
        label="SESSION"
        actionLabel="+ Add Session"
        actionTo="/admin-tools?tab=report-sessions"
        actionTitle="Add or manage sessions"
        size="md"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. LESSON INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonInputSectionProps {
  lessonTitle?: string;
  onLessonChange?: (val: string) => void;
  selectedClassId?: string;
  selectedSectionId?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LessonInputSection({
  lessonTitle = "",
  onLessonChange,
  selectedClassId,
  selectedSectionId,
  label = "LESSON",
  placeholder = "e.g. Lesson title, topic, or chapter...",
  disabled = false,
}: LessonInputSectionProps) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || "default";

  // Load curriculum books & lessons to provide intelligent suggestions
  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const items = curriculumStore?.getCurriculumItems?.(tenantId) || [];
      setCurriculumItems(Array.isArray(items) ? items : []);
    } catch {
      setCurriculumItems([]);
    }
  }, [tenantId]);

  const lessonOptions: AutocompleteOption[] = useMemo(() => {
    const list: AutocompleteOption[] = [];
    const seen = new Set<string>();

    (curriculumItems || []).forEach((item: any) => {
      const title = (item?.title || item?.name || item?.subject || "").trim();
      if (title && !seen.has(title.toLowerCase())) {
        seen.add(title.toLowerCase());
        list.push({
          label: title,
          value: title,
          sub: item?.subject || item?.category || undefined,
        });
      }
    });

    return list;
  }, [curriculumItems]);

  const handleSelectOption = (option: any) => {
    if (!onLessonChange) return;
    if (typeof option === "string") {
      onLessonChange(option);
    } else if (typeof option === "object" && option !== null) {
      onLessonChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={lessonOptions}
        value={lessonTitle}
        onChange={handleSelectOption}
        onQueryChange={(val) => onLessonChange && onLessonChange(val || "")}
        placeholder={placeholder}
        label={label}
        // actionLabel="+ Plan Lesson"
        // actionTo="/studies/daily-classroom?tab=lessons"
        // actionTitle="Open Lesson Management"
        size="md"
        disabled={disabled}
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BOOK / SUBJECT NAME INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface BookSubjectInputSectionProps {
  bookTitle?: string;
  onBookChange?: (val: string) => void;
  selectedClassId?: string;
  selectedSectionId?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function BookSubjectInputSection({
  bookTitle = "",
  onBookChange,
  selectedClassId,
  selectedSectionId,
  label = "BOOK / SUBJECT NAME",
  placeholder = "e.g. Bukhari, Math, English...",
  disabled = false,
}: BookSubjectInputSectionProps) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || "default";

  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const items =
        curriculumStore?.getItems?.(tenantId) ||
        curriculumStore?.getCurriculumItems?.(tenantId) ||
        [];
      setCurriculumItems(Array.isArray(items) ? items : []);
    } catch {
      setCurriculumItems([]);
    }
  }, [tenantId]);

  const bookOptions: AutocompleteOption[] = useMemo(() => {
    const list: AutocompleteOption[] = [];
    const seen = new Set<string>();

    (curriculumItems || []).forEach((item: any) => {
      const name = (item?.name || item?.title || item?.subject || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          label: name,
          value: name,
          sub: item?.subject || item?.className || item?.category || undefined,
        });
      }
    });

    return list;
  }, [curriculumItems]);

  const handleSelectOption = (option: any) => {
    if (!onBookChange) return;
    if (typeof option === "string") {
      onBookChange(option);
    } else if (typeof option === "object" && option !== null) {
      onBookChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={bookOptions}
        value={bookTitle}
        onChange={handleSelectOption}
        onQueryChange={(val) => onBookChange && onBookChange(val || "")}
        placeholder={placeholder}
        label={label}
        actionLabel="+ Add Book"
        actionTo="/studies/daily-classroom?tab=curriculum"
        actionTitle="Open Curriculum Books & Subjects"
        size="md"
        disabled={disabled}
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}

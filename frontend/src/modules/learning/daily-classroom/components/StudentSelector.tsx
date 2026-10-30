import React, { useMemo } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import { students as studentStore } from "@/utils/localStore";
import { useAcademicData } from "@/hooks/useAcademicData";
import { useFeatureControl } from "@/context/FeatureControlContext";

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
  id?: string;
  inputRef?: React.RefObject<HTMLInputElement | null> | null;
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
  id,
  inputRef,
}: StudentSelectorProps) {
  const { students: academicStudents } = useAcademicData();
  const { isFeatureEnabled } = useFeatureControl();
  const canAddStudent = isFeatureEnabled('progress_action_add_student');

  // 1. Resolve effective student dataset with academic + local fallback and canonical deduplication
  const effectiveStudents = useMemo(() => {
    const sourceList: any[] = [];
    if (Array.isArray(studentDatabase) && studentDatabase.length > 0) {
      sourceList.push(...studentDatabase);
    } else {
      if (Array.isArray(academicStudents) && academicStudents.length > 0) {
        sourceList.push(...academicStudents);
      }
      try {
        const tenantId = typeof localStorage !== "undefined"
          ? localStorage.getItem("spr_active_tenant_id") || "default"
          : "default";
        const fromCache = JSON.parse(
          localStorage.getItem(`spr_students_cache_${tenantId}`) || "[]"
        );
        if (Array.isArray(fromCache) && fromCache.length > 0) {
          sourceList.push(...fromCache);
        }
      } catch {}

      // Fallback to studentStore only if canonical sources are totally empty
      if (sourceList.length === 0) {
        try {
          const local = studentStore.getAll?.() || [];
          if (Array.isArray(local)) sourceList.push(...local);
        } catch {}
      }
    }

    const result: any[] = [];
    const seenIds = new Set<string>();
    const seenUniqs = new Set<string>();
    const seenCards = new Set<string>();
    const idToIdxMap = new Map<string, number>();

    const append = (s: any) => {
      if (!s) return;
      const sName = (typeof s === "object" ? s.name_en || s.name || s.label : String(s || "")).trim();
      if (!sName) return;

      const rawId = typeof s === "object" ? (s.id ?? s.student_id ?? s.originalData?.id) : null;
      const roll = typeof s === "object" ? (s.roll_number ?? s.originalData?.roll_number) : undefined;
      const cardNo = typeof s === "object" ? (s.student_id_card_number ?? s.originalData?.student_id_card_number) : undefined;
      const uniq = typeof s === "object" ? (s.uniq_id ?? s.originalData?.uniq_id) : undefined;
      const clsId = typeof s === "object" ? (s.student_class || s.class_id || s.class) : undefined;
      const secId = typeof s === "object" ? (s.student_section || s.section_id || s.section) : undefined;

      const hasId = rawId != null && String(rawId).trim() !== "";
      const hasUniq = Boolean(uniq && String(uniq).trim() !== "");
      const hasCard = Boolean(cardNo && String(cardNo).trim() !== "");

      // Check if this EXACT student record was already processed via unique identifiers
      const isDupId = hasId && seenIds.has(String(rawId));
      const isDupUniq = hasUniq && seenUniqs.has(String(uniq));
      const isDupCard = hasCard && seenCards.has(String(cardNo));

      if (isDupId || isDupUniq || isDupCard) {
        // Enrich already existing student record with any missing metadata
        const existingIdx = hasId
          ? idToIdxMap.get(`id_${rawId}`)
          : hasUniq
          ? idToIdxMap.get(`uniq_${uniq}`)
          : idToIdxMap.get(`card_${cardNo}`);

        if (existingIdx !== undefined && result[existingIdx]) {
          const target = result[existingIdx];
          if (!target.id && rawId) target.id = rawId;
          if (!target.roll_number && roll != null) target.roll_number = roll;
          if (!target.student_id_card_number && cardNo) target.student_id_card_number = cardNo;
          if (!target.uniq_id && uniq) target.uniq_id = uniq;
          if (!target.student_class && clsId) target.student_class = clsId;
          if (!target.student_section && secId) target.student_section = secId;
        }
        return;
      }

      // If no unique identifier exists at all on this raw record, fallback to exact composite key
      if (!hasId && !hasUniq && !hasCard) {
        const normName = sName.toLowerCase();
        const fallbackKey = `noid_${normName}_cls_${clsId || ""}_sec_${secId || ""}_roll_${roll != null ? roll : ""}`;
        if (idToIdxMap.has(fallbackKey)) return;
        idToIdxMap.set(fallbackKey, result.length);
        result.push(s);
        return;
      }

      // Register unique identifiers for this student
      const newIdx = result.length;
      if (hasId) {
        seenIds.add(String(rawId));
        idToIdxMap.set(`id_${rawId}`, newIdx);
      }
      if (hasUniq) {
        seenUniqs.add(String(uniq));
        idToIdxMap.set(`uniq_${uniq}`, newIdx);
      }
      if (hasCard) {
        seenCards.add(String(cardNo));
        idToIdxMap.set(`card_${cardNo}`, newIdx);
      }

      result.push(s);
    };

    sourceList.forEach(append);
    return result;
  }, [studentDatabase, academicStudents]);

  // 2. Build enriched autocomplete options with strict deduplication
  const options: AutocompleteOption[] = useMemo(() => {
    const rawOptions = (effectiveStudents || []).map((s: any) => {
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

      if (roll != null && String(roll).trim() !== "" && !subVal.includes(`Roll ${roll}`)) {
        subVal = subVal ? `${subVal} • Roll ${roll}` : `Roll ${roll}`;
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

      // Find matching student in Student Directory (academicStudents)
      const matched = (academicStudents || []).find((as: any) => {
        if (rawId != null && String(as.id) === String(rawId)) return true;
        if (uniq && (String(as.uniq_id) === String(uniq) || String(as.unique_id) === String(uniq))) return true;
        if (cardNo && String(as.student_id_card_number) === String(cardNo)) return true;
        return false;
      });

      // Canonical Student Directory ID resolution (Strict 'STU-B1BD3C86' standard)
      const canonicalStudentId =
        (typeof uniq === "string" && uniq.trim().toUpperCase().startsWith("STU-") ? uniq.trim() : null) ||
        (typeof s.unique_id === "string" && s.unique_id.trim().toUpperCase().startsWith("STU-") ? s.unique_id.trim() : null) ||
        (typeof cardNo === "string" && cardNo.trim().toUpperCase().startsWith("STU-") ? cardNo.trim() : null) ||
        (typeof matched?.uniq_id === "string" && matched.uniq_id.trim().toUpperCase().startsWith("STU-") ? matched.uniq_id.trim() : null) ||
        (typeof matched?.unique_id === "string" && matched.unique_id.trim().toUpperCase().startsWith("STU-") ? matched.unique_id.trim() : null) ||
        (typeof matched?.student_id_card_number === "string" && matched.student_id_card_number.trim().toUpperCase().startsWith("STU-") ? matched.student_id_card_number.trim() : null) ||
        (uniq ? `STU-${String(uniq).replace(/^STU[-_]?/i, "")}` : null) ||
        (cardNo ? `STU-${String(cardNo).replace(/^STU[-_]?/i, "")}` : null) ||
        (matched?.uniq_id ? `STU-${String(matched.uniq_id).replace(/^STU[-_]?/i, "")}` : null) ||
        (rawId != null ? `STU-${String(rawId).padStart(8, "0")}` : undefined);

      const badge = canonicalStudentId || undefined;

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

    // Zero-duplicate guarantee: deduplicate options strictly by unique student identifier (id, uniq_id, cardNo)
    const deduplicated: AutocompleteOption[] = [];
    const seenOptionKeys = new Set<string>();

    rawOptions.forEach((opt) => {
      // Primary deduplication: unique database or student identifier
      const idKey = opt.id
        ? `id_${opt.id}`
        : opt.uniq_id
        ? `uniq_${opt.uniq_id}`
        : opt.student_id_card_number
        ? `card_${opt.student_id_card_number}`
        : null;

      if (idKey) {
        if (seenOptionKeys.has(idKey)) return;
        seenOptionKeys.add(idKey);
      } else {
        // Fallback ONLY when no ID exists anywhere on the record
        const fallbackKey = `fallback_${(opt.label || "").trim().toLowerCase()}_${(opt.sub || "").trim().toLowerCase()}_${opt.roll_number != null ? opt.roll_number : ""}`;
        if (seenOptionKeys.has(fallbackKey)) return;
        seenOptionKeys.add(fallbackKey);
      }
      deduplicated.push(opt);
    });

    return deduplicated;
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
        id={id}
        inputRef={inputRef}
        options={options}
        value={studentName}
        selectedId={studentId ? String(studentId) : undefined}
        onChange={handleSelect}
        onQueryChange={(val) => onStudentSelect && onStudentSelect(val)}
        placeholder={placeholder}
        label={label}
        actionLabel={canAddStudent ? actionLabel : null}
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

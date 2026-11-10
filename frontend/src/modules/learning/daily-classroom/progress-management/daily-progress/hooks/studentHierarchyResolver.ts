import {
  getClassId,
  getSectionId,
  getDepartmentId,
} from "@/modules/learning/daily-classroom/utils/dailyClassroomUtils";

export interface StudentHierarchyResult {
  resolvedStudentId: string | null;
  realName: string;
  departmentId: string;
  classId: string;
  sectionId: string;
  groupName: string;
}

export interface HierarchyScopeFilter {
  selectedDepartmentId?: string;
  selectedClassId?: string;
  selectedSectionId?: string;
}

/**
 * Fast normalized candidate lookup within the authoritative allStudentDatabase.
 * Eliminates duplicate arrays and redundant multi-pass sweeps.
 */
export function findStudentCandidate(
  chosenName: string,
  studentExplicitId: string | null,
  allCandidates: any[] = [],
  scope: HierarchyScopeFilter = {}
): any {
  if (studentExplicitId) {
    const directMatch = allCandidates.find((a: any) => String(a.id) === String(studentExplicitId));
    if (directMatch) return directMatch;
  }

  const query = chosenName.trim().toLowerCase();
  if (!query) return null;

  // 1. Direct match by ID, uniq_id, or student_id_card_number
  const idMatch = allCandidates.find(
    (a: any) =>
      String(a.id) === query ||
      (a.uniq_id && String(a.uniq_id).toLowerCase() === query) ||
      (a.student_id_card_number && String(a.student_id_card_number).toLowerCase() === query)
  );
  if (idMatch) return idMatch;

  // 2. Match by exact Name
  const nameMatches = allCandidates.filter(
    (a: any) => (a.name_en || a.name || a.bangla_name || a.label || "").toLowerCase().trim() === query
  );
  if (nameMatches.length === 1) {
    return nameMatches[0];
  }
  if (nameMatches.length > 1) {
    return (
      (scope.selectedSectionId &&
        nameMatches.find((a: any) => String(a.student_section || a.section_id) === String(scope.selectedSectionId))) ||
      (scope.selectedClassId &&
        nameMatches.find((a: any) => String(a.student_class || a.class_id) === String(scope.selectedClassId))) ||
      (scope.selectedDepartmentId &&
        nameMatches.find((a: any) => String(a.department || a.department_id) === String(scope.selectedDepartmentId))) ||
      nameMatches[0]
    );
  }

  // 3. Numeric roll number query
  if (/^\d+$/.test(query)) {
    const rollMatches = allCandidates.filter(
      (a: any) => String(a.roll_number ?? a.roll ?? "").trim() === query
    );
    if (rollMatches.length === 1) {
      return rollMatches[0];
    }
    if (rollMatches.length > 1) {
      return (
        (scope.selectedSectionId &&
          rollMatches.find((a: any) => String(a.student_section || a.section_id) === String(scope.selectedSectionId))) ||
        (scope.selectedClassId &&
          rollMatches.find((a: any) => String(a.student_class || a.class_id) === String(scope.selectedClassId))) ||
        rollMatches[0]
      );
    }
  }

  return null;
}

/**
 * Pure domain resolver that derives Department, Class, Section, and Group Name
 * from a selected student candidate using effective academic data.
 */
export function resolveStudentHierarchy(
  candidate: any,
  effectiveClasses: any[] = [],
  effectiveSections: any[] = [],
  departments: any[] = [],
  fallbackScope: HierarchyScopeFilter = {},
  fallbackSub = ""
): StudentHierarchyResult {
  const chosenName = candidate?.name_en || candidate?.name || candidate?.label || "";
  const resolvedStudentId = candidate?.id != null ? String(candidate.id) : null;
  const realName = candidate?.name_en || candidate?.name || candidate?.label || candidate?.bangla_name || chosenName;

  let candSub =
    candidate?.section_name ||
    candidate?.student_section_name ||
    candidate?.sub ||
    candidate?.group_name ||
    fallbackSub;

  // A. Extract Section
  let candSecId =
    getSectionId(candidate) ||
    getSectionId(candidate?.originalData) ||
    "";
  if (!candSecId && (candidate?.student_section || candidate?.section_id || candidate?.section)) {
    const rawSec = candidate.student_section || candidate.section_id || candidate.section;
    candSecId = typeof rawSec === "object" ? String(rawSec?.id || "") : String(rawSec || "");
  }
  if (!candSecId && candSub) {
    const secSearch = candSub.toLowerCase().trim();
    const matchedSec = (effectiveSections || []).find(
      (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === secSearch
    );
    if (matchedSec) candSecId = String(matchedSec.id);
  }
  const secObj = candSecId ? (effectiveSections || []).find((s: any) => String(s.id) === String(candSecId)) : null;

  // B. Extract Class
  let candClassId =
    getClassId(candidate) ||
    getClassId(candidate?.originalData) ||
    (secObj ? getClassId(secObj) : "");

  if (!candClassId && (candidate?.student_class || candidate?.class_id || candidate?.academic_class || candidate?.academic_class_id)) {
    const rawCls = candidate.student_class || candidate.class_id || candidate.academic_class || candidate.academic_class_id;
    candClassId = typeof rawCls === "object" ? String(rawCls?.id || "") : String(rawCls || "");
  }
  if (!candClassId && (candidate?.student_class_name || candidate?.class_name)) {
    const targetClsName = (candidate.student_class_name || candidate.class_name || "").toLowerCase().trim();
    const matchedCls = (effectiveClasses || []).find(
      (c: any) =>
        (c.name || c.class_name || "").toLowerCase().trim() === targetClsName ||
        (c.code || "").toLowerCase().trim() === targetClsName
    );
    if (matchedCls) candClassId = String(matchedCls.id);
  }
  const classObj = candClassId ? (effectiveClasses || []).find((c: any) => String(c.id) === String(candClassId)) : null;

  // C. Extract Department
  let candDeptId =
    getDepartmentId(candidate) ||
    getDepartmentId(candidate?.originalData) ||
    (classObj ? getDepartmentId(classObj) : "") ||
    (secObj ? getDepartmentId(secObj) : "");

  if (!candDeptId && (candidate?.department || candidate?.department_id || candidate?.dept_id)) {
    const rawDept = candidate.department || candidate.department_id || candidate.dept_id;
    candDeptId = typeof rawDept === "object" ? String(rawDept?.id || "") : String(rawDept || "");
  }
  if (!candDeptId && (candidate?.department_name || classObj?.department_name)) {
    const targetDeptName = (candidate?.department_name || classObj?.department_name || "").toLowerCase().trim();
    const matchedDept = (departments || []).find(
      (d: any) =>
        (d.name || d.department_name || "").toLowerCase().trim() === targetDeptName ||
        (d.code || "").toLowerCase().trim() === targetDeptName
    );
    if (matchedDept) candDeptId = String(matchedDept.id);
  }

  const effectiveGroupName =
    secObj?.section_name ||
    secObj?.name ||
    candidate?.section_name ||
    candidate?.student_section_name ||
    candidate?.sub ||
    candSub ||
    "";

  const targetDept = candDeptId || (classObj ? getDepartmentId(classObj) : "") || fallbackScope.selectedDepartmentId || "";
  const targetClass = candClassId || (secObj ? getClassId(secObj) : "") || fallbackScope.selectedClassId || "";
  const targetSec = candSecId || "";

  return {
    resolvedStudentId,
    realName,
    departmentId: targetDept,
    classId: targetClass,
    sectionId: targetSec,
    groupName: effectiveGroupName,
  };
}


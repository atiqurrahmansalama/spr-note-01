import { useMemo } from "react";
import { readJSON } from "@/stores/coreStore";
import { getClassId, getSectionId, getDepartmentId } from "@/modules/learning/daily-classroom/utils/dailyClassroomUtils";

interface AcademicHierarchyFallbackParams {
  classes: any[];
  sections: any[];
  academicStudents: any[];
  studentDatabase: any[];
  activeTenantId?: string | null;
}

export interface EffectiveAcademicData {
  effectiveClasses: any[];
  effectiveSections: any[];
}

/**
 * Multi-Tier Academic Hierarchy Fallback Engine.
 * Resolves classes and sections through memory state, scoped persistent caches, and student record harvesting.
 */
export function useEffectiveAcademicHierarchy({
  classes = [],
  sections = [],
  academicStudents = [],
  studentDatabase = [],
  activeTenantId,
}: AcademicHierarchyFallbackParams): EffectiveAcademicData {
  const tenantKey = activeTenantId || "default";

  // 1. Effective Sections Resolution (Memory -> Scoped Cache -> Student Harvesting)
  const cachedSections = useMemo(() => {
    try {
      const localSecs = readJSON(`spr_sections_cache_${tenantKey}`, []);
      return Array.isArray(localSecs) ? localSecs : [];
    } catch {
      return [];
    }
  }, [tenantKey]);

  const harvestedSections = useMemo(() => {
    const combinedStudents = [...(academicStudents || []), ...(studentDatabase || [])];
    const seenSecIds = new Set<string>();
    const harvested: any[] = [];
    combinedStudents.forEach((st: any) => {
      const sId = st?.student_section || st?.section_id || st?.section;
      const sName = st?.section_name || st?.student_section_name || (typeof st?.sub === "string" ? st.sub : null);
      if (sId && !seenSecIds.has(String(sId))) {
        seenSecIds.add(String(sId));
        harvested.push({
          id: sId,
          section_name: sName || `Section ${sId}`,
          name: sName || `Section ${sId}`,
          student_class: st?.student_class || st?.class_id || st?.academic_class,
        });
      }
    });
    return harvested;
  }, [academicStudents, studentDatabase]);

  const effectiveSections = useMemo(() => {
    if (Array.isArray(sections) && sections.length > 0) return sections;
    if (cachedSections.length > 0) return cachedSections;
    return harvestedSections;
  }, [sections, cachedSections, harvestedSections]);

  // 2. Effective Classes Resolution (Memory -> Scoped Cache -> Student Harvesting)
  const cachedClasses = useMemo(() => {
    try {
      const localCls = readJSON(`spr_classes_cache_${tenantKey}`, []);
      return Array.isArray(localCls) ? localCls : [];
    } catch {
      return [];
    }
  }, [tenantKey]);

  const harvestedClasses = useMemo(() => {
    const combinedStudents = [...(academicStudents || []), ...(studentDatabase || [])];
    const seenClsIds = new Set<string>();
    const harvested: any[] = [];
    combinedStudents.forEach((st: any) => {
      const cId = getClassId(st) || st?.student_class || st?.class_id || st?.academic_class;
      const cName = st?.student_class_name || st?.class_name || st?.academic_class_name;
      if (cId && !seenClsIds.has(String(cId))) {
        seenClsIds.add(String(cId));
        harvested.push({
          id: String(cId),
          name: cName || `Class ${cId}`,
          class_name: cName || `Class ${cId}`,
          department: getDepartmentId(st) || st?.department || st?.department_id,
        });
      }
    });
    return harvested;
  }, [academicStudents, studentDatabase]);

  const effectiveClasses = useMemo(() => {
    if (Array.isArray(classes) && classes.length > 0) return classes;
    if (cachedClasses.length > 0) return cachedClasses;
    return harvestedClasses;
  }, [classes, cachedClasses, harvestedClasses]);

  return {
    effectiveClasses,
    effectiveSections,
  };
}


import { useMemo, useCallback } from "react";
import { useAcademicData } from "@/hooks/useAcademicData";
import {
  ReportItem,
  ReportPortion,
  ReportMistakeDetail,
  ReportStuckDetail,
} from "../types";

export interface ResolvedStudentMeta {
  name: string;
  roll: string;
  studentId: string;
  className: string;
  sectionName: string;
  deptCode: string;
  group: string;
}

export interface AcademicLookupMaps {
  studentById: Map<string, any>;
  studentByName: Map<string, any>;
  classById: Map<string, any>;
  classByName: Map<string, any>;
  sectionById: Map<string, any>;
  deptById: Map<string, any>;
}

/**
 * High-performance academic lookup maps builder
 */
export function useAcademicLookupMaps(): AcademicLookupMaps {
  const { students = [], classes = [], sections = [], departments = [] } =
    (useAcademicData() as any) || {};

  return useMemo(() => {
    const studentById = new Map<string, any>();
    const studentByName = new Map<string, any>();
    (students || []).forEach((s: any) => {
      if (s.id !== undefined && s.id !== null) studentById.set(String(s.id), s);
      if (s.uniq_id) studentById.set(String(s.uniq_id), s);
      if (s.unique_id) studentById.set(String(s.unique_id), s);
      if (s.name_en) studentByName.set(s.name_en.trim().toLowerCase(), s);
      if (s.name) studentByName.set(s.name.trim().toLowerCase(), s);
      if (s.bangla_name) studentByName.set(s.bangla_name.trim().toLowerCase(), s);
      if (s.label) studentByName.set(s.label.trim().toLowerCase(), s);
    });

    const classById = new Map<string, any>();
    const classByName = new Map<string, any>();
    (classes || []).forEach((c: any) => {
      if (c.id !== undefined && c.id !== null) classById.set(String(c.id), c);
      if (c.name) classByName.set(c.name.trim().toLowerCase(), c);
    });

    const sectionById = new Map<string, any>();
    (sections || []).forEach((sec: any) => {
      if (sec.id !== undefined && sec.id !== null) sectionById.set(String(sec.id), sec);
    });

    const deptById = new Map<string, any>();
    (departments || []).forEach((d: any) => {
      if (d.id !== undefined && d.id !== null) deptById.set(String(d.id), d);
      if (d.code) deptById.set(d.code.trim().toUpperCase(), d);
    });

    return { studentById, studentByName, classById, classByName, sectionById, deptById };
  }, [students, classes, sections, departments]);
}

/**
 * Universal Student & Academic Metadata Resolver
 */
export function resolveStudentMeta(
  rep: ReportItem,
  maps: AcademicLookupMaps
): ResolvedStudentMeta {
  const { studentById, studentByName, classById, classByName, sectionById, deptById } = maps;

  const rawStudentId =
    typeof rep.student === "object"
      ? rep.student?.id || rep.student?.uniq_id
      : rep.student || rep.student_id || rep.studentId;

  const rawStudentName = (
    rep.student_name ||
    rep.studentName ||
    rep.student_details?.name_en ||
    rep.student_details?.name ||
    (typeof rep.student === "object" ? rep.student?.name || rep.student?.name_en : null) ||
    (typeof rep.student === "string" && isNaN(Number(rep.student)) ? rep.student : null) ||
    ""
  ).trim();

  const matchedStudent =
    (rawStudentId ? studentById.get(String(rawStudentId)) : null) ||
    (rawStudentName ? studentByName.get(rawStudentName.toLowerCase()) : null);

  const studentDetails =
    rep.student_details || matchedStudent || (typeof rep.student === "object" ? rep.student : null);

  const name =
    rawStudentName ||
    studentDetails?.name_en ||
    studentDetails?.name ||
    matchedStudent?.name_en ||
    matchedStudent?.name ||
    "Unnamed Student";

  const rawRoll =
    rep.rollNumber ??
    rep.roll_number ??
    rep.roll ??
    studentDetails?.roll_number ??
    studentDetails?.roll ??
    matchedStudent?.roll_number ??
    matchedStudent?.roll ??
    "";
  const roll = String(rawRoll).trim();

  const rawStudentIdVal =
    rep.uniqId ||
    rep.unique_id ||
    rep.student_uniq_id ||
    studentDetails?.uniq_id ||
    studentDetails?.unique_id ||
    studentDetails?.student_id_card_number ||
    matchedStudent?.uniq_id ||
    matchedStudent?.unique_id ||
    matchedStudent?.student_id_card_number ||
    (rep.studentId && !String(rep.studentId).startsWith("stu_") ? String(rep.studentId) : "") ||
    "";
  const studentId = String(rawStudentIdVal).trim();

  // Class Resolution
  let classId = String(
    rep.classId ||
    rep.class_id ||
    rep.student_class_id ||
    studentDetails?.student_class?.id ||
    studentDetails?.student_class ||
    studentDetails?.class_id ||
    matchedStudent?.student_class?.id ||
    matchedStudent?.student_class ||
    matchedStudent?.class_id ||
    ""
  );
  let className =
    rep.className ||
    rep.student_class_name ||
    rep.class_name ||
    studentDetails?.student_class_name ||
    studentDetails?.class_name ||
    matchedStudent?.student_class_name ||
    matchedStudent?.class_name ||
    "";

  const foundClass =
    (classId ? classById.get(classId) : null) ||
    (className ? classByName.get(className.trim().toLowerCase()) : null);
  if (foundClass) {
    if (!className && foundClass.name) className = foundClass.name;
    if (!classId && foundClass.id) classId = String(foundClass.id);
  }

  // Section Resolution
  let sectionId = String(
    rep.sectionId ||
    rep.section_id ||
    rep.student_section_id ||
    studentDetails?.section?.id ||
    studentDetails?.section ||
    studentDetails?.student_section ||
    matchedStudent?.section?.id ||
    matchedStudent?.section ||
    matchedStudent?.student_section ||
    ""
  );
  let sectionName =
    rep.sectionName ||
    rep.student_section_name ||
    rep.section_name ||
    studentDetails?.student_section_name ||
    studentDetails?.section_name ||
    matchedStudent?.student_section_name ||
    matchedStudent?.section_name ||
    "";

  const foundSection = sectionId ? sectionById.get(sectionId) : null;
  if (foundSection && !sectionName) {
    sectionName = foundSection.section_name || foundSection.name || "";
  }

  // Department Resolution
  let deptId = String(
    rep.departmentId ||
    rep.department_id ||
    studentDetails?.department?.id ||
    studentDetails?.department ||
    studentDetails?.department_id ||
    matchedStudent?.department?.id ||
    matchedStudent?.department ||
    foundClass?.department?.id ||
    foundClass?.department_id ||
    (typeof foundClass?.department === "string" || typeof foundClass?.department === "number"
      ? foundClass.department
      : "") ||
    ""
  );
  let deptCode =
    rep.departmentCode ||
    rep.department_code ||
    rep.dept_code ||
    studentDetails?.department?.code ||
    studentDetails?.department_code ||
    studentDetails?.dept_code ||
    matchedStudent?.department?.code ||
    matchedStudent?.department_code ||
    foundClass?.department?.code ||
    foundClass?.department_code ||
    "";

  const foundDept =
    (deptId ? deptById.get(deptId) : null) ||
    (deptCode ? deptById.get(deptCode.trim().toUpperCase()) : null);
  if (foundDept) {
    if (!deptCode && foundDept.code) deptCode = foundDept.code;
  }

  if (!deptCode && (rep.departmentName || foundDept?.name || foundClass?.department?.name)) {
    const dName = rep.departmentName || foundDept?.name || foundClass?.department?.name || "";
    const words = dName.trim().split(/\s+/);
    deptCode =
      words.length === 1
        ? words[0].slice(0, 4).toUpperCase()
        : words.map((w: string) => w.charAt(0)).join("").toUpperCase();
  }

  return {
    name,
    roll,
    studentId,
    className: className || rep.student_group || "General Class",
    sectionName,
    deptCode,
    group: rep.student_group || "Standard",
  };
}

/**
 * Hook providing memoized resolveStudentMeta with automated lookup maps
 */
export function useStudentMetaResolver() {
  const maps = useAcademicLookupMaps();

  const resolve = useCallback(
    (rep: ReportItem): ResolvedStudentMeta => resolveStudentMeta(rep, maps),
    [maps]
  );

  return { resolveStudentMeta: resolve, lookupMaps: maps };
}

/**
 * Extracts recitation ranges in standard format: [{ juz, ranges: [{ start, end }] }]
 */
export function getPortions(report: ReportItem | null | undefined): ReportPortion[] {
  if (!report) return [];
  if (Array.isArray(report.juz_and_pages) && report.juz_and_pages.length > 0) {
    return report.juz_and_pages;
  }
  if (Array.isArray(report.portions) && report.portions.length > 0) {
    const juzMap = new Map<number | string, Array<{ start: number | string; end: number | string }>>();
    report.portions.forEach((p) => {
      const j = p.start_juz || p.juz || 1;
      if (!juzMap.has(j)) {
        juzMap.set(j, []);
      }
      juzMap.get(j)!.push({
        start: p.start_page || 1,
        end: p.end_page || p.start_page || 1,
      });
    });
    return Array.from(juzMap.entries()).map(([juz, ranges]) => ({
      juz,
      ranges,
    }));
  }
  return [];
}

/**
 * Extracts mistake items in standard format: [{ juz, page, ayah }]
 */
export function getMistakes(report: ReportItem | null | undefined): ReportMistakeDetail[] {
  if (!report) return [];
  if (Array.isArray(report.mistake_details) && report.mistake_details.length > 0) {
    return report.mistake_details;
  }
  if (Array.isArray(report.error_details)) {
    const serverMistakes = report.error_details.filter((e) => e.type === "Mistake");
    if (serverMistakes.length > 0) return serverMistakes;
  }
  if (Array.isArray(report.mistakes)) {
    const list: ReportMistakeDetail[] = [];
    report.mistakes.forEach((row) => {
      const juz = row.juz || "";
      const page = row.page || "";
      (row.ayahs || []).forEach((a: any) => {
        const val = typeof a === "object" ? (a.value || a.ayah || "") : (a || "");
        if (val && String(val).trim()) {
          list.push({ juz, page, ayah: val });
        }
      });
    });
    return list;
  }
  return [];
}

/**
 * Extracts stuck items in standard format: [{ juz, page, ayah }]
 */
export function getStucks(report: ReportItem | null | undefined): ReportStuckDetail[] {
  if (!report) return [];
  if (Array.isArray(report.stuck_details) && report.stuck_details.length > 0) {
    return report.stuck_details;
  }
  if (Array.isArray(report.error_details)) {
    const serverStucks = report.error_details.filter((e) => e.type === "Stuck");
    if (serverStucks.length > 0) return serverStucks;
  }
  if (Array.isArray(report.stucks)) {
    const list: ReportStuckDetail[] = [];
    report.stucks.forEach((row) => {
      const juz = row.juz || "";
      const page = row.page || "";
      (row.ayahs || []).forEach((a: any) => {
        const val = typeof a === "object" ? (a.value || a.ayah || "") : (a || "");
        if (val && String(val).trim()) {
          list.push({ juz, page, ayah: val });
        }
      });
    });
    return list;
  }
  return [];
}

/**
 * Clean student name initials generator
 */
export function getInitials(name?: string): string {
  if (!name) return "S";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

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

  const isNumericName = Boolean(rawStudentName && /^\d+$/.test(rawStudentName));
  const realStudentName =
    studentDetails?.name_en ||
    studentDetails?.name ||
    matchedStudent?.name_en ||
    matchedStudent?.name;

  const name =
    isNumericName && realStudentName
      ? realStudentName
      : rawStudentName || realStudentName || "Unnamed Student";

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
 * Extracts recitation / book ranges in standard format: [{ juz, ranges: [{ start, end }] }]
 */
export function getPortions(report: ReportItem | null | undefined): ReportPortion[] {
  if (!report) return [];

  // 1. Direct juz_and_pages
  if (Array.isArray(report.juz_and_pages) && report.juz_and_pages.length > 0) {
    return report.juz_and_pages;
  }

  // 2. Book Page Data (unified Book engine)
  if (Array.isArray((report as any).bookPageData) && (report as any).bookPageData.length > 0) {
    return (report as any).bookPageData;
  }

  // 3. Normalized portions from server API or local storage
  if (Array.isArray(report.portions) && report.portions.length > 0) {
    const juzMap = new Map<number | string, Array<{ start: number | string; end: number | string }>>();
    report.portions.forEach((p) => {
      const rawJ = p.start_juz !== undefined && p.start_juz !== null ? p.start_juz : (p.juz !== undefined && p.juz !== null ? p.juz : "");
      const j = String(rawJ).trim() !== "" ? rawJ : "";
      if (!juzMap.has(j)) {
        juzMap.set(j, []);
      }
      (p.ranges || [{ start: p.start_page || 1, end: p.end_page || p.start_page || 1 }]).forEach((r: any) => {
        juzMap.get(j)!.push({
          start: r.start || r.page_start || 1,
          end: r.end || r.page_end || r.start || 1,
        });
      });
    });
    return Array.from(juzMap.entries()).map(([juz, ranges]) => ({
      juz,
      ranges,
    }));
  }

  // 4. Single page range fallback
  const startP = (report as any).start_page || (report as any).page_start;
  const endP = (report as any).end_page || (report as any).page_end || startP;
  if (startP) {
    return [{ juz: (report as any).juz || "", ranges: [{ start: startP, end: endP }] }];
  }

  return [];
}

/**
 * Authoritative Single Source of Truth for Total Recited / Studied Pages.
 */
export function getTotalPages(report: ReportItem | null | undefined): number {
  if (!report) return 0;
  const portions = getPortions(report);
  if (portions.length > 0) {
    let pages = 0;
    portions.forEach((p) => {
      (p.ranges || []).forEach((r) => {
        const s = Number(r.start || (r as any).page_start) || 0;
        const e = Number(r.end || (r as any).page_end) || s;
        if (e >= s && s > 0) pages += (e - s + 1);
        else if (s > 0) pages += 1;
      });
    });
    if (pages > 0) return pages;
  }
  const rawTotal = (report as any).total_page ?? (report as any).totalPages ?? (report as any).total_pages ?? (report as any).pages;
  if (rawTotal !== undefined && rawTotal !== null && Number(rawTotal) > 0) {
    return Number(rawTotal);
  }
  return 0;
}

/**
 * Extracts mistake items in standard format: [{ juz, page, ayah }]
 */
export function getMistakes(report: ReportItem | null | undefined): ReportMistakeDetail[] {
  if (!report) return [];

  const sources = [
    report.mistakes,
    (report as any).mistakeData,
    (report as any).bookMistakeData,
    report.mistake_details,
  ];

  for (const src of sources) {
    if (Array.isArray(src) && src.length > 0) {
      const list: ReportMistakeDetail[] = [];
      src.forEach((row: any) => {
        const juz = row.juz !== undefined && row.juz !== null ? String(row.juz) : "";
        const page = row.page !== undefined && row.page !== null ? String(row.page) : "";
        let pushed = false;
        if (Array.isArray(row.ayahs) && row.ayahs.length > 0) {
          row.ayahs.forEach((a: any) => {
            const val = typeof a === "object" ? (a.value || a.ayah || "") : (a || "");
            if (val && String(val).trim()) {
              list.push({ juz, page, ayah: String(val).trim() });
              pushed = true;
            }
          });
        }
        if (!pushed) {
          const singleAyah = row.ayah || row.line || "";
          if (singleAyah && String(singleAyah).trim()) {
            list.push({ juz, page, ayah: String(singleAyah).trim() });
          } else if (page && String(page).trim()) {
            list.push({ juz, page, ayah: "" });
          }
        }
      });
      if (list.length > 0) return list;
    }
  }

  if (Array.isArray(report.error_details) && report.error_details.length > 0) {
    const serverMistakes = report.error_details
      .filter((e: any) => e.type === "Mistake")
      .map((e: any) => ({
        juz: e.juz !== undefined && e.juz !== null ? String(e.juz) : "",
        page: e.page !== undefined && e.page !== null ? String(e.page) : "",
        ayah: e.ayah !== undefined && e.ayah !== null ? String(e.ayah) : "",
      }));
    if (serverMistakes.length > 0) return serverMistakes;
  }
  return [];
}

/**
 * Extracts stuck items in standard format: [{ juz, page, ayah }]
 */
export function getStucks(report: ReportItem | null | undefined): ReportStuckDetail[] {
  if (!report) return [];

  const sources = [
    report.stucks,
    (report as any).stuckData,
    (report as any).bookStuckData,
    report.stuck_details,
  ];

  for (const src of sources) {
    if (Array.isArray(src) && src.length > 0) {
      const list: ReportStuckDetail[] = [];
      src.forEach((row: any) => {
        const juz = row.juz !== undefined && row.juz !== null ? String(row.juz) : "";
        const page = row.page !== undefined && row.page !== null ? String(row.page) : "";
        let pushed = false;
        if (Array.isArray(row.ayahs) && row.ayahs.length > 0) {
          row.ayahs.forEach((a: any) => {
            const val = typeof a === "object" ? (a.value || a.ayah || "") : (a || "");
            if (val && String(val).trim()) {
              list.push({ juz, page, ayah: String(val).trim() });
              pushed = true;
            }
          });
        }
        if (!pushed) {
          const singleAyah = row.ayah || row.line || "";
          if (singleAyah && String(singleAyah).trim()) {
            list.push({ juz, page, ayah: String(singleAyah).trim() });
          } else if (page && String(page).trim()) {
            list.push({ juz, page, ayah: "" });
          }
        }
      });
      if (list.length > 0) return list;
    }
  }

  if (Array.isArray(report.error_details) && report.error_details.length > 0) {
    const serverStucks = report.error_details
      .filter((e: any) => e.type === "Stuck")
      .map((e: any) => ({
        juz: e.juz !== undefined && e.juz !== null ? String(e.juz) : "",
        page: e.page !== undefined && e.page !== null ? String(e.page) : "",
        ayah: e.ayah !== undefined && e.ayah !== null ? String(e.ayah) : "",
      }));
    if (serverStucks.length > 0) return serverStucks;
  }
  return [];
}

/**
 * Authoritative Single Source of Truth for Mistakes Count across all views, tables, parent rows, and analytics.
 */
export function getMistakesCount(report: ReportItem | null | undefined): number {
  if (!report) return 0;
  const resolvedMistakes = getMistakes(report).filter(
    (m) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())
  );
  // 1. Authoritative: if resolved detail rows exist, count them directly
  if (resolvedMistakes.length > 0) {
    return resolvedMistakes.length;
  }
  // 2. Fallback: if no detail items are listed, check numeric totals
  const raw = (report as any).total_mistake ?? (report as any).total_mistakes ?? (report as any).mistakesCount;
  return Number(raw) || 0;
}

/**
 * Authoritative Single Source of Truth for Stucks Count across all views, tables, parent rows, and analytics.
 */
export function getStucksCount(report: ReportItem | null | undefined): number {
  if (!report) return 0;
  const resolvedStucks = getStucks(report).filter(
    (s) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())
  );
  // 1. Authoritative: if resolved detail rows exist, count them directly
  if (resolvedStucks.length > 0) {
    return resolvedStucks.length;
  }
  // 2. Fallback: if no detail items are listed, check numeric totals
  const raw = (report as any).total_stuck ?? (report as any).total_stucks ?? (report as any).stucksCount;
  return Number(raw) || 0;
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

/**
 * Determines whether a report belongs to Book / Subject progress or Quran recitation
 */
export function isBookReport(report: ReportItem | null | undefined): boolean {
  if (!report) return false;
  if (report.progress_mode === "BOOK" || report.mode === "BOOK") return true;
  if (typeof report.book_title === "string" && report.book_title.trim() !== "") return true;
  if (typeof report.curriculum_book_name === "string" && report.curriculum_book_name.trim() !== "") return true;
  if (typeof report.book_name === "string" && report.book_name.trim() !== "") return true;
  if (typeof report.lesson_title === "string" && report.lesson_title.trim() !== "") return true;
  if (typeof report.lesson_covered === "string" && report.lesson_covered.trim() !== "") return true;
  if (Array.isArray(report.bookPageData) && report.bookPageData.length > 0) return true;
  if (Array.isArray(report.bookMistakeData) && report.bookMistakeData.length > 0) return true;
  if (Array.isArray(report.bookStuckData) && report.bookStuckData.length > 0) return true;

  // Check juz_and_pages or portions:
  // In Quran mode, every recitation has a Juz number (1 to 30).
  // In Book mode, juz is empty string "" or null!
  const rawJuzPages = Array.isArray(report.juz_and_pages) && report.juz_and_pages.length > 0
    ? report.juz_and_pages
    : (Array.isArray(report.portions) ? report.portions : []);

  if (rawJuzPages.length > 0) {
    const hasAnyExplicitJuz = rawJuzPages.some((p: any) => {
      const val = p.juz !== undefined && p.juz !== null ? String(p.juz).trim() : (p.start_juz ? String(p.start_juz).trim() : "");
      return val !== "" && val !== "0";
    });
    if (!hasAnyExplicitJuz) return true;
  }

  return false;
}

/**
 * Safely extracts the book / subject name from a report
 */
export function getBookTitle(report: ReportItem | null | undefined): string {
  if (!report) return "";
  const candidate = (
    report.book_title ||
    report.curriculum_book_name ||
    report.book_name ||
    (report.subject_course && report.subject_course !== "General Group" && report.subject_course !== "Standard" ? report.subject_course : "") ||
    ""
  ).trim();
  return candidate;
}

/**
 * Safely extracts the lesson title from a report
 */
export function getLessonTitle(report: ReportItem | null | undefined): string {
  if (!report) return "";
  return (
    report.lesson_title ||
    report.lesson_covered ||
    (report as any)?.lessonTitle ||
    (report as any)?.lesson ||
    ""
  ).trim();
}


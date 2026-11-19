import { ReportItem } from "../../../progress-management/progress-reports/types";
import { getTotalPages, getMistakesCount, getStucksCount } from "../../../progress-management/progress-reports/utils/studentMetaResolver";
import { SessionBreakdownItem } from "../types";

export const getReportDate = (r: ReportItem): string => {
  if (r.isoDateOnly) return r.isoDateOnly;
  const raw = r.report_date || r.date || r.selectedDate || r.generate_date || r.created_at || "";
  if (!raw) return "";
  return String(raw).substring(0, 10);
};

export const getReportPages = (r: ReportItem): number => getTotalPages(r);
export const getReportMistakes = (r: ReportItem): number => getMistakesCount(r);
export const getReportStucks = (r: ReportItem): number => getStucksCount(r);

export const formatDayLabel = (dateStr: string): string => {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {}
  return dateStr;
};

export const generateDatesBetween = (startStr: string, endStr: string): string[] => {
  const sParts = startStr.split("-").map(Number);
  const eParts = endStr.split("-").map(Number);
  if (sParts.length !== 3 || eParts.length !== 3) return [];

  const s = new Date(sParts[0], sParts[1] - 1, sParts[2]);
  const e = new Date(eParts[0], eParts[1] - 1, eParts[2]);
  if (s > e) return [];

  const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) return [];

  const dates: string[] = [];
  const cur = new Date(s);
  while (cur <= e) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

export interface ExtractedDimensions {
  student: string;
  session: string;
  department: string;
  className: string;
  section: string;
  teacher: string;
}

export const extractReportDimensions = (r: ReportItem): ExtractedDimensions => {
  const sid = r.student_name || (r as any).studentName || (r as any).student?.name || r.studentId || r.student_id || "";
  const sess = r.session_name || r.session || (r as any).sessionName || "Regular Session";

  const dept =
    r.department_name ||
    r.departmentName ||
    r.department_code ||
    r.departmentCode ||
    r.deptCode ||
    r.student_details?.department_name ||
    r.student_details?.department?.name ||
    r.student_details?.department ||
    r.department ||
    "";

  const cls =
    r.class_name ||
    r.className ||
    r.academic_class_name ||
    r.student_details?.class_name ||
    r.student_details?.class?.name ||
    r.student_group ||
    r.academic_class ||
    "";

  const sec =
    r.section_name ||
    r.sectionName ||
    r.student_section_name ||
    r.student_details?.section_name ||
    r.student_details?.section?.name ||
    r.section ||
    "";

  const tch =
    r.teacher_name ||
    r.teacherName ||
    (typeof r.teacher === "object"
      ? r.teacher?.name || r.teacher?.name_en
      : typeof r.teacher === "string" && isNaN(Number(r.teacher))
      ? r.teacher
      : "") ||
    "";

  return {
    student: String(sid).trim(),
    session: String(sess).trim(),
    department: String(dept).trim(),
    className: String(cls).trim(),
    section: String(sec).trim(),
    teacher: String(tch).trim(),
  };
};

export const padSparkline = (arr: number[], defVal: number): number[] => {
  if (arr.length === 0) return [defVal, defVal];
  if (arr.length === 1) return [arr[0], arr[0]];
  return arr;
};

export const calculateDelta = (arr: number[], inverse = false) => {
  if (arr.length < 2) return undefined;
  const last = arr[arr.length - 1];
  const prev = arr[arr.length - 2];
  if (prev === 0) {
    return {
      value: `${last > 0 ? "+" : ""}${last}`,
      isPositive: inverse ? last <= 0 : last >= 0,
    };
  }
  const pct = Math.round(((last - prev) / prev) * 100);
  return {
    value: `${pct >= 0 ? "+" : ""}${pct}% vs prior`,
    isPositive: inverse ? pct <= 0 : pct >= 0,
  };
};

export const generateProgressAiInsight = (
  totalReports: number,
  studentCount: number,
  totalPages: number,
  totalErrors: number,
  totalMistakes: number,
  totalStucks: number,
  topSession?: SessionBreakdownItem
): string => {
  if (totalReports === 0) {
    return "No progress records found matching the active date criteria.";
  }
  const errorRateText =
    totalErrors === 0
      ? "with flawless zero recorded errors"
      : `with ${totalMistakes} mistakes and ${totalStucks} stucks across ${totalPages} pages`;

  return `${studentCount} student${studentCount === 1 ? "" : "s"} recited across ${totalReports} session${
    totalReports === 1 ? "" : "s"
  }, covering ${totalPages} pages (${errorRateText}). ${
    topSession
      ? `${topSession.sessionName} registered the highest recitation volume (${topSession.totalPages} pages, ${topSession.totalErrors} errors).`
      : ""
  }`;
};

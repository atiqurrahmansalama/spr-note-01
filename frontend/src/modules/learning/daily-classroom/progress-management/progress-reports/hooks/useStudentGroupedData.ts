import { useMemo } from "react";
import { StudentGroupedItem, ReportItem } from "../types";
import { ResolvedStudentMeta } from "../utils/studentMetaResolver";
import { isReportUnsynced } from "@/utils/syncEngine";

export interface EnrichedStudentRow {
  student_key: string;
  student_name: string;
  student_group: string;
  reports: ReportItem[];
  meta: ResolvedStudentMeta;
  totalReports: number;
  totalPages: number;
  totalMistakes: number;
  totalStucks: number;
  hasPendingSync: boolean;
}

/**
 * Custom hook to aggregate, consolidate and enrich student grouped reports
 */
export function useStudentGroupedData(
  studentGroupedData: StudentGroupedItem[] | undefined,
  reportsList: ReportItem[] | undefined,
  resolveStudentMeta: (rep: ReportItem) => ResolvedStudentMeta
): EnrichedStudentRow[] {
  return useMemo(() => {
    let sourceGroups: StudentGroupedItem[] = [];

    if (studentGroupedData && Array.isArray(studentGroupedData) && studentGroupedData.length > 0) {
      sourceGroups = studentGroupedData;
    } else {
      const map = new Map<string, StudentGroupedItem>();
      (reportsList || []).forEach((rep) => {
        const name = rep.student_name || "Unnamed Student";
        if (!map.has(name)) {
          map.set(name, {
            student_name: name,
            student_group: rep.student_group || "",
            reports: [],
          });
        }
        map.get(name)!.reports.push(rep);
      });
      sourceGroups = Array.from(map.values());
    }

    return sourceGroups.map((stu) => {
      const primaryRep = stu.reports[0] || ({} as ReportItem);
      const meta = resolveStudentMeta(primaryRep);

      const totalReports = stu.reports.length;
      const totalPages = stu.reports.reduce(
        (sum, r) => sum + (r.totalPages || r.total_page || r.total_pages || r.pages || 0),
        0
      );
      const totalMistakes = stu.reports.reduce(
        (sum, r) => sum + (r.mistakesCount || r.total_mistake || 0),
        0
      );
      const totalStucks = stu.reports.reduce(
        (sum, r) => sum + (r.stucksCount || r.total_stuck || 0),
        0
      );
      const hasPendingSync = stu.reports.some(isReportUnsynced);

      const studentKey = String(
        meta.studentId || meta.roll ? `${stu.student_name}__${meta.studentId || meta.roll}` : stu.student_name
      );

      return {
        student_key: studentKey,
        student_name: stu.student_name,
        student_group: stu.student_group || meta.group,
        reports: stu.reports,
        meta,
        totalReports,
        totalPages,
        totalMistakes,
        totalStucks,
        hasPendingSync,
      };
    });
  }, [studentGroupedData, reportsList, resolveStudentMeta]);
}

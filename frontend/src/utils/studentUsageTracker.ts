/**
 * Student Usage Frequency Tracker & Sorting Engine
 * ===================================================
 * Tracks student usage across reports, classroom sessions, and daily progress.
 * Calculates dynamic frequency weightings so that the most frequently used students
 * are automatically sorted to the top of autocomplete dropdowns and selection lists.
 */

const USAGE_STORE_KEY = "spr_student_usage_freq_v1";

/**
 * Returns a map of student identifier (name/ID in lowercase) -> total usage count.
 * Aggregates both persisted usage counters and historical local reports.
 */
export function getStudentUsageMap(): Record<string, number> {
  const usageMap: Record<string, number> = {};

  // 1. Read explicit usage frequency counters
  try {
    const rawFreq = localStorage.getItem(USAGE_STORE_KEY);
    if (rawFreq) {
      const parsed = JSON.parse(rawFreq);
      if (typeof parsed === "object" && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === "number") {
            usageMap[k.toLowerCase().trim()] = (usageMap[k.toLowerCase().trim()] || 0) + v;
          }
        });
      }
    }
  } catch (err) {
    console.warn("[studentUsageTracker] Error reading usage frequency store:", err);
  }

  // 2. Aggregate counts from all historical reports stored in spr_reports_local_v1
  try {
    const rawReports = localStorage.getItem("spr_reports_local_v1");
    if (rawReports) {
      const reports = JSON.parse(rawReports);
      if (Array.isArray(reports)) {
        reports.forEach((r: any) => {
          const sName = (
            r.student_name ||
            r.studentName ||
            (typeof r.student === "string" ? r.student : "") ||
            ""
          )
            .toLowerCase()
            .trim();
          const sId = r.studentId || (typeof r.student === "object" ? r.student?.id : null);

          if (sName) {
            usageMap[sName] = (usageMap[sName] || 0) + 1;
          }
          if (sId) {
            const idKey = String(sId).toLowerCase().trim();
            usageMap[idKey] = (usageMap[idKey] || 0) + 1;
          }
        });
      }
    }
  } catch (err) {
    console.warn("[studentUsageTracker] Error reading local reports for usage count:", err);
  }

  return usageMap;
}

/**
 * Records a usage event for a given student (by ID and name).
 */
export function recordStudentUsage(student: any | string): void {
  if (!student) return;
  try {
    const rawFreq = localStorage.getItem(USAGE_STORE_KEY);
    const parsed: Record<string, number> = rawFreq ? JSON.parse(rawFreq) : {};

    const name = typeof student === "string" ? student : student.label || student.name || student.name_en || "";
    const id = typeof student === "object" && student.id ? String(student.id) : null;

    if (name && typeof name === "string" && name.trim()) {
      const nameKey = name.toLowerCase().trim();
      parsed[nameKey] = (parsed[nameKey] || 0) + 1;
    }
    if (id && String(id).trim()) {
      const idKey = String(id).toLowerCase().trim();
      parsed[idKey] = (parsed[idKey] || 0) + 1;
    }

    localStorage.setItem(USAGE_STORE_KEY, JSON.stringify(parsed));
  } catch (err) {
    console.warn("[studentUsageTracker] Error recording student usage:", err);
  }
}

/**
 * Sorts any list of students by their usage frequency (highest used first).
 * Falls back to alphabetical sorting when counts are tied.
 */
export function sortStudentsByUsage<T extends { id?: any; label?: string; name?: string; name_en?: string }>(
  students: T[],
  usageMap?: Record<string, number>
): T[] {
  if (!Array.isArray(students)) return [];
  const validList = students.filter(Boolean);
  const map = usageMap || getStudentUsageMap();

  return [...validList].sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    const aIdKey = a.id ? String(a.id).toLowerCase().trim() : "";
    const bIdKey = b.id ? String(b.id).toLowerCase().trim() : "";

    const aNameKey = (a.label || a.name || a.name_en || (typeof a === "string" ? a : "") || "").toLowerCase().trim();
    const bNameKey = (b.label || b.name || b.name_en || (typeof b === "string" ? b : "") || "").toLowerCase().trim();

    const countA = Math.max(
      aIdKey && map[aIdKey] ? map[aIdKey] : 0,
      aNameKey && map[aNameKey] ? map[aNameKey] : 0
    );
    const countB = Math.max(
      bIdKey && map[bIdKey] ? map[bIdKey] : 0,
      bNameKey && map[bNameKey] ? map[bNameKey] : 0
    );

    if (countB !== countA) {
      return countB - countA;
    }

    return (a.label || a.name || a.name_en || "").localeCompare(b.label || b.name || b.name_en || "");
  });
}


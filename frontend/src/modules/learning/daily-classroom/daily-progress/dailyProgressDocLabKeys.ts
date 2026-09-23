import type { KeyTaxonomyItem } from '../../../../components/print/keyLibrary/types';
import type { DailyProgressData, DetailRowData, JuzRowData } from './types';

/**
 * Standard date formatter for reports
 */
function formatReportDate(selectedDate?: string): string {
  if (!selectedDate) return '';
  const d = new Date(selectedDate);
  if (isNaN(d.getTime())) return String(selectedDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Universal Document Scope ID for Daily Progress / Hifz Reports in DocLab
 */
export const DAILY_PROGRESS_SCOPE_ID = 'hifz_daily_report';

/**
 * Exact 14 DocLab Taxonomy Keys for Daily Progress Reports
 * Defined locally within the module and passed to DocLab Studio & Quick Report Modal.
 */
export const DAILY_PROGRESS_DOCLAB_KEYS: KeyTaxonomyItem[] = [
  {
    key: 'date',
    label: 'Date',
    category: 'general',
    example: '23/09/2026',
    description: 'Daily progress evaluation date',
  },
  {
    key: 'student-name',
    label: 'Student Name',
    category: 'student',
    example: 'Abdullah Al Mamun',
    description: 'Full name of the student',
  },
  {
    key: 'dept',
    label: 'Department',
    category: 'academic',
    example: 'Tahfizul Quran',
    description: 'Academic department',
  },
  {
    key: 'class',
    label: 'Class',
    category: 'academic',
    example: 'Hifz Class',
    description: 'Class or grade level',
  },
  {
    key: 'section',
    label: 'Section',
    category: 'academic',
    example: 'Section A',
    description: 'Section or branch group',
  },
  {
    key: 'juz-number',
    label: 'Juz Number',
    category: 'hifz',
    example: '22',
    description: 'Recited Para or Juz number(s)',
  },
  {
    key: 'juz-page',
    label: 'Juz Page',
    category: 'hifz',
    example: '13–14',
    description: 'Page range (e.g. "13–14" or "22: 13–14" per line if multiple juz)',
  },
  {
    key: 'Session',
    label: 'Session',
    category: 'academic',
    example: 'Morning Sabaq',
    description: 'Daily recitation session name',
  },
  {
    key: 'total-mis',
    label: 'Total Mistakes',
    category: 'hifz',
    example: '2',
    description: 'Total mistake count',
  },
  {
    key: 'total-stuck',
    label: 'Total Stuck',
    category: 'hifz',
    example: '1',
    description: 'Total stuck count',
  },
  {
    key: 'detail-mis',
    label: 'Mistake Details',
    category: 'hifz',
    example: 'Page 13 Ayah 3',
    description: 'Detailed list of mistakes (or "22: Page 13 Ayah 3" per line if multiple juz)',
  },
  {
    key: 'detail-stuck',
    label: 'Stuck Details',
    category: 'hifz',
    example: 'Page 13 Ayah 3',
    description: 'Detailed list of stuck points (or "22: Page 13 Ayah 3" per line if multiple juz)',
  },
  {
    key: 'mention-teacher-name',
    label: 'Mention Teacher Name',
    category: 'staff',
    example: '@Mustafa',
    description: 'Assigned teacher or evaluator handle',
  },
  {
    key: 'remarks',
    label: 'Remarks',
    category: 'general',
    example: 'Good recitation with proper tajweed.',
    description: 'Teacher comments and observations (empty if none)',
  },
];

export interface AcademicContextInfo {
  departmentName?: string;
  className?: string;
  sectionName?: string;
  teacherName?: string;
}

/**
 * Counts valid mistake or stuck items from detail rows
 */
function countValidAyahItems(data?: DetailRowData[]): number {
  if (!Array.isArray(data)) return 0;
  return data.reduce((total, row) => {
    if (!row.page || String(row.page).trim() === '') return total;
    const validAyahs = (row.ayahs || []).filter(
      (a) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ''
    ).length;
    return total + (validAyahs > 0 ? validAyahs : 0);
  }, 0);
}

/**
 * Formats mistake or stuck items with strict "one item per line" rule.
 * - Single Juz: "Page 13 Ayah 3" (without Juz prefix).
 * - Multiple Juz:
 *   For each Juz group:
 *     1st line: "22: Page 13 Ayah 3" (with Juz prefix)
 *     2nd line onwards for that Juz: "Page 14 Ayah 5" (Juz prefix omitted).
 * If empty or no items exist, returns an empty string "".
 */
function formatDetailLines(
  data?: DetailRowData[],
  sessionJuzs: string[] = [],
  isMultiJuzSession: boolean = false
): string {
  if (!Array.isArray(data) || data.length === 0) return '';

  const itemsByJuz = new Map<string, Array<{ page: string; ayah: string }>>();

  data.forEach((row) => {
    const pageStr = (row.page !== undefined && row.page !== null) ? String(row.page).trim() : '';
    if (!pageStr) return;

    let rowJuz = (row.juz !== undefined && row.juz !== null) ? String(row.juz).trim() : '';
    if (!rowJuz && sessionJuzs.length > 0) {
      rowJuz = sessionJuzs[0];
    }

    const validAyahs = (row.ayahs || [])
      .map((a) => (a.value !== undefined && a.value !== null ? String(a.value).trim() : ''))
      .filter((v) => v !== '');

    if (validAyahs.length === 0) return;

    if (!itemsByJuz.has(rowJuz)) {
      itemsByJuz.set(rowJuz, []);
    }

    validAyahs.forEach((ayahVal) => {
      itemsByJuz.get(rowJuz)!.push({ page: pageStr, ayah: ayahVal });
    });
  });

  if (itemsByJuz.size === 0) return '';

  const distinctDataJuzs = Array.from(itemsByJuz.keys()).filter((j) => j !== '');
  const isMultiJuz = isMultiJuzSession || sessionJuzs.length > 1 || distinctDataJuzs.length > 1;

  const lines: string[] = [];

  if (!isMultiJuz) {
    // Single Juz: standard formatting without any Juz prefix
    itemsByJuz.forEach((items) => {
      items.forEach((item) => {
        lines.push(`Page ${item.page} Ayah ${item.ayah}`);
      });
    });
  } else {
    // Multiple Juz:
    // 1st line of each Juz gets the Juz prefix (e.g. "22: Page 13 Ayah 3"),
    // subsequent lines for that Juz omit the prefix ("Page 14 Ayah 5").
    itemsByJuz.forEach((items, juz) => {
      items.forEach((item, index) => {
        const itemText = `Page ${item.page} Ayah ${item.ayah}`;
        if (index === 0 && juz) {
          lines.push(`${juz}: ${itemText}`);
        } else {
          lines.push(itemText);
        }
      });
    });
  }

  return lines.join('\n');
}

/**
 * Extracts and formats Juz number string (e.g. "30" or "22, 23")
 */
function extractJuzNumberString(juzPageData?: JuzRowData[]): string {
  if (!Array.isArray(juzPageData)) return '';
  const juzSet = new Set<string>();
  juzPageData.forEach((row) => {
    if (row.juz !== undefined && row.juz !== null) {
      const jStr = String(row.juz).trim();
      if (jStr) juzSet.add(jStr);
    }
  });
  return Array.from(juzSet).join(', ');
}

/**
 * Extracts and formats page range string:
 * - Single Juz: "13–14" (or "13–14, 16–18" if multiple ranges in same juz)
 * - Multiple Juz: each Juz on a separate line, e.g.:
 *   22: 13–14
 *   23: 1–5
 */
function extractJuzPageString(juzPageData?: JuzRowData[]): string {
  if (!Array.isArray(juzPageData) || juzPageData.length === 0) return '';

  const groupMap = new Map<string, string[]>();

  juzPageData.forEach((row) => {
    const jStr = (row.juz !== undefined && row.juz !== null) ? String(row.juz).trim() : '';
    if (!row.ranges || !Array.isArray(row.ranges)) return;

    const currentRanges: string[] = [];
    row.ranges.forEach((r) => {
      const s = (r.start || '').toString().trim();
      const e = (r.end || '').toString().trim();
      if (s) {
        if (e && e !== s) {
          currentRanges.push(`${s}–${e}`);
        } else {
          currentRanges.push(s);
        }
      }
    });

    if (currentRanges.length > 0) {
      if (!groupMap.has(jStr)) {
        groupMap.set(jStr, []);
      }
      groupMap.get(jStr)!.push(...currentRanges);
    }
  });

  if (groupMap.size === 0) return '';

  const distinctJuzs = Array.from(groupMap.keys()).filter((j) => j !== '');
  const isMultiJuz = distinctJuzs.length > 1;

  if (!isMultiJuz) {
    const allRanges: string[] = [];
    groupMap.forEach((ranges) => {
      allRanges.push(...ranges);
    });
    return allRanges.join(', ');
  }

  // Multiple Juz: each Juz on a separate line
  const lines: string[] = [];
  groupMap.forEach((ranges, juz) => {
    const rangesStr = ranges.join(', ');
    if (juz) {
      lines.push(`${juz}: ${rangesStr}`);
    } else {
      lines.push(rangesStr);
    }
  });

  return lines.join('\n');
}

/**
 * Transforms live Daily Progress state into a normalized record matching the 14 keys
 * plus common aliases for 100% resilient template token matching.
 */
export function buildDailyProgressReportData(
  reportData: DailyProgressData = {},
  academicContext: AcademicContextInfo = {}
): Record<string, string> {
  const {
    studentName = '',
    departmentName: propDeptName = '',
    className: propClassName = '',
    sectionName: propSectionName = '',
    selectedSession = '',
    selectedDate = '',
    juzPageData = [],
    mistakeData = [],
    stuckData = [],
    comment = '',
    teacherName: propTeacherName = '',
  } = reportData;

  // 1. Date (Direct from user's picked date, empty if none)
  const rawDate = selectedDate || '';
  const formattedDate = rawDate ? formatReportDate(rawDate) : '';

  // 2. Student Name
  const safeStudentName = (studentName || '').trim();

  // 3. Dept, Class, Section (Strictly user-picked, no forced fallbacks)
  const deptName = (academicContext.departmentName || propDeptName || '').trim();
  const className = (academicContext.className || propClassName || '').trim();
  const sectionName = (academicContext.sectionName || propSectionName || '').trim();

  // 4. Juz Number & Juz Page
  const sessionJuzSet = new Set<string>();
  (juzPageData || []).forEach((row) => {
    if (row.juz !== undefined && row.juz !== null) {
      const jStr = String(row.juz).trim();
      if (jStr) sessionJuzSet.add(jStr);
    }
  });
  const sessionJuzs = Array.from(sessionJuzSet);

  const juzNumber = extractJuzNumberString(juzPageData);
  const juzPage = extractJuzPageString(juzPageData);

  // Check if session or detail rows represent multi-juz
  const mistakeJuzSet = new Set<string>();
  (mistakeData || []).forEach((r) => {
    if (r.juz !== undefined && r.juz !== null) {
      const jStr = String(r.juz).trim();
      if (jStr) mistakeJuzSet.add(jStr);
    }
  });

  const stuckJuzSet = new Set<string>();
  (stuckData || []).forEach((r) => {
    if (r.juz !== undefined && r.juz !== null) {
      const jStr = String(r.juz).trim();
      if (jStr) stuckJuzSet.add(jStr);
    }
  });

  const isMultiJuz = sessionJuzs.length > 1 || mistakeJuzSet.size > 1 || stuckJuzSet.size > 1;

  // 5. Session
  const sessionName = (selectedSession || '').trim();

  // 6. Total Mistakes & Total Stuck
  const totalMistakesCount = countValidAyahItems(mistakeData);
  const totalStuckCount = countValidAyahItems(stuckData);
  const totalMisStr = String(totalMistakesCount);
  const totalStuckStr = String(totalStuckCount);

  // 7. Detail Mistakes & Detail Stuck (Strict: one item per line, empty if none)
  const detailMisStr = formatDetailLines(mistakeData, sessionJuzs, isMultiJuz);
  const detailStuckStr = formatDetailLines(stuckData, sessionJuzs, isMultiJuz);

  // 8. Teacher Mention
  let resolvedTeacher = (propTeacherName || academicContext.teacherName || '').trim();
  if (!resolvedTeacher && typeof window !== 'undefined') {
    resolvedTeacher = (localStorage.getItem('spr_copy_teacher_name') || '').trim();
  }
  const teacherHandle = resolvedTeacher
    ? (resolvedTeacher.startsWith('@') ? resolvedTeacher : `@${resolvedTeacher}`)
    : '';

  // 9. Remarks (Strict: empty if none, no dummy text)
  const remarksStr = (comment || '').trim();

  // Exact 14 Keys + Enriched Aliases
  return {
    // 14 Exact Requested Keys
    'date': formattedDate,
    'student-name': safeStudentName,
    'dept': deptName,
    'class': className,
    'section': sectionName,
    'juz-number': juzNumber,
    'juz-page': juzPage,
    'Session': sessionName,
    'total-mis': totalMisStr,
    'total-stuck': totalStuckStr,
    'detail-mis': detailMisStr,
    'detail-stuck': detailStuckStr,
    'mention-teacher-name': teacherHandle,
    'remarks': remarksStr,

    // Case-Insensitive, Short Form & Underscore/CamelCase Aliases
    'Date': formattedDate,
    'delivery_date': formattedDate,
    'report_date': formattedDate,
    'selected_date': formattedDate,
    'student_name': safeStudentName,
    'studentName': safeStudentName,
    'StudentName': safeStudentName,
    'dept_name': deptName,
    'department': deptName,
    'department_name': deptName,
    'department-name': deptName,
    'Dept': deptName,
    'Department': deptName,
    'class_name': className,
    'class-name': className,
    'Class': className,
    'ClassName': className,
    'target_class': className,
    'sec': sectionName,
    'Sec': sectionName,
    'section_name': sectionName,
    'section-name': sectionName,
    'Section': sectionName,
    'group': sectionName,
    'Group': sectionName,
    'group_name': sectionName,
    'juz_number': juzNumber,
    'juz_page': juzPage,
    'session': sessionName,
    'session_name': sessionName,
    'total_mis': totalMisStr,
    'total_mistakes': totalMisStr,
    'total_stuck': totalStuckStr,
    'detail_mis': detailMisStr,
    'detail_stuck': detailStuckStr,
    'mention_teacher_name': teacherHandle,
    'teacher_name': teacherHandle,
    'teacher': teacherHandle,
    'comment': remarksStr,
  };
}

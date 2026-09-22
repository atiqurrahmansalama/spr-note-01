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
    example: '30',
    description: 'Recited Para or Juz number(s)',
  },
  {
    key: 'juz-page',
    label: 'Juz Page',
    category: 'hifz',
    example: '582–586',
    description: 'Page range recited during session',
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
    example: 'Page 582 Ayah 3\nPage 583 Ayah 12',
    description: 'Detailed list of mistakes (one item per line)',
  },
  {
    key: 'detail-stuck',
    label: 'Stuck Details',
    category: 'hifz',
    example: 'Page 584 Ayah 7',
    description: 'Detailed list of stuck points (one item per line)',
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
 * If empty or no items exist, returns an empty string "".
 */
function formatDetailLines(data?: DetailRowData[]): string {
  if (!Array.isArray(data) || data.length === 0) return '';

  const lines: string[] = [];

  data.forEach((row) => {
    const pageStr = (row.page !== undefined && row.page !== null) ? String(row.page).trim() : '';
    if (!pageStr) return;

    const validAyahs = (row.ayahs || [])
      .map((a) => (a.value !== undefined && a.value !== null ? String(a.value).trim() : ''))
      .filter((v) => v !== '');

    if (validAyahs.length === 0) return;

    validAyahs.forEach((ayahVal) => {
      lines.push(`Page ${pageStr} Ayah ${ayahVal}`);
    });
  });

  return lines.join('\n');
}

/**
 * Extracts and formats Juz number string (e.g. "30" or "29, 30")
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
 * Extracts and formats page range string (e.g. "582–586" or multi-juz breakdown)
 */
function extractJuzPageString(juzPageData?: JuzRowData[]): string {
  if (!Array.isArray(juzPageData)) return '';
  const rangesList: string[] = [];

  juzPageData.forEach((row) => {
    if (row.ranges && Array.isArray(row.ranges)) {
      row.ranges.forEach((r) => {
        const s = (r.start || '').toString().trim();
        const e = (r.end || '').toString().trim();
        if (s) {
          if (e && e !== s) {
            rangesList.push(`${s}–${e}`);
          } else {
            rangesList.push(s);
          }
        }
      });
    }
  });

  return rangesList.join(', ');
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
    groupName = '',
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

  // 1. Date
  const rawDate = selectedDate || new Date().toISOString().split('T')[0];
  const formattedDate = formatReportDate(rawDate);

  // 2. Student Name
  const safeStudentName = (studentName || '').trim();

  // 3. Dept, Class, Section (with groupName fallback)
  const deptName = (
    academicContext.departmentName ||
    propDeptName ||
    (reportData as any).dept ||
    (reportData as any).dept_name ||
    (reportData as any).department ||
    ''
  ).trim();

  const className = (
    academicContext.className ||
    propClassName ||
    (reportData as any).class ||
    (reportData as any).class_name ||
    ''
  ).trim();

  const sectionName = (
    academicContext.sectionName ||
    propSectionName ||
    groupName ||
    (reportData as any).sec ||
    (reportData as any).section_name ||
    (reportData as any).section ||
    ''
  ).trim();

  // 4. Juz Number & Juz Page
  const juzNumber = extractJuzNumberString(juzPageData);
  const juzPage = extractJuzPageString(juzPageData);

  // 5. Session
  const sessionName = (selectedSession || '').trim();

  // 6. Total Mistakes & Total Stuck
  const totalMistakesCount = countValidAyahItems(mistakeData);
  const totalStuckCount = countValidAyahItems(stuckData);
  const totalMisStr = String(totalMistakesCount);
  const totalStuckStr = String(totalStuckCount);

  // 7. Detail Mistakes & Detail Stuck (Strict: one item per line, empty if none)
  const detailMisStr = formatDetailLines(mistakeData);
  const detailStuckStr = formatDetailLines(stuckData);

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
    'student_name': safeStudentName,
    'studentName': safeStudentName,
    'dept_name': deptName,
    'department': deptName,
    'department_name': deptName,
    'department-name': deptName,
    'Dept': deptName,
    'Department': deptName,
    'class_name': className,
    'class-name': className,
    'Class': className,
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

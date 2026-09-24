import type { KeyTaxonomyItem } from '@/components/print/keyLibrary/types';
import { registerTokenFilterInterceptor } from '@/components/print/docxTemplateEngine';
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
    description: 'Detailed list of mistakes (or "No Mistake" if none)',
  },
  {
    key: 'detail-stuck',
    label: 'Stuck Details',
    category: 'hifz',
    example: 'Page 13 Ayah 3',
    description: 'Detailed list of stuck points (or "No Stuck" if none)',
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
    itemsByJuz.forEach((items) => {
      items.forEach((item) => {
        lines.push(`Page ${item.page} Ayah ${item.ayah}`);
      });
    });
  } else {
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
 * Extracts and formats page range string
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

  const rawDate = selectedDate || '';
  const formattedDate = rawDate ? formatReportDate(rawDate) : '';
  const safeStudentName = (studentName || '').trim();

  const deptName = (academicContext.departmentName || propDeptName || '').trim();
  const className = (academicContext.className || propClassName || '').trim();
  const sectionName = (academicContext.sectionName || propSectionName || '').trim();

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
  const sessionName = (selectedSession || '').trim();

  const totalMistakesCount = countValidAyahItems(mistakeData);
  const totalStuckCount = countValidAyahItems(stuckData);
  const totalMisStr = String(totalMistakesCount);
  const totalStuckStr = String(totalStuckCount);

  const rawDetailMis = formatDetailLines(mistakeData, sessionJuzs, isMultiJuz);
  const detailMisStr = rawDetailMis.trim() ? rawDetailMis : 'No Mistake';

  const rawDetailStuck = formatDetailLines(stuckData, sessionJuzs, isMultiJuz);
  const detailStuckStr = rawDetailStuck.trim() ? rawDetailStuck : 'No Stuck';

  let resolvedTeacher = (propTeacherName || academicContext.teacherName || '').trim();
  if (!resolvedTeacher && typeof window !== 'undefined') {
    resolvedTeacher = (localStorage.getItem('spr_copy_teacher_name') || '').trim();
  }
  const teacherHandle = resolvedTeacher
    ? (resolvedTeacher.startsWith('@') ? resolvedTeacher : `@${resolvedTeacher}`)
    : '';

  const remarksStr = (comment || '').trim();

  return {
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
    'is_multi_juz': isMultiJuz ? 'true' : 'false',
    'isMultiJuz': isMultiJuz ? 'true' : 'false',
    'has_multiple_juz': isMultiJuz ? 'true' : 'false',

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

/**
 * Daily Progress Domain Filter Interceptor:
 * - When only a single Juz is evaluated: Indent filter is completely skipped (all lines remain flush left).
 * - When multiple Juz exist: The 1st line (header line) of each Juz remains unindented,
 *   while subsequent sub-item lines under that Juz are indented with the requested spaces.
 */
let isDailyProgressInterceptorRegistered = false;
export function registerDailyProgressDocLabInterceptor(): void {
  if (isDailyProgressInterceptorRegistered) return;
  isDailyProgressInterceptorRegistered = true;

  registerTokenFilterInterceptor((tokenKey, filterName, args, value, lookup, mode) => {
    const isDetailKey = tokenKey === 'detailmis' || tokenKey === 'detailstuck';
    if (!isDetailKey || filterName !== 'indent') {
      return null;
    }

    const isMultiJuzFlag =
      lookup.get('is_multi_juz') === 'true' ||
      lookup.get('ismultijuz') === 'true' ||
      lookup.get('has_multiple_juz') === 'true';

    const juzNumStr = lookup.get('juz_number') || lookup.get('juznumber') || lookup.get('juz-number') || '';
    const hasMultipleInJuzNumber = juzNumStr.includes(',') || juzNumStr.includes('–') || juzNumStr.includes('-');

    let hasMultipleJuz = isMultiJuzFlag || hasMultipleInJuzNumber;
    const rawLines = value.includes('<br>') || value.includes('<br/>') || value.includes('<br />')
      ? value.split(/<br\s*[\/]?>/gi)
      : value.split(/\r?\n/);

    const juzHeaderRegex = /^(?:[A-Za-z0-9_\-\.\s]+|\d+):\s+/i;
    const headerLines = rawLines.filter((l) => juzHeaderRegex.test(l.replace(/<[^>]*>/g, '').trim()));

    if (headerLines.length > 0) {
      hasMultipleJuz = true;
    }

    // 1. Single Juz: Indentation is NOT applied (keep flush left)
    if (!hasMultipleJuz || headerLines.length === 0) {
      return { handled: true, skipFilter: true };
    }

    // 2. Multiple Juz: Parse indent arguments and indent only sub-items under each Juz header
    let spaceCount = 5;
    const numMatch = (args || '').match(/\b(\d+)\b/);
    if (numMatch) {
      spaceCount = parseInt(numMatch[1], 10);
    }
    const spaceChar = mode === 'html' ? '&nbsp;' : ' ';
    const indent = spaceChar.repeat(Math.max(1, spaceCount));

    const formattedLines = rawLines.map((line) => {
      const cleanLine = line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (!cleanLine) return line;

      // Skip indent on 1st line of each Juz (Juz header line, e.g. "22: Page 13 Ayah 3")
      if (juzHeaderRegex.test(cleanLine)) {
        return line;
      }

      // Indent sub-item lines under that Juz (e.g. "Page 14 Ayah 5")
      return `${indent}${line}`;
    });

    const result = mode === 'html' ? formattedLines.join('<br>') : formattedLines.join('\n');
    return { handled: true, result };
  });
}

// Automatically register interceptor on module load
registerDailyProgressDocLabInterceptor();

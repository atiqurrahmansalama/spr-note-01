import type { KeyTaxonomyItem } from '@/components/print/keyLibrary/types';
import { SubjectRoutineItem } from './types';

/**
 * Dedicated Scope Identifier for Examination Subject Routine in DocLab
 */
export const SUBJECT_ROUTINE_SCOPE_ID = 'subject_routine';

/**
 * Strict, Isolated DocLab Taxonomy Keys for Examination Subject Routine.
 * Strictly contains only the required tokens for Subject Routine templates:
 * - {{exam-name}}
 * - {{academic-year}}
 * - {{exam-date}}
 * - {{day-name}}
 * - {{shift}}
 * - {{shift-time}}
 * - {{class}}
 * - {{class-sub1}}, {{class-sub2}}, {{class-sub3}}...
 */
export const SUBJECT_ROUTINE_DOCLAB_KEYS: KeyTaxonomyItem[] = [
  // 1. Examination & Session Metadata
  {
    key: 'exam-name',
    label: 'Exam Name',
    category: 'subjects',
    example: 'Annual Examination 2026',
    description: 'Title of active examination session',
  },
  {
    key: 'academic-year',
    label: 'Academic Year',
    category: 'subjects',
    example: '2026-2027',
    description: 'Academic session or academic year',
  },

  // 2. Schedule, Date & Day
  {
    key: 'exam-date',
    label: 'Exam Date',
    category: 'subjects',
    example: '15/10/2026',
    description: 'Scheduled examination date',
  },
  {
    key: 'day-name',
    label: 'Day Name',
    category: 'subjects',
    example: 'Saturday',
    description: 'Day of the week (e.g. Saturday, Sunday)',
  },
  {
    key: 'date-day',
    label: 'Date & Day (Combined)',
    category: 'subjects',
    example: '15/10/2026<br>Saturday',
    description: 'Combined examination date and day of week',
  },

  // 3. Shift & Shift Time
  {
    key: 'shift',
    label: 'Shift',
    category: 'subjects',
    example: 'Morning Shift',
    description: 'Assigned examination shift slot',
  },
  {
    key: 'shift-time',
    label: 'Shift Time',
    category: 'subjects',
    example: '09:00 AM - 12:00 PM',
    description: 'Examination shift start and end time',
  },

  // 4. Class & Dynamic Sequential Class Subject Token
  {
    key: 'class',
    label: 'Class Names',
    category: 'subjects',
    example: 'Class 1, Class 2, Class 3',
    description: 'Participating class names in routine sequence',
  },
  {
    key: 'class-sub1',
    label: 'Sequential Class Subject',
    category: 'subjects',
    example: 'Al-Quran / Bangla',
    description: 'Subject of class by sequence number (e.g. {{class-sub1}} for 1st class, {{class-sub2}} for 2nd class, {{class-sub3}} for 3rd class, etc.)',
  },
];

export interface SubjectRoutineAcademicContext {
  departmentName?: string;
  className?: string;
  sectionName?: string;
  allAvailableClasses?: any[];
  participatingClasses?: any[];
  examShifts?: any[];
  designatedExamDays?: string[];
}

/**
 * Standard date formatter for reports (DD/MM/YYYY)
 */
function formatReportDate(dateVal?: string): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Resolves day name from a date string (e.g. "Saturday", "Sunday")
 */
function resolveDayName(dateVal?: string, fallbackDay?: string): string {
  if (fallbackDay) return fallbackDay;
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Transforms live Subject Routine rows and exam session state into a clean key-value mapping
 * matching SUBJECT_ROUTINE_DOCLAB_KEYS for DocLab template merge engine.
 * Generates dynamic sequential class subjects: {{class-sub1}}, {{class-sub2}}, {{class-sub3}}...
 */
export function buildSubjectRoutineReportData(
  routineRows: SubjectRoutineItem[] = [],
  activeExam: any = null,
  context: SubjectRoutineAcademicContext = {}
): Record<string, any> {
  const firstRow = routineRows[0] || ({} as SubjectRoutineItem);

  // 1. Resolve Ordered Participating Classes
  const classMap = new Map<string, { id: string; name: string; sequence?: number }>();
  const addClassCandidate = (c: any) => {
    if (!c) return;
    const cId = String(c.id || c.classId || '');
    if (!cId) return;
    if (!classMap.has(cId)) {
      classMap.set(cId, {
        id: cId,
        name: c.name || c.className || c.class_name || `Class ${cId}`,
        sequence: typeof c.sequence === 'number' ? c.sequence : typeof c.order === 'number' ? c.order : 999,
      });
    }
  };

  (context.participatingClasses || []).forEach(addClassCandidate);
  (context.allAvailableClasses || []).forEach(addClassCandidate);
  routineRows.forEach((r) => {
    if (r.classId) {
      addClassCandidate({ id: r.classId, name: r.className || `Class ${r.classId}` });
    }
  });

  let orderedClasses = Array.from(classMap.values()).sort((a, b) => {
    if ((a.sequence ?? 999) !== (b.sequence ?? 999)) {
      return (a.sequence ?? 999) - (b.sequence ?? 999);
    }
    return a.name.localeCompare(b.name);
  });

  // If filtered by specific class context, restrict to that class
  if (context.className) {
    const matched = orderedClasses.filter((c) => c.name.toLowerCase() === context.className?.toLowerCase());
    if (matched.length > 0) orderedClasses = matched;
  }

  const classNamesList = orderedClasses.map((c) => c.name);
  const classNamesStr = classNamesList.length > 0 ? classNamesList.join(', ') : (context.className || firstRow.className || '');

  // 2. Resolve Unique Date & Shift Slots dynamically from designatedExamDays, scheduleDays, and routineRows
  interface SlotKey {
    rawDate: string;
    shiftId: string;
    shiftName: string;
    shiftTime: string;
    dayName: string;
  }

  const slotMap = new Map<string, SlotKey>();

  const defaultShift = (context.examShifts && context.examShifts[0]) ||
    (activeExam?.shifts && activeExam.shifts[0]) ||
    (activeExam?.examShifts && activeExam.examShifts[0]) ||
    { id: 'shift_1', name: 'Standard Shift', startTime: '09:00 AM', endTime: '12:00 PM', time: '09:00 AM - 12:00 PM' };

  const defaultShiftId = String(defaultShift.id || defaultShift.shiftId || 'shift_1');
  const defaultShiftName = defaultShift.name || defaultShift.shiftName || 'Standard Shift';
  const defaultShiftTime = defaultShift.startTime && defaultShift.endTime
    ? `${defaultShift.startTime} - ${defaultShift.endTime}`
    : defaultShift.time || defaultShift.shiftTime || '09:00 AM - 12:00 PM';

  // 2a. Ingest all designated exam days from context
  if (Array.isArray(context.designatedExamDays) && context.designatedExamDays.length > 0) {
    context.designatedExamDays.forEach((dateStr) => {
      const rawDate = String(dateStr || '').split('T')[0].trim();
      if (!rawDate) return;
      const key = `${rawDate}___${defaultShiftId}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          rawDate,
          shiftId: defaultShiftId,
          shiftName: defaultShiftName,
          shiftTime: defaultShiftTime,
          dayName: resolveDayName(rawDate),
        });
      }
    });
  }

  // 2b. Ingest all scheduleDays from activeExam
  if (Array.isArray(activeExam?.scheduleDays) && activeExam.scheduleDays.length > 0) {
    activeExam.scheduleDays.forEach((d: any) => {
      if (d && d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK') {
        const rawDate = String(d.date || d.examDate || '').split('T')[0].trim();
        if (!rawDate) return;
        const sId = String(d.shiftId || (d as any).shift_id || defaultShiftId);
        const sName = d.shiftName || (d as any).shift_name || defaultShiftName;
        const sTime = d.startTime && d.endTime ? `${d.startTime} - ${d.endTime}` : (d.shiftTime || defaultShiftTime);
        const key = `${rawDate}___${sId}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            rawDate,
            shiftId: sId,
            shiftName: sName,
            shiftTime: sTime,
            dayName: resolveDayName(rawDate, d.dayOfWeek || d.dayName),
          });
        }
      }
    });
  }

  // 2c. Ingest date range from activeExam startDate & endDate if present
  if (activeExam?.startDate && activeExam?.endDate) {
    const s = new Date(activeExam.startDate);
    const e = new Date(activeExam.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      const cur = new Date(s);
      while (cur <= e) {
        const rawDate = cur.toISOString().split('T')[0];
        const key = `${rawDate}___${defaultShiftId}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            rawDate,
            shiftId: defaultShiftId,
            shiftName: defaultShiftName,
            shiftTime: defaultShiftTime,
            dayName: resolveDayName(rawDate),
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // 2d. Ingest all routine rows (which may have specific shifts or custom dates)
  routineRows.forEach((r) => {
    const rawDate = String(r.examDate || (r as any).exam_date || (r as any).date || (r as any).rawDate || '').split('T')[0].trim();
    if (!rawDate) return;
    const sId = String(r.shiftId || (r as any).shift_id || defaultShiftId);
    const key = `${rawDate}___${sId}`;

    const sName = r.shiftName || (r as any).shift_name || defaultShiftName;
    const sTime = r.startTime && r.endTime
      ? `${r.startTime} - ${r.endTime}`
      : r.startTime || r.shiftTime || (r as any).shift_time || defaultShiftTime;
    const dName = resolveDayName(rawDate, r.dayOfWeek || r.dayName || (r as any).day_name);

    slotMap.set(key, {
      rawDate,
      shiftId: sId,
      shiftName: sName,
      shiftTime: sTime,
      dayName: dName,
    });
  });

  // Sort slots chronologically
  const sortedSlots = Array.from(slotMap.values()).sort((a, b) => {
    if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
    return a.shiftId.localeCompare(b.shiftId);
  });

  // 3. Build Matrix Rows for Repeating Table Expansion
  const tableRows = sortedSlots.map((slot) => {
    const rowObj: Record<string, any> = {
      'exam-name': activeExam?.name || firstRow.examName || '',
      'academic-year': activeExam?.academicYearName || activeExam?.session || activeExam?.year || firstRow.academicYear || '',
      'exam-date': formatReportDate(slot.rawDate),
      'day-name': slot.dayName,
      shift: slot.shiftName,
      'shift-time': slot.shiftTime,
      class: classNamesStr,
    };

    // Populate {{class-sub1}}, {{class-sub2}}, {{class-sub3}}... sequentially
    orderedClasses.forEach((cls, idx) => {
      const subKey = `class-sub${idx + 1}`;
      const matchedRow = routineRows.find((r) => {
        const rDate = String(r.examDate || '').split('T')[0].trim();
        const rShift = String(r.shiftId || 'shift_1');
        const rClassId = String(r.classId || '');
        return rDate === slot.rawDate && (rShift === slot.shiftId || !r.shiftId) && rClassId === cls.id;
      });

      rowObj[subKey] = matchedRow ? (matchedRow.subjectName || matchedRow.name || '') : '-';
    });

    return rowObj;
  });

  // 4. Extract Top-level Flat Record
  const examNameVal = activeExam?.name || firstRow.examName || 'Annual Examination 2026';
  const academicYearVal = activeExam?.academicYearName || activeExam?.session || activeExam?.year || firstRow.academicYear || '2026-2027';

  // Fallback rich sample data if tableRows is empty (e.g. initial template design / preview)
  const defaultSampleDates = ['15/10/2026', '16/10/2026', '17/10/2026', '18/10/2026', '19/10/2026'];
  const defaultSampleDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
  const defaultSampleShifts = ['Morning Shift', 'Morning Shift', 'Morning Shift', 'Morning Shift', 'Morning Shift'];
  const defaultSampleShiftTimes = ['09:00 AM - 12:00 PM', '09:00 AM - 12:00 PM', '09:00 AM - 12:00 PM', '09:00 AM - 12:00 PM', '09:00 AM - 12:00 PM'];
  const defaultSampleSubjects = [
    ['Al-Quran', 'Bangla 1st', 'English 1st', 'Mathematics', 'General Science'],
    ['Arabic 1st', 'Bangla 2nd', 'English 2nd', 'Social Science', 'ICT'],
    ['Hadith Studies', 'Islamic History', 'General Math', 'Higher Math', 'Physics'],
  ];

  const examDatesList = tableRows.length > 0
    ? tableRows.map((r) => r['exam-date']).filter(Boolean)
    : defaultSampleDates;

  const dayNamesList = tableRows.length > 0
    ? tableRows.map((r) => r['day-name']).filter(Boolean)
    : defaultSampleDays;

  const shiftsList = tableRows.length > 0
    ? tableRows.map((r) => r.shift).filter(Boolean)
    : defaultSampleShifts;

  const shiftTimesList = tableRows.length > 0
    ? tableRows.map((r) => r['shift-time']).filter(Boolean)
    : defaultSampleShiftTimes;

  const dateDaysList = examDatesList.map((d, i) => `${d}<br>${dayNamesList[i] || ''}`);

  const flatRecord: Record<string, any> = {
    'exam-name': examNameVal,
    'academic-year': academicYearVal,
    'exam-date': examDatesList,
    'day-name': dayNamesList,
    'date-day': dateDaysList,
    'exam-date-day': dateDaysList,
    shift: shiftsList,
    'shift-time': shiftTimesList,
    class: classNamesStr || 'Class 1, Class 2, Class 3',
  };

  // Populate dynamic sequential class subjects ({{class-sub1}}, {{class-sub2}}, etc.)
  if (orderedClasses.length === 0) {
    defaultSampleSubjects.forEach((subList, idx) => {
      const subKey = `class-sub${idx + 1}`;
      flatRecord[subKey] = subList;
    });
  } else {
    orderedClasses.forEach((cls, idx) => {
      const subKey = `class-sub${idx + 1}`;
      const subjectsAcrossSlots = tableRows.map((r) => r[subKey] || '-').filter(Boolean);
      flatRecord[subKey] = subjectsAcrossSlots.length > 0
        ? subjectsAcrossSlots
        : (defaultSampleSubjects[idx % defaultSampleSubjects.length] || '-');
    });
  }

  // Attach table rows array for universal table loops and repeating sections
  flatRecord.rows = tableRows;
  flatRecord.items = tableRows;
  flatRecord.data = tableRows;

  return flatRecord;
}

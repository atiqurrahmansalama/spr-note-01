import type { KeyTaxonomyItem } from '@/components/print/keyLibrary/types';
import { SubjectRoutineItem } from './types';

/**
 * Dedicated Scope Identifier for Subject Routine Matrix in DocLab
 */
export const SUBJECT_ROUTINE_SCOPE_ID = 'subject_routine';

/**
 * Strict, Isolated DocLab Taxonomy Keys for Subject Routine.
 * Kept 100% inside this module so DocLab displays only these relevant keys when Subject Routine opens.
 */
export const SUBJECT_ROUTINE_DOCLAB_KEYS: KeyTaxonomyItem[] = [
  // 1. Examination & Session Metadata
  {
    key: 'exam-name',
    label: 'Exam Name',
    category: 'exam',
    example: 'Annual Examination 2026',
    description: 'Title of active examination session',
  },
  {
    key: 'academic-year',
    label: 'Academic Year',
    category: 'exam',
    example: '2026-2027',
    description: 'Academic session or academic year',
  },
  {
    key: 'start-date',
    label: 'Start Date',
    category: 'exam',
    example: '15/10/2026',
    description: 'Routine commencement start date',
  },
  {
    key: 'end-date',
    label: 'End Date',
    category: 'exam',
    example: '28/10/2026',
    description: 'Routine conclusion end date',
  },

  // 2. Class & Academic Scope
  {
    key: 'department',
    label: 'Department',
    category: 'academic',
    example: 'Kitab Division',
    description: 'Academic department or division',
  },
  {
    key: 'class',
    label: 'Class',
    category: 'academic',
    example: 'Class 9',
    description: 'Target class or grade level',
  },
  {
    key: 'section',
    label: 'Section',
    category: 'academic',
    example: 'Section A',
    description: 'Class section or group',
  },

  // 3. Schedule, Shift & Timing
  {
    key: 'exam-date',
    label: 'Exam Date',
    category: 'exam',
    example: '15/10/2026',
    description: 'Scheduled examination date',
  },
  {
    key: 'day-name',
    label: 'Day Name',
    category: 'exam',
    example: 'Thursday',
    description: 'Day of the week',
  },
  {
    key: 'shift',
    label: 'Shift',
    category: 'exam',
    example: 'Morning Shift',
    description: 'Assigned shift slot',
  },
  {
    key: 'start-time',
    label: 'Start Time',
    category: 'exam',
    example: '09:00 AM',
    description: 'Examination start time',
  },
  {
    key: 'end-time',
    label: 'End Time',
    category: 'exam',
    example: '12:00 PM',
    description: 'Examination end time',
  },
  {
    key: 'duration',
    label: 'Duration',
    category: 'exam',
    example: '3 Hours',
    description: 'Allocated examination duration',
  },

  // 4. Subject & Evaluation
  {
    key: 'subject-name',
    label: 'Subject Name',
    category: 'subjects',
    example: 'Al-Quran & Tajweed',
    description: 'Subject or curriculum book title',
  },
  {
    key: 'subject-code',
    label: 'Subject Code',
    category: 'subjects',
    example: 'QUR-101',
    description: 'Unique subject or course code',
  },
  {
    key: 'full-marks',
    label: 'Full Marks',
    category: 'grading_scale',
    example: '100',
    description: 'Total full marks for the subject',
  },
  {
    key: 'pass-marks',
    label: 'Pass Marks',
    category: 'grading_scale',
    example: '33',
    description: 'Minimum passing score threshold',
  },

  // 5. Hall Logistics & Staff Assignment
  {
    key: 'room-no',
    label: 'Room / Hall',
    category: 'academic',
    example: 'Room 204',
    description: 'Allocated examination room or hall number',
  },
  {
    key: 'examiner-name',
    label: 'Examiner Name',
    category: 'staff',
    example: 'Ustadh Ahmad',
    description: 'Assigned paper examiner or subject teacher',
  },
  {
    key: 'invigilator-name',
    label: 'Invigilator Name',
    category: 'staff',
    example: 'Ustadh Tariq',
    description: 'Assigned examination hall invigilator',
  },

  // 6. Notes & General
  {
    key: 'notes',
    label: 'Notes / Guidelines',
    category: 'general',
    example: 'Calculators and mobile devices are strictly prohibited.',
    description: 'Special exam guidelines, syllabus portion, or instructions',
  },
  {
    key: 'date',
    label: 'Print Date',
    category: 'general',
    example: '26/09/2026',
    description: 'Report generation current date timestamp',
  },
];

export interface SubjectRoutineAcademicContext {
  departmentName?: string;
  className?: string;
  sectionName?: string;
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
 * Transforms live Subject Routine rows and exam session state into a clean key-value mapping
 * matching SUBJECT_ROUTINE_DOCLAB_KEYS for DocLab template merge engine.
 */
export function buildSubjectRoutineReportData(
  routineRows: SubjectRoutineItem[] = [],
  activeExam: any = null,
  context: SubjectRoutineAcademicContext = {}
): Record<string, string> {
  const firstRow = routineRows[0] || ({} as SubjectRoutineItem);
  const today = formatReportDate(new Date().toISOString());

  const examDates = Array.from(
    new Set(routineRows.map((r) => formatReportDate(r.examDate)).filter(Boolean))
  ).join(', ');

  const subjectNames = routineRows.map((r) => r.subjectName || r.name).filter(Boolean).join(', ');
  const subjectCodes = routineRows.map((r) => r.subjectCode || r.code).filter(Boolean).join(', ');

  return {
    'exam-name': activeExam?.name || firstRow.examName || '',
    'academic-year': activeExam?.academicYearName || activeExam?.session || firstRow.academicYear || '',
    'start-date': formatReportDate(activeExam?.startDate) || firstRow.startDate || '',
    'end-date': formatReportDate(activeExam?.endDate) || firstRow.endDate || '',
    department: context.departmentName || firstRow.departmentName || '',
    class: context.className || firstRow.className || '',
    section: context.sectionName || firstRow.sectionName || '',
    'exam-date': routineRows.length === 1 ? formatReportDate(firstRow.examDate) : examDates,
    'day-name': firstRow.dayName || firstRow.day || '',
    shift: firstRow.shiftName || firstRow.shift || '',
    'start-time': firstRow.startTime || '',
    'end-time': firstRow.endTime || '',
    duration: firstRow.duration || '',
    'subject-name': routineRows.length === 1 ? firstRow.subjectName || firstRow.name || '' : subjectNames,
    'subject-code': routineRows.length === 1 ? firstRow.subjectCode || firstRow.code || '' : subjectCodes,
    'full-marks': firstRow.fullMarks !== undefined && firstRow.fullMarks !== null ? String(firstRow.fullMarks) : '',
    'pass-marks': firstRow.passMarks !== undefined && firstRow.passMarks !== null ? String(firstRow.passMarks) : '',
    'room-no': firstRow.roomNo || firstRow.hallName || '',
    'examiner-name': firstRow.examinerName || firstRow.teacherName || '',
    'invigilator-name': firstRow.invigilatorName || '',
    notes: firstRow.notes || '',
    date: today,
  };
}

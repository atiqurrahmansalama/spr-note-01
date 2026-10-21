import type { ReactNode } from 'react';
import type { BookProgressStats } from '../../components/ClassroomContextCard';

export interface Student {
  id: string | number;
  name?: string;
  name_en?: string;
  uniq_id?: string;
  roll_number?: string;
  student_class?: any;
  student_class_name?: string;
  class_id?: string | number;
  section?: any;
  section_id?: string | number;
  student_section?: any;
  section_name?: string;
  department?: any;
  department_id?: string | number;
  department_name?: string;
  [key: string]: any;
}

export interface AcademicClass {
  id: string | number;
  name?: string;
  class_name?: string;
  department?: any;
  department_id?: string | number;
  [key: string]: any;
}

export interface Section {
  id: string | number;
  name?: string;
  section_name?: string;
  academic_class?: any;
  class_id?: string | number;
  [key: string]: any;
}

export interface PeriodSlot {
  id: string | number;
  period_order?: number;
  order?: number;
  period_name?: string;
  start_time?: string;
  end_time?: string;
  [key: string]: any;
}

export interface Department {
  id: string | number;
  name?: string;
  [key: string]: any;
}

export interface Teacher {
  id: string | number;
  name?: string;
  [key: string]: any;
}

export interface StaffMember {
  id: string | number;
  name?: string;
  [key: string]: any;
}

export type EvaluationStatus = 'MASTERED' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'NOT_EVALUATED' | 'ABSENT' | string;

export interface AssessmentRowItem {
  id: string | number;
  student: string | number;
  student_name: string;
  student_uniq_id: string;
  student_class_name: string;
  evaluation_date: string;
  is_evaluated: boolean;
  has_assigned_lesson: boolean;
  evaluation_status: EvaluationStatus;
  curriculum_book_id?: string | number | null;
  curriculum_book_name?: string;
  subject_name?: string;
  lesson_title?: string;
  lesson_covered?: string;
  start_unit?: string | number;
  end_unit?: string | number;
  score?: number | string;
  recitation_score?: number | string;
  homework_score?: number | string;
  total_mistakes: number;
  total_stucks: number;
  fluency_rating?: number | string;
  teacher_remarks?: string;
}

export interface AssessmentMetricItem {
  label: string;
  value: string | number;
  subValue?: string;
}

export type { BookProgressStats };

export interface AssessmentEvaluationPayload {
  id: string;
  tenant_id: string;
  student: string | number;
  student_name: string;
  student_uniq_id: string;
  student_class: string | number;
  student_class_name: string;
  evaluation_date: string;
  period_slot?: string | number | null;
  period_order?: number | null;
  period_name?: string;
  evaluation_status: EvaluationStatus;
  curriculum_book_id?: string | number | null;
  curriculum_book_name?: string | null;
  subject_name?: string;
  lesson_covered: string;
  start_unit: string;
  end_unit: string;
  score: number;
  recitation_score: number;
  homework_score: number;
  max_score: number;
  total_mistakes: number;
  total_stucks: number;
  fluency_rating: number;
  teacher_remarks: string;
  next_target: string;
  teacher_name?: string;
  is_synced_to_parent?: boolean;
  updated_at?: string;
}

export interface LessonAssessmentsViewProps {
  filterProps?: any;
  assessmentRows?: AssessmentRowItem[];
  assessmentMetrics?: AssessmentMetricItem[];
  getSlotAssessmentCount?: (slotValue: string | number) => number;
  onOpenAssessmentDrawer?: (studentId: string | number, row?: AssessmentRowItem) => void;
  tenantId?: string;
  loadData?: () => void;
  [key: string]: any;
}

export interface StudentAssessmentDrawerProps {
  studentId?: string | number;
  date?: string;
  evaluation?: any;
  assignedLesson?: any;
  defaultDepartmentId?: string;
  defaultClassId?: string;
  defaultSectionId?: string;
  defaultPeriodId?: string;
  onSaveSuccess?: (savedData: AssessmentEvaluationPayload) => void;
  onCancel?: () => void;
}

export interface UseDailyClassroomAssessmentParams {
  enrolledStudents: Student[];
  evaluations: any[];
  lessons: any[];
  classes: AcademicClass[];
  selectedDate: string;
  activePeriodId?: string;
  filteredLessons?: any[];
  baseFilteredLessons?: any[];
}

export interface UseDailyClassroomAssessmentReturn {
  assessmentRows: AssessmentRowItem[];
  assessmentMetrics: AssessmentMetricItem[];
  getSlotAssessmentCount: (slotValue: string | number) => number;
}

export interface UseStudentAssessmentOptionsParams {
  students?: Student[];
  periodSlots?: PeriodSlot[];
  availableBooks?: any[];
  curriculumBooks?: any[];
  teachers?: Teacher[];
  staff?: StaffMember[];
  periodSlotId?: string;
  curriculumBookId?: string;
  curriculumBookName?: string;
}

export interface UseStudentAssessmentOptionsReturn {
  studentOptions: Array<{ value: string; label: string }>;
  periodOptions: Array<{ value: string; label: string }>;
  bookOptions: Array<{ value: string; label: string }>;
}

export interface UseStudentAssessmentFormParams {
  studentId?: string | number;
  date?: string;
  evaluation?: any;
  assignedLesson?: any;
  defaultDepartmentId?: string;
  defaultClassId?: string;
  defaultSectionId?: string;
  defaultPeriodId?: string;
  students?: Student[];
  classes?: AcademicClass[];
  sections?: Section[];
  departments?: Department[];
  periodSlots?: PeriodSlot[];
  teachers?: Teacher[];
  staff?: StaffMember[];
  curriculumBooks?: any[];
  tenantId?: string;
  onSaveSuccess?: (payload: AssessmentEvaluationPayload) => void;
  onCancel?: () => void;
}

export interface UseStudentAssessmentFormReturn {
  selectedStudentId: string;
  setSelectedStudentId: (val: string) => void;
  evaluationDate: string;
  setEvaluationDate: (val: string) => void;
  periodSlotId: string;
  setPeriodSlotId: (val: string) => void;
  curriculumBookId: string;
  setCurriculumBookId: (val: string) => void;
  curriculumBookName: string;
  setCurriculumBookName: (val: string) => void;
  subjectName: string;
  setSubjectName: (val: string) => void;
  lessonCovered: string;
  setLessonCovered: (val: string) => void;
  startUnit: string;
  setStartUnit: (val: string) => void;
  endUnit: string;
  setEndUnit: (val: string) => void;
  recitationScore: number | string;
  setRecitationScore: (val: number | string) => void;
  homeworkScore: number | string;
  setHomeworkScore: (val: number | string) => void;
  maxScore: number | string;
  setMaxScore: (val: number | string) => void;
  totalMistakes: number;
  setTotalMistakes: (val: number) => void;
  totalStucks: number;
  setTotalStucks: (val: number) => void;
  fluencyRating: number;
  setFluencyRating: (val: number) => void;
  teacherRemarks: string;
  setTeacherRemarks: (val: string) => void;
  nextTarget: string;
  setNextTarget: (val: string) => void;
  saving: boolean;
  isEditingContext: boolean;
  setIsEditingContext: React.Dispatch<React.SetStateAction<boolean>>;
  autoSaveStatus: any;
  lastSavedAt: Date | null;
  clearDraft: () => void;
  activeStudent: any;
  studentClassObj: AcademicClass | null;
  studentDeptObj: Department | null;
  matchedSectionObj: Section | null;
  displaySectionName: string;
  availableBooks: any[];
  selectedBook: any;
  resolvedTeacherName: string;
  matchedPeriod: PeriodSlot | null;
  displayPeriodName: string;
  resolvedPeriodTime: string;
  bookMinPage: number;
  bookMaxPage: number | undefined;
  bookProgressStats: BookProgressStats | null;
  hasFixedContext: boolean;
  handleStartPageChange: (val: string | { target?: { value: string } }) => void;
  handleEndPageChange: (val: string | { target?: { value: string } }) => void;
  handleSubmit: (e?: React.FormEvent) => void;
}

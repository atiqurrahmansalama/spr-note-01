import { DailyClassroomFilterProps } from "../../components/DailyClassroomFilterControls";

export interface DailyLessonItem {
  id: string | number;
  lesson_title?: string;
  lesson_date?: string;
  period_slot?: string | number;
  period_name?: string;
  curriculum_book_id?: string | number;
  curriculum_book_name?: string;
  subject_name?: string;
  teacher_name?: string;
  teacher?: string | number;
  department_id?: string | number;
  department?: any;
  academic_class?: any;
  class_id?: string | number;
  student_class?: any;
  section?: any;
  section_id?: string | number;
  student_section?: any;
  start_unit?: string | number;
  end_unit?: string | number;
  homework_task?: string;
  lesson_instructions?: string;
  assigned_scope?: "CLASS_WIDE" | "SPECIFIC_STUDENTS" | string;
  target_student_ids?: Array<string | number>;
  target_student_id?: string | number;
  is_assigned?: boolean;
  [key: string]: any;
}

export interface DailyLessonsViewProps {
  filterProps?: DailyClassroomFilterProps | null;
  filteredLessons?: DailyLessonItem[];
  lessonMetrics?: any[];
  getSlotLessonsCount?: (slotId: string | number) => number;
  getBookNamesForPeriod?: (periodId: string | number) => string | string[];
  selectedClassObj?: any;
  classes?: any[];
  tenantId?: string;
  loadData?: () => void;
  onOpenAddLesson?: (row?: any) => void;
  onEditLesson?: (row: any) => void;
  onDuplicateLesson?: (row: any) => void;
  [key: string]: any;
}

export interface LessonPlanDrawerProps {
  date?: string;
  defaultDate?: string;
  defaultDepartmentId?: string | number;
  defaultClassId?: string | number;
  defaultSectionId?: string | number;
  defaultPeriodId?: string | number;
  lesson?: DailyLessonItem | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export interface CarryForwardLessonPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentDate?: string;
  classId?: string | number;
  classes?: any[];
  tenantId?: string;
  onApplyLesson?: (sourceLesson: DailyLessonItem, nextStart: string, nextEnd: string) => void;
}

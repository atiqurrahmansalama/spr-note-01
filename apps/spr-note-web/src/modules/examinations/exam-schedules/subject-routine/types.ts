import React from 'react';

export interface RoutineAssessmentComponent {
  id?: string;
  name: string;
  maxMarks: number;
  passMarks?: number;
}

export interface RoutinePreviousExamMark {
  id?: string;
  examId: string;
  examName?: string;
  weightagePct?: number;
  maxMarks?: number;
}

export interface SubjectRoutineItem {
  id: string;
  examId: string;
  examName?: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  classId: string;
  className?: string;
  classCode?: string;
  sectionId?: string;
  sectionName?: string;
  subjectId?: string;
  subjectName: string;
  subjectCode?: string;
  curriculumBookId?: string | null;
  curriculumBookName?: string;
  evaluationType?: string;
  examDate: string;
  dayOfWeek?: string;
  shiftId?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  roomNo?: string;
  hallId?: string;
  hallName?: string;
  roomCapacity?: number;
  seatingPlan?: string;
  teacherId?: string;
  teacherName?: string;
  examinerId?: string;
  examinerName?: string;
  evaluatorId?: string;
  evaluatorName?: string;
  invigilatorId?: string;
  invigilatorName?: string;
  fullMarks?: number;
  passMarks?: number;
  sequence?: number;
  notes?: string;
  status?: string;
  breakdownEnabled?: boolean;
  components?: RoutineAssessmentComponent[];
  previousExamsEnabled?: boolean;
  previousExams?: RoutinePreviousExamMark[];
  previousExamsMarks?: RoutinePreviousExamMark[];
  [key: string]: any;
}

export interface RoutineConflictDetail {
  type: 'CLASS_DOUBLE_BOOKING' | 'EXAMINER_CLASH' | 'INVIGILATOR_CLASH' | 'ROOM_CLASH' | string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  clashingItemIds: string[];
}

export interface RoutineConflictResult {
  conflictMap: Map<string, RoutineConflictDetail[]>;
  totalConflictsCount: number;
  hasAnyConflict: boolean;
  conflictsList: Array<{ itemId: string; conflicts: RoutineConflictDetail[] }>;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  code?: string;
  departmentId?: string;
  shiftObj?: any;
  bookObj?: any;
  exam?: any;
  [key: string]: any;
}

export interface ActionMenuItem {
  id?: string;
  label?: string;
  icon?: any;
  onClick?: (item?: any) => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  divider?: boolean;
  hidden?: boolean;
  badge?: string | number;
  [key: string]: any;
}

export interface SubjectRoutineMatrixViewProps {
  initialExamId?: string | null;
  initialViewMode?: 'table' | 'studio' | 'matrix' | string;
  onNavigateToExamSessions?: (() => void) | null;
  onPrint?: (() => void) | null;
  isPrintOpen?: boolean;
  onClosePrint?: () => void;
  actionMenuItems?: ActionMenuItem[];
}

export interface SubjectRoutineStudioViewProps {
  matrixState?: any;
  initialExamId?: string | null;
  onToggleViewMode?: (() => void) | null;
  onNavigateToExamSessions?: (() => void) | null;
  onPrint?: (() => void) | null;
  actionMenuItems?: ActionMenuItem[];
}

export interface SubjectRoutineDrawerFormProps {
  mode?: 'add' | 'edit';
  initialData?: Partial<SubjectRoutineItem> | null;
  activeExam?: any;
  allAvailableClasses?: any[];
  availableCurriculumBooks?: any[];
  examShifts?: any[];
  designatedExamDays?: string[];
  onSave?: (savedItem: SubjectRoutineItem) => void;
  onCancel?: () => void;
}

export interface SubjectMatrixHeaderProps {
  examOptions?: SelectOption[];
  selectedExamId?: string;
  setSelectedExamId?: (examId: string) => void;
  activeExam?: any;
  viewMode?: 'table' | 'studio' | string;
  onToggleViewMode?: () => void;
  onAutoPopulate?: () => void;
  autoPopulateLabel?: string;
  autoPopulateTitle?: string;
  onClearRoutine?: () => void;
  onAddRow?: () => void;
  onPrint?: () => void;
  actionMenuItems?: ActionMenuItem[];
  rightActions?: React.ReactNode;
  showSearch?: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  searchPlaceholder?: string;
  showDepartmentFilter?: boolean;
  filterDepartmentId?: string;
  setFilterDepartmentId?: (deptId: string) => void;
  showClassFilter?: boolean;
  filterClassId?: string;
  setFilterClassId?: (classId: string) => void;
  showExamDateFilter?: boolean;
  filterExamDate?: string;
  setFilterExamDate?: (date: string) => void;
  showTeacherFilter?: boolean;
  teacherLabel?: string;
  filterTeacherId?: string;
  setFilterTeacherId?: (teacherId: string) => void;
  dateFilterOptions?: SelectOption[];
  allAvailableClasses?: any[];
  totalCount?: number;
  totalRowsCount?: number;
  filteredCount?: number;
  itemLabel?: string;
  selectedCount?: number;
  onBulkDelete?: () => void;
  filterGridClassName?: string;
  inlineSessionSelector?: boolean;
  activeLens?: string;
  setActiveLens?: (lens: string) => void;
  density?: 'compact' | 'normal' | 'comfortable' | string;
  setDensity?: (density: any) => void;
}

export interface SubjectMatrixTableProps {
  activeExam?: any;
  filteredRows?: SubjectRoutineItem[];
  showActions?: boolean;
  onEditRow?: (item: SubjectRoutineItem) => void;
  onOpenComponentModal?: (item: SubjectRoutineItem) => void;
  onDuplicateRow?: (item: SubjectRoutineItem) => void;
  onDeleteRow?: (rowId: string) => void;
}

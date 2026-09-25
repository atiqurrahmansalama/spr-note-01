import React from 'react';
import type { LocalizedFieldInput, LocalizedValue } from '@/i18n/localizedEntity';

export interface ExamShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export type ExamScheduleDayType =
  | 'EXAM_DAY'
  | 'PREPARATION_GAP'
  | 'EXAM_BREAK'
  | 'DUAL_EXAM'
  | 'MULTI_EXAM';

export interface ExamScheduleDay {
  date: string;
  type: ExamScheduleDayType;
  shiftCount?: number;
  shifts?: ExamShift[];
}

export interface DepartmentSchedule {
  departmentId: string;
  departmentName: string;
  departmentCode?: string;
  startDate: string;
  endDate: string;
  prepStartDate?: string;
  prepEndDate?: string;
}

export interface ExamAssessmentComponent {
  id: string;
  name: string;
  maxMarks: number;
}

export interface CaWeightageConfig {
  enabled: boolean;
  dailyEnabled: boolean;
  attendanceEnabled: boolean;
  examWeightageEnabled: boolean;
  dailyClassroomPct: number;
  attendancePct: number;
  examPct: number;
}

export interface PreviousExamItem {
  id: string;
  examId: string;
  weightagePct: number;
}

export interface PreviousExamsConfig {
  enabled: boolean;
  exams: PreviousExamItem[];
}

export type RankingScope = 'CLASS_AND_SECTION' | 'CLASS_ONLY';
export type FailSubjectRule = 'EXCLUDE_FROM_MERIT' | 'NORMAL';

export interface RankingConfig {
  scope: RankingScope;
  failSubjectRule: FailSubjectRule;
}

export type ExamStatus =
  | 'DRAFT'
  | 'MARK_ENTRY'
  | 'FIRST_PUBLISHED'
  | 'UNDER_REVIEW'
  | 'FINAL_PUBLISHED'
  | 'LOCKED'
  | string;

export interface Exam {
  id: string;
  name: string | LocalizedValue;
  code?: string;
  academicYearId: string;
  academicYearName?: string;
  semesterId: string;
  semesterName?: string;
  departmentId?: string | string[];
  departmentIds?: string[];
  departmentName?: string;
  gradingSystemId?: string;
  targetClassIds?: string[];
  startDate: string;
  endDate: string;
  prepStartDate?: string | null;
  prepEndDate?: string | null;
  isMultiDepartmentSchedule?: boolean;
  departmentSchedules?: DepartmentSchedule[];
  scheduleDays?: ExamScheduleDay[];
  shifts?: ExamShift[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  hasSecondShift?: boolean;
  secondStartTime?: string;
  secondEndTime?: string;
  breakdownEnabled?: boolean;
  defaultFullMarks?: number;
  targetFullMarks?: number;
  defaultBreakdown?: {
    written?: number;
    oral?: number;
  };
  defaultComponents?: ExamAssessmentComponent[];
  caWeightage?: CaWeightageConfig;
  previousExamsConfig?: PreviousExamsConfig;
  previousExamsEnabled?: boolean;
  previousExams?: PreviousExamItem[];
  rankingConfig?: RankingConfig;
  description?: string;
  status?: ExamStatus;
  updatedAt?: string;
  createdAt?: string;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  code?: string;
  departmentId?: string;
  term?: any;
  exam?: Exam;
  [key: string]: any;
}

export interface ExamDetailsViewProps {
  isEmbedded?: boolean;
  hideHeader?: boolean;
  onNavigateToMatrix?: (examId: string) => void;
  onNavigateToMarkEntry?: (examId: string) => void;
  onNavigateToTabulation?: (examId: string) => void;
}

export interface ExamFormDrawerProps {
  exam?: Exam | null;
  tenantId?: string;
  academicYears?: any[];
  academicYearOptions?: SelectOption[];
  departmentOptions?: SelectOption[];
  gradingSystemOptions?: SelectOption[];
  classOptions?: SelectOption[];
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export interface ExamGeneralScheduleSectionProps {
  name: LocalizedFieldInput;
  onNameChange: (val: any) => void;
  academicYearOptions: SelectOption[];
  academicYearId: string;
  onAcademicYearChange: (val: string) => void;
  semesterOptions: SelectOption[];
  semesterId: string;
  onSemesterChange: (val: string) => void;
  gradingSystemOptions: SelectOption[];
  gradingSystemId: string;
  onGradingSystemChange: (val: string) => void;
  startDate: string;
  endDate: string;
  onExamDateRangeSelect: (start: string, end: string) => void;
  prepStartDate: string;
  prepEndDate: string;
  onPrepDateRangeSelect: (start: string, end: string) => void;
  shifts: ExamShift[];
  onAddShift: () => void;
  onRemoveShift: (idx: number) => void;
  onShiftChange: (idx: number, field: keyof ExamShift, val: string) => void;
  scheduleDays: ExamScheduleDay[];
  onScheduleDaysChange: (days: ExamScheduleDay[]) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
}

export interface ExamClassesSectionProps {
  departmentOptions?: SelectOption[];
  departmentId?: string | string[];
  onDepartmentChange: (val: string | string[]) => void;
  visibleClasses?: SelectOption[];
  targetClassIds?: string[];
  onClassToggle: (classId: string | number) => void;
  onSelectAllClasses: () => void;
  isMultiDepartmentSchedule?: boolean;
  onMultiDepartmentScheduleToggle: (val: boolean) => void;
  departmentSchedules?: DepartmentSchedule[];
  onDepartmentScheduleChange: (
    deptId: string,
    fieldOrObject: Partial<DepartmentSchedule> | string,
    value?: any
  ) => void;
  globalStartDate?: string;
  globalEndDate?: string;
  globalPrepStartDate?: string;
  globalPrepEndDate?: string;
}

export interface ExamEvaluationSectionProps {
  breakdownEnabled?: boolean;
  onBreakdownEnabledChange: (val: boolean) => void;
  targetFullMarks?: number | string;
  onTargetFullMarksChange: (val: string | number) => void;
  components?: ExamAssessmentComponent[];
  onAddComponent: () => void;
  onRemoveComponent: (index: number) => void;
  onUpdateComponent: (index: number, field: keyof ExamAssessmentComponent, val: any) => void;

  caEnabled?: boolean;
  onCaEnabledChange: (val: boolean) => void;
  dailyEnabled?: boolean;
  onDailyEnabledChange: (val: boolean) => void;
  attendanceEnabled?: boolean;
  onAttendanceEnabledChange: (val: boolean) => void;
  examWeightageEnabled?: boolean;
  onExamWeightageEnabledChange: (val: boolean) => void;
  dailyClassroomPct?: number;
  attendancePct?: number;
  examPct?: number;
  onCaChange: (field: 'daily' | 'attendance' | 'exam', val: string | number) => void;
  onAutoBalanceCa?: () => void;

  previousExamsEnabled?: boolean;
  onPreviousExamsEnabledChange: (val: boolean) => void;
  previousExams?: PreviousExamItem[];
  onAddPreviousExam: () => void;
  onRemovePreviousExam: (index: number) => void;
  onUpdatePreviousExam: (index: number, field: keyof PreviousExamItem, val: any) => void;
  otherExamsOptions?: SelectOption[];

  rankingScope?: RankingScope;
  onRankingScopeChange: (val: RankingScope) => void;
  failSubjectRule?: FailSubjectRule;
  onFailSubjectRuleChange: (val: FailSubjectRule) => void;
}

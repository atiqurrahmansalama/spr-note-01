/**
 * SPR Note — Academic Domain Models & Type Contracts
 * ====================================================
 * Strongly-typed domain interfaces for Students, Academic Sessions,
 * Subjects, Curricula, Period Routines, Academic Years, and Transfer Reasons.
 * Complies with Rule 6 (Mandatory TypeScript) & Rule 8 (Modular Decomposition).
 */

export interface StudentItem {
  id?: string | number | null;
  uniq_id?: string | number | null;
  label: string;
  name?: string;
  name_en?: string;
  sub?: string;
  group?: string;
  group_name?: string;
  section_name?: string;
  student_section_name?: string;
  _local?: boolean;
  [key: string]: any;
}

export interface AcademicSessionItem {
  id: string | number;
  name: string;
  _local?: boolean;
  [key: string]: any;
}

export interface SavedCommentItem {
  id: string;
  text: string;
  _local?: boolean;
  [key: string]: any;
}

export interface AcademicSubjectCategory {
  value: string;
  label: string;
}

export interface AcademicSubject {
  id: string;
  name: string;
  name_bn?: string;
  code: string;
  type: string;
  order: number;
  is_active: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  termSystem: 'SEMESTER' | 'TRIMESTER' | 'ANNUAL' | string;
  isCurrent: boolean;
  branch_id?: string;
  branch_name?: string;
  terms: AcademicTerm[];
  createdAt?: string;
  [key: string]: any;
}

export interface BranchCategory {
  id: string;
  code: string;
  name: string;
  name_bn?: string;
  order: number;
  description?: string;
  is_active: boolean;
  [key: string]: any;
}

export interface CurriculumItem {
  id: string;
  name: string;
  subject: string;
  className: string;
  classId: string;
  periodSlotId?: string;
  period_order?: number;
  periodName?: string;
  semester?: string;
  teacherName?: string;
  teacherId?: string;
  startPage?: number;
  endPage?: number;
  totalPages?: number;
  currentPage?: number;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | string;
  notes?: string;
  [key: string]: any;
}

export interface PeriodCategory {
  id: string;
  code: string;
  name: string;
  badge: string;
  description: string;
  affects_class_attendance: boolean;
  is_active: boolean;
  order: number;
  [key: string]: any;
}

export interface PeriodSequence {
  id: string;
  name: string;
  code: string;
  badge: string;
  order: number;
  description: string;
  is_active: boolean;
  [key: string]: any;
}

export interface TransferReasonTypeOption {
  value: string;
  label: string;
  badgeColor: string;
}

export interface TransferReason {
  id: string;
  name: string;
  name_bn?: string;
  code: string;
  order: number;
  type: string;
  description: string;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface TransferReasonDropdownOption {
  value: string;
  label: string;
  code: string;
  type: string;
  description: string;
  raw: TransferReason;
}

/**
 * SPR Note — Academic Years Type Definitions
 * ============================================
 * Enterprise strict TypeScript contracts for Academic Sessions,
 * Semesters / Terms, Date Guards, and Lifecycle Statuses.
 */

export type TermSystemType = 'SEMESTER' | 'TRIMESTER' | 'QUARTER' | 'ANNUAL' | 'CUSTOM';

export type AcademicYearStatus = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'PAST';

export interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  status?: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  termSystem: TermSystemType;
  terms: AcademicTerm[];
  isCurrent?: boolean;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicYearFormData {
  id?: string;
  name?: string;
  startDate: string;
  endDate: string;
  termSystem: TermSystemType;
  terms: AcademicTerm[];
}

export type CollisionType =
  | 'EXACT_MATCH'
  | 'ENCLOSED'
  | 'SUB_RANGE'
  | 'START_COLLISION'
  | 'END_COLLISION'
  | 'SAME_DAY_TOUCH';

export interface DateConflict {
  conflictingYear: AcademicYear;
  collisionType: CollisionType;
  overlapDays: number;
  overlapStart: string;
  overlapEnd: string;
  message: string;
}

export interface TermConflict {
  termIndex: number;
  termName: string;
  conflictType: 'OUT_OF_BOUNDS' | 'INVERTED_DATES' | 'TERM_OVERLAP';
  message: string;
  conflictingWithTermIndex?: number;
  conflictingWithTermName?: string;
}

export interface AvailableDateSlot {
  startDate: string;
  endDate: string;
  suggestedName: string;
}

export interface AcademicYearMetrics {
  total_years: number;
  active_year_name: string;
  total_terms: number;
  avg_terms_per_year: number | string;
}

export interface AcademicYearDrawerFormProps {
  year?: AcademicYear | null;
  onSave?: (savedYear: AcademicYearFormData & { name: string }) => void;
  onCancel?: () => void;
}

export interface AcademicSessionSwitcherDrawerProps {
  onSaved?: () => void;
  onCancel?: () => void;
}

export interface AcademicYearsManagementViewProps {
  isEmbedded?: boolean;
  hideHeader?: boolean;
  hideMetrics?: boolean;
}

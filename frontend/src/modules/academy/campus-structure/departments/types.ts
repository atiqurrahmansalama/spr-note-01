/**
 * Enterprise Academic Department Types & Contracts
 */

export interface AcademicDepartment {
  id: string;
  institution?: string | null;
  branch?: string | null;
  name: string;
  code?: string;
  department_head?: string | number | null;
  department_head_name?: string;
  dean_name?: string;
  has_quran_tracker: boolean;
  order_rank: number;
  is_active?: boolean;
  description?: string;
  class_count?: number;
  classes_count?: number;
  sections_count?: number;
  student_count?: number;
  students_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentFormData {
  institution: string;
  branch: string;
  name: string;
  code: string;
  department_head: string | number;
  has_quran_tracker: boolean;
  order_rank: number;
  is_active: boolean;
}

export interface DepartmentFormProps {
  department?: AcademicDepartment | null;
  editingDepartment?: AcademicDepartment | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export interface DepartmentManagementViewProps {
  hideHeader?: boolean;
  hideMetrics?: boolean;
  isEmbedded?: boolean;
}

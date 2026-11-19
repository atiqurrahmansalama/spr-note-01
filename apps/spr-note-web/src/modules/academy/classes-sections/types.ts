/**
 * SPR Note — Classes & Sections Type Definitions
 * Enterprise-grade strict TypeScript contracts for Academic Classes, Sections, Groups, and Metrics.
 */

export interface AcademicClass {
  id: number | string;
  name: string;
  code?: string;
  department?: number | string | null;
  department_name?: string;
  has_sections?: boolean;
  has_groups?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  order_rank?: number;
  class_teacher?: number | string | null;
  class_teacher_name?: string;
  total_students?: number;
  sections_count?: number;
  groups_count?: number;
  created_at?: string;
  updated_at?: string;
  institution?: number | string | null;
}

export interface AcademicSection {
  id: number | string;
  student_class: number | string;
  class_name?: string;
  section_name?: string;
  name?: string;
  room_number?: string;
  max_capacity?: number;
  department?: number | string | null;
  department_name?: string;
  class_teacher?: number | string | null;
  teacher_name?: string;
  branch?: number | string | null;
  branch_name?: string;
  has_groups?: boolean;
  group_count?: number;
  total_students?: number;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  institution?: number | string | null;
}

export interface AcademicGroup {
  id: number | string;
  name: string;
  student_class: number | string;
  class_name?: string;
  section?: number | string | null;
  section_name?: string;
  department?: number | string | null;
  department_name?: string;
  mentor_teacher?: number | string | null;
  mentor_teacher_name?: string;
  order_rank?: number;
  total_students?: number;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  institution?: number | string | null;
}

export interface AcademicDepartment {
  id: number | string;
  name: string;
  code?: string;
}

export interface AcademicBranch {
  id: number | string;
  name: string;
  code?: string;
}

export interface TeacherUser {
  id: number | string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface ClassMetrics {
  total_classes: number;
  total_enrolled_students: number;
  avg_students_per_class: number;
  total_departments: number;
}

export interface SectionMetrics {
  total_sections: number;
  total_capacity: number;
  total_enrolled: number;
  occupancy_rate: number;
}

export interface GroupMetrics {
  total_groups: number;
  total_assigned_students: number;
  total_classes: number;
  active_mentors: number;
}

export interface ClassFormData {
  department: string;
  name: string;
  code: string;
  order_rank: number;
  has_sections: boolean;
  has_groups: boolean;
  is_active: boolean;
}

export interface SectionFormData {
  student_class: string;
  section_name: string;
  room_number: string;
  max_capacity: number;
  class_teacher: string;
  has_groups: boolean;
}

export interface GroupFormData {
  name: string;
  student_class: string;
  section: string;
  mentor_teacher: string;
  order_rank: number;
  is_active: boolean;
}

export interface ClassManagementViewProps {
  hideHeader?: boolean;
  hideMetrics?: boolean;
  isEmbedded?: boolean;
  isSuperAdmin?: boolean;
  showSectionsTab?: boolean;
  showGroupsTab?: boolean;
}

export interface SectionManagementViewProps {
  hideHeader?: boolean;
  hideMetrics?: boolean;
  isEmbedded?: boolean;
}

export interface GroupManagementViewProps {
  hideHeader?: boolean;
  hideMetrics?: boolean;
  isEmbedded?: boolean;
}

export interface ClassFormProps {
  editingClass?: AcademicClass | null;
  departments?: AcademicDepartment[];
  defaultDepartmentId?: number | string | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export interface SectionFormProps {
  section?: AcademicSection | null;
  classes?: AcademicClass[];
  teachers?: TeacherUser[];
  defaultClassId?: number | string | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export interface GroupFormProps {
  editingGroup?: AcademicGroup | null;
  classes?: AcademicClass[];
  teachers?: TeacherUser[];
  defaultClassId?: string;
  defaultSectionId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

export interface ClassMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletingClass: AcademicClass | null;
  availableClasses?: AcademicClass[];
  onSuccess?: () => void;
}

export interface SectionMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletingSection: AcademicSection | null;
  availableSections?: AcademicSection[];
  onSuccess?: () => void;
}

export interface GroupMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletingGroup: AcademicGroup | null;
  availableGroups?: AcademicGroup[];
  onSuccess?: () => void;
}


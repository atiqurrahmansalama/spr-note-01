export interface StudentDirectoryViewProps {
  viewMode?: "all" | "students";
}

export interface StudentRecord {
  id: string | number;
  name_en?: string;
  name?: string;
  bangla_name?: string;
  roll_number?: string | number;
  roll?: string | number;
  student_class?: string | number | { id: string | number; name: string; [key: string]: any };
  student_class_id?: string | number;
  student_class_name?: string;
  class_name?: string;
  section?: string | number | { id: string | number; section_name?: string; name?: string; [key: string]: any };
  section_id?: string | number;
  section_name?: string;
  student_section?: string | number;
  student_section_name?: string;
  student_group?: string | number | { id: string | number; name: string; [key: string]: any };
  student_group_id?: string | number;
  student_group_name?: string;
  group_name?: string;
  group?: string;
  sub?: string;
  status?: string;
  father_name?: string;
  guardian_name?: string;
  details?: {
    guardian_phone?: string;
    father_name?: string;
    guardian_name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface StudentMetrics {
  total_students: number;
  active_students: number;
  new_admissions_this_month: number;
  avg_juz_completed: number;
}

export type BulkActionType = "change_status" | "bulk_delete";

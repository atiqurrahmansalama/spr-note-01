/**
 * Teacher, Instructor & Staff Domain Type Definitions
 */

export type StaffType = 'TEACHING' | 'ADMIN' | 'SUPPORT' | 'FINANCE' | 'MANAGEMENT';

export type EmploymentStatus =
  | 'PERMANENT'
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'PROBATION'
  | 'CONTRACT'
  | 'VISITING'
  | 'TEMPORARY'
  | 'VOLUNTEER'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'RETIRED'
  | 'TERMINATED';

export type SalaryType =
  | 'MONTHLY'
  | 'MONTHLY_FIXED'
  | 'HOURLY'
  | 'FIXED'
  | 'COMMISSION'
  | 'PER_PERIOD'
  | 'VOLUNTEER';

export type StaffAttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
export type LeaveType = 'CASUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TeacherDetail {
  highest_degree?: string;
  specialization?: string;
  max_daily_periods?: number;
  can_review_reports?: boolean;
}

export interface GeneralDetail {
  assigned_zone?: string;
  shift_type?: 'MORNING' | 'EVENING' | 'NIGHT' | 'ROTATING';
  reporting_to?: string | number | null;
  duty_scope?: string;
}

export interface StaffMember {
  id: string;
  user?: number | string | null;
  user_name?: string;
  name_en?: string;
  bangla_name?: string;
  phone_number?: string;
  email?: string;
  avatar?: string;
  institution?: number | string;
  employee_id: string;
  staff_type: StaffType;
  designation: string;
  rank_order: number;
  department?: number | string | null;
  department_name?: string;
  department_code?: string;
  employment_status: EmploymentStatus;
  joining_date: string;
  emergency_contact?: string;
  nid_no?: string;
  blood_group?: string;
  address?: string;
  division?: string;
  district?: string;
  upazila_thana?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  map_place_id?: string;
  salary_type?: SalaryType;
  base_salary?: number;
  bank_name?: string;
  bank_account_no?: string;
  mobile_banking_no?: string;
  is_active: boolean;
  is_deleted?: boolean;
  teacher_detail?: TeacherDetail;
  general_detail?: GeneralDetail;
  assignments_count?: number;
  duties_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StaffFormValues {
  user_id: string;
  name: string;
  name_en: string;
  bangla_name: string;
  phone_number: string;
  email: string;
  employee_id: string;
  is_active: boolean;
  staff_type: StaffType;
  designation: string;
  rank_order: number;
  department: string | number;
  employment_status: EmploymentStatus;
  joining_date: string;
  emergency_contact: string;
  nid_no: string;
  blood_group: string;
  address: string;
  division: string;
  district: string;
  upazila_thana: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  map_place_id: string;
  teacher_detail: {
    highest_degree: string;
    specialization: string;
    max_daily_periods: number;
    can_review_reports: boolean;
  };
  general_detail: {
    assigned_zone: string;
    shift_type: string;
    reporting_to: string | number | null;
    duty_scope: string;
  };
  salary_type: SalaryType;
  base_salary: number;
  bank_name: string;
  bank_account_no: string;
  mobile_banking_no: string;
}

export interface StaffAttendanceRecord {
  id: string;
  staff: string;
  staff_name?: string;
  staff_employee_id?: string;
  staff_designation?: string;
  staff_type?: string;
  date: string;
  in_time?: string | null;
  out_time?: string | null;
  status: StaffAttendanceStatus | string;
  device_ip?: string;
  source?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StaffLeaveRequest {
  id: string;
  staff: string;
  staff_name?: string;
  staff_phone?: string;
  staff_employee_id?: string;
  staff_designation?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  duration_days?: number;
  reason: string;
  status: LeaveStatus;
  applied_at?: string;
  approved_by?: number | string | null;
  approved_by_name?: string;
  admin_remarks?: string;
  action_date?: string | null;
  substitute_teacher?: string | null;
  created_at?: string;
}

export interface StaffMetrics {
  total_staff: number;
  teaching_staff: number;
  general_staff?: number;
  support_staff?: number;
  active_staff: number;
  permanent_staff?: number;
  on_leave_today: number;
}

export interface StaffRankItem {
  name: string;
  name_bn?: string;
  order: number;
  type?: StaffType;
}

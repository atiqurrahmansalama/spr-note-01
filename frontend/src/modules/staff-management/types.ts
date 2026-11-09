/**
 * SPR Note — Staff Management Module Domain Types
 */

import type {
  StaffMember,
  StaffMetrics,
  StaffRankItem,
  StaffType,
  EmploymentStatus,
  SalaryType,
} from '../../types/staff';

export type {
  StaffMember,
  StaffMetrics,
  StaffRankItem,
  StaffType,
  EmploymentStatus,
  SalaryType,
};

export interface DepartmentItem {
  id: string | number;
  name: string;
  code?: string;
}

export type StaffDisplayMode = 'table' | 'grid';

export interface StaffFilterState {
  searchQuery: string;
  roleFilter: string;
  rankFilter: string;
  deptFilter: string;
  statusFilter: string;
}

export interface StaffOnboardingPayload {
  token?: string;
  user_id?: string | number;
  name: string;
  name_en?: string;
  bangla_name?: string;
  email?: string;
  phone_number: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob?: string;
  nid_no?: string;
  blood_group?: string;
  emergency_contact?: string;
  photo_url?: string;

  // Role & Department
  staff_type: StaffType;
  designation: string;
  rank_order: number;
  department?: string | number;
  employment_status: EmploymentStatus;
  joining_date: string;

  // Qualifications
  highest_degree?: string;
  specialization?: string;
  experience_details?: string;
  max_daily_periods?: number;
  cv_url?: string;
  cv_name?: string;
  cv_size?: string;
  documents?: Array<{
    title: string;
    url: string;
    file_name?: string;
  }>;

  // Address
  address?: string;
  division?: string;
  district?: string;
  upazila_thana?: string;
  postal_code?: string;
  permanent_address?: string;
  permanent_division?: string;
  permanent_district?: string;
  permanent_upazila_thana?: string;

  // Payroll
  salary_type?: SalaryType;
  base_salary?: number;
  medical_allowance?: number;
  house_rent?: number;
  bank_name?: string;
  bank_account_no?: string;
  mobile_banking_no?: string;
  shift_type?: 'MORNING' | 'EVENING' | 'NIGHT' | 'ROTATING';
}

export interface TeacherAssignmentItem {
  id: string | number;
  class_name?: string;
  assigned_class?: string | number;
  assigned_class_name?: string;
  role_in_class?: string;
  assigned_group?: string | number;
  group_name?: string;
  session?: string | number;
  session_name?: string;
}

export interface GeneralDutyItem {
  id: string | number;
  duty_title: string;
  duty_description?: string;
  priority?: string;
  effective_from?: string;
  effective_to?: string;
  is_active?: boolean;
}


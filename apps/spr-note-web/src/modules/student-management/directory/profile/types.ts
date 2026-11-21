export interface StudentVaultDocument {
  id: string | number;
  title: string;
  file: string;
  doc_type?: string;
  uploaded_at?: string;
  file_size?: number | string;
  created_at?: string;
  [key: string]: any;
}

export interface StudentTimelineRecord {
  id: string | number;
  title?: string;
  action?: string;
  description?: string;
  created_at?: string;
  timestamp?: string;
  date?: string;
  performed_by_name?: string;
  department_name?: string;
  class_name?: string;
  section_name?: string;
  group_name?: string;
  [key: string]: any;
}

export interface StudentGuardianDetail {
  primary_guardian_name?: string;
  primary_guardian_phone?: string;
  father_name?: string;
  father_phone?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_occupation?: string;
  guardian_relation?: string;
  guardian_nid?: string;
  emergency_contact_phone?: string;
  [key: string]: any;
}

export interface StudentAcademicDetail {
  previous_school_name?: string;
  previous_school_address?: string;
  previous_class?: string;
  previous_grade?: string;
  previous_result?: string;
  previous_average?: string;
  previous_passing_year?: string;
  tc_number?: string;
  previous_study_details?: string;
  session_year?: string;
  admission_date?: string;
  [key: string]: any;
}

export interface StudentAddressDetail {
  street_address?: string;
  thana_or_upazila?: string;
  district?: string;
  division?: string;
  post_office?: string;
  post_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  [key: string]: any;
}

export interface StudentFullProfile {
  id: string | number;
  uniq_id?: string;
  name_en?: string;
  name?: string;
  bangla_name?: string;
  roll_number?: string | number;
  student_class_name?: string;
  education_status?: string;
  group_name?: string;
  student_group_name?: string;
  department_name?: string;
  department_type?: string;
  status?: string;
  photo?: string;
  avatar?: string;
  dob?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  birth_certificate_no?: string;
  nid_no?: string;
  target_status?: string;
  branch?: string;
  branch_name?: string;
  session_year?: string;
  admission_date?: string;
  latitude?: string | number;
  longitude?: string | number;
  address?: string;
  thana?: string;
  upazila?: string;
  district?: string;
  division?: string;
  present_address?: string | StudentAddressDetail;
  permanent_address?: string | StudentAddressDetail;
  details?: {
    name_bn?: string;
    father_name?: string;
    mother_name?: string;
    father_phone?: string;
    guardian_name?: string;
    guardian_phone?: string;
    guardian_relation?: string;
    emergency_phone?: string;
    emergency_contact_phone?: string;
    date_of_birth?: string;
    dob?: string;
    blood_group?: string;
    admission_date?: string;
    initial_completed_juz?: number;
    current_juz?: number;
    present_address?: string | StudentAddressDetail;
    permanent_address?: string | StudentAddressDetail;
    [key: string]: any;
  };
  guardian_detail?: StudentGuardianDetail;
  academic_detail?: StudentAcademicDetail;
  documents?: StudentVaultDocument[];
  timeline?: StudentTimelineRecord[];
  academic_history?: StudentTimelineRecord[];
  [key: string]: any;
}

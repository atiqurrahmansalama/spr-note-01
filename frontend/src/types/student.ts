/**
 * Student & Guardian Domain Type Definitions
 */

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type AdmissionStatus = 'APPLIED' | 'UNDER_REVIEW' | 'ADMITTED' | 'REJECTED' | 'WAITLISTED';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED' | 'SUSPENDED';

export interface Guardian {
  id?: string;
  name: string;
  relation: 'FATHER' | 'MOTHER' | 'BROTHER' | 'UNCLE' | 'LEGAL_GUARDIAN' | 'OTHER';
  phone: string;
  secondaryPhone?: string;
  email?: string;
  occupation?: string;
  nationalId?: string;
  address?: string;
}

export interface StudentDocument {
  id?: string;
  title: string;
  documentType: 'BIRTH_CERTIFICATE' | 'NID' | 'PREVIOUS_MARKSHEET' | 'TRANSFER_CERTIFICATE' | 'MEDICAL_REPORT' | 'OTHER';
  fileUrl: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface Student {
  id: string;
  studentUniqId: string;
  fullName: string;
  rollNumber?: string | number;
  gender: Gender;
  dateOfBirth?: string;
  bloodGroup?: BloodGroup;
  photoUrl?: string;
  institutionId: string;
  branchId?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  departmentId?: string;
  departmentName?: string;
  groupId?: string;
  groupName?: string;
  academicSessionId?: string;
  guardian?: Guardian;
  residentialStatus?: 'RESIDENTIAL' | 'NON_RESIDENTIAL' | 'DAY_CARE';
  status: StudentStatus;
  admissionDate?: string;
  documents?: StudentDocument[];
  emergencyContact?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFilterParams {
  institutionId?: string;
  branchId?: string;
  departmentId?: string;
  classId?: string;
  sectionId?: string;
  groupId?: string;
  status?: StudentStatus;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

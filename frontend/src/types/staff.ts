/**
 * Teacher, Instructor & Staff Domain Type Definitions
 */

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTUAL' | 'VISITING' | 'HONORARY';
export type StaffRoleCategory = 'TEACHING' | 'ADMINISTRATION' | 'ACCOUNTS' | 'SUPPORT' | 'MANAGEMENT';

export interface TeacherDutyPeriod {
  id?: string;
  dayOfWeek: 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
  periodSlotId: string;
  periodName: string;
  startTime: string;
  endTime: string;
  classId: string;
  className: string;
  sectionId?: string;
  subjectId?: string;
  subjectName?: string;
}

export interface StaffProfile {
  id: string;
  staffUniqId: string;
  userId?: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email?: string;
  photoUrl?: string;
  designation: string;
  category: StaffRoleCategory;
  employmentType: EmploymentType;
  institutionId: string;
  branchId?: string;
  departmentId?: string;
  departmentName?: string;
  assignedClassIds?: string[];
  assignedSectionIds?: string[];
  assignedSubjectIds?: string[];
  periodsPerWeek?: number;
  scheduleDuties?: TeacherDutyPeriod[];
  joiningDate?: string;
  salaryStructure?: {
    basic?: number;
    allowance?: number;
    currency?: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

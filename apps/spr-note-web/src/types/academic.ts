/**
 * Academic Hierarchy Domain Type Definitions
 * Session, Departments, Classes, Sections, Groups, Curriculum & Routine
 */

export interface AcademicYear {
  id: string;
  name: string;
  code?: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  institutionId: string;
  terms?: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicDepartment {
  id: string;
  name: string;
  code?: string;
  description?: string;
  headTeacherId?: string;
  headTeacherName?: string;
  institutionId: string;
  branchId?: string;
  sortOrder?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  code?: string;
  departmentId?: string;
  departmentName?: string;
  institutionId: string;
  branchId?: string;
  capacity?: number;
  classTeacherId?: string;
  classTeacherName?: string;
  sortOrder?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicSection {
  id: string;
  name: string;
  code?: string;
  classId: string;
  className?: string;
  institutionId: string;
  branchId?: string;
  capacity?: number;
  roomNumber?: string;
  sectionTeacherId?: string;
  sectionTeacherName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicGroup {
  id: string;
  name: string;
  code?: string;
  classId?: string;
  sectionId?: string;
  institutionId: string;
  branchId?: string;
  mentorId?: string;
  mentorName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurriculumBook {
  id: string;
  name: string;
  author?: string;
  publisher?: string;
  departmentId?: string;
  classId?: string;
  subjectCode?: string;
  totalChapters?: number;
  totalPages?: number;
  institutionId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PeriodSlot {
  id: string;
  name: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  institutionId: string;
  branchId?: string;
}

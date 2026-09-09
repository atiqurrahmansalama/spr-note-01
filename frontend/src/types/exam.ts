/**
 * Examination, Grading & Mark Sheet Domain Type Definitions
 */

export interface GradingRule {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  description?: string;
  isPassingGrade?: boolean;
}

export interface GradingSystem {
  id: string;
  name: string;
  description?: string;
  rules: GradingRule[];
  institutionId?: string;
  isDefault?: boolean;
}

export interface ExamSubject {
  id: string;
  examId: string;
  subjectName: string;
  subjectCode?: string;
  curriculumBookName?: string;
  classId: string;
  className?: string;
  sectionId?: string;
  departmentId?: string;
  fullMarks: number;
  passMarks: number;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
  supervisorTeacherId?: string;
}

export interface ExamSchedule {
  id: string;
  name: string;
  academicYearId: string;
  academicYearName?: string;
  termName?: string;
  startDate: string;
  endDate: string;
  targetClassIds: string[];
  gradingSystemId?: string;
  institutionId: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED';
  subjects?: ExamSubject[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentSubjectMark {
  subjectId: string;
  subjectName: string;
  obtained: number | string | null;
  fullMarks: number;
  passMarks: number;
  isAbsent: boolean;
  hasEntry: boolean;
  grade?: string;
  gpa?: number;
}

export interface MarkSheetStudentRow {
  studentId: string;
  studentUniqId?: string;
  studentName: string;
  rollNumber?: string | number;
  className?: string;
  sectionName?: string;
  subjectMarks: StudentSubjectMark[];
  totalObtained?: number;
  overallPercentage?: number;
  overallGpa?: number;
  grade?: string;
  classRank?: number | string;
  hasAnyMarks?: boolean;
}

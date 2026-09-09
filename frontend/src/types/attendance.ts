/**
 * Attendance & Leave Management Domain Type Definitions
 */

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED' | 'LEAVE' | 'HOLIDAY';
export type AttendanceScope = 'CLASSROOM' | 'RESIDENTIAL' | 'STAFF' | 'PERIOD';

export interface DailyAttendanceRecord {
  id?: string;
  studentId?: string;
  staffId?: string;
  date: string;
  status: AttendanceStatus;
  scope: AttendanceScope;
  classId?: string;
  sectionId?: string;
  periodSlotId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  markedById?: string;
  institutionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyAttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  percentage: number;
}

export interface LeaveRequest {
  id: string;
  applicantType: 'STUDENT' | 'STAFF';
  applicantId: string;
  applicantName?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedById?: string;
  institutionId: string;
  createdAt?: string;
}

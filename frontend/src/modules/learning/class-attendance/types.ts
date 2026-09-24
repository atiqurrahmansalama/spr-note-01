import type { ReactNode } from 'react';

export interface ClassAttendanceViewProps {
  classId?: string | number;
  groupId?: string | number;
  hideHeader?: boolean;
  onStudentClick?: (student: any) => void;
  [key: string]: any;
}

export interface DayPeriodItem {
  date: string;
  day: number;
  weekday: string;
  is_holiday?: boolean;
  is_disabled?: boolean;
  holiday_title?: string;
  calendar_event?: any;
  event_title?: string;
  event_color?: string;
  event_colors?: any;
}

export interface AttendanceRecordItem {
  id?: string | number;
  student?: string | number;
  date?: string;
  status?: string; // 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'LEAVE'
  check_in_time?: string;
  check_out_time?: string;
  late_minutes?: number;
  note?: string;
  status_display?: string;
  [key: string]: any;
}

export interface AttendanceStudentItem {
  id: string | number;
  student_id?: string | number;
  name: string;
  name_en?: string;
  roll_number?: string | number;
  uniq_id?: string;
  student_id_card_number?: string;
  student_class?: any;
  student_class_name?: string;
  student_section?: any;
  student_section_name?: string;
  section_name?: string;
  department?: any;
  department_name?: string;
  records?: Record<string, AttendanceRecordItem>;
  attendance?: Record<string, AttendanceRecordItem>;
  summary?: {
    present?: number;
    absent?: number;
    late?: number;
    leave?: number;
    excused?: number;
    total_days?: number;
    percentage?: number;
  };
  [key: string]: any;
}

export interface AttendanceMatrixData {
  students?: AttendanceStudentItem[];
  days?: DayPeriodItem[];
  dates?: string[];
  summary?: {
    total_students?: number;
    average_attendance?: number;
    present_count?: number;
    absent_count?: number;
    late_count?: number;
  };
  [key: string]: any;
}

export interface UseAttendanceDateManagerParams {
  activeTenantId?: string;
  moduleType?: string;
  isAdmin?: boolean;
  initialYear?: number;
  initialMonth?: number;
  initialStartDate?: string;
  initialEndDate?: string;
}

export interface UseAttendanceDateManagerReturn {
  todayStr: string;
  minDate: string;
  maxDate: string;
  activeAcademicYear: any;
  isDateInAcademicYear: (dStr: string) => boolean;
  selectedYear: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  selectedMonth: number;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  startDate: string;
  setStartDate: React.Dispatch<React.SetStateAction<string>>;
  endDate: string;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
  handleResetDate: () => void;
  daysInPeriod: DayPeriodItem[];
  enrichedDaysHeader: DayPeriodItem[];
  gregorianTitle: string;
  hijriTitle: string;
  isSingleDay: boolean;
  isFullHijriMonth: boolean;
  isHijriEnabled: boolean;
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void) | any;
  calendarEventsVersion: number;
  setCalendarEventsVersion: React.Dispatch<React.SetStateAction<number>>;
  stepLabels: { prev: string; next: string };
  isAtMinBound: boolean;
  isAtMaxBound: boolean;
  handleStepBackward: () => void;
  handleStepForward: () => void;
  handleGoToToday: () => void;
  isCurrentPeriodToday: boolean;
}

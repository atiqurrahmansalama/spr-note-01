import type { PageRange } from "@/components/ui/PageRangeInput";

export interface DetailAyahItem {
  id: string;
  value: string | number;
}

export interface DetailRowData {
  id: string;
  juz: string | number;
  page: string | number;
  ayahs: DetailAyahItem[];
}

export interface JuzRowData {
  id: string;
  juz: string | number;
  juzInputId?: string;
  ranges: PageRange[];
}

export interface DailyProgressDraft {
  id: string;
  studentName?: string;
  selectedStudentId?: string | number | null;
  groupName?: string;
  selectedSession?: string;
  selectedDate?: string;
  juzPageData?: JuzRowData[];
  mistakeData?: DetailRowData[];
  stuckData?: DetailRowData[];
  comment?: string;
  savedAtDate?: string;
  savedAtTime?: string;
  timestamp?: number;
  hasData?: boolean;
}

export interface DailyProgressData {
  studentName?: string;
  groupName?: string;
  departmentName?: string;
  className?: string;
  sectionName?: string;
  selectedSession?: string;
  selectedDate?: string;
  juzPageData?: JuzRowData[];
  mistakeData?: DetailRowData[];
  stuckData?: DetailRowData[];
  comment?: string;
  report_unique_id?: string;
  id?: string;
  teacherName?: string;
  formattedDate?: string;
  [key: string]: any;
}

export interface SectionVisibilityConfig {
  headerDate?: { enabled?: boolean };
  studentSelect?: { enabled?: boolean };
  sessionSelect?: { enabled?: boolean };
  juzPageInput?: { enabled?: boolean };
  mistakeTracker?: { enabled?: boolean };
  stuckTracker?: { enabled?: boolean };
  commentSection?: { enabled?: boolean };
  actionButtons?: { enabled?: boolean };
  pdfExport?: { enabled?: boolean };
}

export interface StudentProfileOption {
  id?: string | number;
  label?: string;
  name?: string;
  name_en?: string;
  sub?: string;
  group_name?: string;
  section_name?: string;
  student_class_name?: string;
  department?: string | number;
  department_id?: string | number;
  department_name?: string;
  student_class?: string | number;
  class_id?: string | number;
  student_section?: string | number;
  section_id?: string | number;
  roll_number?: number | string;
  student_id_card_number?: string;
  uniq_id?: string;
  badge?: string;
  originalData?: any;
}

export interface SessionItem {
  name?: string;
  label?: string;
  value?: string;
}

export interface DailyProgressFilterProps {
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  dateFormat?: string;
  selectedDepartmentId?: string;
  onDepartmentChange?: (val: string) => void;
  departmentSelectOptions?: Array<{ label: string; value: string; [key: string]: any }>;
  hasDepartments?: boolean;
  selectedClassId?: string;
  onClassChange?: (val: string) => void;
  classSelectOptions?: Array<{ label: string; value: string; [key: string]: any }>;
  selectedSectionId?: string;
  onSectionChange?: (val: string) => void;
  sectionSelectOptions?: Array<{ label: string; value: string; [key: string]: any }>;
  hasSectionsForClass?: boolean;
  onBatchHierarchyChange?: (params: { departmentId?: string; classId?: string; sectionId?: string }) => void;
  setAcademicFilters?: (params: { departmentId?: string; classId?: string; sectionId?: string }) => void;
  [key: string]: any;
}

export interface DailyProgressViewProps {
  timeZone?: string;
  dateFormat?: string;
  filterProps?: DailyProgressFilterProps | null;
  isEmbedded?: boolean;
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl" | "3xl";
  className?: string;
}

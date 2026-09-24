export interface ReportPortion {
  juz?: number | string;
  start_juz?: number | string;
  start_page?: number | string;
  end_page?: number | string;
  ranges?: Array<{
    start: number | string;
    end?: number | string;
    page_start?: number | string;
    page_end?: number | string;
  }>;
}

export interface ReportErrorDetail {
  juz?: number | string;
  page?: number | string;
  ayah?: number | string;
  type?: "Mistake" | "Stuck" | string;
}

export interface ReportMistakeDetail {
  juz?: number | string;
  page?: number | string;
  ayah?: number | string;
}

export interface ReportStuckDetail {
  juz?: number | string;
  page?: number | string;
  ayah?: number | string;
}

export interface ReportItem {
  id?: number | string;
  report_unique_id?: string;
  student_name?: string;
  student_group?: string;
  subject_course?: string;
  session_name?: string;
  session?: string;
  report_date?: string;
  date?: string;
  selectedDate?: string;
  generate_date?: string;
  created_at?: string;
  updated_at?: string;
  client_created_at?: string;
  client_updated_at?: string;
  date_time?: string;
  comment?: string;
  total_page?: number;
  total_pages?: number;
  pages?: number;
  total_mistake?: number;
  total_stuck?: number;
  juz_and_pages?: ReportPortion[];
  portions?: ReportPortion[];
  mistake_details?: ReportMistakeDetail[];
  stuck_details?: ReportStuckDetail[];
  error_details?: ReportErrorDetail[];
  mistakes?: any[];
  stucks?: any[];
  student_details?: {
    name?: string;
    group_name?: string;
    [key: string]: any;
  };
  student?: any;
  // Computed fields
  formattedDate?: string;
  formattedTime?: string;
  formattedReportDate?: string;
  formattedGenerateDate?: string;
  formattedGenerateTime?: string;
  isoDateOnly?: string;
  is_edited?: boolean;
  edited_at?: string | null;
  totalPages?: number;
  mistakesCount?: number;
  stucksCount?: number;
  [key: string]: any;
}

export interface StudentGroupedItem {
  student_name: string;
  student_group?: string;
  reports: ReportItem[];
}

export interface ContextMenuState {
  x: number;
  y: number;
  report: ReportItem;
  targetList?: ReportItem[];
}

export interface ProgressReportsViewProps {
  hideHeader?: boolean;
  isEmbedded?: boolean;
  className?: string;
}

export interface RecordReportsListProps {
  reports?: ReportItem[];
  reportsList?: ReportItem[];
  selectedIds?: Set<number | string>;
  onToggleSelect?: (id: number | string) => void;
  onBatchSelect?: (ids: Set<number | string>) => void;
  onDeselectAll?: () => void;
  onContextMenu?: (e: React.MouseEvent, report: ReportItem) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
}

export interface StudentGroupedListProps {
  studentGroupedData?: StudentGroupedItem[];
  reportsList?: ReportItem[];
  selectedIds?: Set<number | string>;
  onToggleSelect?: (id: number | string) => void;
  onBatchSelect?: (ids: Set<number | string>) => void;
  onDeselectAll?: () => void;
  onContextMenu?: (e: React.MouseEvent, report: ReportItem) => void;
  onStudentContextMenu?: (e: React.MouseEvent, studentObj: StudentGroupedItem) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
}

export interface ReportCardDetailProps {
  report: ReportItem | null;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
}

export interface ReportContextMenuProps {
  x: number;
  y: number;
  report: ReportItem | null;
  targetList?: ReportItem[];
  onClose: () => void;
  onCopyText?: (report: ReportItem | ReportItem[]) => void;
  onExportCSV?: (report: ReportItem | ReportItem[]) => void;
  onExportJSON?: (report: ReportItem | ReportItem[]) => void;
  onPrintPDF?: (report: ReportItem | ReportItem[]) => void;
  onEdit?: (report: ReportItem) => void;
  onDelete?: (report: ReportItem) => void;
}

export interface ReportsAnalyticsProps {
  filteredReports?: ReportItem[];
  reportsList?: ReportItem[];
  reports?: ReportItem[];
}

/**
 * Mark Sheet & Examinations Module TypeScript Interfaces & Type Definitions
 */

export interface Exam {
  id: string | number;
  name: string;
  academicYearName?: string;
  semesterName?: string;
  branchName?: string;
  targetClassIds?: (string | number)[];
  startDate?: string;
  endDate?: string;
  gradingScaleId?: string;
  status?: string;
  [key: string]: any;
}

export interface Subject {
  id: string | number;
  subjectName: string;
  code?: string;
  fullMarks: number | string;
  passMarks?: number | string;
  classId?: string | number;
  sectionId?: string | number;
  departmentId?: string | number;
  [key: string]: any;
}

export interface SubjectMark {
  subjectId: string | number;
  subjectName?: string;
  full?: number;
  pass?: number;
  highest?: number;
  highestMarks?: number;
  obtained?: number | null;
  gradePoint?: number | string;
  grade?: string;
  isPassed?: boolean;
  isAbsent?: boolean;
  hasEntry?: boolean;
  status?: string;
  [key: string]: any;
}

export interface StudentResult {
  studentId: string | number;
  studentName: string;
  studentUniqId?: string;
  rollNumber: string | number;
  studentClass?: string;
  studentSection?: string;
  subjectMarks: SubjectMark[];
  totalObtained?: number | null;
  totalFull?: number;
  overallPercentage?: number | string | null;
  overallGpa?: number | string | null;
  grade?: string;
  division?: string;
  classRank?: number | string;
  isOverallPass?: boolean;
  hasAnyMarks?: boolean;
  [key: string]: any;
}

export interface GradingRule {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gpa: number;
  division?: string;
  remarks?: string;
}

export interface GradingSystem {
  id?: string;
  name: string;
  rules: GradingRule[];
  description?: string;
}

export interface TabulationStats {
  highestMarks: number;
  averageMarks: number;
  averageGpa: number;
}

export interface OptionItem {
  value: string;
  label: string;
  departmentId?: string;
  classId?: string;
  [key: string]: any;
}

// ---------------- Props Interfaces ---------------- //

export interface MarkSheetHeaderProps {
  exam: Exam | null;
  activeSubTab?: 'ledger' | 'transcripts';
  onExportCsv?: () => void;
  onOpenPrintStudio?: () => void;
  onOpenTranscripts?: () => void;
  onSwitchToLedger?: () => void;
  onPrintCurrentMarkSheet?: () => void;
}

export interface TabulationLedgerTabProps {
  exam?: Exam | null;
  subjects?: Subject[];
  studentsData?: StudentResult[];
  selectedClassId?: string;
  selectedClassName?: string;
  activeDeptObj?: OptionItem | null;
  gradingSystem?: GradingSystem | null;
  totalStudents?: number;
  passedCount?: number;
  failedCount?: number;
  passPercentage?: number;
  stats?: Partial<TabulationStats>;
  totalMaxMarks?: number;
  onViewStudentTranscript?: (studentId: string | number) => void;
  onOpenPrintStudio?: () => void;
}

export interface TranscriptStudioTabProps {
  exam?: Exam | null;
  selectedClassId?: string;
  selectedClassName?: string;
  selectedSectionId?: string;
  selectedSectionName?: string;
  gradingSystem?: GradingSystem | null;
  studentsData?: StudentResult[];
  totalStudents?: number;
  passedCount?: number;
  failedCount?: number;
  selectedStudentId?: string | number | null;
  onSelectStudentId?: (studentId: string) => void;
  subjects?: Subject[];
}

export interface TranscriptCardProps {
  studentResult?: StudentResult | null;
  studentsData?: StudentResult[];
  exam?: Exam | null;
  gradingSystem?: GradingSystem | null;
  institutionName?: string;
  institutionAddress?: string;
}

export interface MarkSheetPrintProps {
  isOpen?: boolean;
  onClose: () => void;
  exam?: Exam | null;
  selectedClassId?: string;
  selectedClassName?: string;
  selectedSectionId?: string;
  selectedSectionName?: string;
  gradingSystem?: GradingSystem | null;
  subjects?: Subject[];
  studentsData?: StudentResult[];
  totalStudents?: number;
  passedCount?: number;
  failedCount?: number;
  passPercentage?: number;
  stats?: Partial<TabulationStats>;
  totalMaxMarks?: number;
}

export interface StudentMarkSheetPrintProps {
  isOpen?: boolean;
  onClose: () => void;
  exam?: Exam | null;
  studentResult?: StudentResult | null;
  studentsData?: StudentResult[];
  selectedClassId?: string;
  selectedClassName?: string;
  selectedSectionId?: string;
  selectedSectionName?: string;
  gradingSystem?: GradingSystem | null;
  institutionName?: string;
  institutionAddress?: string;
  subjects?: Subject[];
}

export interface MarkSheetLedgerViewProps {
  initialExamId?: string | number | null;
  initialStudentId?: string | number | null;
  defaultSubTab?: 'ledger' | 'transcripts' | null;
  isEmbedded?: boolean;
  onNavigateToTranscripts?: (studentId: string | number) => void;
}

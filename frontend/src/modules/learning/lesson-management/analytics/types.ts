export interface LessonKPIItem {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
    isPositive: boolean;
  };
  badge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "info" | "neutral";
  };
}

export interface EvaluationStatusCount {
  status: string;
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
  bgClass: string;
}

export interface SubjectCoverageItem {
  subjectName: string;
  bookName: string;
  lessonsAssigned: number;
  unitSpan: string;
  studentsEvaluated: number;
  averageScore: number;
  fluencyRating: number;
}

export interface PeriodSlotRoutineItem {
  periodSlot: string;
  periodName: string;
  timeRange: string;
  isAssigned: boolean;
  subjectName?: string;
  bookName?: string;
  teacherName?: string;
  lessonTitle?: string;
  evaluatedCount: number;
  averageScore?: number;
}

export interface StudentPerformanceItem {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  className?: string;
  sectionName?: string;
  score: number;
  maxScore: number;
  fluencyRating: number;
  status: string;
  totalMistakes: number;
  totalStucks: number;
  remarks?: string;
}

export interface LessonTrendPoint {
  date: string;
  label: string;
  totalScheduled: number;
  assignedCount: number;
  deliveryRate: number;
  evaluatedCount: number;
  averageScore: number;
}

export interface LessonAnalyticsData {
  kpis: LessonKPIItem[];
  deliveryRate: number;
  evaluationRate: number;
  averageScore: number;
  averageFluency: number;
  totalMistakes: number;
  totalStucks: number;
  remedialCount: number;
  statusBreakdown: EvaluationStatusCount[];
  subjectCoverage: SubjectCoverageItem[];
  periodRoutines: PeriodSlotRoutineItem[];
  topPerformers: StudentPerformanceItem[];
  remedialStudents: StudentPerformanceItem[];
  trendHistory: LessonTrendPoint[];
}

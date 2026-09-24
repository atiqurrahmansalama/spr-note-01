export interface ProgressKPIItem {
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

export interface ProgressTrendPoint {
  date: string;
  label: string;
  totalPages: number;
  totalReports: number;
  activeStudents: number;
  totalMistakes: number;
  totalStucks: number;
  cleanRate: number;
}

export interface SessionProgressItem {
  sessionKey: string;
  sessionName: string;
  reportsCount: number;
  totalPages: number;
  mistakesCount: number;
  stucksCount: number;
  cleanCount: number;
  cleanRate: number;
  activeStudents: number;
}

export interface PortionCoverageItem {
  portionKey: string;
  portionTitle: string;
  totalVolume: number;
  unitType: "Pages" | "Portions" | "Juz";
  mistakesCount: number;
  stucksCount: number;
  activeLearners: number;
}

export interface LearnerProgressPerformanceItem {
  studentId: string;
  studentName: string;
  rollNumber?: string;
  className?: string;
  sectionName?: string;
  groupName?: string;
  totalPages: number;
  totalMistakes: number;
  totalStucks: number;
  errorDensity: number;
  sessionsLogged: number;
  status: string;
  isClean: boolean;
  remarks?: string;
}

export interface ProgressAnalyticsData {
  kpis: ProgressKPIItem[];
  totalPages: number;
  totalReports: number;
  activeStudents: number;
  cleanRate: number;
  totalMistakes: number;
  totalStucks: number;
  avgMistakesPerPage: string;
  avgStucksPerPage: string;
  pagesPerMistake: string;
  pagesPerStuck: string;
  purityScore: number;
  trendHistory: ProgressTrendPoint[];
  sessionBreakdown: SessionProgressItem[];
  portionBreakdown: PortionCoverageItem[];
  topPacesetters: LearnerProgressPerformanceItem[];
  remedialLearners: LearnerProgressPerformanceItem[];
}

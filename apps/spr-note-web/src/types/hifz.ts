/**
 * Hifz Progress, Lesson Evaluation & Intelligence Domain Type Definitions
 * Fast 30-Second Daily Evaluation Architecture
 */

export type EvaluationQuality = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'ABSENT';

export interface SabaqRecord {
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  pageNumber?: number;
  totalLines?: number;
  juzNumber?: number;
  quality: EvaluationQuality;
  mistakeCount?: number;
}

export interface SabaqiRecord {
  juzNumber: number;
  fromPage?: number;
  toPage?: number;
  quarterJuz?: 'FIRST_QUARTER' | 'SECOND_QUARTER' | 'THIRD_QUARTER' | 'FOURTH_QUARTER';
  quality: EvaluationQuality;
  mistakeCount?: number;
}

export interface ManzilRecord {
  juzNumber: number;
  fromPage?: number;
  toPage?: number;
  quality: EvaluationQuality;
  mistakeCount?: number;
}

export interface HifzDailyEntry {
  id?: string;
  studentId: string;
  studentName?: string;
  date: string;
  teacherId: string;
  teacherName?: string;
  sabaq?: SabaqRecord;
  sabaqi?: SabaqiRecord;
  manzil?: ManzilRecord;
  totalMistakes: number;
  retentionScore?: number;
  teacherRemarks?: string;
  institutionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HifzStudentAnalytics {
  studentId: string;
  currentJuz: number;
  completedJuzCount: number;
  dailyAverageLines: number;
  revisionConsistencyRate: number;
  totalMistakesLast30Days: number;
  weakSurahNumbers: number[];
  streakDays: number;
}

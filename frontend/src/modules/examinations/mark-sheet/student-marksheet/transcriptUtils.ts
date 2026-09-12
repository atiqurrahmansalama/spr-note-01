import { StudentResult, Subject, GradingSystem } from '../types';

/**
 * Format numeric rank into standard English ordinal string (e.g. 1 -> 1st, 2 -> 2nd, 3 -> 3rd)
 */
export function formatRankOrdinal(rank: number | string | undefined | null): string {
  if (rank === null || rank === undefined || rank === '' || rank === '-') return '-';
  if (typeof rank === 'string' && /^\d+(st|nd|rd|th)$/i.test(rank.trim())) {
    return rank.trim();
  }
  const num = typeof rank === 'number' ? rank : parseInt(String(rank).replace(/[^0-9]/g, ''), 10);
  if (isNaN(num) || num <= 0) return String(rank);
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
}

/**
 * Calculate highest marks map for each subject across the entire class
 */
export function computeHighestMarksMap(studentsData: StudentResult[] = []): Map<string | number, number> {
  const map = new Map<string | number, number>();
  if (Array.isArray(studentsData) && studentsData.length > 0) {
    studentsData.forEach((st) => {
      (st.subjectMarks || []).forEach((sm) => {
        if (sm.obtained !== null && sm.obtained !== undefined && !sm.isAbsent) {
          const current = map.get(sm.subjectId) ?? 0;
          const val = Number(sm.obtained) || 0;
          if (val > current) {
            map.set(sm.subjectId, val);
          }
        }
      });
    });
  }
  return map;
}

/**
 * Dynamic calculation of total full marks across all subjects in the transcript
 */
export function computeTotalFullMarks(
  studentResult?: StudentResult | null,
  subjects?: Subject[]
): number {
  if (Array.isArray(studentResult?.subjectMarks) && studentResult.subjectMarks.length > 0) {
    const sum = studentResult.subjectMarks.reduce((acc: number, sm) => acc + (Number(sm.full) || 0), 0);
    if (sum > 0) return sum;
  }
  if (studentResult?.totalFull && Number(studentResult.totalFull) > 0) {
    return Number(studentResult.totalFull);
  }
  if (Array.isArray(subjects) && subjects.length > 0) {
    const sum = subjects.reduce((acc: number, s) => acc + (Number(s.fullMarks || s.full) || 100), 0);
    if (sum > 0) return sum;
  }
  return 0;
}

/**
 * Dynamic calculation of total obtained marks
 */
export function computeTotalObtainedMarks(
  studentResult?: StudentResult | null
): number | string {
  if (studentResult?.totalObtained !== null && studentResult?.totalObtained !== undefined) {
    return studentResult.totalObtained;
  }
  if (Array.isArray(studentResult?.subjectMarks) && studentResult.subjectMarks.length > 0) {
    return studentResult.subjectMarks.reduce((acc: number, sm) => acc + (Number(sm.obtained) || 0), 0);
  }
  return 0;
}

/**
 * Extract maximum GPA and top grade benchmark from active grading system schema
 */
export function getScaleTopGradeAndGpa(gradingSystem?: GradingSystem | null): {
  scaleMaxGpa: string;
  scaleTopGrade: string;
} {
  if (gradingSystem?.rules && Array.isArray(gradingSystem.rules) && gradingSystem.rules.length > 0) {
    const topRule = [...gradingSystem.rules].sort((a, b) => {
      const valA = Number(a.minPercentage ?? a.minMark ?? a.gradePoint ?? a.gpa ?? 0);
      const valB = Number(b.minPercentage ?? b.minMark ?? b.gradePoint ?? b.gpa ?? 0);
      return valB - valA;
    })[0];

    const maxGpa =
      topRule?.gradePoint !== undefined && topRule?.gradePoint !== null
        ? Number(topRule.gradePoint).toFixed(2)
        : topRule?.gpa !== undefined && topRule?.gpa !== null
        ? Number(topRule.gpa).toFixed(2)
        : '5.00';

    return {
      scaleMaxGpa: maxGpa,
      scaleTopGrade: topRule?.grade || 'A+',
    };
  }

  return {
    scaleMaxGpa: '5.00',
    scaleTopGrade: 'A+',
  };
}

/**
 * Calculate class-level highest benchmarks across all students
 */
export function computeClassStats(
  studentsData: StudentResult[] = [],
  defaultTopGrade = 'A+'
): {
  highestTotal: number | string;
  highestPercentage: string;
  highestGpa: string;
  highestGrade: string;
} {
  if (!Array.isArray(studentsData) || studentsData.length === 0) {
    return {
      highestTotal: '-',
      highestPercentage: '-',
      highestGpa: '-',
      highestGrade: '-',
    };
  }

  let maxTotal = 0;
  let maxPercentage = 0;
  let maxGpa = 0;
  let topGrade = '-';

  studentsData.forEach((st) => {
    const tot = Number(st.totalObtained) || 0;
    if (tot > maxTotal) maxTotal = tot;

    const pct = Number(st.overallPercentage) || 0;
    if (pct > maxPercentage) maxPercentage = pct;

    const gpa = Number(st.overallGpa) || 0;
    if (gpa > maxGpa) {
      maxGpa = gpa;
      topGrade = st.grade || '-';
    }
  });

  return {
    highestTotal: maxTotal > 0 ? maxTotal : '-',
    highestPercentage: maxPercentage > 0 ? `${maxPercentage}%` : '-',
    highestGpa: maxGpa > 0 ? maxGpa.toFixed(2) : '-',
    highestGrade: topGrade !== '-' ? topGrade : defaultTopGrade,
  };
}

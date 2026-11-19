import React from 'react';
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

/**
 * Constructs clean, theme-token styled table footer rows for a student transcript table.
 */
export function buildStudentFooterRows({
  studentResult,
  subjects = [],
  classStats,
  scaleMaxGpa = '5.00',
  scaleTopGrade = 'A+',
  totalStudents = 0,
}: {
  studentResult: StudentResult | null;
  subjects?: Subject[];
  classStats: {
    highestTotal: number | string;
    highestPercentage: string;
    highestGpa: string;
    highestGrade: string;
  };
  scaleMaxGpa?: string;
  scaleTopGrade?: string;
  totalStudents?: number;
}): any[] {
  if (!studentResult) return [];

  const rankText = formatRankOrdinal(
    studentResult.classRank || studentResult.meritPosition || studentResult.rank || studentResult.position
  );
  const gpaText =
    studentResult.overallGpa !== null && studentResult.overallGpa !== undefined
      ? Number(studentResult.overallGpa).toFixed(2)
      : '-';
  const gradeText = studentResult.grade || studentResult.division || '-';
  const totalFull = computeTotalFullMarks(studentResult, subjects);
  const totalObtained = computeTotalObtainedMarks(studentResult);

  const createRow = (
    label: string,
    fullVal: string | number,
    highestVal: string | number,
    obtainedVal: string | number,
    isObtainedBold = true
  ) => ({
    mergeIndex: true,
    cells: [
      {
        colSpan: 1,
        content: label,
        align: 'left' as const,
        className: 'font-bold theme-text-primary',
        style: { paddingLeft: '32px' },
      },
      {
        colSpan: 1,
        content: fullVal,
        align: 'center' as const,
        className: 'font-normal theme-text-secondary font-mono',
      },
      {
        colSpan: 1,
        content: highestVal,
        align: 'center' as const,
        className: 'font-normal theme-text-secondary font-mono',
      },
      {
        colSpan: 1,
        content: obtainedVal,
        align: 'center' as const,
        className: `${isObtainedBold ? 'font-bold theme-text-primary' : 'font-normal theme-text-secondary'} font-mono`,
      },
      {
        colSpan: 2,
        content: '',
        borderless: true,
        className: 'border-0 border-transparent bg-transparent',
      },
    ],
  });

  return [
    { isSpacer: true },
    createRow('Total Marks', totalFull > 0 ? totalFull : '-', classStats.highestTotal, totalObtained),
    createRow('Average Marks', '100%', classStats.highestPercentage, `${studentResult.overallPercentage ?? 0}%`),
    createRow('GPA', scaleMaxGpa, classStats.highestGpa !== '-' ? classStats.highestGpa : scaleMaxGpa, gpaText),
    createRow('Grade', scaleTopGrade, classStats.highestGrade !== '-' ? classStats.highestGrade : scaleTopGrade, gradeText, true),
    {
      mergeIndex: true,
      cells: [
        {
          colSpan: 1,
          content: 'Result & Merit Status',
          align: 'left' as const,
          className: 'font-bold theme-text-primary',
          style: { paddingLeft: '32px' },
        },
        {
          colSpan: 3,
          content: !studentResult.isOverallPass ? (
            React.createElement('span', { className: 'font-bold theme-danger' }, 'FAILED')
          ) : rankText && rankText !== '-' ? (
            React.createElement(
              'span',
              { className: 'font-normal theme-text-primary' },
              'Positioned ',
              React.createElement(
                'strong',
                { className: 'font-bold theme-accent font-mono px-0.5' },
                rankText
              ),
              ` out of ${totalStudents} Students`
            )
          ) : (
            React.createElement('span', { className: 'font-medium theme-success' }, 'PASSED')
          ),
          align: 'center' as const,
          className: 'tracking-tight theme-text-primary',
        },
        {
          colSpan: 2,
          content: '',
          borderless: true,
          className: 'border-0 border-transparent bg-transparent',
        },
      ],
    },
  ];
}

/**
 * Builds structured summary metrics for top-level ribbon or metric displays.
 */
export function buildStudentSummaryMetrics(studentResult: StudentResult | null): any[] {
  if (!studentResult) return [];
  const rankText = formatRankOrdinal(
    studentResult.classRank || studentResult.meritPosition || studentResult.rank || studentResult.position
  );
  return [
    { label: 'Total Marks', value: studentResult.totalObtained ?? '-' },
    {
      label: 'GPA',
      value:
        studentResult.overallGpa !== null && studentResult.overallGpa !== undefined
          ? Number(studentResult.overallGpa).toFixed(2)
          : '-',
    },
    { label: 'Grade', value: studentResult.grade || studentResult.division || '-' },
    { label: 'Merit Position', value: rankText || '-' },
    {
      label: 'Status',
      value: studentResult.isOverallPass !== false ? 'PASSED' : 'FAILED',
      highlight: studentResult.isOverallPass !== false,
    },
  ];
}


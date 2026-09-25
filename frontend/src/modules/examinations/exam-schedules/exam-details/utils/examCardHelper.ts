import { MetricItem } from '../../../../../components/ui/MetricsGrid';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ChartBarIcon,
  SparklesIcon,
} from '../../../../../components/ui/Icons';
import { Exam, ExamAssessmentComponent } from '../types';

export interface GroupedDepartmentSchedule {
  startDate: string;
  endDate: string;
  departments: string[];
}

export const LIFECYCLE_STAGES = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'MARK_ENTRY', label: 'Mark Entry' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'FINAL', label: 'Certified' },
];

/**
 * Normalizes single, array, comma-separated or missing department IDs into a clean string array.
 */
export function normalizeDepartmentIdList(
  departmentId: string | string[] | undefined | null
): string[] {
  if (Array.isArray(departmentId)) {
    const cleaned = departmentId.map(String).filter((s) => s.trim().length > 0);
    return cleaned.length > 0 ? cleaned : ['ALL'];
  }
  if (typeof departmentId === 'string' && departmentId.trim()) {
    const trimmed = departmentId.trim();
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      return parts.length > 0 ? parts : ['ALL'];
    }
    return [trimmed];
  }
  return ['ALL'];
}

/**
 * Returns canonical assessment components with fallback support for legacy breakdowns.
 */
export function getDefaultComponents(
  exam?: Exam | null,
  savedDraft?: any
): ExamAssessmentComponent[] {
  if (Array.isArray(savedDraft?.defaultComponents) && savedDraft.defaultComponents.length > 0) {
    return savedDraft.defaultComponents;
  }
  if (Array.isArray(exam?.defaultComponents) && exam.defaultComponents.length > 0) {
    return exam.defaultComponents.map((c: any, idx: number) => ({
      id: c.id || `comp_${idx + 1}`,
      name: c.name || `Component ${idx + 1}`,
      maxMarks: Number(c.maxMarks) || 0,
    }));
  }
  if (exam?.defaultBreakdown) {
    const w = Number(exam.defaultBreakdown.written) || 70;
    const o = Number(exam.defaultBreakdown.oral) || 30;
    return [
      { id: 'comp_1', name: 'Written Exam', maxMarks: w },
      { id: 'comp_2', name: 'Oral', maxMarks: o },
    ];
  }
  return [
    { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
    { id: 'comp_2', name: 'Oral', maxMarks: 30 },
  ];
}

export function getLifecycleStageIndex(status?: string): number {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'MARK_ENTRY':
      return 1;
    case 'FIRST_PUBLISHED':
    case 'UNDER_REVIEW':
      return 2;
    case 'FINAL_PUBLISHED':
    case 'LOCKED':
      return 3;
    default:
      return 0;
  }
}

/**
 * Returns a concise formatted summary of the exam marks breakdown.
 */
export function getExamBreakdownSummary(exam: Exam): string {
  if (Array.isArray(exam.defaultComponents) && exam.defaultComponents.length > 0) {
    if (exam.defaultComponents.length > 2) {
      return exam.defaultComponents.map((c) => `${c.maxMarks || 0}`).join(' + ') + ' Pts';
    }
    return exam.defaultComponents
      .map((c) => {
        const cleanName = (c.name || 'Comp')
          .replace(/ Examination| Exam| Assessment/gi, '')
          .trim();
        return `${cleanName} ${c.maxMarks || 0}`;
      })
      .join(' · ');
  }

  if (exam.defaultBreakdown?.written && exam.defaultBreakdown?.oral) {
    return `Written ${exam.defaultBreakdown.written} · Oral ${exam.defaultBreakdown.oral}`;
  }

  return exam.breakdownEnabled === false ? 'Single Total' : '100% Written';
}

/**
 * Returns a concise formatted summary of the assessment/evaluation policy.
 */
export function getExamAssessmentSummary(exam: Exam): string {
  if (exam.caWeightage?.enabled) {
    const { dailyClassroomPct = 0, attendancePct = 0, examPct = 0 } = exam.caWeightage;
    return `${dailyClassroomPct}%D · ${attendancePct}%A · ${examPct}%E`;
  }
  return '100% Exam';
}

/**
 * Groups department schedules by matching date windows (Start Date — End Date).
 */
export function getGroupedDepartmentSchedules(exam: Exam): GroupedDepartmentSchedule[] {
  if (!exam.isMultiDepartmentSchedule || !Array.isArray(exam.departmentSchedules) || exam.departmentSchedules.length === 0) {
    return [];
  }

  const map = new Map<string, GroupedDepartmentSchedule>();

  exam.departmentSchedules.forEach((dept) => {
    const sDate = dept.startDate || exam.startDate || '';
    const eDate = dept.endDate || exam.endDate || '';
    const key = `${sDate}___${eDate}`;
    const deptTitle = dept.departmentName || dept.departmentCode || 'Department';

    if (!map.has(key)) {
      map.set(key, {
        startDate: sDate,
        endDate: eDate,
        departments: [deptTitle],
      });
    } else {
      const entry = map.get(key)!;
      if (!entry.departments.includes(deptTitle)) {
        entry.departments.push(deptTitle);
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Builds standard 4-tile MetricsGrid items for an examination session card.
 */
export function buildExamCardMetrics(exam: Exam, subjectCount: number): MetricItem[] {
  return [
    {
      id: 'routine-coverage',
      icon: BookOpenIcon,
      label: 'Routine Coverage',
      value: `${subjectCount} ${subjectCount === 1 ? 'Subject' : 'Subjects'}`,
      title: 'Subject routine coverage for this exam session',
    },
    {
      id: 'full-marks',
      icon: AcademicCapIcon,
      label: 'Full Marks',
      value: `${exam.defaultFullMarks || exam.targetFullMarks || 100} Pts`,
      title: `Baseline Examination Marks Scale: ${exam.defaultFullMarks || exam.targetFullMarks || 100} Points`,
    },
    {
      id: 'breakdown',
      icon: ChartBarIcon,
      label: 'Breakdown',
      value: getExamBreakdownSummary(exam),
      title: 'Component marks breakdown',
    },
    {
      id: 'assessment-policy',
      icon: SparklesIcon,
      label: 'Assessment Policy',
      value: getExamAssessmentSummary(exam),
      title: 'Continuous Assessment & Examination evaluation weights',
    },
  ];
}

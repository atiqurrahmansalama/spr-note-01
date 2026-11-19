import React, { useState, useMemo, useEffect, useCallback } from 'react';
import UniversalPrintStudio from '@/components/print/UniversalPrintStudio';
import { PrintBatchDocument } from '@/components/print/types';
import { formatDateLabel, formatCleanRange } from '../../../exam-schedules/utils/examScheduleUtils';
import { examStore } from '@/stores/examStore';
import { GradingSystem, Subject } from '../../types';

export interface ColumnConfig {
  id: string;
  header?: string;
  label: string;
  subLabel?: string;
  bold?: boolean;
  mono?: boolean;
  align?: 'left' | 'center' | 'right';
  nowrap?: boolean;
  cell?: (val: any, row: any, idx?: number) => React.ReactNode;
  render?: (row: any) => React.ReactNode;
  [key: string]: any;
}

export interface MetaItem {
  label: string;
  value: string | number;
}

export interface SummaryMetric {
  label: string;
  value: string | number;
}

export interface MarkEntryPrintModalProps {
  isOpen?: boolean;
  onClose: () => void;
  selectedExam?: any;
  selectedSubject?: Subject | any;
  availableSubjects?: Subject[];
  targetStudents?: any[];
  allStudents?: any[];
  components?: Array<{ id?: string; name: string; maxMarks?: number | string }>;
  fullMarks?: number;
  passMarks?: number;
  marksGrid?: Record<string, any>;
  activeGradingSystem?: GradingSystem | null;
  stats?: any;
  initialMode?: 'single' | 'bulk';
  tenantId?: string;
  onExportCsv?: () => void;
}

/**
 * MarkEntryPrintModal
 * Comprehensive Print Studio for Teacher Marksheets & Official Subject Award Lists.
 * Supports:
 * 1. Single Mode: Vector-perfect Subject Marksheet & Award List for active subject.
 * 2. Bulk Mode: 1-click batch printing of Subject Marksheets across all scheduled subjects,
 *    each on its own physical page with independent metadata, breakdown, stats & signatures.
 */
export default function MarkEntryPrintModal({
  isOpen = false,
  onClose,
  selectedExam = null,
  selectedSubject = null,
  availableSubjects = [],
  targetStudents = [],
  allStudents = [],
  components = [],
  fullMarks = 100,
  passMarks = 33,
  marksGrid = {},
  activeGradingSystem = null,
  stats = null,
  initialMode = 'single',
  tenantId = 'default',
  onExportCsv,
}: MarkEntryPrintModalProps) {
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>(() => {
    return initialMode === 'bulk' ? 'bulk' : 'single';
  });

  // Sync external mode changes
  useEffect(() => {
    if (initialMode) {
      setPrintMode(initialMode);
    }
  }, [initialMode]);

  const resolvedSubjectsList = useMemo(() => {
    if (availableSubjects && availableSubjects.length > 0) return availableSubjects;
    if (selectedSubject) return [selectedSubject];
    return [];
  }, [availableSubjects, selectedSubject]);

  const effectiveStudents = useMemo(() => {
    if (targetStudents && targetStudents.length > 0) return targetStudents;
    if (allStudents && allStudents.length > 0) return allStudents;
    return [];
  }, [targetStudents, allStudents]);

  // 1. Helper to construct column configs for any subject routine
  const buildSubjectColumns = useCallback((subComponents: any[], subFullMarks: number) => {
    const cols: ColumnConfig[] = [
      {
        id: 'roll',
        header: 'Roll',
        label: 'Roll',
        bold: true,
        mono: true,
        align: 'center',
        nowrap: true,
        cell: (_: any, row: any) => row.roll,
      },
      {
        id: 'regNo',
        header: 'Student ID',
        label: 'Student ID',
        mono: true,
        align: 'center',
        nowrap: true,
        cell: (_: any, row: any) => row.regNo,
      },
      {
        id: 'name',
        header: 'Student Name',
        label: 'Student Name',
        bold: true,
        align: 'left',
        cell: (_: any, row: any) => row.name,
      },
      {
        id: 'status',
        header: 'Status',
        label: 'Status',
        align: 'center',
        nowrap: true,
        cell: (_: any, row: any) =>
          row.isAbsent ? (
            <span className="text-red-600 font-bold">ABS</span>
          ) : (
            <span className="text-emerald-700 font-bold">PRES</span>
          ),
      },
    ];

    // Evaluation Component Columns
    subComponents.forEach((comp, cIdx) => {
      cols.push({
        id: `comp_${cIdx}`,
        header: comp.name,
        label: comp.name,
        subLabel: `(Max: ${comp.maxMarks})`,
        align: 'center',
        mono: true,
        nowrap: true,
        cell: (_: any, row: any) => (row.isAbsent ? '0' : row.componentMarks?.[`comp_${cIdx}`] || '0'),
      });
    });

    // Total Marks Column
    cols.push({
      id: 'total',
      header: `Total (${subFullMarks})`,
      label: `Total (${subFullMarks})`,
      align: 'center',
      bold: true,
      mono: true,
      nowrap: true,
      cell: (_: any, row: any) => (row.isAbsent ? 'ABS' : row.obtainedMarks),
    });

    // Grade Column
    cols.push({
      id: 'grade',
      header: 'Grade',
      label: 'Grade',
      align: 'center',
      bold: true,
      nowrap: true,
      cell: (_: any, row: any) => (row.isAbsent ? 'ABS' : row.grade),
    });

    // GPA Column
    cols.push({
      id: 'gpa',
      header: 'GPA',
      label: 'GPA',
      align: 'center',
      mono: true,
      nowrap: true,
      cell: (_: any, row: any) =>
        row.isAbsent ? '0.00' : row.gpa !== undefined && row.gpa !== null ? Number(row.gpa).toFixed(2) : '-',
    });

    // Remarks Column
    cols.push({
      id: 'remarks',
      header: 'Remarks',
      label: 'Remarks',
      align: 'left',
      cell: (_: any, row: any) =>
        row.teacherRemarks || (row.isPassed ? 'Passed' : row.isAbsent ? 'Absent' : 'Failed'),
    });

    return cols;
  }, []);

  // 2. Helper to build meta items for a subject
  const buildSubjectMetaItems = useCallback(
    (sub: any) => {
      if (!sub) return [];
      return [
        {
          label: 'Subject',
          value: `${sub.subjectName || ''}${sub.subjectCode ? ` (${sub.subjectCode})` : ''}`,
        },
        {
          label: 'Class & Section',
          value: `Class ${sub.className || ''} (${sub.sectionName || 'All Sections'})`,
        },
        {
          label: 'Curriculum',
          value: sub.curriculumBookName || 'Standard Syllabus',
        },
        { label: 'Exam Date', value: formatDateLabel(sub.examDate) },
        {
          label: 'Time & Shift',
          value: `${sub.shiftName ? `${sub.shiftName}, ` : ''}${formatCleanRange(
            sub.startTime,
            sub.endTime
          )}`,
        },
        { label: 'Room / Hall', value: sub.roomNo || 'Main Hall' },
        {
          label: 'Examiner',
          value: sub.examinerName || sub.teacherName || 'Assigned Examiner',
        },
        { label: 'Grading Scale', value: activeGradingSystem?.name || 'Standard Scale' },
      ];
    },
    [activeGradingSystem]
  );

  // 3. Helper to build dataset & stats for a subject
  const buildSubjectDataAndStats = useCallback(
    (sub: any, isCurrentActive: boolean) => {
      if (!sub) {
        return {
          rows: [],
          subComponents: components.length > 0 ? components : [{ id: 'comp_0', name: 'Written Exam', maxMarks: fullMarks || 100 }],
          subFullMarks: fullMarks || 100,
          subPassMarks: passMarks || 33,
          subSummaryMetrics: [],
        };
      }

      const subFullMarks = Number(sub?.fullMarks) || 100;
      const subPassMarks = Number(sub?.passMarks) || 33;
      const subComponents =
        sub?.components && Array.isArray(sub.components) && sub.components.length > 0
          ? sub.components.map((c: any, idx: number) => ({
              id: c.id || `comp_${idx}`,
              name: c.name || `Component ${idx + 1}`,
              maxMarks: Number(c.maxMarks) || 100,
            }))
          : components.length > 0
          ? components
          : [{ id: 'comp_0', name: 'Written Exam', maxMarks: subFullMarks }];

      // Filter enrolled students under this subject's class and section
      const enrolled = effectiveStudents.filter((st: any) => {
        if (!st) return false;
        const rawClass =
          st.class_id !== undefined
            ? st.class_id
            : st.student_class !== undefined
            ? st.student_class
            : st.classId || st.class;
        const stClassId = typeof rawClass === 'object' ? rawClass?.id : rawClass;
        if (stClassId && sub?.classId && String(stClassId) !== String(sub.classId)) {
          return false;
        }
        if (sub?.sectionId && sub.sectionId !== 'ALL') {
          const rawSec =
            st.section !== undefined
              ? st.section
              : st.section_id !== undefined
              ? st.section_id
              : st.sectionId || st.student_section;
          const stSecId = typeof rawSec === 'object' ? rawSec?.id : rawSec;
          if (stSecId && String(stSecId) !== String(sub.sectionId)) {
            return false;
          }
        }
        return true;
      });

      // Retrieve marks for this subject
      let grid = marksGrid;
      if (!isCurrentActive && selectedExam?.id && sub?.id) {
        const rawMarks = examStore.getExamMarks(tenantId, String(selectedExam.id), String(sub.id));
        const markMap: Record<string, any> = {};
        rawMarks.forEach((m: any) => {
          if (m && m.studentId !== undefined) {
            markMap[String(m.studentId)] = m;
          }
        });
        grid = markMap;
      }

      let evaluated = 0;
      let present = 0;
      let absent = 0;
      let passed = 0;
      let failed = 0;

      const rows = enrolled.map((st: any) => {
        const stId = String(st.id);
        const rowData = grid[stId] || {};
        const isAbs = Boolean(rowData.isAbsent);
        const obtained = isAbs ? 0 : Number(rowData.obtainedMarks) || 0;
        const pct = subFullMarks > 0 ? (obtained / subFullMarks) * 100 : 0;
        const gradeEval = examStore.evaluateGrade(pct, activeGradingSystem?.rules || []);
        const isPass = !isAbs && obtained >= subPassMarks;

        if (isAbs) {
          absent += 1;
          evaluated += 1;
          failed += 1;
        } else if (rowData.obtainedMarks !== '' && rowData.obtainedMarks !== null && rowData.obtainedMarks !== undefined) {
          present += 1;
          evaluated += 1;
          if (isPass) passed += 1;
          else failed += 1;
        }

        return {
          id: stId,
          roll: st.roll_number || st.roll || st.uniq_id || '-',
          regNo: st.student_id || st.reg_no || '-',
          name: st.name_en || st.name || 'Student',
          isAbsent: isAbs,
          obtainedMarks: rowData.obtainedMarks !== '' && rowData.obtainedMarks !== undefined ? rowData.obtainedMarks : '-',
          grade: isAbs ? 'ABS' : gradeEval.grade,
          gpa:
            isAbs
              ? '0.00'
              : gradeEval.gradePoint !== undefined
              ? Number(gradeEval.gradePoint).toFixed(1)
              : gradeEval.gpa || '-',
          isPassed: isPass,
          teacherRemarks: rowData.teacherRemarks,
          componentMarks: rowData.componentMarks || {},
        };
      });

      const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : 0;

      const subSummaryMetrics: SummaryMetric[] = [
        { label: 'Total Enrolled', value: enrolled.length },
        { label: 'Present Students', value: present },
        { label: 'Absent Students', value: absent },
        { label: 'Passed Students', value: passed },
        { label: 'Failed Students', value: failed },
        { label: 'Pass Rate', value: `${passRate}%` },
      ];

      return {
        rows,
        subComponents,
        subFullMarks,
        subPassMarks,
        subSummaryMetrics,
      };
    },
    [effectiveStudents, marksGrid, selectedExam?.id, tenantId, activeGradingSystem, components]
  );

  // 4. Default Signature Lines
  const getSignatureLines = useCallback((sub: any) => {
    return [
      {
        id: 'examiner',
        label: 'Course Examiner / Teacher',
        sub: sub?.examinerName || sub?.teacherName || 'Subject Teacher',
      },
      {
        id: 'dept_head',
        label: 'Department Head / Scrutinizer',
        sub: 'Verification Seal',
      },
      {
        id: 'controller',
        label: 'Controller of Examinations',
        sub: 'Official Approval',
      },
    ];
  }, []);

  const defaultPrintOptions = useMemo(
    () => ({
      pageSize: 'A4' as const,
      orientation: 'PORTRAIT' as const,
      margin: 'NORMAL' as const,
      density: 'NORMAL' as const,
      signatureLines: getSignatureLines(selectedSubject),
    }),
    [getSignatureLines, selectedSubject]
  );

  // 5. Batch Documents for Bulk Mode
  const batchDocuments: PrintBatchDocument[] = useMemo(() => {
    if (printMode !== 'bulk') return [];

    return resolvedSubjectsList.map((sub) => {
      const isCurrent = Boolean(selectedSubject?.id && String(selectedSubject.id) === String(sub.id));
      const { rows, subComponents, subFullMarks, subSummaryMetrics } = buildSubjectDataAndStats(sub, isCurrent);
      const subCols = buildSubjectColumns(subComponents, subFullMarks);
      const subMeta = buildSubjectMetaItems(sub);

      return {
        id: String(sub.id),
        title: 'Subject MarkSheet (Award List)',
        subtitle: `${selectedExam?.name || 'Examination Session'} • Academic Year: ${selectedExam?.academicYearName || '2026'}`,
        metaItems: subMeta,
        columns: subCols as any,
        data: rows,
        summaryMetrics: subSummaryMetrics as any,
      };
    });
  }, [
    printMode,
    resolvedSubjectsList,
    selectedSubject,
    buildSubjectDataAndStats,
    buildSubjectColumns,
    buildSubjectMetaItems,
    selectedExam,
  ]);

  // Single mode pre-computations
  const singleEvaluation = useMemo(() => {
    return buildSubjectDataAndStats(selectedSubject, true);
  }, [buildSubjectDataAndStats, selectedSubject]);

  const singleColumns = useMemo(() => {
    return buildSubjectColumns(singleEvaluation.subComponents, singleEvaluation.subFullMarks);
  }, [buildSubjectColumns, singleEvaluation]);

  const singleMetaItems = useMemo(() => {
    return buildSubjectMetaItems(selectedSubject);
  }, [buildSubjectMetaItems, selectedSubject]);

  return (
    <UniversalPrintStudio
      isOpen={isOpen}
      onClose={onClose}
      title={
        printMode === 'bulk'
          ? `${selectedExam?.name || 'Academic'} — Bulk Subject MarkSheets (${resolvedSubjectsList.length} Subjects)`
          : 'Subject MarkSheet (Award List)'
      }
      subtitle={
        printMode === 'bulk'
          ? `Batch Award List Studio • ${selectedExam?.academicYearName || '2026'}`
          : `${selectedExam?.name || 'Examination Session'} • Academic Year: ${selectedExam?.academicYearName || '2026'}`
      }
      documents={printMode === 'bulk' ? batchDocuments : undefined}
      data={printMode === 'single' ? singleEvaluation.rows : []}
      columns={printMode === 'single' ? (singleColumns as any) : []}
      metaItems={printMode === 'single' ? (singleMetaItems as any) : []}
      summaryMetrics={printMode === 'single' ? (singleEvaluation.subSummaryMetrics as any) : []}
      defaultOptions={defaultPrintOptions as any}
      onExportCsv={onExportCsv}
      urlSync={true}
      urlParam="print"
      urlParamValue={printMode === 'bulk' ? 'bulk_subject_marksheet' : 'subject_marksheet'}
    />
  );
}

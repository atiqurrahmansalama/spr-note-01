import React, { useState, useMemo, useEffect } from 'react';
import UniversalPrintStudio from '@/components/print/UniversalPrintStudio';
import { PrintBatchDocument } from '@/components/print/types';
import { examStore } from '@/stores/examStore';
import { MarkSheetPrintProps, StudentResult } from '../types';

/**
 * MarkSheetPrint
 * Dedicated Master Mark Sheet & Tabulation Ledger Print Studio.
 * Supports:
 * 1. Single Mode: Vector-perfect Tabulation Ledger for active class/selection.
 * 2. Bulk Mode: 1-click batch printing of Academic Mark Sheets across all classes,
 *    each on its own Landscape page with distinct subject matrix, totals & averages.
 */
export default function MarkSheetPrint({
  isOpen = false,
  onClose,
  exam = null,
  selectedClassId = '',
  selectedClassName = 'All Classes',
  selectedSectionId = 'ALL',
  selectedSectionName = 'All Sections',
  gradingSystem = null,
  subjects = [],
  studentsData = [],
  selectedStudentIds = [],
  initialMode = 'single',
  classesList = [],
  students = [],
  tenantId = 'default',
  totalStudents = 0,
  passedCount = 0,
  failedCount = 0,
  passPercentage = 0,
  stats = {},
  totalMaxMarks = 0,
}: MarkSheetPrintProps) {
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>(() => {
    return initialMode === 'bulk' ? 'bulk' : 'single';
  });

  // Sync external mode changes
  useEffect(() => {
    if (initialMode) {
      setPrintMode(initialMode);
    }
  }, [initialMode]);

  // Helper to build columns dynamically for any subject list
  const buildColumnsForSubjects = (subList: any[]) => {
    const cols: any[] = [
      { id: 'rollNumber', header: 'Roll', label: 'Roll', align: 'center', width: '56px', nowrap: true, bold: true },
      { id: 'studentName', header: 'Student Name', label: 'Student Name', align: 'left', bold: true },
    ];

    (subList || []).forEach((sub) => {
      cols.push({
        id: `subject_${sub.id}`,
        header: sub.subjectName,
        label: sub.subjectName,
        subLabel: `(${sub.fullMarks})`,
        align: 'center',
        rotate: true,
        vertical: true,
        width: '44px',
        headerClassName: 'w-[44px] min-w-[44px] max-w-[44px] text-center p-0.5 pb-1',
        className: 'text-center font-semibold text-xs',
        cell: (val: any, row: StudentResult) => {
          const sm = row.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm || sm.obtained === null || sm.obtained === undefined || sm.status === 'NOT_ENTERED') return '-';
          if (sm.isAbsent) return 'ABS';
          return sm.obtained;
        },
      });
    });

    cols.push(
      { id: 'totalObtained', header: 'Total', label: 'Total Marks', align: 'center', width: '60px', bold: true },
      {
        id: 'overallPercentage',
        header: 'Avg',
        label: 'Percentage',
        align: 'center',
        width: '52px',
        cell: (val: any, row: StudentResult) =>
          row.hasAnyMarks && row.overallPercentage !== null && row.overallPercentage !== undefined
            ? `${row.overallPercentage}%`
            : '0%',
      },
      {
        id: 'overallGpa',
        header: 'GPA',
        label: 'GPA',
        align: 'center',
        width: '52px',
        bold: true,
        cell: (val: any, row: StudentResult) =>
          row.hasAnyMarks && row.overallGpa !== null && row.overallGpa !== undefined
            ? Number(row.overallGpa).toFixed(2)
            : '-',
      },
      {
        id: 'grade',
        header: 'Grade',
        label: 'Grade / Division',
        align: 'center',
        width: '90px',
        bold: true,
        cell: (val: any, row: StudentResult) => (row.hasAnyMarks && row.grade && row.grade !== '-' ? row.grade : '-'),
      },
      {
        id: 'classRank',
        header: 'Rank',
        label: 'Position / Rank',
        align: 'center',
        width: '52px',
        bold: true,
        cell: (val: any, row: StudentResult) => (row.hasAnyMarks && row.classRank && row.classRank !== '-' ? row.classRank : '-'),
      }
    );

    return cols;
  };

  // Helper to build class footer row
  const buildFooterRowForClass = (classStudents: StudentResult[], subList: any[], rules: any[]) => {
    if (!classStudents || classStudents.length === 0) return null;

    const row: Record<string, any> = {
      rollNumber: '-',
      studentName: 'Average',
      studentSection: '-',
    };

    (subList || []).forEach((sub) => {
      const validMarks = classStudents
        .map((st) => st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id)))
        .filter(
          (sm) =>
            sm &&
            sm.hasEntry &&
            !sm.isAbsent &&
            sm.obtained !== null &&
            sm.obtained !== undefined &&
            !isNaN(Number(sm.obtained))
        );

      if (validMarks.length > 0) {
        const sum = validMarks.reduce((acc, m) => acc + Number(m!.obtained), 0);
        const avg = sum / validMarks.length;
        const subFullMarks = Number(sub.fullMarks) || 100;
        const avgPct = subFullMarks > 0 ? (avg / subFullMarks) * 100 : avg;
        row[`subject_${sub.id}`] = avgPct % 1 === 0 ? `${avgPct}%` : `${avgPct.toFixed(1)}%`;
      } else {
        row[`subject_${sub.id}`] = '0%';
      }
    });

    const validStudents = classStudents.filter(
      (st) => st.hasAnyMarks && st.totalObtained !== null && st.totalObtained !== undefined
    );

    if (validStudents.length > 0) {
      const totalSum = validStudents.reduce((acc, st) => acc + Number(st.totalObtained), 0);
      const avgTotal = totalSum / validStudents.length;
      const classMax = subList.reduce((acc, s) => acc + (Number(s.fullMarks) || 0), 0) || 100;
      const totalPct = (avgTotal / classMax) * 100;
      row.totalObtained = totalPct % 1 === 0 ? `${totalPct}%` : `${totalPct.toFixed(1)}%`;

      const pctSum = validStudents.reduce((acc, st) => acc + (Number(st.overallPercentage) || 0), 0);
      const avgPct = pctSum / validStudents.length;
      row.overallPercentage = avgPct % 1 === 0 ? `${avgPct}%` : `${avgPct.toFixed(1)}%`;

      const gpaSum = validStudents.reduce((acc, st) => acc + (Number(st.overallGpa) || 0), 0);
      const avgGpa = gpaSum / validStudents.length;
      const evaluatedGrade = examStore.evaluateGrade(avgPct, rules || []);

      row.overallGpa = avgGpa.toFixed(2);
      row.grade = evaluatedGrade?.grade || '-';
    } else {
      row.totalObtained = '0%';
      row.overallPercentage = '0%';
      row.overallGpa = '-';
      row.grade = '-';
    }

    row.classRank = '-';
    return row;
  };

  // 1. Single Mode Columns Definition
  const singlePrintColumns = useMemo(() => {
    return buildColumnsForSubjects(subjects);
  }, [subjects]);

  // 2. Single Mode Metadata Badges
  const singlePrintMetaItems = useMemo(
    () => [
      { label: 'Examination', value: exam?.name || 'Term Examination' },
      { label: 'Academic Session', value: exam?.academicYearName || 'Current Session' },
      { label: 'Class', value: selectedClassName },
      { label: 'Section', value: selectedSectionName },
      { label: 'Grading Standard', value: gradingSystem?.name || 'Standard Scale' },
      { label: 'Total Candidates', value: `${totalStudents} Registered` },
    ],
    [exam, selectedClassName, selectedSectionName, gradingSystem, totalStudents]
  );

  // 3. Single Mode Summary Metrics
  const singlePrintSummaryMetrics = useMemo(
    () => [
      { label: 'Total Candidates', value: totalStudents },
      { label: 'Passed', value: passedCount },
      { label: 'Failed', value: failedCount },
      { label: 'Pass Rate', value: `${passPercentage}%` },
      { label: 'Highest Marks', value: stats.highestMarks || 0 },
      { label: 'Average GPA', value: stats.averageGpa || 0 },
    ],
    [totalStudents, passedCount, failedCount, passPercentage, stats]
  );

  // 4. Single Mode Clean Footer Row
  const singlePrintFooterRow = useMemo(() => {
    return buildFooterRowForClass(studentsData, subjects, gradingSystem?.rules || []);
  }, [studentsData, subjects, gradingSystem]);

  // 5. Bulk Mode: Compute Tabulation Data for All Target Classes
  const bulkClassesData = useMemo(() => {
    if (printMode !== 'bulk') return [];

    let targetClasses = classesList.filter((c) => c.value && c.value !== '');
    if (targetClasses.length === 0 && Array.isArray(exam?.targetClassIds)) {
      targetClasses = exam.targetClassIds.map((id: any) => ({
        value: String(id),
        label: `Class ${id}`,
      }));
    }

    return targetClasses
      .map((c) => {
        const matrix = examStore.calculateTabulationMatrix(tenantId || 'default', {
          examId: exam?.id,
          classId: c.value,
          sectionId: 'ALL',
          students: students || [],
        });

        const classCols = buildColumnsForSubjects(matrix.subjects || []);
        const classFooter = buildFooterRowForClass(
          matrix.studentsData || [],
          matrix.subjects || [],
          gradingSystem?.rules || []
        );
        const classMeta = [
          { label: 'Examination', value: exam?.name || 'Academic Examination' },
          { label: 'Academic Session', value: exam?.academicYearName || 'Current Session' },
          { label: 'Class', value: c.label },
          { label: 'Section', value: 'All Sections' },
          { label: 'Grading Standard', value: gradingSystem?.name || 'Standard Scale' },
          { label: 'Total Candidates', value: `${matrix.studentsData?.length || 0} Registered` },
        ];

        return {
          classObj: c,
          matrix,
          columns: classCols,
          footerRow: classFooter,
          metaItems: classMeta,
        };
      })
      .filter((item) => item.matrix.studentsData && item.matrix.studentsData.length > 0);
  }, [printMode, classesList, exam, tenantId, students, gradingSystem]);

  // Default Print Options (Landscape for Tabulation Ledger)
  const defaultPrintOptions = useMemo(
    () => ({
      orientation: 'LANDSCAPE' as const,
      pageSize: 'A4' as const,
      density: 'NORMAL' as const,
      showSignatures: true,
    }),
    []
  );

  // 6. Batch Documents for Bulk Mode
  const batchDocuments: PrintBatchDocument[] = useMemo(() => {
    if (printMode !== 'bulk') return [];
    return bulkClassesData.map((item) => ({
      id: String(item.classObj.value),
      title: `${exam?.name || 'Academic Examination'} — Academic Mark Sheet`,
      subtitle: `Class: ${item.classObj.label}`,
      metaItems: item.metaItems,
      columns: item.columns,
      data: item.matrix.studentsData,
      footerRow: item.footerRow,
    }));
  }, [printMode, bulkClassesData, exam?.name]);

  const TABULATION_PLACEHOLDER_KEYS = [
    { key: 'class_name', label: 'Class / Grade', category: 'academic', example: 'Class 10' },
    { key: 'section_name', label: 'Section / Branch', category: 'academic', example: 'Section A' },
    { key: 'exam_name', label: 'Examination Title', category: 'exam', example: 'Annual Examination 2026' },
    { key: 'academic_session', label: 'Academic Session', category: 'academic', example: '2025 - 2026' },
    { key: 'student_name', label: 'Student Name', category: 'student', example: 'Abdullah Al Mamun' },
    { key: 'roll_number', label: 'Roll Number', category: 'student', example: '01' },
    { key: 'total_marks', label: 'Total Full Marks', category: 'exam', example: '500' },
    { key: 'obtained_marks', label: 'Obtained Total Marks', category: 'exam', example: '475' },
    { key: 'gpa', label: 'Overall GPA Score', category: 'exam', example: '5.00' },
    { key: 'grade', label: 'Overall Letter Grade', category: 'exam', example: 'A+' },
    { key: 'merit_position', label: 'Class Rank / Position', category: 'exam', example: '1st' },
    { key: 'percentage', label: 'Average Percentage', category: 'exam', example: '95.00%' },
    { key: 'institution_name', label: 'Institution Name', category: 'institution', example: 'Jamia Islamia Markaz' },
    { key: 'issue_date', label: 'Issue Date', category: 'system', example: new Date().toLocaleDateString() },
    { key: 'principal_signature', label: 'Principal Signature Line', category: 'signatures', example: 'Principal' },
    { key: 'exam_controller_signature', label: 'Exam Controller Signature', category: 'signatures', example: 'Exam Controller' },
  ];

  return (
    <UniversalPrintStudio
      isOpen={isOpen}
      onClose={onClose}
      title={
        printMode === 'bulk'
          ? `${exam?.name || 'Academic Examination'} — Bulk Academic Mark Sheets (${bulkClassesData.length} Classes)`
          : `${exam?.name || 'Academic Examination'} — Academic Mark Sheet`
      }
      subtitle={printMode === 'bulk' ? 'All Classes Master Ledger' : `Class: ${selectedClassName} • Section: ${selectedSectionName}`}
      documents={isOpen && printMode === 'bulk' ? batchDocuments : undefined}
      metaItems={isOpen && printMode === 'single' ? singlePrintMetaItems : []}
      columns={isOpen && printMode === 'single' ? singlePrintColumns : []}
      data={isOpen && printMode === 'single' ? studentsData : []}
      footerRow={isOpen && printMode === 'single' ? singlePrintFooterRow : null}
      summaryMetrics={isOpen && printMode === 'single' ? singlePrintSummaryMetrics : []}
      placeholderKeys={TABULATION_PLACEHOLDER_KEYS}
      defaultOptions={defaultPrintOptions}
      showRows={printMode === 'single'}
      getRowKey={(r: StudentResult) => String(r.studentId)}
      getRowLabel={(r: StudentResult) => r.studentName}
      getRowSubLabel={(r: StudentResult) => `Roll: ${r.rollNumber || '-'} • GPA ${Number(r.overallGpa || 0).toFixed(2)}`}
      visibleRowKeys={selectedStudentIds && selectedStudentIds.length > 0 ? selectedStudentIds.map(String) : null}
      scopeId="tabulation_sheet"
      urlSync={true}
      urlParam="print"
      urlParamValue={printMode === 'bulk' ? 'bulk_marksheet' : 'mark_sheet'}
    />
  );
}

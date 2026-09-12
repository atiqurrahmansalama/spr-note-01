import React, { useState, useMemo, useEffect } from 'react';
import UniversalPrintModal from '@/components/print/UniversalPrintModal';
import PrintDocumentWrapper from '@/components/print/PrintDocumentWrapper';
import PrintTableRenderer from '@/components/print/PrintTableRenderer';
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
      orientation: 'LANDSCAPE',
      pageSize: 'A4',
      density: 'NORMAL',
      showSignatures: true,
    }),
    []
  );

  // 6. Bulk Mode Multi-Page Sheets Content
  const bulkAcademicSheetsContent = useMemo(() => {
    if (printMode !== 'bulk') return null;

    if (bulkClassesData.length === 0) {
      return (
        <div className="p-12 text-center text-xs theme-text-secondary">
          No class records or student marks found for bulk Academic MarkSheet printing.
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        {bulkClassesData.map((item, idx) => (
          <div
            key={item.classObj.value || idx}
            className="relative paper-sheet-wrapper group"
          >
            <div
              className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
              data-size="A4"
              data-orientation="LANDSCAPE"
              data-margin="NORMAL"
              data-density="NORMAL"
              data-color-mode="FULL_COLOR"
              data-page-break="true"
            >
              <PrintDocumentWrapper
                title={`${exam?.name || 'Academic Examination'} — Academic Mark Sheet`}
                subtitle={`Class: ${item.classObj.label}`}
                metaItems={item.metaItems}
                options={defaultPrintOptions}
                pageIndex={idx}
                totalPages={bulkClassesData.length}
                isFirstPage={true}
                isLastPage={true}
              >
                <PrintTableRenderer
                  columns={item.columns}
                  data={item.matrix.studentsData}
                  footerRow={item.footerRow}
                  density="NORMAL"
                />
              </PrintDocumentWrapper>
            </div>
          </div>
        ))}
      </div>
    );
  }, [printMode, bulkClassesData, exam?.name, defaultPrintOptions]);

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        printMode === 'bulk'
          ? `${exam?.name || 'Academic Examination'} — Bulk Academic Mark Sheets (${bulkClassesData.length} Classes)`
          : `${exam?.name || 'Academic Examination'} — Academic Mark Sheet`
      }
      subtitle={printMode === 'bulk' ? 'All Classes Master Ledger' : `Class: ${selectedClassName} • Section: ${selectedSectionName}`}
      metaItems={printMode === 'single' ? singlePrintMetaItems : []}
      columns={printMode === 'single' ? singlePrintColumns : []}
      data={printMode === 'single' ? studentsData : []}
      footerRow={printMode === 'single' ? singlePrintFooterRow : null}
      summaryMetrics={printMode === 'single' ? singlePrintSummaryMetrics : []}
      defaultOptions={defaultPrintOptions}
      showRows={printMode === 'single'}
      getRowKey={(r: StudentResult) => String(r.studentId)}
      getRowLabel={(r: StudentResult) => r.studentName}
      getRowSubLabel={(r: StudentResult) => `Roll: ${r.rollNumber || '-'} • GPA ${Number(r.overallGpa || 0).toFixed(2)}`}
      visibleRowKeys={selectedStudentIds && selectedStudentIds.length > 0 ? selectedStudentIds.map(String) : null}
      customSheets={printMode === 'bulk'}
      urlSync={true}
      urlParam="print"
      urlParamValue={printMode === 'bulk' ? 'bulk_marksheet' : 'mark_sheet'}
    >
      {printMode === 'bulk' ? bulkAcademicSheetsContent : null}
    </UniversalPrintModal>
  );
}

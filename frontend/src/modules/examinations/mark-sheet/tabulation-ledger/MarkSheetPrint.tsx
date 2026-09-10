import React, { useMemo } from 'react';
import UniversalPrintModal from '@/components/print/UniversalPrintModal';
import { examStore } from '@/stores/examStore';
import { MarkSheetPrintProps, StudentResult } from '../types';

/**
 * MarkSheetPrint
 * Dedicated Master Mark Sheet & Tabulation Ledger Print Studio.
 * Encapsulates print columns, metadata badges, summary statistics,
 * and footer average rows for seamless printing and export.
 */
export default function MarkSheetPrint({
  isOpen = false,
  onClose,
  exam,
  selectedClassId,
  selectedClassName = 'All Classes',
  selectedSectionId = 'ALL',
  selectedSectionName = 'All Sections',
  gradingSystem,
  subjects = [],
  studentsData = [],
  totalStudents = 0,
  passedCount = 0,
  failedCount = 0,
  passPercentage = 0,
  stats = {},
  totalMaxMarks = 0,
}: MarkSheetPrintProps) {
  // 1. Columns Definition for Universal Print Studio
  const printColumns = useMemo(() => {
    const cols: any[] = [
      { id: 'rollNumber', header: 'Roll', label: 'Roll', align: 'center', width: '56px', nowrap: true, bold: true },
      { id: 'studentName', header: 'Student Name', label: 'Student Name', align: 'left', bold: true },
    ];

    (subjects || []).forEach((sub) => {
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
      },
    );

    return cols;
  }, [subjects]);

  // 2. Document Metadata Badges
  const printMetaItems = useMemo(
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

  // 3. Summary Metrics
  const printSummaryMetrics = useMemo(
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

  // 4. Clean Print Footer Row for Subject & Overall Averages
  const printFooterRow = useMemo(() => {
    if (!studentsData || studentsData.length === 0) return null;

    const row: Record<string, any> = {
      rollNumber: '-',
      studentName: 'Average',
      studentSection: '-',
    };

    // Calculate individual subject averages (formatted as percentage)
    (subjects || []).forEach((sub) => {
      const validMarks = studentsData
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

    const validStudents = studentsData.filter(
      (st) => st.hasAnyMarks && st.totalObtained !== null && st.totalObtained !== undefined
    );

    if (validStudents.length > 0) {
      const totalSum = validStudents.reduce((acc, st) => acc + Number(st.totalObtained), 0);
      const avgTotal = totalSum / validStudents.length;
      const totalMax = totalMaxMarks > 0 ? totalMaxMarks : 100;
      const totalPct = (avgTotal / totalMax) * 100;
      row.totalObtained = totalPct % 1 === 0 ? `${totalPct}%` : `${totalPct.toFixed(1)}%`;

      const pctSum = validStudents.reduce((acc, st) => acc + (Number(st.overallPercentage) || 0), 0);
      const avgPct = pctSum / validStudents.length;
      row.overallPercentage = avgPct % 1 === 0 ? `${avgPct}%` : `${avgPct.toFixed(1)}%`;

      const gpaSum = validStudents.reduce((acc, st) => acc + (Number(st.overallGpa) || 0), 0);
      const avgGpa = gpaSum / validStudents.length;
      const evaluatedGrade = examStore.evaluateGrade(avgPct, gradingSystem?.rules || []);

      row.overallGpa = avgGpa.toFixed(2);
      row.grade = evaluatedGrade?.grade || '-';
    } else {
      row.totalObtained = '0%';
      row.overallPercentage = '0%';
      row.overallGpa = '-';
      row.grade = '-';
    }

    row.classRank = '-';
    row.status = `${passPercentage}%`;

    return row;
  }, [studentsData, subjects, totalMaxMarks, gradingSystem, passPercentage]);

  // 5. Default Print Options
  const defaultPrintOptions = useMemo(
    () => ({
      orientation: 'LANDSCAPE',
      pageSize: 'A4',
      density: 'NORMAL',
      showSignatures: true,
    }),
    []
  );

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${exam?.name || 'Academic Examination'} — Master Mark Sheet`}
      subtitle={`Class: ${selectedClassName} • Section: ${selectedSectionName}`}
      metaItems={printMetaItems}
      columns={printColumns}
      data={studentsData}
      footerRow={printFooterRow}
      summaryMetrics={printSummaryMetrics}
      defaultOptions={defaultPrintOptions}
      urlSync={true}
      urlParam="print"
      urlParamValue="mark_sheet"
    />
  );
}

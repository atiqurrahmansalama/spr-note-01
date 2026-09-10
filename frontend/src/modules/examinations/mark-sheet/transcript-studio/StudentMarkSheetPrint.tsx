import React, { useMemo } from 'react';
import UniversalPrintModal from '@/components/print/UniversalPrintModal';
import { StudentMarkSheetPrintProps } from '../types';

/**
 * StudentMarkSheetPrint
 * Dedicated Master Student Mark Sheet Print Studio.
 * Encapsulates single student academic transcript with official grading breakdown,
 * summary performance metrics, metadata badges, footer summary, and export to PDF/PNG/Images.
 */
export default function StudentMarkSheetPrint({
  isOpen = false,
  onClose,
  exam = null,
  studentResult = null,
  studentsData = [],
  selectedClassName = 'Class',
  selectedSectionName = 'All Sections',
  gradingSystem = null,
}: StudentMarkSheetPrintProps) {
  const activeStudentName = studentResult?.studentName || 'Student';
  const activeStudentRoll = studentResult?.rollNumber || '-';

  // 1. Calculate highest marks map across students if available
  const highestMarksMap = useMemo(() => {
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
  }, [studentsData]);

  // 2. Columns Definition for Universal Print Studio & PrintTableRenderer
  const printColumns = useMemo(() => {
    return [
      {
        id: 'subjectName',
        header: 'Subject Name',
        label: 'Subject Name',
        align: 'left',
        bold: true,
        cell: (_: any, row: any, idx: number) => row.subjectName || `Subject ${idx + 1}`,
      },
      {
        id: 'full',
        header: 'Full Marks',
        label: 'Full Marks',
        align: 'center',
        width: '84px',
        mono: true,
        cell: (_: any, row: any) => row.full ?? '-',
      },
      {
        id: 'highest',
        header: 'Highest',
        label: 'Highest',
        align: 'center',
        width: '84px',
        mono: true,
        cell: (_: any, row: any) => {
          const val = row.highestMarks ?? row.highest ?? highestMarksMap.get(row.subjectId);
          return val !== undefined && val !== null ? val : (row.obtained ?? '-');
        },
      },
      {
        id: 'obtained',
        header: 'Obtained',
        label: 'Obtained',
        align: 'center',
        width: '84px',
        bold: true,
        mono: true,
        cell: (_: any, row: any) => (row.isAbsent ? 'ABS' : (row.obtained ?? '-')),
      },
      {
        id: 'gradePoint',
        header: 'GPA',
        label: 'GPA',
        align: 'center',
        width: '72px',
        bold: true,
        mono: true,
        cell: (_: any, row: any) =>
          row.gradePoint !== undefined && row.gradePoint !== null ? Number(row.gradePoint).toFixed(2) : '-',
      },
      {
        id: 'grade',
        header: 'Grade',
        label: 'Grade',
        align: 'center',
        width: '72px',
        bold: true,
        mono: true,
        cell: (_: any, row: any) => row.grade || (row.isPassed ? 'P' : 'F'),
      },
    ];
  }, [highestMarksMap]);

  // 3. Document Metadata Badges (Line 1: Student Name, Roll No, Student ID | Line 2: Class, Section)
  const printMetaItems = useMemo(
    () => [
      // Line 1: Student Identification
      { label: 'Student Name', value: activeStudentName },
      { label: 'Roll No', value: String(activeStudentRoll) },
      {
        label: 'Student ID',
        value: studentResult?.studentUniqId || (studentResult?.studentId ? `ST-${studentResult.studentId}` : '-'),
      },
      // Line 2: Academic Placement
      { label: 'Class', value: selectedClassName },
      { label: 'Section', value: selectedSectionName },
    ],
    [activeStudentName, activeStudentRoll, studentResult, selectedClassName, selectedSectionName]
  );

  // 4. Performance Total & Average Rows directly integrated in table footer
  const printFooterRows = useMemo(() => {
    if (!studentResult) return [];
    return [
      {
        subjectName: 'Grand Total Marks',
        full: studentResult.totalFull ?? '-',
        highest: '-',
        obtained: studentResult.totalObtained ?? '-',
        gradePoint:
          studentResult.overallGpa !== null && studentResult.overallGpa !== undefined
            ? Number(studentResult.overallGpa).toFixed(2)
            : '-',
        grade: studentResult.grade || studentResult.division || '-',
      },
      {
        subjectName: 'Average Percentage & Result Status',
        full: '100%',
        highest: '-',
        obtained: `${studentResult.overallPercentage ?? 0}%`,
        gradePoint:
          studentResult.classRank && studentResult.classRank !== '-'
            ? `${studentResult.classRank}`
            : '-',
        grade: studentResult.isOverallPass ? 'PASSED' : 'FAILED',
      },
    ];
  }, [studentResult]);

  // 5. Default Print Studio Configuration (A4 Portrait with 3-column / 2-line metadata layout)
  const defaultPrintOptions = useMemo(
    () => ({
      orientation: 'PORTRAIT',
      pageSize: 'A4',
      showSignatures: true,
      showMeta: true,
      showSummary: false,
      metaCols: 3,
    }),
    []
  );

  const subjectMarksList = studentResult?.subjectMarks || [];

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${exam?.name || 'Academic Examination'} — Student Mark Sheet`}
      subtitle={`Class: ${selectedClassName}  •  Section: ${selectedSectionName}  •  Session: ${exam?.academicYearName || 'Current Session'}`}
      metaItems={printMetaItems}
      columns={printColumns}
      data={subjectMarksList}
      footerRows={printFooterRows}
      defaultOptions={defaultPrintOptions}
      urlSync={true}
      urlParam="print"
      urlParamValue="student_marksheet"
    />
  );
}

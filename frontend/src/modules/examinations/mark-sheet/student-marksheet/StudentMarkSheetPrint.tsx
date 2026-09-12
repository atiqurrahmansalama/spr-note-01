import React, { useState, useMemo, useCallback, useEffect } from 'react';
import UniversalPrintModal from '@/components/print/UniversalPrintModal';
import PrintDocumentWrapper from '@/components/print/PrintDocumentWrapper';
import PrintTableRenderer from '@/components/print/PrintTableRenderer';
import CustomInput from '@/components/ui/CustomInput';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import { SearchIcon, UserIcon, PrinterIcon, UsersIcon } from '@/components/ui/Icons';
import { TranscriptPrintProps, StudentResult } from '../types';
import {
  computeHighestMarksMap,
  computeTotalFullMarks,
  computeTotalObtainedMarks,
  formatRankOrdinal,
  getScaleTopGradeAndGpa,
  computeClassStats,
} from './transcriptUtils';

/**
 * StudentMarkSheetPrint (Student MarkSheet & Bulk Transcript Print Studio)
 * Dedicated Master Student Mark Sheet & Bulk Academic Transcript Print Studio.
 * Supports:
 * 1. Single Student Mode: Vector-perfect individual student transcript.
 * 2. Bulk Class Mode: 1-click batch printing of all or selected students,
 *    each on an independent physical page with clean page breaks.
 */
export default function StudentMarkSheetPrint({
  isOpen = false,
  onClose,
  exam = null,
  studentResult = null,
  studentsData = [],
  selectedStudentIds = [],
  initialMode = 'single',
  selectedClassName = 'Class',
  selectedSectionName = 'All Sections',
  gradingSystem = null,
  subjects = [],
  totalStudents = 0,
}: TranscriptPrintProps) {
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>(() => {
    if (initialMode === 'bulk') return 'bulk';
    if (!studentResult && studentsData.length > 0) return 'bulk';
    return 'single';
  });

  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    if (studentResult?.studentId) return String(studentResult.studentId);
    if (studentsData[0]?.studentId) return String(studentsData[0].studentId);
    return '';
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
      return new Set(selectedStudentIds.map(String));
    }
    return new Set(studentsData.map((s) => String(s.studentId)));
  });

  const [studentSearch, setStudentSearch] = useState<string>('');

  // Sync external mode changes
  useEffect(() => {
    if (initialMode) {
      setPrintMode(initialMode);
    }
  }, [initialMode]);

  // Sync active student result changes
  useEffect(() => {
    if (studentResult?.studentId) {
      setActiveStudentId(String(studentResult.studentId));
    }
  }, [studentResult]);

  // Sync selected student IDs changes
  useEffect(() => {
    if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
      setSelectedIds(new Set(selectedStudentIds.map(String)));
    } else if (studentsData.length > 0) {
      setSelectedIds(new Set(studentsData.map((s) => String(s.studentId))));
    }
  }, [selectedStudentIds, studentsData]);

  // 1. Calculate highest marks map across students if available
  const highestMarksMap = useMemo(() => {
    return computeHighestMarksMap(studentsData);
  }, [studentsData]);

  // 2. Columns Definition for PrintTableRenderer
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
        header: 'Full',
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

  // Dynamic top scale benchmarks derived from active grading system schema
  const { scaleMaxGpa, scaleTopGrade } = useMemo(() => {
    return getScaleTopGradeAndGpa(gradingSystem);
  }, [gradingSystem]);

  // Calculate class-level highest benchmarks across students
  const classStats = useMemo(() => {
    return computeClassStats(studentsData, scaleTopGrade);
  }, [studentsData, scaleTopGrade]);

  // Helper to generate metadata items for any student
  const getStudentMetaItems = useCallback(
    (st: StudentResult | null) => {
      const name = st?.studentName || 'Student';
      const roll = st?.rollNumber || '-';
      const uniqId = st?.studentUniqId || (st?.studentId ? `ST-${st.studentId}` : '-');
      return [
        { label: 'Student Name', value: name },
        { label: 'Roll No', value: String(roll) },
        { label: 'Student ID', value: String(uniqId) },
        { label: 'Class', value: selectedClassName },
        {
          label: 'Section',
          value: selectedSectionName && selectedSectionName !== 'ALL' ? selectedSectionName : 'All Sections',
        },
        {
          label: 'Academic Session',
          value: exam?.academicYearName || 'Current Session',
        },
      ];
    },
    [selectedClassName, selectedSectionName, exam?.academicYearName]
  );

  // Helper to generate footer rows for any student
  const getStudentFooterRows = useCallback(
    (st: StudentResult | null) => {
      if (!st) return [];

      const rankText = formatRankOrdinal(
        st.classRank || st.meritPosition || st.rank || st.position
      );
      const gpaText =
        st.overallGpa !== null && st.overallGpa !== undefined ? Number(st.overallGpa).toFixed(2) : '-';
      const gradeText = st.grade || st.division || '-';
      const totalFull = computeTotalFullMarks(st, subjects);
      const totalObtained = computeTotalObtainedMarks(st);

      return [
        { isSpacer: true },
        // 1. Total Marks
        {
          mergeIndex: true,
          cells: [
            {
              colSpan: 1,
              content: 'Total Marks',
              align: 'left',
              className: 'font-bold theme-text-primary !pl-8',
              style: { paddingLeft: '32px' },
            },
            {
              colSpan: 1,
              content: totalFull > 0 ? totalFull : '-',
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary font-mono',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: classStats.highestTotal,
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary font-mono',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: totalObtained,
              align: 'center',
              className: 'font-bold theme-text-primary font-mono',
            },
            {
              colSpan: 2,
              content: '',
              borderless: true,
              className: 'border-0 border-transparent bg-transparent',
            },
          ],
        },
        // 2. Average Marks
        {
          mergeIndex: true,
          cells: [
            {
              colSpan: 1,
              content: 'Average Marks',
              align: 'left',
              className: 'font-bold theme-text-primary !pl-8',
              style: { paddingLeft: '32px' },
            },
            {
              colSpan: 1,
              content: '100%',
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary font-mono',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: classStats.highestPercentage,
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary font-mono',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: `${st.overallPercentage ?? 0}%`,
              align: 'center',
              className: 'font-bold theme-text-primary font-mono',
            },
            {
              colSpan: 2,
              content: '',
              borderless: true,
              className: 'border-0 border-transparent bg-transparent',
            },
          ],
        },
        // 3. GPA
        {
          mergeIndex: true,
          cells: [
            {
              colSpan: 1,
              content: 'GPA',
              align: 'left',
              className: 'font-bold theme-text-primary !pl-8',
              style: { paddingLeft: '32px' },
            },
            {
              colSpan: 1,
              content: scaleMaxGpa,
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary font-mono',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: classStats.highestGpa !== '-' ? classStats.highestGpa : scaleMaxGpa,
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary font-mono',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: gpaText,
              align: 'center',
              className: 'font-bold theme-text-primary font-mono',
            },
            {
              colSpan: 2,
              content: '',
              borderless: true,
              className: 'border-0 border-transparent bg-transparent',
            },
          ],
        },
        // 4. Grade
        {
          mergeIndex: true,
          cells: [
            {
              colSpan: 1,
              content: 'Grade',
              align: 'left',
              className: 'font-bold theme-text-primary !pl-8',
              style: { paddingLeft: '32px' },
            },
            {
              colSpan: 1,
              content: scaleTopGrade,
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: classStats.highestGrade !== '-' ? classStats.highestGrade : scaleTopGrade,
              align: 'center',
              className: 'font-normal !font-normal theme-text-secondary',
              style: { fontWeight: 'normal' },
            },
            {
              colSpan: 1,
              content: gradeText,
              align: 'center',
              className: 'font-bold theme-text-primary',
            },
            {
              colSpan: 2,
              content: '',
              borderless: true,
              className: 'border-0 border-transparent bg-transparent',
            },
          ],
        },
        // 5. Result & Merit Status
        {
          mergeIndex: true,
          cells: [
            {
              colSpan: 1,
              content: 'Result & Merit Status',
              align: 'left',
              className: 'font-bold theme-text-primary !pl-8',
              style: { paddingLeft: '32px' },
            },
            {
              colSpan: 3,
              content: !st.isOverallPass ? (
                <span className="font-bold theme-danger">FAILED</span>
              ) : rankText && rankText !== '-' ? (
                <span className="font-normal !font-normal theme-text-primary" style={{ fontWeight: 400 }}>
                  Positioned <strong className="font-bold !font-bold theme-accent font-mono px-0.5" style={{ fontWeight: 700 }}>{rankText}</strong> out of {totalStudents || studentsData?.length || 0} Students
                </span>
              ) : (
                <span className="font-medium theme-success">PASSED</span>
              ),
              align: 'center',
              className: '!font-normal tracking-tight theme-text-primary',
              style: { fontWeight: 'normal' },
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
    },
    [classStats, scaleMaxGpa, scaleTopGrade, subjects, totalStudents, studentsData]
  );

  // Active student for single mode
  const activeSingleStudent = useMemo(() => {
    if (activeStudentId) {
      const found = studentsData.find((s) => String(s.studentId) === String(activeStudentId));
      if (found) return found;
    }
    return studentResult || studentsData[0] || null;
  }, [studentsData, activeStudentId, studentResult]);

  // Filtered list of students for bulk mode
  const bulkStudentsList = useMemo(() => {
    return studentsData.filter((s) => selectedIds.has(String(s.studentId)));
  }, [studentsData, selectedIds]);

  // Handle selection toggles
  const handleToggleStudent = (id: string | number) => {
    const strId = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(studentsData.map((s) => String(s.studentId))));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Default print configuration
  const defaultPrintOptions = useMemo(
    () => ({
      orientation: 'PORTRAIT',
      pageSize: 'A4',
      showSignatures: true,
      showMeta: true,
      showMetaBox: true,
      showSummary: false,
      metaCols: 3,
      metaGridTemplate: '1.75fr 1fr 1.15fr',
    }),
    []
  );

  // 3. Bulk Mode Multi-Page Sheets Children
  const bulkPrintSheetsContent = useMemo(() => {
    if (printMode !== 'bulk') return null;

    if (bulkStudentsList.length === 0) {
      return (
        <div className="p-12 text-center text-xs theme-text-secondary">
          No students selected for bulk printing. Please select at least one student.
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        {bulkStudentsList.map((st, sIdx) => {
          const stMeta = getStudentMetaItems(st);
          const stFooter = getStudentFooterRows(st);
          const stMarks = st.subjectMarks || [];

          return (
            <div
              key={st.studentId || sIdx}
              className="relative paper-sheet-wrapper group"
            >
              <div
                className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                data-size="A4"
                data-orientation="PORTRAIT"
                data-margin="NORMAL"
                data-density="NORMAL"
                data-color-mode="FULL_COLOR"
                data-page-break="true"
              >
                <PrintDocumentWrapper
                  title={exam?.name ? `${exam.name} — Student Mark Sheet` : 'Academic Transcript & Mark Sheet'}
                  subtitle=""
                  metaItems={stMeta}
                  options={defaultPrintOptions}
                  pageIndex={sIdx}
                  totalPages={bulkStudentsList.length}
                  isFirstPage={true}
                  isLastPage={true}
                >
                  <PrintTableRenderer
                    columns={printColumns}
                    data={stMarks}
                    footerRows={stFooter}
                    density="NORMAL"
                  />
                </PrintDocumentWrapper>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [printMode, bulkStudentsList, getStudentMetaItems, getStudentFooterRows, printColumns, exam?.name]);

  const singleMetaItems = useMemo(() => getStudentMetaItems(activeSingleStudent), [getStudentMetaItems, activeSingleStudent]);
  const singleFooterRows = useMemo(() => getStudentFooterRows(activeSingleStudent), [getStudentFooterRows, activeSingleStudent]);
  const singleData = activeSingleStudent?.subjectMarks || [];

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        printMode === 'bulk'
          ? `${exam?.name || 'Academic'} — Bulk Student Mark Sheets (${bulkStudentsList.length} Students)`
          : exam?.name
          ? `${exam.name} — Student Mark Sheet`
          : 'Academic Transcript & Mark Sheet'
      }
      subtitle={printMode === 'bulk' ? `Class: ${selectedClassName} • Batch Print` : ''}
      metaItems={printMode === 'single' ? singleMetaItems : []}
      columns={printMode === 'single' ? printColumns : []}
      data={printMode === 'single' ? singleData : []}
      footerRows={printMode === 'single' ? singleFooterRows : []}
      defaultOptions={defaultPrintOptions}
      customSheets={printMode === 'bulk'}
      urlSync={true}
      urlParam="print"
      urlParamValue={printMode === 'bulk' ? 'bulk_student_marksheet' : 'student_marksheet'}
    >
      {printMode === 'bulk' ? bulkPrintSheetsContent : null}
    </UniversalPrintModal>
  );
}

// Re-export with legacy alias for full backwards compatibility
export { StudentMarkSheetPrint as TranscriptPrint };

import React, { useMemo } from 'react';
import UniversalPrintModal from '../../../../components/print/UniversalPrintModal';
import { formatDateLabel, formatCleanRange } from '../../exam-schedules/utils/examScheduleUtils';
import { examStore } from '@/stores/examStore';

/**
 * MarkEntryPrintModal
 * Encapsulated Print Studio for Mark Entry and Official Award Lists.
 * Computes columns, student mark rows, document metadata, and stats metrics.
 */
export default function MarkEntryPrintModal({
  isOpen = false,
  onClose,
  selectedExam,
  selectedSubject,
  targetStudents = [],
  components = [],
  fullMarks = 100,
  passMarks = 33,
  marksGrid = {},
  activeGradingSystem,
  stats,
  onExportCsv,
}) {
  // 1. Dynamic Columns Definition for Universal Print Studio
  const printColumns = useMemo(() => {
    const cols = [
      {
        id: 'roll',
        label: 'Roll',
        bold: true,
        mono: true,
        align: 'center',
        nowrap: true,
        render: (row) => row.roll,
      },
      {
        id: 'regNo',
        label: 'Student ID',
        mono: true,
        align: 'center',
        nowrap: true,
        render: (row) => row.regNo,
      },
      {
        id: 'name',
        label: 'Student Name',
        bold: true,
        render: (row) => row.name,
      },
      {
        id: 'status',
        label: 'Status',
        align: 'center',
        nowrap: true,
        render: (row) =>
          row.isAbsent ? (
            <span className="text-red-600 font-bold">ABS</span>
          ) : (
            <span className="text-emerald-700 font-bold">PRES</span>
          ),
      },
    ];

    // Evaluation Component Columns
    components.forEach((comp, cIdx) => {
      cols.push({
        id: `comp_${cIdx}`,
        label: comp.name,
        subLabel: `(Max: ${comp.maxMarks})`,
        align: 'center',
        mono: true,
        nowrap: true,
        render: (row) => (row.isAbsent ? '0' : row.componentMarks?.[`comp_${cIdx}`] || '0'),
      });
    });

    // Total Marks Column
    cols.push({
      id: 'total',
      label: `Total (${fullMarks})`,
      align: 'center',
      bold: true,
      mono: true,
      nowrap: true,
      render: (row) => (row.isAbsent ? 'ABS' : row.obtainedMarks),
    });

    // Grade Column
    cols.push({
      id: 'grade',
      label: 'Grade',
      align: 'center',
      bold: true,
      nowrap: true,
      render: (row) => (row.isAbsent ? 'ABS' : row.grade),
    });

    // GPA Column
    cols.push({
      id: 'gpa',
      label: 'GPA',
      align: 'center',
      mono: true,
      nowrap: true,
      render: (row) =>
        row.isAbsent ? '0.00' : row.gpa !== undefined ? Number(row.gpa).toFixed(2) : '-',
    });

    // Remarks Column
    cols.push({
      id: 'remarks',
      label: 'Remarks',
      render: (row) =>
        row.teacherRemarks || (row.isPassed ? 'Passed' : row.isAbsent ? 'Absent' : 'Failed'),
    });

    return cols;
  }, [components, fullMarks]);

  // 2. Dataset for Universal Print Studio
  const printRows = useMemo(() => {
    return targetStudents.map((st) => {
      const stId = String(st.id);
      const rowData = marksGrid[stId] || {};
      const isAbsent = Boolean(rowData.isAbsent);
      const obtained = isAbsent ? 0 : Number(rowData.obtainedMarks) || 0;
      const pct = fullMarks > 0 ? (obtained / fullMarks) * 100 : 0;
      const gradeEval = examStore.evaluateGrade(pct, activeGradingSystem?.rules || []);
      const isPassed = !isAbsent && obtained >= passMarks;

      return {
        id: stId,
        roll: st.roll_number || st.roll || st.uniq_id || '-',
        regNo: st.student_id || st.reg_no || '-',
        name: st.name_en || st.name || 'Student',
        isAbsent,
        obtainedMarks: rowData.obtainedMarks !== '' ? rowData.obtainedMarks : '-',
        grade: gradeEval.grade,
        gpa: gradeEval.gradePoint !== undefined ? Number(gradeEval.gradePoint).toFixed(1) : (gradeEval.gpa || '-'),
        isPassed,
        teacherRemarks: rowData.teacherRemarks,
        componentMarks: rowData.componentMarks || {},
      };
    });
  }, [targetStudents, marksGrid, fullMarks, passMarks, activeGradingSystem]);

  // 3. Document Metadata Badges
  const printMetaItems = useMemo(() => {
    if (!selectedSubject) return [];
    return [
      {
        label: 'Subject',
        value: `${selectedSubject.subjectName || ''}${
          selectedSubject.subjectCode ? ` (${selectedSubject.subjectCode})` : ''
        }`,
      },
      {
        label: 'Class & Section',
        value: `Class ${selectedSubject.className || ''} (${
          selectedSubject.sectionName || 'All Sections'
        })`,
      },
      {
        label: 'Curriculum',
        value: selectedSubject.curriculumBookName || 'Standard Syllabus',
      },
      { label: 'Exam Date', value: formatDateLabel(selectedSubject.examDate) },
      {
        label: 'Time & Shift',
        value: `${selectedSubject.shiftName ? `${selectedSubject.shiftName}, ` : ''}${formatCleanRange(
          selectedSubject.startTime,
          selectedSubject.endTime
        )}`,
      },
      { label: 'Room / Hall', value: selectedSubject.roomNo || 'Main Hall' },
      {
        label: 'Examiner',
        value:
          selectedSubject.examinerName || selectedSubject.teacherName || 'Assigned Examiner',
      },
      { label: 'Grading Scale', value: activeGradingSystem?.name || 'Standard Scale' },
    ];
  }, [selectedSubject, activeGradingSystem]);

  // 4. Summary Metrics for Print
  const printSummaryMetrics = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total Enrolled', value: stats.totalStudents || 0 },
      { label: 'Present Students', value: stats.presentCount || 0 },
      { label: 'Absent Students', value: stats.absentCount || 0 },
      { label: 'Passed Students', value: stats.passedCount || 0 },
      { label: 'Failed Students', value: stats.failedCount || 0 },
      { label: 'Pass Rate', value: `${stats.passRate || 0}%` },
    ];
  }, [stats]);

  // 5. Default Print Options & Signatures
  const defaultPrintOptions = useMemo(
    () => ({
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      density: 'NORMAL',
      signatureLines: [
        {
          id: 'examiner',
          label: 'Course Examiner / Teacher',
          sub: selectedSubject?.examinerName || selectedSubject?.teacherName || 'Subject Teacher',
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
      ],
    }),
    [selectedSubject]
  );

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title="Teacher Marksheet & Award List"
      subtitle={`${selectedExam?.name || 'Examination Session'} • Academic Year: ${selectedExam?.academicYearName || '2026'}`}
      data={printRows}
      columns={printColumns}
      metaItems={printMetaItems}
      summaryMetrics={printSummaryMetrics}
      defaultOptions={defaultPrintOptions}
      onExportCsv={onExportCsv}
      urlSync={true}
      urlParam="print"
      urlParamValue="award_list"
    />
  );
}

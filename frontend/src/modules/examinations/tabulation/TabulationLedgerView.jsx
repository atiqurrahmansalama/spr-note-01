import React, { useState, useMemo, useEffect } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import MetricsGrid from '../../../components/ui/MetricsGrid';
import DataTable from '../../../components/ui/DataTable';
import CustomButton from '../../../components/ui/CustomButton';
import UniversalPrintModal from '../../../components/print/UniversalPrintModal';
import ResultGazetteModal from './ResultGazetteModal';
import TabulationHeader from './TabulationHeader';
import MarkEntryFilterBar from '../mark-entry/components/MarkEntryFilterBar';
import {
  ChartBarIcon,
  UserIcon,
  CheckCircleIcon,
  TrophyIcon,
  AcademicCapIcon,
} from '../../../components/ui/Icons';
import useExamData from '../hooks/useExamData';
import useTabulationData from '../hooks/useTabulationData';

/**
 * TabulationLedgerView (Master Mark Sheet Ledger)
 * Enterprise Master Mark Sheet and Academic Ledger with multi-level ranking,
 * metric statistics, full sorting, and integrated Canva/Adobe-Grade Universal Print Studio.
 */
export default function TabulationLedgerView({
  initialExamId = null,
  isEmbedded = false,
  onNavigateToTranscripts,
}) {
  const {
    tenantId,
    exams,
    students,
    classOptions,
    departmentOptions,
    sectionOptions,
    examSubjects,
  } = useExamData();

  const [selectedExamId, setSelectedExamId] = useState(initialExamId || (exams[0]?.id ? String(exams[0].id) : ''));
  const [filterDepartmentId, setFilterDepartmentId] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState(classOptions[0]?.value ? String(classOptions[0].value) : '');
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [isGazetteOpen, setIsGazetteOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);

  // Sync initialExamId
  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(String(initialExamId));
    }
  }, [initialExamId]);

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

  // Filtered Class Options: Narrowed down to selected Exam target classes and Department
  const filteredClassOptions = useMemo(() => {
    let list = classOptions;

    const selectedExamObj = exams.find((e) => String(e.id) === String(selectedExamId));
    if (selectedExamObj && Array.isArray(selectedExamObj.targetClassIds) && selectedExamObj.targetClassIds.length > 0) {
      const targetSet = new Set(selectedExamObj.targetClassIds.map((id) => String(id)));
      const hasMatch = list.some((c) => targetSet.has(String(c.value)));
      if (hasMatch) {
        list = list.filter((c) => targetSet.has(String(c.value)));
      }
    }

    if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      list = list.filter((c) => {
        if (c.departmentId && String(c.departmentId) === String(filterDepartmentId)) {
          return true;
        }
        return (examSubjects || []).some(
          (s) =>
            String(s.classId) === String(c.value) &&
            (s.departmentId === 'ALL' || String(s.departmentId) === String(filterDepartmentId))
        );
      });
    }

    return [{ value: '', label: 'All Classes' }, ...list];
  }, [classOptions, exams, selectedExamId, filterDepartmentId, examSubjects]);

  // Filtered Section Options: Narrowed down to selected Class and Department
  const filteredSectionOptions = useMemo(() => {
    let rawList = sectionOptions.filter((s) => s.value !== 'ALL');

    if (selectedClassId) {
      rawList = rawList.filter((s) => {
        if (s.classId && String(s.classId) === String(selectedClassId)) return true;
        return (examSubjects || []).some(
          (sub) => String(sub.classId) === String(selectedClassId) && String(sub.sectionId) === String(s.value)
        );
      });
    } else if (filterDepartmentId && filterDepartmentId !== 'ALL') {
      const allowedClassIds = new Set(
        filteredClassOptions
          .map((c) => String(c.value))
          .filter((v) => v && v !== '')
      );
      rawList = rawList.filter((s) => s.classId && allowedClassIds.has(String(s.classId)));
    }

    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...rawList];
  }, [sectionOptions, selectedClassId, filterDepartmentId, filteredClassOptions, examSubjects]);

  // Cascading Auto-Reset: When Department changes, ensure Class is valid
  useEffect(() => {
    if (selectedClassId) {
      const isValidClass = filteredClassOptions.some(
        (c) => c.value && String(c.value) === String(selectedClassId)
      );
      if (!isValidClass) {
        setSelectedClassId('');
        setSelectedSectionId('ALL');
      }
    }
  }, [filterDepartmentId, filteredClassOptions, selectedClassId]);

  // Cascading Auto-Reset: When Class changes, ensure Section is valid
  useEffect(() => {
    if (selectedSectionId && selectedSectionId !== 'ALL') {
      const isValidSection = filteredSectionOptions.some(
        (s) => s.value !== 'ALL' && String(s.value) === String(selectedSectionId)
      );
      if (!isValidSection) {
        setSelectedSectionId('ALL');
      }
    }
  }, [selectedClassId, filteredSectionOptions, selectedSectionId]);

  const {
    exam,
    subjects,
    studentsData,
    gradingSystem,
    totalStudents,
    passedCount,
    failedCount,
    passPercentage,
    stats,
    exportToCsv,
  } = useTabulationData({
    tenantId,
    examId: selectedExamId,
    classId: selectedClassId,
    sectionId: selectedSectionId,
    students,
  });

  const selectedClassObj = useMemo(() => {
    return classOptions.find((c) => String(c.value) === String(selectedClassId));
  }, [classOptions, selectedClassId]);

  const selectedSectionObj = useMemo(() => {
    return sectionOptions.find((s) => String(s.value) === String(selectedSectionId));
  }, [sectionOptions, selectedSectionId]);

  const selectedClassName = selectedClassObj?.label || 'All Classes';
  const selectedSectionName = selectedSectionId === 'ALL' ? 'All Sections' : (selectedSectionObj?.label || 'Section');

  // Dynamic Columns Configuration for DataTable
  const columns = useMemo(() => {
    const cols = [
      {
        key: 'classRank',
        header: 'Rank',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) => Number(st.classRank) || 0,
        headerClassName: 'w-16 text-center font-bold',
        cellClassName: 'text-center font-bold',
        render: (st) => {
          if (st.classRank === 1) {
            return (
              <span className="inline-flex items-center gap-1 font-black theme-text-accent">
                <TrophyIcon className="w-3.5 h-3.5" /> 1st
              </span>
            );
          }
          if (st.classRank === 2) {
            return <span className="font-black theme-text-secondary">2nd</span>;
          }
          if (st.classRank === 3) {
            return <span className="font-black theme-text-primary">3rd</span>;
          }
          return <span className="font-mono theme-text-secondary">{st.classRank}</span>;
        },
      },
      {
        key: 'rollNumber',
        header: 'Roll',
        rotatable: false,
        align: 'center',
        sortable: true,
        sortValue: (st) => Number(st.rollNumber) || st.rollNumber,
        headerClassName: 'w-16 text-center font-mono',
        cellClassName: 'text-center font-mono font-bold theme-text-primary',
        render: (st) => st.rollNumber,
      },
      {
        key: 'studentName',
        header: 'Student Name',
        rotatable: false,
        align: 'left',
        sortable: true,
        sortValue: (st) => (st.studentName || '').toLowerCase(),
        headerClassName: 'min-w-[170px]',
        cellClassName: 'font-bold theme-text-primary',
        render: (st) => (
          <div>
            <div className="font-bold theme-text-primary">{st.studentName}</div>
            {st.studentUniqId && (
              <div className="text-[10px] theme-text-secondary font-mono">
                {st.studentUniqId}
              </div>
            )}
          </div>
        ),
      },
    ];

    // Dynamic Subject Columns
    const totalMaxMarks = (subjects || []).reduce((acc, sub) => acc + (Number(sub.fullMarks) || 0), 0);

    (subjects || []).forEach((sub) => {
      cols.push({
        key: `subject_${sub.id}`,
        header: sub.subjectName,
        subHeader: `(${sub.fullMarks})`,
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st) => {
          const sm = st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm) return -999;
          if (sm.isAbsent) return -1;
          return Number(sm.obtained) || 0;
        },
        headerClassName: 'min-w-[64px] max-w-[120px] text-center px-1.5',
        cellClassName: 'text-center font-mono',
        render: (st) => {
          const sm = st.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm) return <span className="theme-text-secondary text-[11px]">-</span>;
          if (sm.isAbsent) return <span className="theme-text-muted font-bold text-[11px]">ABS</span>;
          return (
            <span
              className={`font-semibold ${
                sm.isPassed ? 'theme-text-primary' : 'theme-text-danger font-bold underline'
              }`}
            >
              {sm.obtained}
            </span>
          );
        },
      });
    });

    // Summary Columns
    cols.push(
      {
        key: 'totalObtained',
        header: 'Total Marks',
        subHeader: totalMaxMarks > 0 ? `(${totalMaxMarks})` : undefined,
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st) => Number(st.totalObtained) || 0,
        headerClassName: 'min-w-[64px] text-center font-mono px-1.5',
        cellClassName: 'text-center font-mono font-black text-sm theme-text-primary',
        render: (st) => st.totalObtained,
      },
      {
        key: 'overallPercentage',
        header: 'Percentage',
        subHeader: '%',
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st) => Number(st.overallPercentage) || 0,
        headerClassName: 'min-w-[56px] text-center font-mono px-1.5',
        cellClassName: 'text-center font-mono theme-text-secondary',
        render: (st) => `${st.overallPercentage}%`,
      },
      {
        key: 'grade',
        header: 'Grade / GPA',
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st) => Number(st.overallGpa) || 0,
        headerClassName: 'min-w-[64px] text-center px-1.5',
        cellClassName: 'text-center',
        render: (st) => (
          <div className="flex flex-col items-center justify-center leading-tight">
            <span
              className={`text-xs font-bold font-mono ${
                st.isOverallPass ? 'theme-accent' : 'theme-text-danger'
              }`}
            >
              {st.grade || 'F'}
            </span>
            <span className="text-[10px] theme-text-secondary font-mono leading-none mt-0.5">
              GPA {Number(st.overallGpa || 0).toFixed(2)}
            </span>
          </div>
        ),
      },
      {
        key: 'isOverallPass',
        header: 'Result Status',
        rotatable: true,
        align: 'center',
        sortable: true,
        sortValue: (st) => (st.isOverallPass ? 1 : 0),
        headerClassName: 'min-w-[72px] text-center px-1.5',
        cellClassName: 'text-center',
        render: (st) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              st.isOverallPass
                ? 'theme-bg-accent-soft theme-accent'
                : 'theme-bg-sub theme-text-secondary'
            }`}
          >
            {st.isOverallPass ? 'PASSED' : 'FAILED'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        rotatable: false,
        align: 'center',
        sortable: false,
        sticky: 'right',
        headerClassName: 'w-24 text-center',
        cellClassName: 'text-center',
        render: (st) => (
          onNavigateToTranscripts ? (
            <CustomButton
              variant="sub"
              size="xs"
              onClick={() => onNavigateToTranscripts(selectedExamId, st.studentId)}
            >
              Marksheet
            </CustomButton>
          ) : (
            <CustomButton
              variant="sub"
              size="xs"
              onClick={() => setIsPrintStudioOpen(true)}
            >
              View
            </CustomButton>
          )
        ),
      }
    );

    return cols;
  }, [subjects, onNavigateToTranscripts, selectedExamId]);

  // ── Universal Print Studio Columns & Data Definition ────────────────────
  const printColumns = useMemo(() => {
    const cols = [
      { id: 'classRank', header: 'Rank', label: 'Rank', align: 'center', width: '48px', nowrap: true, bold: true },
      { id: 'rollNumber', header: 'Roll', label: 'Roll', align: 'center', width: '56px', nowrap: true, mono: true, bold: true },
      { id: 'studentName', header: 'Student Name', label: 'Student Name', align: 'left', bold: true },
      { id: 'studentSection', header: 'Section', label: 'Section', align: 'center', width: '70px' },
    ];

    (subjects || []).forEach((sub) => {
      cols.push({
        id: `subject_${sub.id}`,
        header: sub.subjectName,
        label: sub.subjectName,
        subLabel: `(${sub.fullMarks})`,
        align: 'center',
        nowrap: true,
        cell: (val, row) => {
          const sm = row.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm) return '-';
          if (sm.isAbsent) return 'ABS';
          return sm.obtained;
        },
      });
    });

    cols.push(
      { id: 'totalObtained', header: 'Total', label: 'Total Marks', align: 'center', width: '60px', bold: true, mono: true },
      { id: 'overallPercentage', header: '%', label: 'Percentage', align: 'center', width: '52px', cell: (val, row) => `${row.overallPercentage}%` },
      { id: 'overallGpa', header: 'GPA', label: 'GPA', align: 'center', width: '52px', bold: true, mono: true },
      { id: 'grade', header: 'Grade', label: 'Grade / Division', align: 'center', width: '90px', bold: true },
      { id: 'status', header: 'Status', label: 'Result Status', align: 'center', width: '70px', cell: (val, row) => (row.isOverallPass ? 'PASSED' : 'FAILED') }
    );

    return cols;
  }, [subjects]);

  const printMetaItems = useMemo(() => [
    { label: 'Examination', value: exam?.name || 'Term Examination' },
    { label: 'Academic Session', value: exam?.academicYearName || 'Current Session' },
    { label: 'Class & Section', value: `${selectedClassName} — ${selectedSectionName}` },
    { label: 'Grading Standard', value: gradingSystem?.name || 'Standard Scale' },
    { label: 'Published Date', value: exam?.publishDate ? new Date(exam.publishDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Official Gazette' },
    { label: 'Total Candidates', value: `${totalStudents} Registered` },
  ], [exam, selectedClassName, selectedSectionName, gradingSystem, totalStudents]);

  const printSummaryMetrics = useMemo(() => [
    { label: 'Total Candidates', value: totalStudents },
    { label: 'Passed', value: passedCount },
    { label: 'Failed', value: failedCount },
    { label: 'Pass Rate', value: `${passPercentage}%` },
    { label: 'Highest Marks', value: stats.highestMarks || 0 },
    { label: 'Average GPA', value: stats.averageGpa || 0 },
  ], [totalStudents, passedCount, failedCount, passPercentage, stats]);

  const metricItems = useMemo(() => [
    {
      id: 'passed',
      label: 'Passed',
      value: String(passedCount),
      icon: CheckCircleIcon,
      color: 'accent',
    },
    {
      id: 'failed',
      label: 'Failed',
      value: String(failedCount),
      icon: UserIcon,
      color: 'default',
    },
    {
      id: 'pass_rate',
      label: 'Pass Rate',
      value: `${passPercentage}%`,
      icon: TrophyIcon,
      color: 'accent',
    },
    {
      id: 'highest',
      label: 'Highest Marks',
      value: String(stats.highestMarks || 0),
      icon: TrophyIcon,
      color: 'default',
    },
    {
      id: 'average',
      label: 'Average GPA',
      value: String(stats.averageGpa || 0),
      icon: ChartBarIcon,
      color: 'accent',
    },
  ], [passedCount, failedCount, passPercentage, stats]);

  return (
    <PageContainer maxWidth="7xl" isEmbedded={isEmbedded}>
      {/* Top Header */}
      <TabulationHeader
        exam={exam}
        onExportCsv={exportToCsv}
        onOpenPrintStudio={() => setIsPrintStudioOpen(true)}
        onOpenGazette={() => setIsGazetteOpen(true)}
      />

      {/* Target Academic Filter Console (Reused from MarkEntryFilterBar with Department cascading & Mark Grades popover) */}
      <MarkEntryFilterBar
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        departmentOptions={departmentOptions}
        filterDepartmentId={filterDepartmentId}
        setFilterDepartmentId={setFilterDepartmentId}
        classOptions={filteredClassOptions}
        filterClassId={selectedClassId}
        setFilterClassId={setSelectedClassId}
        sectionOptions={filteredSectionOptions}
        filterSectionId={selectedSectionId}
        setFilterSectionId={setSelectedSectionId}
        showSubject={false}
        activeGradingSystem={gradingSystem}
        selectedClassName={selectedClassName}
        selectedSectionName={selectedSectionName}
      />

      {/* Metric Cards Summary */}
      {selectedExamId && selectedClassId && (
        <MetricsGrid items={metricItems} cols={5} />
      )}

      {/* Main Tabulation Table */}
      {!selectedExamId || !selectedClassId ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <ChartBarIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">Select Examination & Class</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Choose an examination term and target class from above to render the master mark sheet ledger.
          </p>
        </div>
      ) : (
        <div className="print:hidden w-full space-y-3">
          {/* Master Marksheet Ledger DataTable */}
          <DataTable
            tableTitle={`${selectedClassName} Marksheet (${studentsData.length})`}
            tableTitleIcon={AcademicCapIcon}
            columns={columns}
            data={studentsData}
            keyExtractor={(st) => String(st.studentId)}
            emptyTitle="No Student Results Found"
            emptySubMessage="No marks have been recorded yet for this examination and class. Visit the Mark Entry Desk to enter subject marks."
            emptyIcon={UserIcon}
            sortable={true}
            defaultSortKey="classRank"
            defaultSortDirection="asc"
            rowClassName={(st) => (!st.isOverallPass ? 'theme-bg-sub/10' : '')}
            cellPaddingClass="py-2.5 px-3"
          />
        </div>
      )}

      {/* Master Universal Print Studio */}
      {isPrintStudioOpen && (
        <UniversalPrintModal
          isOpen={isPrintStudioOpen}
          onClose={() => setIsPrintStudioOpen(false)}
          title={`${exam?.name || 'Academic Examination'} — Master Mark Sheet`}
          subtitle={`Class: ${selectedClassName} • Section: ${selectedSectionName}`}
          metaItems={printMetaItems}
          columns={printColumns}
          data={studentsData}
          summaryMetrics={printSummaryMetrics}
          defaultOptions={{
            orientation: 'LANDSCAPE',
            pageSize: 'A4',
            density: 'NORMAL',
            showSignatures: true,
          }}
        />
      )}

      {/* Gazette Modal */}
      {isGazetteOpen && (
        <ResultGazetteModal
          exam={exam}
          classId={selectedClassId}
          gradingSystem={gradingSystem}
          studentsData={studentsData}
          stats={stats}
          onClose={() => setIsGazetteOpen(false)}
        />
      )}
    </PageContainer>
  );
}

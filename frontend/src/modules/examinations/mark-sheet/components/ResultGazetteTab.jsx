import React, { useMemo, useState } from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import MetricsGrid from '../../../../components/ui/MetricsGrid';
import UniversalPrintModal from '../../../../components/print/UniversalPrintModal';
import { useTenant } from '../../../../context/TenantContext';
import {
  PrinterIcon,
  TrophyIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  UserIcon,
  DownloadIcon,
  AcademicCapIcon,
} from '../../../../components/ui/Icons';

/**
 * ResultGazetteTab
 * Enterprise Official Academic Result Gazette tab component.
 * Displays division/grade breakdown, pass/fail statistics, notice board candidate cards,
 * and seamlessly integrates with UniversalPrintModal for vector-perfect printing & PDF export.
 */
export default function ResultGazetteTab({
  exam = null,
  selectedClassId = '',
  selectedClassName = 'All Classes',
  selectedSectionId = 'ALL',
  selectedSectionName = 'All Sections',
  gradingSystem = null,
  studentsData = [],
  totalStudents = 0,
  passedCount = 0,
  failedCount = 0,
  passPercentage = 0,
  stats = {},
  subjects = [],
  onSelectStudent = null,
}) {
  const { currentInstitution } = useTenant();
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('ALL');

  const institutionName = currentInstitution?.name || 'SPR Note Academy';
  const institutionAddress =
    currentInstitution?.address ||
    currentInstitution?.campus_address ||
    'Central Campus & Academic Affairs';

  // Group Passed Students by Division / Letter Grade
  const divisionGroups = useMemo(() => {
    const groups = {};
    studentsData.forEach((st) => {
      const divKey = st.grade || st.division || 'Unassigned';
      if (!groups[divKey]) groups[divKey] = [];
      groups[divKey].push(st);
    });
    return groups;
  }, [studentsData]);

  const passedStudents = useMemo(
    () => studentsData.filter((s) => s.isOverallPass),
    [studentsData]
  );

  const failedStudents = useMemo(
    () => studentsData.filter((s) => !s.isOverallPass),
    [studentsData]
  );

  // Filtered lists based on search and division filter
  const filteredPassedStudents = useMemo(() => {
    return passedStudents.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDiv =
        selectedDivisionFilter === 'ALL' ||
        (s.grade || s.division) === selectedDivisionFilter;
      return matchesSearch && matchesDiv;
    });
  }, [passedStudents, searchTerm, selectedDivisionFilter]);

  const filteredFailedStudents = useMemo(() => {
    if (selectedDivisionFilter !== 'ALL' && selectedDivisionFilter !== 'FAILED') {
      return [];
    }
    return failedStudents.filter((s) => {
      return (
        !searchTerm ||
        s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [failedStudents, searchTerm, selectedDivisionFilter]);

  // Metric items for MetricsGrid
  const metricItems = useMemo(
    () => [
      {
        id: 'total',
        label: 'Total Enrolled',
        value: String(totalStudents || studentsData.length),
        icon: UserIcon,
        color: 'default',
      },
      {
        id: 'passed',
        label: 'Passed Candidates',
        value: String(passedCount),
        icon: CheckCircleIcon,
        color: 'accent',
      },
      {
        id: 'failed',
        label: 'Failed Candidates',
        value: String(failedCount),
        icon: XCircleIcon,
        color: failedCount > 0 ? 'danger' : 'default',
      },
      {
        id: 'passRate',
        label: 'Pass Percentage',
        value: `${passPercentage}%`,
        icon: TrophyIcon,
        color: 'accent',
      },
      {
        id: 'avgGpa',
        label: 'Average GPA',
        value: String(stats.averageGpa || 0),
        icon: ChartBarIcon,
        color: 'default',
      },
    ],
    [totalStudents, studentsData.length, passedCount, failedCount, passPercentage, stats.averageGpa]
  );

  // Gazette Print Columns Definition for UniversalPrintModal
  const gazettePrintColumns = useMemo(() => {
    return [
      { id: 'classRank', header: 'Rank', label: 'Rank', align: 'center', width: '48px', bold: true },
      { id: 'rollNumber', header: 'Roll', label: 'Roll', align: 'center', width: '56px', bold: true },
      { id: 'studentName', header: 'Student Name', label: 'Student Name', align: 'left', bold: true },
      { id: 'studentSection', header: 'Section', label: 'Section', align: 'center', width: '70px' },
      { id: 'totalObtained', header: 'Total Marks', label: 'Total Marks', align: 'center', width: '75px', bold: true },
      {
        id: 'overallGpa',
        header: 'GPA',
        label: 'GPA',
        align: 'center',
        width: '56px',
        bold: true,
        cell: (val, row) => (row.overallGpa ? Number(row.overallGpa).toFixed(2) : '-'),
      },
      { id: 'grade', header: 'Grade', label: 'Grade / Division', align: 'center', width: '75px', bold: true },
      {
        id: 'isOverallPass',
        header: 'Status',
        label: 'Result Status',
        align: 'center',
        width: '75px',
        bold: true,
        cell: (val, row) => (row.isOverallPass ? 'PASSED' : 'FAILED'),
      },
    ];
  }, []);

  const metaItems = useMemo(() => {
    return [
      { label: 'Examination', value: exam?.name || 'Academic Term' },
      { label: 'Academic Session', value: exam?.academicYearName || 'Current Session' },
      { label: 'Class', value: selectedClassName },
      { label: 'Section', value: selectedSectionName },
      { label: 'Total Candidates', value: String(totalStudents || studentsData.length) },
      { label: 'Pass Rate', value: `${passPercentage}%` },
    ];
  }, [exam, selectedClassName, selectedSectionName, totalStudents, studentsData.length, passPercentage]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <TrophyIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold theme-text-primary leading-tight">
              {exam?.name || 'Academic Examination'} — Result Gazette
            </h2>
            <p className="text-xs theme-text-secondary leading-tight mt-0.5">
              {selectedClassName} • {selectedSectionName} • {passedStudents.length} Passed / {studentsData.length} Candidates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CustomButton
            variant="sub"
            size="sm"
            icon={PrinterIcon}
            onClick={() => setIsPrintOpen(true)}
          >
            Print Gazette
          </CustomButton>
        </div>
      </div>

      {/* Metrics Grid */}
      <MetricsGrid items={metricItems} cols={5} />

      {/* Grade Tier Pills / Quick Division Filter */}
      <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-2xl theme-bg-sub border theme-border text-xs">
        <button
          type="button"
          onClick={() => setSelectedDivisionFilter('ALL')}
          className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
            selectedDivisionFilter === 'ALL'
              ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          All Grades ({studentsData.length})
        </button>

        {Object.entries(divisionGroups).map(([gradeKey, list]) => {
          const count = list.filter((s) => s.isOverallPass).length;
          if (count === 0) return null;
          return (
            <button
              key={gradeKey}
              type="button"
              onClick={() => setSelectedDivisionFilter(gradeKey)}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedDivisionFilter === gradeKey
                  ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <span>Grade {gradeKey}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md theme-bg-accent-soft theme-accent font-mono">
                {count}
              </span>
            </button>
          );
        })}

        {failedStudents.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedDivisionFilter('FAILED')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDivisionFilter === 'FAILED'
                ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <span>Unsuccessful</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-500 font-mono">
              {failedStudents.length}
            </span>
          </button>
        )}
      </div>

      {/* Division-Wise Categorized Student Cards */}
      {studentsData.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs">
          <AcademicCapIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Gazette Records Available</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Please select an active examination term and class to render the official result gazette.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Passed Candidates Grouped by Academic Division / Grade */}
          {Object.entries(divisionGroups).map(([divisionName, list]) => {
            if (
              selectedDivisionFilter !== 'ALL' &&
              selectedDivisionFilter !== divisionName
            ) {
              return null;
            }

            const passedInDiv = list.filter((s) => s.isOverallPass);
            if (passedInDiv.length === 0) return null;

            return (
              <div
                key={divisionName}
                className="rounded-2xl border theme-border p-4 sm:p-5 theme-bg-surface shadow-xs space-y-3"
              >
                {/* Division Section Header */}
                <div className="flex items-center justify-between pb-2 border-b theme-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full theme-bg-accent" />
                    <h3 className="text-sm font-bold theme-text-primary">
                      Grade / Division: {divisionName}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg theme-bg-accent-soft theme-accent">
                    {passedInDiv.length} Students
                  </span>
                </div>

                {/* Student Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                  {passedInDiv.map((st) => (
                    <div
                      key={st.studentId}
                      onClick={() => onSelectStudent && onSelectStudent(st.studentId)}
                      className="p-3 rounded-xl border theme-border theme-bg-sub/50 hover:theme-bg-sub hover:border-[var(--accent-main)]/50 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-xs theme-text-primary group-hover:theme-accent transition-colors truncate block">
                            {st.studentName}
                          </span>
                          <span className="text-[10px] theme-text-secondary">
                            Roll: {st.rollNumber || '-'} • Sec: {st.studentSection || 'Gen'}
                          </span>
                        </div>
                        {st.classRank && st.classRank !== '-' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded theme-bg-elevated theme-text-primary border theme-border shrink-0">
                            #{st.classRank}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t theme-border flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] theme-text-secondary block">Total</span>
                          <span className="font-bold theme-text-primary text-[11px]">
                            {st.totalObtained || 0}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] theme-text-secondary block">GPA</span>
                          <span className="font-bold theme-accent text-[11px]">
                            {Number(st.overallGpa || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Failed / Unsuccessful Candidates Section */}
          {failedStudents.length > 0 &&
            (selectedDivisionFilter === 'ALL' || selectedDivisionFilter === 'FAILED') && (
              <div className="rounded-2xl border border-rose-500/30 p-4 sm:p-5 theme-bg-surface shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                  <div className="flex items-center gap-2 text-rose-500">
                    <XCircleIcon className="w-4 h-4" />
                    <h3 className="text-sm font-bold">
                      Unsuccessful Candidates ({failedStudents.length})
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-500">
                    Needs Attention
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                  {failedStudents.map((st) => (
                    <div
                      key={st.studentId}
                      onClick={() => onSelectStudent && onSelectStudent(st.studentId)}
                      className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-2 text-xs"
                    >
                      <div>
                        <span className="font-bold theme-text-primary truncate block">
                          {st.studentName}
                        </span>
                        <span className="text-[10px] theme-text-secondary">
                          Roll: {st.rollNumber || '-'} • Sec: {st.studentSection || 'Gen'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px]">
                        <span className="text-rose-500 font-bold">FAILED</span>
                        <span className="theme-text-secondary">
                          Obtained: {st.totalObtained || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Gazette Master Print Studio Modal */}
      {isPrintOpen && (
        <UniversalPrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={`${exam?.name || 'Examination'} — Result Gazette`}
          subtitle={`${selectedClassName} • ${selectedSectionName}`}
          metaItems={metaItems}
          columns={gazettePrintColumns}
          data={studentsData}
          summaryMetrics={[
            { label: 'Total Enrolled', value: String(totalStudents || studentsData.length) },
            { label: 'Passed Candidates', value: String(passedCount) },
            { label: 'Failed Candidates', value: String(failedCount) },
            { label: 'Pass Rate', value: `${passPercentage}%` },
            { label: 'Average GPA', value: String(stats.averageGpa || 0) },
          ]}
          defaultOptions={{
            orientation: 'PORTRAIT',
            pageSize: 'A4',
            density: 'NORMAL',
            showMeta: true,
            showSummary: true,
            showSignatures: true,
            signatureLines: [
              { id: 'tabulator', label: 'Prepared By', sub: 'Tabulator', enabled: true },
              { id: 'verifier', label: 'Verified By', sub: 'Head of Department', enabled: true },
              { id: 'controller', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
            ],
          }}
        />
      )}
    </div>
  );
}

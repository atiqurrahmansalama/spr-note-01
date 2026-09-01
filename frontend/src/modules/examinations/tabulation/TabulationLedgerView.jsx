import React, { useState, useMemo } from 'react';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import CustomInput from '../../../components/ui/CustomInput';
import ResultGazetteModal from './ResultGazetteModal';
import {
  ChartBarIcon,
  DownloadIcon,
  PrinterIcon,
  CheckIcon,
  SearchIcon,
  UserIcon,
  DocumentIcon,
  TrophyIcon,
} from '../../../components/ui/Icons';
import useExamData from '../hooks/useExamData';
import useTabulationData from '../hooks/useTabulationData';

/**
 * TabulationLedgerView
 * Master Tabulation Sheet & Academic Gazette with multi-level ranking,
 * metric statistics, print styles (A3/Legal landscape), and CSV exports.
 */
export default function TabulationLedgerView({ initialExamId = null, onNavigateToTranscripts }) {
  const {
    tenantId,
    exams,
    students,
    classOptions,
    sectionOptions,
  } = useExamData();

  const [selectedExamId, setSelectedExamId] = useState(initialExamId || (exams[0]?.id ? String(exams[0].id) : ''));
  const [selectedClassId, setSelectedClassId] = useState(classOptions[0]?.value ? String(classOptions[0].value) : '');
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGazetteOpen, setIsGazetteOpen] = useState(false);

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

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

  // Filter students by name or roll search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsData;
    const q = searchQuery.toLowerCase();
    return studentsData.filter(
      (st) =>
        st.studentName.toLowerCase().includes(q) ||
        String(st.rollNumber).toLowerCase().includes(q)
    );
  }, [studentsData, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Master Tabulation Sheet & Ledger
          </h1>
          <p className="text-xs sm:text-sm theme-text-secondary mt-1">
            Integrated class ledger displaying subject-wise scores, total marks, GPA, academic division, and class/section rank.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CustomButton
            variant="sub"
            size="sm"
            icon={DownloadIcon}
            onClick={exportToCsv}
          >
            Export CSV
          </CustomButton>

          <CustomButton
            variant="sub"
            size="sm"
            icon={PrinterIcon}
            onClick={handlePrint}
          >
            Print Sheet
          </CustomButton>

          <CustomButton
            variant="primary"
            size="sm"
            icon={DocumentIcon}
            onClick={() => setIsGazetteOpen(true)}
          >
            Result Gazette
          </CustomButton>
        </div>
      </div>

      {/* Target Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
        <CustomSelect
          label="Select Examination"
          options={examOptions}
          value={selectedExamId}
          onChange={setSelectedExamId}
          required
        />

        <CustomSelect
          label="Target Class"
          options={classOptions}
          value={selectedClassId}
          onChange={setSelectedClassId}
          required
        />

        <CustomSelect
          label="Target Section"
          options={sectionOptions}
          value={selectedSectionId}
          onChange={setSelectedSectionId}
        />
      </div>

      {/* Metric Cards Summary */}
      {selectedExamId && selectedClassId && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface shadow-2xs">
            <span className="text-[11px] font-semibold theme-text-secondary block">Total Students</span>
            <span className="text-lg font-black theme-text-primary mt-0.5 block">{totalStudents}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600 block">Passed</span>
            <span className="text-lg font-black text-emerald-600 mt-0.5 block">{passedCount}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-500 block">Failed</span>
            <span className="text-lg font-black text-rose-500 mt-0.5 block">{failedCount}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface shadow-2xs">
            <span className="text-[11px] font-semibold theme-text-secondary block">Pass Rate</span>
            <span className="text-lg font-black theme-text-accent mt-0.5 block">{passPercentage}%</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface shadow-2xs">
            <span className="text-[11px] font-semibold theme-text-secondary block">Highest Marks</span>
            <span className="text-lg font-black theme-text-primary mt-0.5 block">{stats.highestMarks}</span>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-surface shadow-2xs">
            <span className="text-[11px] font-semibold theme-text-secondary block">Class Average GPA</span>
            <span className="text-lg font-black theme-text-primary mt-0.5 block">{stats.averageGpa}</span>
          </div>
        </div>
      )}

      {/* Main Tabulation Table */}
      {!selectedExamId || !selectedClassId ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50">
          <ChartBarIcon className="w-12 h-12 mx-auto theme-text-secondary/50 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">Select Examination & Class</h3>
          <p className="text-xs theme-text-secondary mt-1">
            Choose an examination term and target class from above to render the master tabulation ledger.
          </p>
        </div>
      ) : studentsData.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50">
          <UserIcon className="w-12 h-12 mx-auto theme-text-secondary/50 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Student Results Found</h3>
          <p className="text-xs theme-text-secondary mt-1">
            No marks have been recorded yet for this examination and class. Visit the Mark Entry Desk to enter subject marks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Printable Official Header */}
          <div className="hidden print:block text-center space-y-1 mb-6 border-b pb-4">
            <h2 className="text-2xl font-black">{exam?.name || 'Examination Result'}</h2>
            <p className="text-sm font-semibold">
              Academic Session: {exam?.academicYearName} • Semester: {exam?.semesterName}
            </p>
            <p className="text-xs">
              Grading Standard: {gradingSystem?.name} • Published Date: {exam?.publishDate || new Date().toISOString().split('T')[0]}
            </p>
          </div>

          {/* Search Filter Bar */}
          <div className="w-full max-w-sm print:hidden">
            <CustomInput
              placeholder="Filter by student name or roll..."
              prefix={SearchIcon}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {/* Matrix Ledger */}
          <div className="border theme-border rounded-2xl overflow-hidden theme-bg-surface shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/60 font-bold theme-text-primary">
                    <th className="py-3 px-3 w-14 text-center">Rank</th>
                    <th className="py-3 px-3 w-16">Roll</th>
                    <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                    <th className="py-3 px-3 w-20 text-center">Section</th>
                    {subjects.map((sub) => (
                      <th key={sub.id} className="py-3 px-2 text-center min-w-[90px]">
                        <span className="block truncate max-w-[120px]" title={sub.subjectName}>
                          {sub.subjectName}
                        </span>
                        <span className="block text-[10px] font-normal theme-text-secondary">
                          ({sub.fullMarks})
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-3 w-20 text-center">Total</th>
                    <th className="py-3 px-3 w-16 text-center">%</th>
                    <th className="py-3 px-3 w-16 text-center">GPA</th>
                    <th className="py-3 px-4 min-w-[130px] text-center">Grade / Division</th>
                    <th className="py-3 px-3 w-24 text-center">Status</th>
                    <th className="py-3 px-3 w-20 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredStudents.map((st) => (
                    <tr
                      key={st.studentId}
                      className={`hover:theme-bg-sub/30 transition-colors ${
                        !st.isOverallPass ? 'theme-bg-sub/10' : ''
                      }`}
                    >
                      {/* Class Rank */}
                      <td className="py-2.5 px-3 text-center font-bold">
                        {st.classRank === 1 ? (
                          <span className="inline-flex items-center gap-1 font-black text-amber-500">
                            <TrophyIcon className="w-3.5 h-3.5" /> 1st
                          </span>
                        ) : st.classRank === 2 ? (
                          <span className="font-black text-slate-400">2nd</span>
                        ) : st.classRank === 3 ? (
                          <span className="font-black text-amber-700">3rd</span>
                        ) : (
                          <span className="font-mono theme-text-secondary">{st.classRank}</span>
                        )}
                      </td>

                      {/* Roll Number */}
                      <td className="py-2.5 px-3 font-mono font-bold theme-text-primary">
                        {st.rollNumber}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-4 font-bold theme-text-primary">
                        {st.studentName}
                      </td>

                      {/* Section */}
                      <td className="py-2.5 px-3 text-center theme-text-secondary">
                        {st.studentSection || 'General'}
                      </td>

                      {/* Subject Marks */}
                      {st.subjectMarks.map((sm) => (
                        <td key={sm.subjectId} className="py-2.5 px-2 text-center font-mono">
                          {sm.isAbsent ? (
                            <span className="text-rose-500 font-bold text-[11px]">ABS</span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                sm.isPassed ? 'theme-text-primary' : 'text-rose-500 font-bold'
                              }`}
                            >
                              {sm.obtained}
                            </span>
                          )}
                        </td>
                      ))}

                      {/* Total Obtained Marks */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-sm theme-text-primary">
                        {st.totalObtained}
                      </td>

                      {/* Overall Percentage */}
                      <td className="py-2.5 px-3 text-center font-mono theme-text-secondary">
                        {st.overallPercentage}%
                      </td>

                      {/* Overall GPA */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold theme-text-primary">
                        {st.overallGpa}
                      </td>

                      {/* Grade & Division */}
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            st.isOverallPass
                              ? 'theme-bg-accent/10 theme-text-accent'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {st.grade}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            st.isOverallPass
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {st.isOverallPass ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center print:hidden">
                        {onNavigateToTranscripts && (
                          <CustomButton
                            variant="sub"
                            size="xs"
                            onClick={() => onNavigateToTranscripts(selectedExamId, st.studentId)}
                          >
                            Marksheet
                          </CustomButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
    </div>
  );
}

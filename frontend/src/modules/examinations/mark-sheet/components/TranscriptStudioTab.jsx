import React, { useState, useMemo, useEffect } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomButton from '../../../../components/ui/CustomButton';
import TranscriptCard from '../../transcripts/TranscriptCard';
import UniversalPrintModal from '../../../../components/print/UniversalPrintModal';
import { useTenant } from '../../../../context/TenantContext';
import {
  DocumentIcon,
  PrinterIcon,
  SearchIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
} from '../../../../components/ui/Icons';

/**
 * TranscriptStudioTab
 * Integrated 3rd sub-tab within the Mark Sheet Ledger module.
 * Provides interactive student transcript browsing, instant fraud-proof QR verification,
 * next/prev fast navigation, live marksheet preview, and batch/single print studio capabilities.
 */
export default function TranscriptStudioTab({
  exam = null,
  selectedClassId = '',
  selectedClassName = 'Class',
  selectedSectionId = 'ALL',
  selectedSectionName = 'All Sections',
  gradingSystem = null,
  studentsData = [],
  totalStudents = 0,
  passedCount = 0,
  failedCount = 0,
  selectedStudentId = null,
  onSelectStudentId = null,
  subjects = [],
}) {
  const { currentInstitution } = useTenant();
  const [internalSelectedStudentId, setInternalSelectedStudentId] = useState(
    selectedStudentId ? String(selectedStudentId) : ''
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PASSED' | 'FAILED'
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  // Sync external selectedStudentId prop
  useEffect(() => {
    if (selectedStudentId) {
      setInternalSelectedStudentId(String(selectedStudentId));
    }
  }, [selectedStudentId]);

  const activeStudentId = selectedStudentId || internalSelectedStudentId;

  const handleSelectStudent = (id) => {
    const strId = String(id);
    setInternalSelectedStudentId(strId);
    if (onSelectStudentId) {
      onSelectStudentId(strId);
    }
  };

  const institutionName = currentInstitution?.name || 'SPR Note Academy';
  const institutionAddress =
    currentInstitution?.address ||
    currentInstitution?.campus_address ||
    'Central Campus & Academic Affairs';

  // Filter students by search and pass/fail status
  const filteredStudents = useMemo(() => {
    return studentsData.filter((st) => {
      if (filterStatus === 'PASSED' && !st.isOverallPass) return false;
      if (filterStatus === 'FAILED' && st.isOverallPass) return false;

      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      return (
        st.studentName?.toLowerCase().includes(q) ||
        String(st.rollNumber || '').toLowerCase().includes(q) ||
        String(st.grade || '').toLowerCase().includes(q)
      );
    });
  }, [studentsData, studentSearch, filterStatus]);

  // Current Active Student Result Object
  const currentStudentResult = useMemo(() => {
    if (activeStudentId) {
      const found = studentsData.find((s) => String(s.studentId) === String(activeStudentId));
      if (found) return found;
    }
    return filteredStudents[0] || studentsData[0] || null;
  }, [studentsData, filteredStudents, activeStudentId]);

  // Auto-select first student if none selected
  useEffect(() => {
    if (!activeStudentId && filteredStudents.length > 0) {
      handleSelectStudent(filteredStudents[0].studentId);
    }
  }, [activeStudentId, filteredStudents]);

  // Current index in filtered list for pagination
  const currentIndex = useMemo(() => {
    if (!currentStudentResult) return -1;
    return filteredStudents.findIndex(
      (s) => String(s.studentId) === String(currentStudentResult.studentId)
    );
  }, [filteredStudents, currentStudentResult]);

  const handleNextStudent = () => {
    if (currentIndex >= 0 && currentIndex + 1 < filteredStudents.length) {
      handleSelectStudent(filteredStudents[currentIndex + 1].studentId);
    }
  };

  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      handleSelectStudent(filteredStudents[currentIndex - 1].studentId);
    }
  };

  const handlePrintCurrent = () => {
    window.print();
  };

  // Batch Print Columns for UniversalPrintModal
  const batchPrintColumns = useMemo(() => {
    const cols = [
      { id: 'rollNumber', header: 'Roll', label: 'Roll', align: 'center', width: '60px', bold: true },
      { id: 'studentName', header: 'Student Name', label: 'Student Name', align: 'left', bold: true },
    ];

    (subjects || []).forEach((sub) => {
      cols.push({
        id: `subject_${sub.id}`,
        header: sub.subjectName,
        label: sub.subjectName,
        align: 'center',
        width: '50px',
        cell: (val, row) => {
          const sm = row.subjectMarks?.find((s) => String(s.subjectId) === String(sub.id));
          if (!sm || sm.obtained === null || sm.obtained === undefined) return '-';
          if (sm.isAbsent) return 'ABS';
          return sm.obtained;
        },
      });
    });

    cols.push(
      { id: 'totalObtained', header: 'Total Marks', label: 'Total', align: 'center', width: '70px', bold: true },
      { id: 'overallGpa', header: 'GPA', label: 'GPA', align: 'center', width: '55px', bold: true },
      { id: 'grade', header: 'Grade', label: 'Grade', align: 'center', width: '55px', bold: true },
      { id: 'classRank', header: 'Rank', label: 'Rank', align: 'center', width: '50px' },
      {
        id: 'status',
        header: 'Status',
        label: 'Status',
        align: 'center',
        width: '65px',
        cell: (val, row) => (row.isOverallPass ? 'PASSED' : 'FAILED'),
      }
    );

    return cols;
  }, [subjects]);

  const batchPrintMetaItems = useMemo(
    () => [
      { label: 'Examination', value: exam?.name || 'Academic Term' },
      { label: 'Academic Session', value: exam?.academicYearName || 'Current Session' },
      { label: 'Target Class', value: selectedClassName },
      { label: 'Target Section', value: selectedSectionName },
      { label: 'Total Students', value: String(totalStudents) },
      { label: 'Passing Rate', value: `${totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(1) : 0}%` },
    ],
    [exam, selectedClassName, selectedSectionName, totalStudents, passedCount]
  );

  return (
    <div className="space-y-4 text-left animate-fade-in">
      {/* 1. Sub-Tab Context & Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 theme-accent" />
            <h2 className="text-base font-bold theme-text-primary">
              Student Transcript & Marksheet Studio
            </h2>
          </div>
          <p className="text-xs theme-text-secondary mt-0.5">
            Individual student printable academic transcript with official grading breakdown and QR verification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CustomButton
            type="button"
            variant="sub"
            size="sm"
            icon={PrinterIcon}
            onClick={() => setIsBatchPrintOpen(true)}
          >
            Batch Summary
          </CustomButton>
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PrinterIcon}
            onClick={handlePrintCurrent}
          >
            Print Transcript
          </CustomButton>
        </div>
      </div>

      {/* 2. Main Studio Workspace: 2-Column Responsive Layout */}
      {studentsData.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs print:hidden">
          <UserIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Student Results Found</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            No marks have been recorded for this examination and class selection. Select a class with evaluated scores to generate transcripts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Student Roster & Search Directory (Hidden in Print) */}
          <div className="lg:col-span-4 space-y-3 print:hidden">
            <div className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold theme-text-primary">
                  Class Roster ({filteredStudents.length}/{studentsData.length})
                </span>
                <span className="text-[11px] theme-text-secondary font-mono">
                  {passedCount} Passed • {failedCount} Failed
                </span>
              </div>

              {/* Live Search */}
              <CustomInput
                placeholder="Search student, roll, or grade..."
                prefix={SearchIcon}
                value={studentSearch}
                onChange={setStudentSearch}
              />

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl theme-bg-sub border theme-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                    filterStatus === 'ALL'
                      ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  All ({studentsData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('PASSED')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                    filterStatus === 'PASSED'
                      ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Passed ({passedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('FAILED')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                    filterStatus === 'FAILED'
                      ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                      : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Failed ({failedCount})
                </button>
              </div>

              {/* Scrollable Student List */}
              <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1 no-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs theme-text-secondary">
                    No matching students found.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = String(currentStudentResult?.studentId) === String(st.studentId);
                    return (
                      <div
                        key={st.studentId}
                        onClick={() => handleSelectStudent(st.studentId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[var(--accent-main)] theme-bg-accent-soft shadow-xs'
                            : 'theme-border theme-bg-surface hover:theme-bg-sub/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Student Initial Avatar */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? 'theme-bg-accent theme-accent-text'
                                : 'theme-bg-sub theme-text-secondary border theme-border'
                            }`}
                          >
                            {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-xs theme-text-primary block truncate">
                              {st.studentName}
                            </span>
                            <span className="text-[11px] theme-text-secondary block">
                              Roll: {st.rollNumber || '-'} • Rank #{st.classRank || '-'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold theme-text-primary block">
                            {st.totalObtained || 0} M
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              st.isOverallPass
                                ? 'theme-bg-accent-soft theme-accent'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            GPA {Number(st.overallGpa || 0).toFixed(2)} ({st.grade})
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Official Transcript Document */}
          <div className="lg:col-span-8 space-y-4">
            {/* Fast Next / Prev Navigation Toolbar (Hidden in Print) */}
            <div className="flex items-center justify-between p-3 rounded-2xl border theme-border theme-bg-surface shadow-2xs print:hidden">
              <CustomButton
                variant="sub"
                size="xs"
                icon={ChevronLeftIcon}
                onClick={handlePrevStudent}
                disabled={currentIndex <= 0}
              >
                Previous
              </CustomButton>

              <div className="text-center">
                <span className="text-xs font-bold theme-text-primary block">
                  {currentStudentResult?.studentName}
                </span>
                <span className="text-[10px] theme-text-secondary font-mono">
                  Roll: {currentStudentResult?.rollNumber || '-'} • Student {currentIndex + 1} of {filteredStudents.length}
                </span>
              </div>

              <CustomButton
                variant="sub"
                size="xs"
                icon={ChevronRightIcon}
                onClick={handleNextStudent}
                disabled={currentIndex >= filteredStudents.length - 1 || currentIndex < 0}
              >
                Next
              </CustomButton>
            </div>

            {/* Official Digital Transcript Card */}
            <div className="w-full">
              <TranscriptCard
                studentResult={currentStudentResult}
                exam={exam}
                gradingSystem={gradingSystem}
                institutionName={institutionName}
                institutionAddress={institutionAddress}
              />
            </div>
          </div>
        </div>
      )}

      {/* Batch Print Summary Modal */}
      {isBatchPrintOpen && (
        <UniversalPrintModal
          isOpen={isBatchPrintOpen}
          onClose={() => setIsBatchPrintOpen(false)}
          title={`${exam?.name || 'Examination'} — Student Transcripts Summary`}
          subtitle={`Class: ${selectedClassName} • Section: ${selectedSectionName}`}
          metaItems={batchPrintMetaItems}
          columns={batchPrintColumns}
          data={studentsData}
          summaryMetrics={[
            { label: 'Total Enrolled', value: String(totalStudents) },
            { label: 'Passed Students', value: String(passedCount) },
            { label: 'Failed Students', value: String(failedCount) },
            {
              label: 'Passing Ratio',
              value: `${totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(1) : 0}%`,
            },
          ]}
          defaultOptions={{
            orientation: 'LANDSCAPE',
            pageSize: 'A4',
            density: 'NORMAL',
            showSignatures: true,
          }}
        />
      )}
    </div>
  );
}

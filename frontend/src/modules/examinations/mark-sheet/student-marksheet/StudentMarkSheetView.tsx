import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import DataTable from '@/components/ui/DataTable';
import {
  SearchIcon,
  UserIcon,
  AcademicCapIcon,
  PrinterIcon,
  DocumentIcon,
} from '@/components/ui/Icons';
import { StudentMarkSheetViewProps, SubjectMark, StudentResult } from '../types';
import { computeHighestMarksMap, computeTotalFullMarks } from './transcriptUtils';

/**
 * Individual Student Academic MarkSheet & Transcript Preview Card
 */
export function TranscriptCard({
  studentResult = null,
  studentsData = [],
  exam = null,
}: {
  studentResult?: StudentResult | null;
  studentsData?: StudentResult[];
  exam?: any;
}) {
  if (!studentResult || !exam) {
    return (
      <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface text-xs theme-text-secondary shadow-xs">
        <AcademicCapIcon className="w-10 h-10 mx-auto theme-accent opacity-60 mb-2" />
        <h4 className="font-bold theme-text-primary text-sm">No Student Selected</h4>
        <p className="mt-1">Please select a student from the class roster to generate their official mark sheet.</p>
      </div>
    );
  }

  // Calculate highest marks map for each subject across the class
  const highestMarksMap = useMemo(() => {
    return computeHighestMarksMap(studentsData);
  }, [studentsData]);

  // Dynamic columns definition for DataTable
  const subjectColumns = useMemo(
    () => [
      {
        key: 'subjectName',
        header: 'Subject Name',
        align: 'left',
        sortable: false,
        headerClassName: 'text-left min-w-[170px] px-3',
        cellClassName: 'font-bold theme-text-primary text-left text-xs px-3',
        render: (sm: SubjectMark, idx: number) => sm.subjectName || `Subject ${idx + 1}`,
      },
      {
        key: 'full',
        header: 'Full Marks',
        align: 'center',
        sortable: false,
        headerClassName: 'w-20 min-w-[76px] max-w-[80px] text-center px-1',
        cellClassName: 'w-20 min-w-[76px] max-w-[80px] text-center font-mono theme-text-secondary text-xs px-1',
        render: (sm: SubjectMark) => sm.full ?? '-',
      },
      {
        key: 'highest',
        header: 'Highest',
        align: 'center',
        sortable: false,
        sortValue: (sm: SubjectMark) => {
          const val = sm.highestMarks ?? sm.highest ?? highestMarksMap.get(sm.subjectId);
          return val !== undefined && val !== null ? Number(val) : -1;
        },
        headerClassName: 'w-20 min-w-[76px] max-w-[80px] text-center px-1',
        cellClassName: 'w-20 min-w-[76px] max-w-[80px] text-center font-mono theme-text-secondary text-xs px-1',
        render: (sm: SubjectMark) => {
          const val = sm.highestMarks ?? sm.highest ?? highestMarksMap.get(sm.subjectId);
          return val !== undefined && val !== null ? val : (sm.obtained ?? '-');
        },
      },
      {
        key: 'obtained',
        header: 'Obtained',
        align: 'center',
        sortable: false,
        sortValue: (sm: SubjectMark) => (sm.isAbsent ? -1 : Number(sm.obtained) || 0),
        headerClassName: 'w-20 min-w-[76px] max-w-[80px] text-center px-1',
        cellClassName: 'w-20 min-w-[76px] max-w-[80px] text-center font-mono font-bold text-xs px-1',
        render: (sm: SubjectMark) => {
          if (sm.isAbsent) {
            return <span className="theme-text-secondary font-bold">ABS</span>;
          }
          return (
            <span className={sm.isPassed ? 'theme-text-primary' : 'theme-text-secondary font-bold underline'}>
              {sm.obtained ?? '-'}
            </span>
          );
        },
      },
      {
        key: 'gradePoint',
        header: 'GPA',
        align: 'center',
        sortable: false,
        sortValue: (sm: SubjectMark) => Number(sm.gradePoint) || 0,
        headerClassName: 'w-20 min-w-[76px] max-w-[80px] text-center px-1',
        cellClassName: 'w-20 min-w-[76px] max-w-[80px] text-center font-mono font-bold theme-text-primary text-xs px-1',
        render: (sm: SubjectMark) =>
          sm.gradePoint !== undefined && sm.gradePoint !== null ? Number(sm.gradePoint).toFixed(2) : '-',
      },
      {
        key: 'grade',
        header: 'Grade',
        align: 'center',
        sortable: false,
        sortValue: (sm: SubjectMark) => sm.grade || '',
        headerClassName: 'w-20 min-w-[76px] max-w-[80px] text-center px-1',
        cellClassName: 'w-20 min-w-[76px] max-w-[80px] text-center font-mono font-bold text-xs px-1',
        render: (sm: SubjectMark) => (
          <span
            className={`font-bold text-xs font-mono ${
              sm.isPassed ? 'theme-accent' : 'theme-text-secondary'
            }`}
          >
            {sm.grade || (sm.isPassed ? 'P' : 'F')}
          </span>
        ),
      },
    ],
    [highestMarksMap]
  );

  const totalFullMarks = useMemo(() => {
    return computeTotalFullMarks(studentResult);
  }, [studentResult]);

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-xs @container print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
      {/* 1. Subject-Wise Marks Breakdown Standard DataTable */}
      <DataTable
        columns={subjectColumns}
        data={studentResult.subjectMarks || []}
        showIndex={true}
        emptyTitle="No Subject Marks"
        emptySubMessage="No evaluated subject marks available."
      />

      {/* 2. Grand Total & Performance Scoreboard */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-5 gap-3">
        {/* Total Marks */}
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
            Total Marks
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-base sm:text-lg font-extrabold theme-text-primary">
              {studentResult.totalObtained ?? 0}
            </span>
            {totalFullMarks > 0 ? (
              <span className="text-xs theme-text-secondary font-medium">
                / {totalFullMarks}
              </span>
            ) : null}
          </div>
        </div>

        {/* Average */}
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
            Average
          </span>
          <span className="text-base sm:text-lg font-extrabold theme-accent font-mono mt-1 block">
            {studentResult.overallPercentage ?? 0}%
          </span>
        </div>

        {/* GPA Score */}
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
            GPA Score
          </span>
          <span className="text-base sm:text-lg font-extrabold theme-accent font-mono mt-1 block">
            {Number(studentResult.overallGpa ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Letter Grade */}
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
            Letter Grade
          </span>
          <span className="text-base sm:text-lg font-extrabold theme-text-primary mt-1 block">
            {studentResult.grade || studentResult.division || '-'}
          </span>
        </div>

        {/* Class Rank */}
        <div className="col-span-2 @[480px]:col-span-1 p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
            Class Rank
          </span>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="text-base sm:text-lg font-extrabold theme-text-primary font-mono">
              {studentResult.classRank && studentResult.classRank !== '-' ? `#${studentResult.classRank}` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * StudentMarkSheetView (Student MarkSheet View)
 * Interactive individual student academic marksheet preview with verified student roster browsing,
 * bulk student selection, and seamless single/bulk print capabilities.
 */
export default function StudentMarkSheetView({
  exam = null,
  studentsData = [],
  passedCount = 0,
  failedCount = 0,
  selectedStudentId = null,
  onSelectStudentId,
  onOpenStudentPrint,
}: StudentMarkSheetViewProps) {
  const [internalSelectedStudentId, setInternalSelectedStudentId] = useState<string>(
    selectedStudentId ? String(selectedStudentId) : ''
  );
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');

  // Bulk student selection state (default selected all)
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(() => {
    return new Set(studentsData.map((s) => String(s.studentId)));
  });

  // Sync selectedBulkIds when studentsData changes
  useEffect(() => {
    if (studentsData.length > 0) {
      setSelectedBulkIds((prev) => {
        const availableSet = new Set(studentsData.map((s) => String(s.studentId)));
        if (prev.size === 0) return availableSet;
        const next = new Set<string>();
        prev.forEach((id) => {
          if (availableSet.has(id)) next.add(id);
        });
        return next.size > 0 ? next : availableSet;
      });
    }
  }, [studentsData]);

  // Sync external selectedStudentId prop
  useEffect(() => {
    if (selectedStudentId) {
      setInternalSelectedStudentId(String(selectedStudentId));
    }
  }, [selectedStudentId]);

  const activeStudentId = selectedStudentId || internalSelectedStudentId;

  const handleSelectStudent = useCallback(
    (id: string | number) => {
      const strId = String(id);
      setInternalSelectedStudentId(strId);
      if (onSelectStudentId) {
        onSelectStudentId(strId);
      }
    },
    [onSelectStudentId]
  );

  // Filter students by search and pass/fail status
  const filteredStudents = useMemo(() => {
    return studentsData.filter((st) => {
      if (filterStatus === 'PASSED' && !st.isOverallPass) return false;
      if (filterStatus === 'FAILED' && st.isOverallPass) return false;

      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase().trim();
      return (
        (st.studentName || '').toLowerCase().includes(q) ||
        String(st.rollNumber || '').toLowerCase().includes(q) ||
        String(st.studentUniqId || '').toLowerCase().includes(q) ||
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
  }, [activeStudentId, filteredStudents, handleSelectStudent]);

  // Toggle individual student in bulk selection
  const handleToggleBulkStudent = (id: string | number) => {
    const strId = String(id);
    setSelectedBulkIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  // Toggle select all filtered students
  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s) => selectedBulkIds.has(String(s.studentId)));
  }, [filteredStudents, selectedBulkIds]);

  const handleToggleSelectAll = () => {
    setSelectedBulkIds((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredStudents.forEach((s) => next.delete(String(s.studentId)));
      } else {
        filteredStudents.forEach((s) => next.add(String(s.studentId)));
      }
      return next;
    });
  };

  // Trigger Bulk Print
  const handleTriggerBulkPrint = () => {
    if (onOpenStudentPrint) {
      const idsArray = Array.from(selectedBulkIds);
      onOpenStudentPrint(null, 'bulk', idsArray);
    }
  };

  // Trigger Single Print
  const handleTriggerSinglePrint = (studentId?: string | number | null) => {
    if (onOpenStudentPrint) {
      const targetId = studentId || currentStudentResult?.studentId;
      onOpenStudentPrint(targetId, 'single');
    }
  };

  return (
    <div className="space-y-4 text-left animate-fade-in">
      {studentsData.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50 shadow-xs print:hidden">
          <UserIcon className="w-12 h-12 mx-auto theme-accent opacity-60 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Student Results Found</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            No marks have been recorded for this examination and class selection. Select a class with evaluated scores to generate student mark sheets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Student Roster & Search Directory (Hidden in Print) */}
          <div className="lg:col-span-4 space-y-3 print:hidden">
            <div className="p-4 theme-bg-surface border theme-border rounded-2xl shadow-xs space-y-3">
              {/* Quick Search */}
              <CustomInput
                type="text"
                placeholder="Search student or roll..."
                value={studentSearch}
                onChange={(e: any) => setStudentSearch(e.target.value)}
                icon={SearchIcon}
                size="sm"
                fullWidth={true}
              />

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 pt-1 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'ALL'
                      ? 'theme-bg-accent theme-accent-text shadow-xs'
                      : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  All ({studentsData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('PASSED')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'PASSED'
                      ? 'theme-bg-accent theme-accent-text shadow-xs'
                      : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Passed ({passedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('FAILED')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'FAILED'
                      ? 'theme-bg-accent theme-accent-text shadow-xs'
                      : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Failed ({failedCount})
                </button>
              </div>

              {/* Bulk Selection Bar */}
              <div className="flex items-center justify-between gap-2 px-1 py-1.5 border-t border-b theme-border text-xs">
                <label
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <CustomCheckbox
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAll}
                    size="sm"
                  />
                  <span className="text-[11px] font-semibold theme-text-secondary">
                    Select All ({selectedBulkIds.size}/{studentsData.length})
                  </span>
                </label>

                <CustomButton
                  type="button"
                  variant="sub"
                  size="xs"
                  icon={PrinterIcon}
                  disabled={selectedBulkIds.size === 0}
                  onClick={handleTriggerBulkPrint}
                  className="shrink-0"
                >
                  Bulk Print ({selectedBulkIds.size})
                </CustomButton>
              </div>

              {/* Student Scrollable List */}
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 no-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs theme-text-secondary">
                    No matching students found.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = String(currentStudentResult?.studentId) === String(st.studentId);
                    const isBulkChecked = selectedBulkIds.has(String(st.studentId));

                    return (
                      <div
                        key={st.studentId}
                        onClick={() => handleSelectStudent(st.studentId)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'border-[var(--accent-main)] theme-bg-accent-soft shadow-xs'
                            : 'theme-border theme-bg-surface hover:theme-bg-sub/60'
                        }`}
                      >
                        {/* Multi-Select Checkbox */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBulkStudent(st.studentId);
                          }}
                          className="shrink-0 flex items-center justify-center p-0.5"
                          title={isBulkChecked ? 'Deselect for bulk print' : 'Select for bulk print'}
                        >
                          <CustomCheckbox
                            checked={isBulkChecked}
                            onChange={() => handleToggleBulkStudent(st.studentId)}
                            size="sm"
                          />
                        </div>

                        {/* Student Details */}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs theme-text-primary block truncate">
                            {st.studentName}
                          </span>
                          <span className="text-[11px] theme-text-secondary block">
                            Roll: {st.rollNumber || '-'} {st.classRank && st.classRank !== '-' ? `• Rank #${st.classRank}` : ''}
                          </span>
                        </div>

                        {/* Grade / GPA Badge */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold font-mono ${
                              st.isOverallPass
                                ? 'theme-accent'
                                : 'theme-text-secondary'
                            }`}
                          >
                            GPA {Number(st.overallGpa || 0).toFixed(2)} ({st.grade || 'P'})
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
          <div className="lg:col-span-8 space-y-3">
            {/* Top Student Header & Print Actions Bar */}
            {currentStudentResult && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 theme-bg-surface border theme-border rounded-2xl shadow-xs print:hidden">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl theme-bg-accent-soft flex items-center justify-center shrink-0">
                    <DocumentIcon className="w-4 h-4 theme-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold theme-text-primary truncate">
                      {currentStudentResult.studentName} — Official Mark Sheet
                    </h3>
                    <p className="text-[11px] theme-text-secondary truncate">
                      Roll: {currentStudentResult.rollNumber || '-'} • GPA: {Number(currentStudentResult.overallGpa || 0).toFixed(2)} ({currentStudentResult.grade || 'P'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <CustomButton
                    type="button"
                    variant="sub"
                    size="sm"
                    icon={PrinterIcon}
                    onClick={() => handleTriggerSinglePrint(currentStudentResult.studentId)}
                    className="flex-1 sm:flex-initial"
                  >
                    Print Student
                  </CustomButton>
                  <CustomButton
                    type="button"
                    variant="accent"
                    size="sm"
                    icon={PrinterIcon}
                    disabled={selectedBulkIds.size === 0}
                    onClick={handleTriggerBulkPrint}
                    className="flex-1 sm:flex-initial"
                  >
                    Bulk Print ({selectedBulkIds.size})
                  </CustomButton>
                </div>
              </div>
            )}

            {/* Live Student MarkSheet Preview Card */}
            <TranscriptCard
              studentResult={currentStudentResult}
              studentsData={studentsData}
              exam={exam}
            />
          </div>
        </div>
      )}
    </div>
  );
}

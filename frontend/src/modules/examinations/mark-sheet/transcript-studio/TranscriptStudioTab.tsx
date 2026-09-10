import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import TranscriptCard from './TranscriptCard';
import {
  SearchIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { TranscriptStudioTabProps } from '../types';

/**
 * TranscriptStudioTab (Student MarkSheet Studio)
 * Interactive individual student academic marksheet preview with verified QR code,
 * fast roster browsing, and vector-perfect single print capability.
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
  onSelectStudentId,
  subjects = [],
}: TranscriptStudioTabProps) {
  const [internalSelectedStudentId, setInternalSelectedStudentId] = useState<string>(
    selectedStudentId ? String(selectedStudentId) : ''
  );
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');

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

  return (
    <div className="space-y-4 text-left animate-fade-in">
      {/* Main Studio Workspace: 2-Column Responsive Layout */}
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
                      ? 'theme-bg-accent text-white shadow-xs'
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
                      ? 'theme-bg-accent text-white shadow-xs'
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
                      ? 'theme-bg-accent text-white shadow-xs'
                      : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  Failed ({failedCount})
                </button>
              </div>

              {/* Student Scrollable List */}
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
                        <div className="min-w-0">
                          <span className="font-bold text-xs theme-text-primary block truncate">
                            {st.studentName}
                          </span>
                          <span className="text-[11px] theme-text-secondary block">
                            Roll: {st.rollNumber || '-'} {st.classRank && st.classRank !== '-' ? `• Rank #${st.classRank}` : ''}
                          </span>
                        </div>

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
          <div className="lg:col-span-8">
            <TranscriptCard
              studentResult={currentStudentResult}
              studentsData={studentsData}
              exam={exam}
              gradingSystem={gradingSystem}
            />
          </div>
        </div>
      )}
    </div>
  );
}

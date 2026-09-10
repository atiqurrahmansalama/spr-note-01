import React, { useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';
import { AcademicCapIcon } from '@/components/ui/Icons';
import { TranscriptCardProps, SubjectMark } from '../types';

/**
 * TranscriptCard
 * Enterprise High-Definition Print-Ready Official Student Academic MarkSheet & Transcript.
 * Uses project-standard DataTable with zero hardcoded styling and 100% theme design tokens.
 */
export default function TranscriptCard({
  studentResult = null,
  studentsData = [],
  exam = null,
  gradingSystem = null,
}: TranscriptCardProps) {
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

  // Project-standard dynamic columns definition for DataTable
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

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-xs print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
      {/* 1. Subject-Wise Marks Breakdown Standard DataTable */}
      <DataTable
        columns={subjectColumns}
        data={studentResult.subjectMarks || []}
        showIndex={true}
        emptyTitle="No Subject Marks"
        emptySubMessage="No evaluated subject marks available."
      />

      {/* 2. Grand Total & Performance Scoreboard */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Marks */}
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary block">
            Total Marks
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-base sm:text-lg font-extrabold theme-text-primary">
              {studentResult.totalObtained ?? 0}
            </span>
            {studentResult.totalFull ? (
              <span className="text-xs theme-text-secondary font-medium">
                / {studentResult.totalFull}
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
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex flex-col items-center justify-center text-center shadow-xs">
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

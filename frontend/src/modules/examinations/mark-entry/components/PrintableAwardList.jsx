import React from 'react';
import { formatDateLabel, formatCleanRange } from '../../exam-schedules/utils/examScheduleUtils';
import { examStore } from '@/stores/examStore';

/**
 * PrintableAwardList
 * Official institutional subject award list and marksheet for printing.
 * Hidden on regular screen and formatted cleanly for A4 portrait/landscape paper.
 */
export default function PrintableAwardList({
  selectedExam,
  selectedSubject,
  students = [],
  components = [],
  fullMarks = 100,
  passMarks = 33,
  marksGrid = {},
  gradingRules = [],
  stats,
}) {
  if (!selectedSubject) return null;

  return (
    <div className="hidden print:block p-8 bg-white text-slate-900 font-sans text-xs">
      {/* Official Academy Header */}
      <div className="text-center border-b-2 border-slate-900 pb-4 mb-4 space-y-1">
        <h1 className="text-xl font-black uppercase tracking-wider">
          Official Subject Examination Marksheet & Award List
        </h1>
        <h2 className="text-base font-bold text-slate-800">
          {selectedExam?.name || 'Examination Session'}
        </h2>
        <p className="text-xs text-slate-600">
          Academic Session: {selectedExam?.academicYearName || '2026'} • Semester: {selectedExam?.semesterName || 'Term'}
        </p>
      </div>

      {/* Meta Details 2-Column Grid */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded-lg mb-4 text-xs">
        <div className="space-y-1">
          <div>
            <span className="font-bold">Subject: </span>
            <span className="font-semibold">{selectedSubject.subjectName}</span>
            {selectedSubject.subjectCode && <span> ({selectedSubject.subjectCode})</span>}
          </div>
          <div>
            <span className="font-bold">Class & Section: </span>
            <span>Class {selectedSubject.className} ({selectedSubject.sectionName || 'All Sections'})</span>
          </div>
          <div>
            <span className="font-bold">Curriculum / Book: </span>
            <span>{selectedSubject.curriculumBookName || 'Standard Syllabus'}</span>
          </div>
        </div>

        <div className="space-y-1 text-right">
          <div>
            <span className="font-bold">Exam Date: </span>
            <span>{formatDateLabel(selectedSubject.examDate)}</span>
          </div>
          <div>
            <span className="font-bold">Shift & Time: </span>
            <span>
              {selectedSubject.shiftName && `${selectedSubject.shiftName}, `}
              {formatCleanRange(selectedSubject.startTime, selectedSubject.endTime)}
            </span>
          </div>
          <div>
            <span className="font-bold">Room / Hall: </span>
            <span>{selectedSubject.roomNo || 'Main Hall'}</span>
            <span className="ml-3 font-bold">Examiner: </span>
            <span>{selectedSubject.examinerName || selectedSubject.teacherName || 'Assigned Examiner'}</span>
          </div>
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full text-left border-collapse border border-slate-400 mb-6 text-[11px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800">
            <th className="py-2 px-2 border-r border-slate-400 text-center w-10">#</th>
            <th className="py-2 px-2 border-r border-slate-400 w-16">Roll</th>
            <th className="py-2 px-3 border-r border-slate-400">Student Name</th>
            <th className="py-2 px-2 border-r border-slate-400 text-center w-16">Status</th>
            {components.map((comp, idx) => (
              <th key={idx} className="py-2 px-2 border-r border-slate-400 text-center">
                {comp.name}
                <span className="block text-[9px] font-normal text-slate-600">
                  (Max: {comp.maxMarks})
                </span>
              </th>
            ))}
            <th className="py-2 px-2 border-r border-slate-400 text-center w-16">
              Total ({fullMarks})
            </th>
            <th className="py-2 px-2 border-r border-slate-400 text-center w-16">Grade</th>
            <th className="py-2 px-2 text-center w-28">Teacher Remark</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300">
          {students.map((st, idx) => {
            const stId = String(st.id);
            const rowData = marksGrid[stId] || {};
            const isAbsent = Boolean(rowData.isAbsent);
            const obtained = isAbsent ? 0 : Number(rowData.obtainedMarks) || 0;
            const pct = fullMarks > 0 ? (obtained / fullMarks) * 100 : 0;
            const gradeEval = examStore.evaluateGrade(pct, gradingRules);
            const isPassed = !isAbsent && obtained >= passMarks;

            return (
              <tr key={stId} className="border-b border-slate-300">
                <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                <td className="py-1.5 px-2 border-r border-slate-300 font-mono font-bold">
                  {st.roll_number || st.roll || st.uniq_id || '-'}
                </td>
                <td className="py-1.5 px-3 border-r border-slate-300 font-semibold">
                  {st.name_en || st.name || 'Student'}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold">
                  {isAbsent ? <span className="text-red-600">ABSENT</span> : 'PRESENT'}
                </td>
                {components.map((_, cIdx) => (
                  <td key={cIdx} className="py-1.5 px-2 border-r border-slate-300 text-center font-mono">
                    {isAbsent ? '0' : rowData.componentMarks?.[`comp_${cIdx}`] || '0'}
                  </td>
                ))}
                <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono font-bold">
                  {isAbsent ? 'ABS' : (rowData.obtainedMarks !== '' ? rowData.obtainedMarks : '-')}
                </td>
                <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold">
                  {isAbsent ? 'ABS' : gradeEval.grade}
                </td>
                <td className="py-1.5 px-2 text-center text-slate-600 text-[10px]">
                  {rowData.teacherRemarks || (isPassed ? 'Passed' : isAbsent ? 'Absent' : 'Failed')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Metrics Box */}
      {stats && (
        <div className="border border-slate-400 p-3 rounded-lg mb-8 grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="font-bold">Total Enrolled: </span>
            <span>{stats.totalStudents}</span>
          </div>
          <div>
            <span className="font-bold">Present / Absent: </span>
            <span>{stats.presentCount} / {stats.absentCount}</span>
          </div>
          <div>
            <span className="font-bold">Passed / Failed: </span>
            <span>{stats.passedCount} / {stats.failedCount}</span>
          </div>
          <div>
            <span className="font-bold">Pass Rate: </span>
            <span>{stats.passRate}%</span>
          </div>
        </div>
      )}

      {/* Official Signatures Block */}
      <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs">
        <div className="border-t border-slate-800 pt-2">
          <p className="font-bold">Course Examiner / Teacher</p>
          <p className="text-[10px] text-slate-600">Signature & Date</p>
        </div>
        <div className="border-t border-slate-800 pt-2">
          <p className="font-bold">Department Head / Supervisor</p>
          <p className="text-[10px] text-slate-600">Verification Seal</p>
        </div>
        <div className="border-t border-slate-800 pt-2">
          <p className="font-bold">Controller of Examinations</p>
          <p className="text-[10px] text-slate-600">Official Approval</p>
        </div>
      </div>
    </div>
  );
}

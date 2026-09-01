import React from 'react';
import CustomButton from '../../../components/ui/CustomButton';
import {
  PrinterIcon,
  TrophyIcon,
  CheckIcon,
  BuildingOfficeIcon,
} from '../../../components/ui/Icons';

/**
 * ResultGazetteModal
 * Official Academic Result Gazette for board meetings, notice board prints, and certified records.
 */
export default function ResultGazetteModal({
  exam = null,
  classId = '',
  gradingSystem = null,
  studentsData = [],
  stats = {},
  onClose,
}) {
  const handlePrint = () => {
    window.print();
  };

  // Group by Division / Grade
  const divisionGroups = {};
  studentsData.forEach((st) => {
    const divKey = st.division || 'Unassigned';
    if (!divisionGroups[divKey]) divisionGroups[divKey] = [];
    divisionGroups[divKey].push(st);
  });

  const passedStudents = studentsData.filter((s) => s.isOverallPass);
  const failedStudents = studentsData.filter((s) => !s.isOverallPass);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl border theme-border shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header Action Bar */}
        <div className="p-4 sm:p-5 border-b theme-border flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 theme-text-accent" />
            <h2 className="text-base font-bold theme-text-primary">
              Official Examination Result Gazette
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <CustomButton
              variant="sub"
              size="sm"
              icon={PrinterIcon}
              onClick={handlePrint}
            >
              Print Gazette
            </CustomButton>
            <CustomButton
              variant="sub"
              size="sm"
              onClick={onClose}
            >
              Close
            </CustomButton>
          </div>
        </div>

        {/* Printable Gazette Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-left" id="gazette-printable-area">
          {/* Institutional Heading */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-slate-300 dark:border-slate-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold uppercase tracking-wider mb-1">
              <BuildingOfficeIcon className="w-4 h-4" />
              Office of the Controller of Examinations
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {exam?.name || 'Academic Term Examination'}
            </h1>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Academic Session: {exam?.academicYearName} • Semester: {exam?.semesterName} • Branch: {exam?.branchName || 'Main Campus'}
            </p>
            <p className="text-[11px] text-slate-500">
              Grading Standard: {gradingSystem?.name || 'Standard Scale'} • Gazette Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Key Executive Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 text-center">
              <span className="text-[10px] font-semibold uppercase theme-text-secondary block">Total Appeared</span>
              <span className="text-lg font-black theme-text-primary">{studentsData.length}</span>
            </div>
            <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 text-center">
              <span className="text-[10px] font-semibold uppercase text-emerald-600 block">Total Passed</span>
              <span className="text-lg font-black text-emerald-600">{passedStudents.length}</span>
            </div>
            <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 text-center">
              <span className="text-[10px] font-semibold uppercase text-rose-500 block">Total Failed</span>
              <span className="text-lg font-black text-rose-500">{failedStudents.length}</span>
            </div>
            <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 text-center">
              <span className="text-[10px] font-semibold uppercase theme-text-secondary block">Overall Pass Rate</span>
              <span className="text-lg font-black theme-text-accent">
                {studentsData.length > 0
                  ? Math.round((passedStudents.length / studentsData.length) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Top 5 Merit Positions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-1 border-b theme-border flex items-center gap-1.5">
              <TrophyIcon className="w-4 h-4 text-amber-500" />
              Top Merit Standings (Honor Roll)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {passedStudents.slice(0, 6).map((st) => (
                <div
                  key={st.studentId}
                  className="p-3 rounded-xl border theme-border theme-bg-surface flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg font-black flex items-center justify-center theme-bg-accent/10 theme-text-accent">
                      #{st.classRank}
                    </div>
                    <div>
                      <span className="font-bold theme-text-primary block">{st.studentName}</span>
                      <span className="text-[11px] theme-text-secondary block">
                        Roll: {st.rollNumber} • Sec: {st.studentSection || 'Gen'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold theme-text-primary block">{st.totalObtained} Marks</span>
                    <span className="text-[11px] font-semibold text-emerald-600 block">{st.grade} ({st.overallGpa} GPA)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Division-Wise Gazette Roster */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-1 border-b theme-border">
              Division & Category Roll Call
            </h3>

            {Object.entries(divisionGroups).map(([divisionName, studentsInDiv]) => (
              <div key={divisionName} className="space-y-2 p-3.5 rounded-xl border theme-border theme-bg-sub/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-primary">
                    {divisionName} ({studentsInDiv.length} Students)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {studentsInDiv.map((s) => (
                    <span
                      key={s.studentId}
                      className="px-2 py-1 rounded-md text-[11px] font-mono border theme-border theme-bg-surface font-semibold"
                      title={`${s.studentName} (${s.totalObtained} Marks)`}
                    >
                      Roll {s.rollNumber}: {s.studentName} ({s.totalObtained})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Signatures & Certification Line */}
          <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-600 dark:text-slate-400">
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-semibold">
                Class Teacher
              </div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-semibold">
                Controller of Examinations
              </div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 pt-2 font-semibold">
                Head of Institution / Principal
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

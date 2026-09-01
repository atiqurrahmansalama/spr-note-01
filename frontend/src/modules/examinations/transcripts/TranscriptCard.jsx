import React from 'react';
import QrCodeBadge from '../../../components/common/QrCodeBadge';
import {
  BuildingOfficeIcon,
  AcademicCapIcon,
  TrophyIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';

/**
 * TranscriptCard
 * High-definition print-ready official digital marksheet / academic transcript.
 * Features fraud-proof QR verification, institutional seal, and multi-curriculum compatibility.
 */
export default function TranscriptCard({
  studentResult = null,
  exam = null,
  gradingSystem = null,
  institutionName = 'Darul Uloom Islamic Academy',
  institutionAddress = 'Dhaka, Bangladesh',
}) {
  if (!studentResult || !exam) {
    return (
      <div className="p-8 text-center border theme-border rounded-2xl theme-bg-surface text-xs theme-text-secondary">
        Select a student result to generate academic transcript.
      </div>
    );
  }

  // Generate verifiable public URL
  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify-report/EXAM_${exam.id}_${studentResult.studentId}`
    : `https://sprnote.com/verify-report/EXAM_${exam.id}_${studentResult.studentId}`;

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 sm:p-10 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-left print:border-none print:shadow-none print:p-4 print:max-w-none">
      {/* 1. Header & Institutional Branding */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
            SPR
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              {institutionName}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {institutionAddress} • Branch: {exam.branchName || 'Main Campus'}
            </p>
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Official Academic Transcript & Marksheet
            </p>
          </div>
        </div>

        {/* Fraud-Proof QR Code */}
        <div className="text-center shrink-0">
          <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-2xs inline-block">
            <QrCodeBadge value={verificationUrl} size={64} />
          </div>
          <span className="block text-[9px] font-mono text-slate-500 mt-1">Scan to Verify</span>
        </div>
      </div>

      {/* 2. Examination & Student Bio Information */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Student Name</span>
          <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">
            {studentResult.studentName}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Roll / ID</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm block">
            {studentResult.rollNumber}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Class & Section</span>
          <span className="font-bold text-slate-900 dark:text-white block">
            {studentResult.studentClass || 'Class'} ({studentResult.studentSection || 'Gen'})
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Academic Session</span>
          <span className="font-bold text-slate-900 dark:text-white block">
            {exam.academicYearName}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Examination Term</span>
          <span className="font-bold text-slate-900 dark:text-white block">
            {exam.name} ({exam.semesterName})
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Grading Standard</span>
          <span className="font-bold text-slate-900 dark:text-white block">
            {gradingSystem?.name || 'Standard Scale'}
          </span>
        </div>
      </div>

      {/* 3. Subject-Wise Mark Breakdown Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-4">Subject Name</th>
              <th className="py-2.5 px-3 text-center w-20">Full Marks</th>
              <th className="py-2.5 px-3 text-center w-20">Pass Marks</th>
              <th className="py-2.5 px-3 text-center w-24">Obtained</th>
              <th className="py-2.5 px-3 text-center w-20">GPA</th>
              <th className="py-2.5 px-3 text-center w-24">Letter Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {studentResult.subjectMarks.map((sm, idx) => (
              <tr key={sm.subjectId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                  {sm.subjectName}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                  {sm.full}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                  {sm.pass}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                  {sm.isAbsent ? (
                    <span className="text-rose-500 font-black">ABS</span>
                  ) : (
                    <span className={sm.isPassed ? 'text-slate-900 dark:text-white' : 'text-rose-500'}>
                      {sm.obtained}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                  {sm.gradePoint}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      sm.isPassed
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    {sm.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Grand Total & Performance Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-900 text-white dark:bg-slate-900 border border-slate-800 text-center">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Marks</span>
          <span className="text-base font-black mt-0.5 block">
            {studentResult.totalObtained} / {studentResult.totalFull}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Percentage</span>
          <span className="text-base font-black mt-0.5 block text-emerald-400">
            {studentResult.overallPercentage}%
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">GPA Score</span>
          <span className="text-base font-black mt-0.5 block text-cyan-400">
            {studentResult.overallGpa}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Final Grade</span>
          <span className="text-base font-black mt-0.5 block text-amber-400">
            {studentResult.grade}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Class Position</span>
          <span className="text-base font-black mt-0.5 block text-white flex items-center justify-center gap-1">
            <TrophyIcon className="w-4 h-4 text-amber-400" />
            {studentResult.classRank}
          </span>
        </div>
      </div>

      {/* 5. Remarks & Certification Block */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-600 dark:text-slate-400">
            Result Status:{' '}
            <strong className={studentResult.isOverallPass ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
              {studentResult.isOverallPass ? 'Passed & Certified' : 'Failed / Unsatisfactory'}
            </strong>{' '}
            • Division: <strong className="text-slate-900 dark:text-white">{studentResult.division}</strong>
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Auth Code: EXAM-{exam.id}-{studentResult.studentId}
        </span>
      </div>

      {/* 6. Signatures & Official Institutional Seal */}
      <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs text-slate-600 dark:text-slate-400">
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
            Principal / Vice Principal
          </div>
        </div>
      </div>
    </div>
  );
}

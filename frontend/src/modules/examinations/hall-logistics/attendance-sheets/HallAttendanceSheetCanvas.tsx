import React from 'react';
import { HallAttendanceSheetData } from '../types';
import { AcademicCapIcon } from '../../../../components/ui/Icons';

export interface HallAttendanceSheetCanvasProps {
  sheetData: HallAttendanceSheetData;
  students?: HallAttendanceSheetData['students'];
  pageIndex?: number;
  totalPages?: number;
  isFirstPage?: boolean;
  isLastPage?: boolean;
  totalAllocatedCount?: number;
  className?: string;
  isEditable?: boolean;
  onSheetDataChange?: (updatedData: HallAttendanceSheetData) => void;
}

/**
 * Enterprise Examination Hall Attendance & Script Distribution Record Canvas
 * 
 * Formal institutional attendance matrix containing script serial tracking,
 * student signatures, invigilator validation, and candidate tally records.
 * Supports live WYSIWYG editing.
 */
export default function HallAttendanceSheetCanvas({
  sheetData,
  students = sheetData.students,
  pageIndex = 0,
  totalPages = 1,
  isFirstPage = true,
  isLastPage = true,
  totalAllocatedCount = sheetData.students.length,
  className = '',
  isEditable = true,
  onSheetDataChange,
}: HallAttendanceSheetCanvasProps) {
  const displayStudents = students || sheetData.students;

  const handleFieldUpdate = (field: keyof HallAttendanceSheetData, value: any) => {
    if (!onSheetDataChange) return;
    onSheetDataChange({
      ...sheetData,
      [field]: value,
    });
  };

  const handleStudentUpdate = (studentIndex: number, field: string, value: any) => {
    if (!onSheetDataChange) return;
    const updatedStudents = [...(sheetData.students || [])];
    const targetStudent = displayStudents[studentIndex];
    if (!targetStudent) return;
    const masterIdx = updatedStudents.findIndex(s => s.studentId === targetStudent.studentId || s.uniqId === targetStudent.uniqId);
    if (masterIdx !== -1) {
      updatedStudents[masterIdx] = {
        ...updatedStudents[masterIdx],
        [field]: value,
      };
      onSheetDataChange({
        ...sheetData,
        students: updatedStudents,
      });
    }
  };

  const editableClass = isEditable
    ? 'outline-hidden focus:ring-1.5 focus:ring-blue-500/60 focus:bg-blue-50/40 hover:bg-slate-100/80 rounded px-0.5 -mx-0.5 transition-colors cursor-text'
    : '';

  return (
    <div
      className={`bg-white text-slate-900 border-2 border-slate-900 rounded-lg p-5 font-sans text-xs shadow-xs flex flex-col justify-between h-full min-h-[1050px] ${className}`}
    >
      <div>
        {/* 1. Formal Institutional & Exam Header (Page 1 or Continuation) */}
        {isFirstPage ? (
          <div className="border-b-2 border-slate-900 pb-2.5 text-center relative">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              {/* Logo */}
              <div className="w-12 h-12 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                {sheetData.institutionLogo ? (
                  <img
                    src={sheetData.institutionLogo}
                    alt="Logo"
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <AcademicCapIcon className="w-7 h-7 text-slate-700" />
                )}
              </div>

              {/* Institutional Title & Subtitle */}
              <div className="flex-1 min-w-0">
                <h2
                  className={`text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 leading-tight ${editableClass}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleFieldUpdate('institutionName', e.currentTarget.textContent || '')}
                  title={isEditable ? 'Click to edit Institution Name' : undefined}
                >
                  {sheetData.institutionName}
                </h2>
                <p
                  className={`text-[10.5px] text-slate-600 font-medium ${editableClass}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleFieldUpdate('institutionAddress', e.currentTarget.textContent || '')}
                  title={isEditable ? 'Click to edit Institution Address' : undefined}
                >
                  {sheetData.institutionAddress}
                </p>
                <div className="inline-block mt-0.5 px-3 py-0.5 bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider rounded">
                  Examination Hall Attendance &amp; Answer Script Distribution Sheet
                </div>
              </div>

              <div className="w-12 shrink-0" />
            </div>

            {/* Exam Metadata Grid */}
            <div className="grid grid-cols-4 gap-2 text-[10.5px] text-left mt-2 pt-1.5 border-t border-slate-300 bg-slate-50/70 p-2 rounded">
              <div>
                <span className="text-slate-500 font-semibold block text-[9.5px]">Examination:</span>
                <span
                  className={`font-extrabold text-slate-900 truncate block ${editableClass}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleFieldUpdate('examTitle', e.currentTarget.textContent || '')}
                >
                  {sheetData.examTitle} ({sheetData.sessionYear})
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[9.5px]">Subject &amp; Paper:</span>
                <span
                  className={`font-bold text-slate-900 truncate block ${editableClass}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleFieldUpdate('subjectName', e.currentTarget.textContent || '')}
                >
                  {sheetData.subjectName} ({sheetData.subjectCode || 'ISL-101'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[9.5px]">Date &amp; Time Slot:</span>
                <span
                  className={`font-bold text-slate-900 truncate block ${editableClass}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleFieldUpdate('examDate', e.currentTarget.textContent || '')}
                >
                  {sheetData.examDate} | {sheetData.startTime} - {sheetData.endTime}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[9.5px]">Hall / Room No:</span>
                <span
                  className={`font-extrabold text-slate-900 truncate block ${editableClass}`}
                  contentEditable={isEditable}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleFieldUpdate('roomName', e.currentTarget.textContent || '')}
                >
                  {sheetData.roomName}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pb-2 mb-2 border-b-2 border-slate-800 flex items-center justify-between text-xs text-slate-600 font-bold">
            <span className="uppercase tracking-wide text-slate-900">
              {sheetData.examTitle} — Attendance Sheet ({sheetData.roomName})
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-medium">
              Page {pageIndex + 1} of {totalPages}
            </span>
          </div>
        )}

        {/* 2. Candidate Attendance & Answer Script Distribution Table */}
        <div className="my-2 border border-slate-800 rounded-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-extrabold">
                <th className="py-1 px-1.5 border-r border-slate-400 text-center w-8">SL</th>
                <th className="py-1 px-1.5 border-r border-slate-400 text-center w-14">Roll No</th>
                <th className="py-1 px-1.5 border-r border-slate-400 w-20">Student ID</th>
                <th className="py-1 px-1.5 border-r border-slate-400">Student Name</th>
                <th className="py-1 px-1.5 border-r border-slate-400 w-20">Class (Sec)</th>
                <th className="py-1 px-1.5 border-r border-slate-400 text-center w-32">
                  Main Script Serial
                </th>
                <th className="py-1 px-1.5 border-r border-slate-400 text-center w-14">
                  Extra Script
                </th>
                <th className="py-1 px-1.5 border-r border-slate-400 text-center w-28">
                  Student Signature
                </th>
                <th className="py-1 px-1.5 text-center w-20">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {displayStudents.map((st, idx) => (
                <tr key={st.studentId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="py-1 px-1.5 border-r border-slate-400 text-center font-mono font-bold text-slate-700">
                    {st.sl}
                  </td>
                  <td
                    className={`py-1 px-1.5 border-r border-slate-400 text-center font-mono font-black text-slate-900 text-[11px] ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleStudentUpdate(idx, 'rollNumber', e.currentTarget.textContent || '')}
                  >
                    {st.rollNumber}
                  </td>
                  <td
                    className={`py-1 px-1.5 border-r border-slate-400 font-mono text-[9.5px] text-slate-700 ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleStudentUpdate(idx, 'uniqId', e.currentTarget.textContent || '')}
                  >
                    {st.uniqId}
                  </td>
                  <td
                    className={`py-1 px-1.5 border-r border-slate-400 font-bold text-slate-900 uppercase truncate max-w-[140px] ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleStudentUpdate(idx, 'name', e.currentTarget.textContent || '')}
                  >
                    {st.name}
                  </td>
                  <td
                    className={`py-1 px-1.5 border-r border-slate-400 text-slate-700 font-medium ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleStudentUpdate(idx, 'className', e.currentTarget.textContent || '')}
                  >
                    {st.className} {st.sectionName ? `(${st.sectionName})` : ''}
                  </td>
                  <td className="py-1 px-1.5 border-r border-slate-400 text-center">
                    <div
                      className={`h-4.5 border border-slate-400 rounded-2xs bg-white flex items-center justify-center font-mono text-[9.5px] ${editableClass}`}
                      contentEditable={isEditable}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => handleStudentUpdate(idx, 'scriptSerialNo', e.currentTarget.textContent || '')}
                    >
                      {st.scriptSerialNo || ''}
                    </div>
                  </td>
                  <td className="py-1 px-1.5 border-r border-slate-400 text-center">
                    <div
                      className={`h-4.5 border border-slate-400 rounded-2xs bg-white flex items-center justify-center font-mono text-[9.5px] ${editableClass}`}
                      contentEditable={isEditable}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => handleStudentUpdate(idx, 'extraScriptCount', parseInt(e.currentTarget.textContent || '0', 10) || 0)}
                    >
                      {st.extraScriptCount !== undefined && st.extraScriptCount !== 0 ? st.extraScriptCount : ''}
                    </div>
                  </td>
                  <td className="py-1 px-1.5 border-r border-slate-400 text-center">
                    <div className="h-5 border border-slate-300 rounded-2xs bg-white flex items-center justify-center text-slate-300 text-[8.5px] italic">
                      Sign Here
                    </div>
                  </td>
                  <td
                    className={`py-1 px-1.5 text-center text-slate-600 font-medium text-[9.5px] ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleStudentUpdate(idx, 'remarks', e.currentTarget.textContent || '')}
                  >
                    {st.remarks || (st.status === 'ABSENT' ? 'ABSENT' : '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 & 4. Summary Tally & Official Signatures Block (Rendered on Last Page) */}
      {isLastPage && (
        <div>
          {/* Summary Tally Box */}
          <div className="my-2 p-1.5 bg-slate-50 border border-slate-300 rounded grid grid-cols-5 gap-2 text-center text-[10px]">
            <div className="border-r border-slate-300 pr-1">
              <span className="text-slate-500 font-semibold block text-[9px]">Total Allocated:</span>
              <span className="font-extrabold text-slate-900">{totalAllocatedCount} Candidates</span>
            </div>
            <div className="border-r border-slate-300 pr-1">
              <span className="text-slate-500 font-semibold block text-[9px]">Present Count:</span>
              <span className="font-extrabold text-emerald-700">______ Candidates</span>
            </div>
            <div className="border-r border-slate-300 pr-1">
              <span className="text-slate-500 font-semibold block text-[9px]">Absent Count:</span>
              <span className="font-extrabold text-rose-700">______ Candidates</span>
            </div>
            <div className="border-r border-slate-300 pr-1">
              <span className="text-slate-500 font-semibold block text-[9px]">Expelled / Withheld:</span>
              <span className="font-extrabold text-slate-800">______ Candidates</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[9px]">Scripts Used:</span>
              <span className="font-extrabold text-slate-900">______ Scripts</span>
            </div>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center mt-3">
            <div>
              <div className="h-6 flex items-end justify-center">
                <span className="text-slate-400 text-xs">__________________________</span>
              </div>
              <p className="font-bold text-slate-900 text-[10px] uppercase mt-0.5">
                Invigilator Signature
              </p>
              <p
                className={`text-[9px] text-slate-500 font-medium ${editableClass}`}
                contentEditable={isEditable}
                suppressContentEditableWarning={true}
                onBlur={(e) => handleFieldUpdate('invigilatorName', e.currentTarget.textContent?.replace('Name:', '').trim() || '')}
              >
                Name: {sheetData.invigilatorName || '__________________'}
              </p>
            </div>

            <div>
              <div className="h-6 flex items-end justify-center">
                <span className="text-slate-400 text-xs">__________________________</span>
              </div>
              <p className="font-bold text-slate-900 text-[10px] uppercase mt-0.5">
                Hall Super / Chief Invigilator
              </p>
              <p className="text-[9px] text-slate-500 font-medium">Signature &amp; Seal</p>
            </div>

            <div>
              <div className="h-6 flex items-end justify-center">
                <span className="text-slate-400 text-xs">__________________________</span>
              </div>
              <p className="font-bold text-slate-900 text-[10px] uppercase mt-0.5">
                Exam Controller
              </p>
              <p className="text-[9px] text-slate-500 font-medium">Authorized Verification</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AdmitCardStudent, AdmitCardPrintLayout } from '../types';
import { AcademicCapIcon, UserIcon } from '../../../../components/ui/Icons';

export interface AdmitCardCanvasProps {
  card: AdmitCardStudent;
  institutionName?: string;
  institutionLogo?: string;
  institutionAddress?: string;
  scale?: number;
  className?: string;
  showSignature?: boolean;
  showQrCode?: boolean;
  layout?: AdmitCardPrintLayout; // '1_PER_PAGE' | '2_PER_PAGE' | '4_PER_PAGE'
  isEditable?: boolean;
  onCardChange?: (updatedCard: AdmitCardStudent) => void;
  onInstitutionNameChange?: (name: string) => void;
  onInstitutionAddressChange?: (address: string) => void;
}

/**
 * Enterprise Admit Card Canvas Component
 * 
 * Pixel-perfect official admit card rendering with student photograph,
 * institutional credentials, full exam routine matrix, code of conduct,
 * authorized signatures, and verification QR code.
 * Supports adaptive density layouts (1, 2, or 4 cards per A4 page) and
 * direct WYSIWYG live document editing.
 */
export default function AdmitCardCanvas({
  card,
  institutionName = 'TaleemOS Academic Institution',
  institutionLogo,
  institutionAddress = 'Main Campus, Education Boulevard',
  scale = 1,
  className = '',
  showSignature = true,
  showQrCode = true,
  layout = '2_PER_PAGE',
  isEditable = true,
  onCardChange,
  onInstitutionNameChange,
  onInstitutionAddressChange,
}: AdmitCardCanvasProps) {
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-admit?id=${card.uniqId}&exam=${card.examId}`;

  // Sizing tokens based on layout density
  const isFullPage = layout === '1_PER_PAGE';
  const isFourPerPage = layout === '4_PER_PAGE';
  const isTwoPerPage = layout === '2_PER_PAGE' || (!isFullPage && !isFourPerPage);

  const containerClasses = isFullPage
    ? 'h-full min-h-[960px] p-6'
    : isFourPerPage
    ? 'h-[515px] p-2.5 text-[10px]'
    : 'h-[515px] max-h-[515px] p-3 sm:p-3.5'; // Standard 2 per A4 sheet

  const displayedRules = isFullPage
    ? (card.codeOfConduct || [])
    : isFourPerPage
    ? (card.codeOfConduct || []).slice(0, 2)
    : (card.codeOfConduct || []).slice(0, 3);

  const handleFieldUpdate = (field: keyof AdmitCardStudent, value: any) => {
    if (!onCardChange) return;
    onCardChange({
      ...card,
      [field]: value,
    });
  };

  const handleRoutineUpdate = (routineIndex: number, field: string, value: string) => {
    if (!onCardChange) return;
    const updatedRoutine = [...(card.routine || [])];
    if (updatedRoutine[routineIndex]) {
      updatedRoutine[routineIndex] = {
        ...updatedRoutine[routineIndex],
        [field]: value,
      };
      onCardChange({
        ...card,
        routine: updatedRoutine,
      });
    }
  };

  const handleRuleUpdate = (ruleIndex: number, value: string) => {
    if (!onCardChange) return;
    const updatedRules = [...(card.codeOfConduct || [])];
    updatedRules[ruleIndex] = value;
    onCardChange({
      ...card,
      codeOfConduct: updatedRules,
    });
  };

  const editableClass = isEditable
    ? 'outline-hidden focus:ring-1.5 focus:ring-blue-500/60 focus:bg-blue-50/40 hover:bg-slate-100/80 rounded px-0.5 -mx-0.5 transition-colors cursor-text'
    : '';

  return (
    <div
      className={`relative bg-white text-slate-900 border-2 border-slate-800 rounded-xl shadow-xs flex flex-col justify-between overflow-hidden font-sans ${containerClasses} ${className}`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      {/* Decorative Security Border & Watermark */}
      <div className="absolute inset-1 border border-slate-300 rounded-lg pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
        <AcademicCapIcon className="w-72 h-72 text-slate-900" />
      </div>

      {/* 1. Official Header */}
      <div className={`relative z-10 border-b-2 border-slate-800 ${isFullPage ? 'pb-3' : isFourPerPage ? 'pb-1.5' : 'pb-2'}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Institution Logo */}
          <div
            className={`rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs ${
              isFullPage ? 'w-14 h-14' : isFourPerPage ? 'w-8 h-8 rounded-lg' : 'w-11 h-11'
            }`}
          >
            {institutionLogo ? (
              <img src={institutionLogo} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <AcademicCapIcon className={isFullPage ? 'w-8 h-8 text-slate-700' : isFourPerPage ? 'w-5 h-5 text-slate-700' : 'w-6 h-6 text-slate-700'} />
            )}
          </div>

          {/* Title & Institutional Meta */}
          <div className="text-center flex-1 min-w-0">
            <h2
              className={`font-black uppercase tracking-tight text-slate-900 leading-tight truncate ${editableClass} ${
                isFullPage ? 'text-base' : isFourPerPage ? 'text-[11px]' : 'text-xs sm:text-sm'
              }`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => onInstitutionNameChange?.(e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Institution Name' : undefined}
            >
              {institutionName}
            </h2>
            <p
              className={`text-slate-600 font-medium leading-tight truncate ${editableClass} ${
                isFullPage ? 'text-[11px]' : isFourPerPage ? 'text-[8.5px]' : 'text-[9.5px]'
              }`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => onInstitutionAddressChange?.(e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Institution Address' : undefined}
            >
              {institutionAddress}
            </p>
            <div
              className={`inline-block bg-slate-900 text-white font-bold rounded-full uppercase tracking-wider ${editableClass} ${
                isFullPage
                  ? 'mt-1 px-3 py-0.5 text-[11px]'
                  : isFourPerPage
                  ? 'mt-0.5 px-2 py-0.2 text-[8px]'
                  : 'mt-0.5 px-2.5 py-0.5 text-[9px]'
              }`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('examTitle', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Exam Title' : undefined}
            >
              Admit Card — {card.examTitle} ({card.sessionYear})
            </div>
          </div>

          {/* Quick QR Code for Verification */}
          {showQrCode && (
            <div
              className={`bg-white border border-slate-300 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                isFullPage ? 'w-14 h-14 p-1' : isFourPerPage ? 'w-9 h-9 p-0.5 rounded-lg' : 'w-11 h-11 p-0.5'
              }`}
            >
              <QRCodeSVG
                value={verifyUrl}
                size={isFullPage ? 48 : isFourPerPage ? 30 : 38}
                level="M"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Student Bio & Credentials Matrix */}
      <div
        className={`relative z-10 grid grid-cols-12 gap-2 bg-slate-50/80 border border-slate-200 rounded-lg ${
          isFullPage ? 'p-3 my-3' : isFourPerPage ? 'p-1.5 my-1' : 'p-2 my-1.5'
        }`}
      >
        {/* Left: Metadata columns */}
        <div
          className={`col-span-9 grid grid-cols-2 gap-x-2.5 text-slate-900 ${
            isFullPage
              ? 'gap-y-1.5 text-xs'
              : isFourPerPage
              ? 'gap-y-0.5 text-[9px]'
              : 'gap-y-1 text-[10.5px]'
          }`}
        >
          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-500 font-medium shrink-0">Name:</span>
            <span
              className={`font-bold uppercase truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('name', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit student name' : undefined}
            >
              {card.name}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium shrink-0">Roll No:</span>
            <span
              className={`font-extrabold font-mono text-slate-900 px-1.5 py-0.2 bg-white border border-slate-300 rounded text-[11px] ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('rollNumber', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit roll number' : undefined}
            >
              {card.rollNumber}
            </span>
          </div>

          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-500 font-medium shrink-0">ID:</span>
            <span
              className={`font-bold font-mono text-slate-800 truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('uniqId', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Student ID' : undefined}
            >
              {card.uniqId}
            </span>
          </div>

          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-500 font-medium shrink-0">Class:</span>
            <span
              className={`font-bold truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('className', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit class' : undefined}
            >
              {card.className}
            </span>
            <span
              className={`font-semibold text-slate-700 truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('sectionName', (e.currentTarget.textContent || '').replace(/[()]/g, '').trim())}
              title={isEditable ? 'Click to edit section' : undefined}
            >
              {card.sectionName ? `(${card.sectionName})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-500 font-medium shrink-0">Guardian:</span>
            <span
              className={`font-semibold text-slate-800 truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('fatherName', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit guardian name' : undefined}
            >
              {card.fatherName || 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-500 font-medium shrink-0">Room:</span>
            <span
              className={`font-bold truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('roomNumber', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit hall / room' : undefined}
            >
              {card.roomNumber || 'Main Hall'}
            </span>
          </div>
        </div>

        {/* Right: Student Photograph */}
        <div className="col-span-3 flex justify-end items-center">
          <div
            className={`border-2 border-slate-400 rounded-md overflow-hidden bg-white shadow-2xs flex flex-col items-center justify-center shrink-0 ${
              isFullPage
                ? 'w-20 h-24'
                : isFourPerPage
                ? 'w-12 h-14'
                : 'w-16 h-20'
            }`}
          >
            {card.photoUrl ? (
              <img src={card.photoUrl} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-center p-0.5">
                <UserIcon className={isFullPage ? 'w-8 h-8' : isFourPerPage ? 'w-5 h-5' : 'w-6 h-6'} />
                <span className="text-[8px] font-semibold text-slate-400 uppercase mt-0.5 leading-none">Photo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Examination Routine Schedule Table */}
      <div className={`relative z-10 ${isFullPage ? 'my-2' : 'my-1'}`}>
        <h4
          className={`font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-0.5 ${
            isFullPage ? 'text-[11px]' : 'text-[9.5px]'
          }`}
        >
          <span>Examination Schedule &amp; Timetable</span>
        </h4>
        <div className="border border-slate-300 rounded-md overflow-hidden">
          <table
            className={`w-full text-left border-collapse ${
              isFullPage
                ? 'text-[11px]'
                : isFourPerPage
                ? 'text-[8.5px]'
                : 'text-[9.5px]'
            }`}
          >
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                <th className="py-0.5 px-1.5 border-r border-slate-300 text-center w-6">#</th>
                <th className="py-0.5 px-1.5 border-r border-slate-300">Subject Name</th>
                <th className="py-0.5 px-1.5 border-r border-slate-300 text-center w-16">Code</th>
                <th className="py-0.5 px-1.5 border-r border-slate-300 text-center w-24">Date &amp; Day</th>
                <th className="py-0.5 px-1.5 border-r border-slate-300 text-center w-24">Time Slot</th>
                <th className="py-0.5 px-1.5 text-center w-16">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {card.routine.map((item, idx) => (
                <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-0.5 px-1.5 border-r border-slate-300 text-center font-mono font-semibold">{idx + 1}</td>
                  <td
                    className={`py-0.5 px-1.5 border-r border-slate-300 font-bold text-slate-900 truncate max-w-[140px] ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleRoutineUpdate(idx, 'subjectName', e.currentTarget.textContent || '')}
                    title={isEditable ? 'Click to edit subject name' : undefined}
                  >
                    {item.subjectName}
                  </td>
                  <td
                    className={`py-0.5 px-1.5 border-r border-slate-300 text-center font-mono text-slate-700 ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleRoutineUpdate(idx, 'subjectCode', e.currentTarget.textContent || '')}
                    title={isEditable ? 'Click to edit subject code' : undefined}
                  >
                    {item.subjectCode || '—'}
                  </td>
                  <td
                    className={`py-0.5 px-1.5 border-r border-slate-300 text-center font-medium whitespace-nowrap ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleRoutineUpdate(idx, 'examDate', e.currentTarget.textContent || '')}
                    title={isEditable ? 'Click to edit exam date' : undefined}
                  >
                    {item.examDate} ({item.dayOfWeek?.slice(0, 3)})
                  </td>
                  <td
                    className={`py-0.5 px-1.5 border-r border-slate-300 text-center font-medium whitespace-nowrap ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => {
                      const text = e.currentTarget.textContent || '';
                      const parts = text.split('-');
                      if (parts.length >= 2) {
                        handleRoutineUpdate(idx, 'startTime', parts[0].trim());
                        handleRoutineUpdate(idx, 'endTime', parts[1].trim());
                      } else {
                        handleRoutineUpdate(idx, 'startTime', text.trim());
                      }
                    }}
                    title={isEditable ? 'Click to edit exam time slot' : undefined}
                  >
                    {item.startTime} - {item.endTime}
                  </td>
                  <td
                    className={`py-0.5 px-1.5 text-center font-bold text-slate-800 whitespace-nowrap ${editableClass}`}
                    contentEditable={isEditable}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleRoutineUpdate(idx, 'roomNumber', e.currentTarget.textContent || '')}
                    title={isEditable ? 'Click to edit exam room' : undefined}
                  >
                    {item.roomNumber || card.roomNumber || 'Hall 1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Instructions & Code of Conduct */}
      <div
        className={`relative z-10 bg-slate-50 border border-slate-200 rounded-md ${
          isFullPage ? 'p-2 my-2' : isFourPerPage ? 'p-1 my-0.5' : 'p-1.5 my-1'
        }`}
      >
        <h5
          className={`font-bold uppercase tracking-wider text-slate-800 mb-0.5 ${
            isFullPage ? 'text-[10px]' : 'text-[8.5px]'
          }`}
        >
          General Instructions for Examinees:
        </h5>
        <ul
          className={`list-disc list-inside text-slate-600 space-y-0.5 leading-tight ${
            isFullPage ? 'text-[9.5px]' : 'text-[8px]'
          }`}
        >
          {displayedRules.map((rule, idx) => (
            <li
              key={idx}
              className={`truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleRuleUpdate(idx, e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit instruction' : undefined}
            >
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* 5. Signatures & Official Validation Block */}
      {showSignature && (
        <div
          className={`relative z-10 border-t border-slate-300 flex items-end justify-between text-center px-3 ${
            isFullPage ? 'pt-3' : isFourPerPage ? 'pt-1' : 'pt-1.5'
          }`}
        >
          <div className="flex flex-col items-center">
            <div className={`flex items-end ${isFullPage ? 'h-8' : isFourPerPage ? 'h-4' : 'h-5'}`}>
              <span className="text-[9px] font-mono text-slate-400 tracking-tighter">________________</span>
            </div>
            <span
              className={`font-bold text-slate-700 uppercase mt-0.5 ${
                isFullPage ? 'text-[10px]' : 'text-[8.5px]'
              }`}
            >
              Student Signature
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className={`flex items-end ${isFullPage ? 'h-8' : isFourPerPage ? 'h-4' : 'h-5'}`}>
              <span className="text-[9px] font-mono text-slate-400 tracking-tighter">________________</span>
            </div>
            <span
              className={`font-bold text-slate-700 uppercase mt-0.5 ${
                isFullPage ? 'text-[10px]' : 'text-[8.5px]'
              }`}
            >
              Exam Controller
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className={`flex items-end ${isFullPage ? 'h-8' : isFourPerPage ? 'h-4' : 'h-5'}`}>
              <span className="text-[9px] font-mono text-slate-400 tracking-tighter">________________</span>
            </div>
            <span
              className={`font-bold text-slate-700 uppercase mt-0.5 ${
                isFullPage ? 'text-[10px]' : 'text-[8.5px]'
              }`}
            >
              Principal / Muhtamim
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

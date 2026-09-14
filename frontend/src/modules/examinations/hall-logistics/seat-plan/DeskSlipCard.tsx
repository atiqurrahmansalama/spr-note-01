import React from 'react';
import { DeskSlipItem, DeskSlipPrintLayout } from '../types';
import { AcademicCapIcon } from '../../../../components/ui/Icons';

export interface DeskSlipCardProps {
  slip: DeskSlipItem;
  institutionName?: string;
  className?: string;
  showDottedBorder?: boolean;
  layout?: DeskSlipPrintLayout; // '8_PER_PAGE' | '6_PER_PAGE'
  isEditable?: boolean;
  onSlipChange?: (updatedSlip: DeskSlipItem) => void;
  onInstitutionNameChange?: (name: string) => void;
}

/**
 * Enterprise Desk Slip / Bench Sticker Component
 * 
 * High-visibility examination hall bench sticker featuring bold roll numbers,
 * student credentials, room allocation, bench sequence, and dashed cutting guidelines.
 * Supports live WYSIWYG editing.
 */
export default function DeskSlipCard({
  slip,
  institutionName = 'TaleemOS Academic Institution',
  className = '',
  showDottedBorder = true,
  layout = '8_PER_PAGE',
  isEditable = true,
  onSlipChange,
  onInstitutionNameChange,
}: DeskSlipCardProps) {
  const isSixPerPage = layout === '6_PER_PAGE';

  const handleFieldUpdate = (field: keyof DeskSlipItem, value: any) => {
    if (!onSlipChange) return;
    onSlipChange({
      ...slip,
      [field]: value,
    });
  };

  const editableClass = isEditable
    ? 'outline-hidden focus:ring-1.5 focus:ring-blue-500/60 focus:bg-blue-50/40 hover:bg-slate-100/80 rounded px-0.5 -mx-0.5 transition-colors cursor-text'
    : '';

  return (
    <div
      className={`relative bg-white text-slate-900 rounded-lg flex flex-col justify-between overflow-hidden font-sans ${
        isSixPerPage ? 'h-[310px] max-h-[310px] p-4' : 'h-[235px] max-h-[235px] p-3'
      } ${
        showDottedBorder ? 'border-2 border-dashed border-slate-400' : 'border border-slate-300'
      } ${className}`}
    >
      {/* Top Banner: Institution & Exam Title */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <AcademicCapIcon className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <h4
              className={`text-[11px] font-extrabold uppercase tracking-tight text-slate-800 leading-none truncate ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => onInstitutionNameChange?.(e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Institution Name' : undefined}
            >
              {institutionName}
            </h4>
            <p
              className={`text-[9px] font-medium text-slate-500 leading-tight truncate mt-0.5 ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('examTitle', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Exam Title' : undefined}
            >
              {slip.examTitle} ({slip.sessionYear})
            </p>
          </div>
        </div>

        {/* Room Badge */}
        <span
          className={`shrink-0 px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 font-bold text-[10px] rounded ${editableClass}`}
          contentEditable={isEditable}
          suppressContentEditableWarning={true}
          onBlur={(e) => handleFieldUpdate('roomName', e.currentTarget.textContent || '')}
          title={isEditable ? 'Click to edit Room Name' : undefined}
        >
          {slip.roomName}
        </span>
      </div>

      {/* Center Body: Massive Roll Number & Student Bio */}
      <div className="flex items-center justify-between gap-3 my-1">
        {/* Left: Bio info */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div
            className={`${isSixPerPage ? 'text-sm' : 'text-xs'} font-extrabold uppercase text-slate-900 truncate ${editableClass}`}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleFieldUpdate('name', e.currentTarget.textContent || '')}
            title={isEditable ? 'Click to edit student name' : undefined}
          >
            {slip.name}
          </div>
          <div className="text-[10px] text-slate-600 font-medium">
            Class: <span
              className={`font-bold text-slate-800 ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('className', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit class' : undefined}
            >
              {slip.className}
            </span> <span
              className={`font-semibold text-slate-700 ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('sectionName', (e.currentTarget.textContent || '').replace(/[()]/g, '').trim())}
              title={isEditable ? 'Click to edit section' : undefined}
            >
              {slip.sectionName ? `(${slip.sectionName})` : ''}
            </span>
          </div>
          <div className="text-[9.5px] font-mono text-slate-500">
            ID: <span
              className={`font-semibold text-slate-700 ${editableClass}`}
              contentEditable={isEditable}
              suppressContentEditableWarning={true}
              onBlur={(e) => handleFieldUpdate('uniqId', e.currentTarget.textContent || '')}
              title={isEditable ? 'Click to edit Student ID' : undefined}
            >
              {slip.uniqId}
            </span>
          </div>
        </div>

        {/* Right: Prominent Examination Roll Box */}
        <div className={`flex flex-col items-center justify-center bg-slate-900 text-white rounded-lg px-3 py-1 ${isSixPerPage ? 'min-w-[80px]' : 'min-w-[70px]'} shadow-2xs`}>
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-300">
            ROLL NO
          </span>
          <span
            className={`${isSixPerPage ? 'text-2xl' : 'text-xl'} font-black font-mono leading-none tracking-tight ${editableClass}`}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleFieldUpdate('rollNumber', e.currentTarget.textContent || '')}
            title={isEditable ? 'Click to edit roll number' : undefined}
          >
            {slip.rollNumber}
          </span>
        </div>
      </div>

      {/* Bottom Footer: Bench & Seat Coordinates */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 mt-1.5 text-[10px]">
        <div className="flex items-center gap-1 font-semibold text-slate-700">
          <span>Bench:</span>
          <span
            className={`font-bold text-slate-900 px-1.5 py-0.2 bg-slate-100 border border-slate-300 rounded text-[9.5px] ${editableClass}`}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleFieldUpdate('benchNumber', e.currentTarget.textContent?.replace('#', '') || '')}
            title={isEditable ? 'Click to edit bench number' : undefined}
          >
            #{slip.benchNumber}
          </span>
        </div>

        <div className="flex items-center gap-1 font-semibold text-slate-700">
          <span>Position:</span>
          <span
            className={`font-bold text-slate-900 px-1.5 py-0.2 bg-slate-100 border border-slate-300 rounded text-[9.5px] ${editableClass}`}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleFieldUpdate('seatPosition', e.currentTarget.textContent || '')}
            title={isEditable ? 'Click to edit seat position' : undefined}
          >
            {slip.seatPosition || 'Seat 1'}
          </span>
        </div>
      </div>
    </div>
  );
}

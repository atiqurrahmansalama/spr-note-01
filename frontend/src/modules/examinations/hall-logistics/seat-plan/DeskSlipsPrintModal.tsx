import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import UniversalPrintModal from '@/components/print/UniversalPrintModal';
import { TemplatePlaceholderKey } from '@/components/print/docxTemplateEngine';
import DeskSlipCard from './DeskSlipCard';
import { DeskSlipItem, DeskSlipPrintLayout } from '../types';

export const DESK_SLIPS_PLACEHOLDER_KEYS: TemplatePlaceholderKey[] = [
  // Logistics & Seating
  { key: 'bench_number', label: 'Bench / Table Number', category: 'logistics', sampleValue: '#101', description: 'Desk/Bench identifier' },
  { key: 'seat_position', label: 'Seat Position', category: 'logistics', sampleValue: 'Seat 1 (Left)', description: 'Position on bench' },
  { key: 'room_name', label: 'Exam Hall / Room', category: 'logistics', sampleValue: 'Hall 204 (East Wing)', description: 'Allocated room name' },
  { key: 'exam_title', label: 'Examination Title', category: 'examination', sampleValue: 'Annual Examination 2026', description: 'Exam term title' },
  { key: 'session_year', label: 'Session Year', category: 'examination', sampleValue: '2026', description: 'Academic year' },

  // Student Info
  { key: 'student_name', label: 'Student Full Name', category: 'student', sampleValue: 'Rahim Ahmed', description: 'Candidate name' },
  { key: 'roll_number', label: 'Roll Number', category: 'student', sampleValue: '101', description: 'Class roll number' },
  { key: 'uniq_id', label: 'Student ID / Reg No', category: 'student', sampleValue: 'STD-2026-0042', description: 'Candidate registration ID' },
  { key: 'class_name', label: 'Class / Grade', category: 'student', sampleValue: 'Class 10', description: 'Academic class' },
  { key: 'section_name', label: 'Section', category: 'student', sampleValue: 'Section A', description: 'Classroom section' },
  { key: 'group_name', label: 'Academic Group', category: 'student', sampleValue: 'Science', description: 'Academic stream' },

  // Institution & Meta
  { key: 'institution_name', label: 'Institution Name', category: 'institution', sampleValue: 'TaleemOS Academic Institution', description: 'Official institution' },
  { key: 'print_date', label: 'Print Date', category: 'general', sampleValue: new Date().toLocaleDateString(), description: 'Print timestamp' },
];

export interface DeskSlipsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  slips: DeskSlipItem[];
  institutionName?: string;
}

/**
 * Desk Slips & Bench Stickers Print Studio
 */
export default function DeskSlipsPrintModal({
  isOpen,
  onClose,
  slips,
  institutionName = 'TaleemOS Academic Institution',
}: DeskSlipsPrintModalProps) {
  const [layout, setLayout] = useState<DeskSlipPrintLayout>('8_PER_PAGE');
  const [showDottedBorder, setShowDottedBorder] = useState<boolean>(true);
  const [groupByRoom, setGroupByRoom] = useState<boolean>(true);

  // Live in-place editable state
  const [liveSlips, setLiveSlips] = useState<DeskSlipItem[]>(() => slips || []);
  const [liveInstitutionName, setLiveInstitutionName] = useState<string>(institutionName);

  const prevSlipsSigRef = useRef('');
  useEffect(() => {
    const sig = Array.isArray(slips) ? slips.map(s => `${s.id}_${s.studentId}_${s.rollNumber}`).join(',') : '';
    if (sig && sig !== prevSlipsSigRef.current) {
      prevSlipsSigRef.current = sig;
      setLiveSlips(slips);
    }
  }, [slips]);

  useEffect(() => {
    if (institutionName) {
      setLiveInstitutionName(institutionName);
    }
  }, [institutionName]);

  const handleSlipChange = useCallback((updatedSlip: DeskSlipItem) => {
    setLiveSlips((prev) =>
      prev.map((s) => (s.id === updatedSlip.id || s.studentId === updatedSlip.studentId ? updatedSlip : s))
    );
  }, []);

  const handleInstitutionNameChange = useCallback((newName: string) => {
    setLiveInstitutionName(newName);
  }, []);

  const printTemplates = useMemo(() => [
    {
      id: '8_PER_PAGE',
      name: '8 Slips Per Sheet (2 x 4 Grid)',
      description: 'Standard 8 bench stickers per portrait A4 sheet',
    },
    {
      id: '6_PER_PAGE',
      name: '6 Slips Per Sheet (2 x 3 Grid)',
      description: 'Spacious 6 bench stickers per portrait A4 sheet',
    },
  ], []);

  // Group slips by room if enabled
  const groupedSlips = useMemo(() => {
    const currentList = liveSlips.length > 0 ? liveSlips : slips;
    if (!groupByRoom) return { 'All Examinees': currentList };
    return currentList.reduce((acc, slip) => {
      const room = slip.roomName || 'Unassigned Room';
      if (!acc[room]) acc[room] = [];
      acc[room].push(slip);
      return acc;
    }, {} as Record<string, DeskSlipItem[]>);
  }, [liveSlips, slips, groupByRoom]);

  const pageSize = layout === '6_PER_PAGE' ? 6 : 8;

  const paginatedPages = useMemo(() => {
    const pages: { roomTitle: string; slips: DeskSlipItem[]; pageNumber: number; totalRoomPages: number; totalRoomExaminees: number }[] = [];
    Object.entries(groupedSlips).forEach(([roomTitle, roomSlips]) => {
      const totalRoomPages = Math.ceil(roomSlips.length / pageSize) || 1;
      for (let i = 0; i < roomSlips.length; i += pageSize) {
        pages.push({
          roomTitle,
          slips: roomSlips.slice(i, i + pageSize),
          pageNumber: Math.floor(i / pageSize) + 1,
          totalRoomPages,
          totalRoomExaminees: roomSlips.length,
        });
      }
    });
    return pages;
  }, [groupedSlips, pageSize]);

  const defaultPrintOptions = useMemo(() => ({
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NONE',
    colorMode: 'FULL_COLOR',
    density: 'NORMAL',
    fontSize: 100,
    enablePageBreak: true,
  }), []);

  if (!isOpen) return null;

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Seat Plan & Desk Slips (${liveSlips.length || slips.length} Slips)`}
      subtitle={`${liveInstitutionName} • Hall Bench Stickers`}
      customSheets={true}
      data={liveSlips.length > 0 ? liveSlips : slips}
      placeholderKeys={DESK_SLIPS_PLACEHOLDER_KEYS}
      templates={printTemplates}
      activeTemplateId={layout}
      onTemplateChange={(tpl: any) => {
        if (tpl?.id) setLayout(tpl.id as DeskSlipPrintLayout);
      }}
      defaultOptions={defaultPrintOptions}
      urlSync={true}
      urlParam="print"
      urlParamValue="desk_slips"
    >
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        {paginatedPages.map((page, pIdx) => (
          <div
            key={`${page.roomTitle}_${page.pageNumber}_${pIdx}`}
            className="relative paper-sheet-wrapper group"
          >
            <div
              className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
              data-size="A4"
              data-orientation="PORTRAIT"
              data-margin="NONE"
              data-density="NORMAL"
              data-color-mode="FULL_COLOR"
              data-page-break="true"
            >
              <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between print:p-2.5">
                {groupByRoom && (
                  <div className="mb-2 pb-1.5 border-b-2 border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      Hall Seat Plan — {page.roomTitle} {page.totalRoomPages > 1 ? `(Page ${page.pageNumber} of ${page.totalRoomPages})` : ''}
                    </h3>
                    <span className="text-[10.5px] font-semibold text-slate-600">
                      Total Room Examinees: {page.totalRoomExaminees}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 content-start">
                  {page.slips.map((slip, idx) => (
                    <div key={slip.id || idx} className="w-full print:break-inside-avoid">
                      <DeskSlipCard
                        slip={slip}
                        institutionName={liveInstitutionName}
                        showDottedBorder={showDottedBorder}
                        layout={layout}
                        isEditable={true}
                        onSlipChange={handleSlipChange}
                        onInstitutionNameChange={handleInstitutionNameChange}
                        className="w-full shadow-xs print:shadow-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </UniversalPrintModal>
  );
}



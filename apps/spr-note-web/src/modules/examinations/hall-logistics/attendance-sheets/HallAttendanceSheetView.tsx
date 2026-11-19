import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CustomButton,
  CustomSelect,
  CustomInput,
} from '../../../../components/ui';
import {
  PrinterIcon,
  CalendarIcon,
  SearchIcon,
  IdentificationIcon,
} from '../../../../components/ui/Icons';
import { HallAttendanceSheetData } from '../types';
import HallAttendanceSheetCanvas from './HallAttendanceSheetCanvas';
import HallAttendancePrintModal from './HallAttendancePrintModal';

export interface HallAttendanceSheetViewProps {
  exams: any[];
  classes: any[];
  sections: any[];
  examSubjects?: any[];
  availableRooms: string[];
  selectedExamId: string;
  setSelectedExamId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  selectedRoomName: string;
  setSelectedRoomName: (room: string) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (sub: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  hallAttendanceData: HallAttendanceSheetData;
}

/**
 * Examination Hall Attendance & Script Tracking View
 */
export default function HallAttendanceSheetView({
  exams,
  classes,
  sections,
  examSubjects = [],
  availableRooms,
  selectedExamId,
  setSelectedExamId,
  selectedClassId,
  setSelectedClassId,
  selectedSectionId,
  setSelectedSectionId,
  selectedRoomName,
  setSelectedRoomName,
  selectedSubjectId,
  setSelectedSubjectId,
  searchQuery,
  setSearchQuery,
  hallAttendanceData,
}: HallAttendanceSheetViewProps) {
  const [searchParams] = useSearchParams();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('print') === 'hall_attendance';
    }
    return false;
  });
  const [invigilatorName, setInvigilatorName] = useState('Dr. Maulana Abdul Karim');
  const [examDate, setExamDate] = useState(hallAttendanceData.examDate || '2026-10-10');
  const [timeSlot, setTimeSlot] = useState('09:00 AM - 12:00 PM');

  useEffect(() => {
    if (searchParams.get('print') === 'hall_attendance') {
      setIsPrintModalOpen(true);
    }
  }, [searchParams]);

  const examOptions = exams.map((e: any) => ({
    value: String(e.id),
    label: `${e.title || e.name || 'Exam'} (${e.academic_year || '2026'})`,
  }));

  const classOptions = [
    { value: 'ALL', label: 'All Classes' },
    ...classes.map((c: any) => ({
      value: String(c.id),
      label: c.name || c.class_name || `Class ${c.id}`,
    })),
  ];

  const sectionOptions = [
    { value: 'ALL', label: 'All Sections' },
    ...sections.map((s: any) => ({
      value: String(s.id),
      label: s.name || s.section_name || `Section ${s.id}`,
    })),
  ];

  const roomOptions = [
    { value: 'ALL', label: 'All Rooms / Halls' },
    ...availableRooms.map((r) => ({
      value: r,
      label: r,
    })),
  ];

  const subjectOptions = [
    { value: 'ALL', label: 'All Subjects (Composite)' },
    ...(examSubjects && examSubjects.length > 0
      ? examSubjects.map((s: any) => ({
          value: s.name || s.subject_name || `Subject ${s.id}`,
          label: `${s.name || s.subject_name}${s.code ? ` (${s.code})` : ''}`,
        }))
      : [
          { value: 'Quran & Tajweed (ISL-101)', label: 'Quran & Tajweed (ISL-101)' },
          { value: 'Hadith & Usul al-Hadith (ISL-102)', label: 'Hadith & Usul al-Hadith (ISL-102)' },
          { value: 'Arabic Language (ARB-201)', label: 'Arabic Language (ARB-201)' },
          { value: 'Islamic Jurisprudence (ISL-202)', label: 'Islamic Jurisprudence (ISL-202)' },
        ]),
  ];

  // Enriched active sheet data with custom user overrides
  const enrichedSheetData: HallAttendanceSheetData = React.useMemo(() => {
    return {
      ...hallAttendanceData,
      invigilatorName,
      examDate,
      startTime: timeSlot.split('-')[0]?.trim() || '09:00 AM',
      endTime: timeSlot.split('-')[1]?.trim() || '12:00 PM',
    };
  }, [hallAttendanceData, invigilatorName, examDate, timeSlot]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Filter & Configuration Toolbar */}
      <div className="p-4 theme-bg-surface border theme-border rounded-2xl shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomSelect
            label="Examination"
            value={selectedExamId}
            options={examOptions}
            onChange={(val: any) => setSelectedExamId(String(val))}
          />

          <CustomSelect
            label="Subject & Paper"
            value={selectedSubjectId}
            options={subjectOptions}
            onChange={(val: any) => setSelectedSubjectId(String(val))}
          />

          <CustomSelect
            label="Class Scope"
            value={selectedClassId}
            options={classOptions}
            onChange={(val: any) => setSelectedClassId(String(val))}
          />

          <CustomSelect
            label="Hall / Room"
            value={selectedRoomName}
            options={roomOptions}
            onChange={(val: any) => setSelectedRoomName(String(val))}
          />
        </div>

        {/* Invigilator & Session Overrides */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t theme-border">
          <CustomInput
            label="Assigned Invigilator Name"
            value={invigilatorName}
            onChange={(e: any) => setInvigilatorName(e.target.value)}
            placeholder="e.g. Dr. Maulana Abdul Karim"
          />

          <CustomInput
            label="Examination Date"
            type="date"
            value={examDate}
            onChange={(e: any) => setExamDate(e.target.value)}
          />

          <CustomInput
            label="Time Slot"
            value={timeSlot}
            onChange={(e: any) => setTimeSlot(e.target.value)}
            placeholder="09:00 AM - 12:00 PM"
          />
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t theme-border">
          <div className="flex items-center gap-2 text-xs theme-text-secondary">
            <span>Total Examinees in Sheet:</span>
            <strong className="theme-text-primary text-sm font-mono">
              {enrichedSheetData.students.length}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <CustomButton
              variant="primary"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={enrichedSheetData.students.length === 0}
              icon={PrinterIcon}
              className="shadow-xs"
            >
              <span>Print Hall Attendance Sheet</span>
            </CustomButton>
          </div>
        </div>
      </div>

      {/* 2. Live Canvas Preview */}
      <div className="p-4 md:p-6 theme-bg-sub/60 rounded-2xl border theme-border overflow-x-auto shadow-inner">
        <div className="max-w-[1020px] mx-auto">
          <HallAttendanceSheetCanvas
            sheetData={enrichedSheetData}
            className="w-full shadow-lg"
          />
        </div>
      </div>

      {/* 3. Print Modal */}
      {isPrintModalOpen && (
        <HallAttendancePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          sheetData={enrichedSheetData}
        />
      )}
    </div>
  );
}


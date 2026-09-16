import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import UniversalPrintStudio from '@/components/print/UniversalPrintStudio';
import { TemplatePlaceholderKey } from '@/components/print/docxTemplateEngine';
import HallAttendanceSheetCanvas from './HallAttendanceSheetCanvas';
import { HallAttendanceSheetData } from '../types';

export const HALL_ATTENDANCE_PLACEHOLDER_KEYS: TemplatePlaceholderKey[] = [
  // Exam Info
  { key: 'exam_title', label: 'Examination Title', category: 'examination', sampleValue: 'Annual Examination 2026', description: 'Exam term title' },
  { key: 'subject_name', label: 'Subject Name', category: 'examination', sampleValue: 'Mathematics', description: 'Subject title' },
  { key: 'subject_code', label: 'Subject Code', category: 'examination', sampleValue: 'MATH-101', description: 'Subject code' },
  { key: 'class_name', label: 'Class / Grade', category: 'examination', sampleValue: 'Class 10', description: 'Class level' },
  { key: 'room_name', label: 'Exam Hall / Room', category: 'examination', sampleValue: 'Hall 204 (East Wing)', description: 'Allocated hall' },
  { key: 'center_name', label: 'Exam Center', category: 'examination', sampleValue: 'Main Campus Center', description: 'Center location' },
  { key: 'invigilator_name', label: 'Assigned Invigilator', category: 'examination', sampleValue: 'Ustadh Tariq', description: 'Exam supervisor' },
  { key: 'exam_date', label: 'Exam Date', category: 'examination', sampleValue: '2026-10-15', description: 'Scheduled date' },
  { key: 'exam_time', label: 'Exam Time Slot', category: 'examination', sampleValue: '10:00 AM - 01:00 PM', description: 'Start and end time' },

  // Counts & Attendance
  { key: 'total_candidates', label: 'Total Candidates', category: 'attendance', sampleValue: '35', description: 'Total assigned students' },
  { key: 'present_count', label: 'Present Count', category: 'attendance', sampleValue: '33', description: 'Present count' },
  { key: 'absent_count', label: 'Absent Count', category: 'attendance', sampleValue: '2', description: 'Absent count' },

  // Institution & Meta
  { key: 'institution_name', label: 'Institution Name', category: 'institution', sampleValue: 'TaleemOS Academic Institution', description: 'Official institution' },
  { key: 'print_date', label: 'Print Date', category: 'general', sampleValue: new Date().toLocaleDateString(), description: 'Print timestamp' },
];

export interface HallAttendancePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: HallAttendanceSheetData;
}

/**
 * Hall Attendance Sheet Print Studio
 */
export default function HallAttendancePrintModal({
  isOpen,
  onClose,
  sheetData,
}: HallAttendancePrintModalProps) {
  // Live in-place editable state
  const [liveSheetData, setLiveSheetData] = useState<HallAttendanceSheetData>(() => sheetData);

  const prevSheetSigRef = useRef('');
  useEffect(() => {
    const sig = sheetData ? `${sheetData.examTitle}_${sheetData.subjectName}_${sheetData.roomName}_${sheetData.students?.length}` : '';
    if (sig && sig !== prevSheetSigRef.current) {
      prevSheetSigRef.current = sig;
      setLiveSheetData(sheetData);
    }
  }, [sheetData]);

  const handleSheetDataChange = useCallback((updatedData: HallAttendanceSheetData) => {
    setLiveSheetData(updatedData);
  }, []);

  const defaultPrintOptions = useMemo(() => ({
    pageSize: 'A4' as const,
    orientation: 'PORTRAIT' as const,
    margin: 'NONE' as const,
    colorMode: 'FULL_COLOR' as const,
    density: 'NORMAL' as const,
    fontSize: 100,
    enablePageBreak: true,
  }), []);

  const activeData = liveSheetData || sheetData;

  const pages = useMemo(() => {
    const list: (typeof activeData.students)[] = [];
    const all = activeData.students || [];
    if (all.length <= 16) {
      return [all];
    }
    list.push(all.slice(0, 16));
    let start = 16;
    while (start < all.length) {
      list.push(all.slice(start, start + 20));
      start += 20;
    }
    return list;
  }, [activeData.students]);

  if (!isOpen) return null;

  return (
    <UniversalPrintStudio
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Hall Attendance Sheet"
      subtitle={`${activeData.institutionName} • ${activeData.examTitle} • Room: ${activeData.roomName}`}
      customSheets={true}
      data={activeData.students || []}
      placeholderKeys={HALL_ATTENDANCE_PLACEHOLDER_KEYS}
      scopeId="examinations_attendance_sheet"
      scopeName="Hall Attendance Sheets"
      scopeDescription="Examination hall student roll call and attendance registers"
      defaultOptions={defaultPrintOptions}
      enabledFormats={['pdf', 'word', 'png', 'jpg', 'print']}
    >
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        {pages.map((pageStudents, pIdx) => (
          <div
            key={pIdx}
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
              <div className="w-full h-full p-4 print:p-2">
                <HallAttendanceSheetCanvas
                  sheetData={activeData}
                  students={pageStudents}
                  pageIndex={pIdx}
                  totalPages={pages.length}
                  isFirstPage={pIdx === 0}
                  isLastPage={pIdx === pages.length - 1}
                  totalAllocatedCount={activeData.students?.length || 0}
                  isEditable={true}
                  onSheetDataChange={handleSheetDataChange}
                  className="w-full h-full shadow-xs print:shadow-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </UniversalPrintStudio>
  );
}

import React, { useState } from 'react';
import { DrawerContainer, DrawerBanner, DrawerFooter } from '../../../../components/layout';
import { TeacherSelect } from '../../../../components/selectors';
import CustomInput from '../../../../components/ui/CustomInput';
import {
  UserIcon,
  CalendarIcon,
  ClockIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
} from '../../../../components/ui/Icons';
import { formatShortDateLabel } from '../utils/examScheduleUtils';

/**
 * InvigilationDutyDrawerForm
 * Enterprise Right Sidebar Drawer Form to assign or change the Hall Invigilator for a specific Exam Date & Shift slot.
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Zero double-padding (padding="none")
 * - Streamlined Section Separation (No boxed cards)
 * - Zero emojis in UI
 */
export default function InvigilationDutyDrawerForm({
  slotData = null,
  activeExam = null,
  teachers = [],
  onSave,
  onCancel,
}) {
  const [teacherId, setTeacherId] = useState(() => String(slotData?.invigilatorId || slotData?.teacherId || ''));
  const [teacherName, setTeacherName] = useState(() => slotData?.invigilatorName || slotData?.teacherName || '');
  const [roomNo, setRoomNo] = useState(() => slotData?.roomNo || '');
  const [notes, setNotes] = useState(() => slotData?.notes || '');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    onSave?.({
      ...slotData,
      invigilatorId: teacherId,
      invigilatorName: teacherName,
      teacherId,
      teacherName,
      roomNo,
      notes,
    });
  };

  return (
    <DrawerContainer padding="none" spacing="none">
      <form onSubmit={handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* Context Banner */}
        <DrawerBanner
          icon={UserIcon}
          title="Assign Hall Invigilator"
          subtitle={`Schedule Duty for ${formatShortDateLabel(slotData?.examDate)} (${slotData?.shiftName || 'Morning Shift'})`}
          badge={activeExam?.name || 'Active Session'}
        />

        {/* ─── SECTION 1: Slot Details Summary ─────────────────────────────── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <CalendarIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold theme-text-primary uppercase tracking-wider">
              Slot Information
            </h3>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary font-medium">
                <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Exam Date</span>
              </div>
              <div className="text-xs sm:text-sm font-bold theme-text-primary font-mono truncate">
                {formatShortDateLabel(slotData?.examDate)} ({slotData?.examDate})
              </div>
            </div>

            <div className="p-3 rounded-xl theme-bg-sub border theme-border space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary font-medium">
                <ClockIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Shift & Timing</span>
              </div>
              <div className="text-xs sm:text-sm font-bold theme-text-primary font-mono truncate">
                {slotData?.shiftName || 'Shift 1'}: {slotData?.startTime || '09:00 AM'} – {slotData?.endTime || '11:00 AM'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: Invigilator & Room Assignment ─────────────────────── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <UserIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold theme-text-primary uppercase tracking-wider">
              Invigilator & Hall Details
            </h3>
          </div>

          <div className="space-y-3.5">
            <TeacherSelect
              label="Assigned Hall Invigilator"
              value={teacherId}
              teachers={teachers}
              allowAll={false}
              searchable={true}
              placeholder="Search and assign teacher..."
              onChange={(val, teacherObj) => {
                const nameStr =
                  teacherObj?.name_en ||
                  teacherObj?.name ||
                  teacherObj?.full_name ||
                  teacherObj?.user_name ||
                  teacherObj?.label ||
                  '';
                setTeacherId(val || '');
                setTeacherName(nameStr);
              }}
            />

            <CustomInput
              label="Exam Hall / Room No"
              value={roomNo}
              onChange={(val) => setRoomNo(val)}
              placeholder="e.g. Central Hall 101, Main Auditorium"
              icon={BuildingLibraryIcon}
            />

            <CustomInput
              label="Duty Instructions / Notes"
              value={notes}
              onChange={(val) => setNotes(val)}
              placeholder="e.g. Verify student admit cards and question envelope seals"
              icon={DocumentTextIcon}
            />
          </div>
        </div>

        {/* ─── Drawer Action Footer ─────────────────────────────────────────── */}
        <DrawerFooter
          onCancel={onCancel}
          cancelLabel="Cancel"
          onSubmit={true}
          saveLabel="Save Invigilator Duty"
        />
      </form>
    </DrawerContainer>
  );
}

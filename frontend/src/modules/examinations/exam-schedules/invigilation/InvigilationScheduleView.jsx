import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable from '../../../../components/ui/DataTable';
import ActionMenu from '../../../../components/ui/ActionMenu';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  EditIcon,
  TrashIcon,
  BuildingLibraryIcon,
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../../context/RightSidebarContext';
import { examStore } from '@/stores/examStore';
import useExamData from '../../hooks/useExamData';
import { formatShortDateLabel, generateDateRange } from '../utils/examScheduleUtils';
import InvigilationDutyDrawerForm from './InvigilationDutyDrawerForm';
import { SubjectMatrixHeader } from '../subject-routine';
import { UniversalAutoPopulateDrawer } from '../../../../components/ui/auto-populate';

/**
 * InvigilationScheduleView
 * Dedicated Enterprise Hall Invigilation Roster Workspace.
 * Dynamically displays and manages exam hall invigilators per Exam Date & Shift slot.
 * Reuses the unified SubjectMatrixHeader for 100% UI consistency across Exam Schedules.
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Dynamic data-driven from Subject Matrix and Exam Store
 * - Clean minimal table showing Exam Date, Schedule/Timing, Invigilator, and Actions
 * - Real-time synchronization with examStore and Subject Routine Matrix
 * - Zero hardcoded colors, zero dead code, and zero emojis in UI
 */
export default function InvigilationScheduleView({ initialExamId = null }) {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const {
    tenantId,
    exams = [],
    teachers = [],
    classes: allAvailableClasses = [],
  } = useExamData();

  // Active Exam Session Context
  const [selectedExamId, setSelectedExamId] = useState(() => {
    if (initialExamId) return String(initialExamId);
    return exams.length > 0 ? String(exams[0].id) : '';
  });

  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(String(initialExamId));
    } else if ((!selectedExamId || !exams.some((e) => String(e.id) === String(selectedExamId))) && exams.length > 0) {
      setSelectedExamId(String(exams[0].id));
    }
  }, [initialExamId, exams, selectedExamId]);

  const activeExam = useMemo(() => {
    return exams.find((e) => String(e.id) === String(selectedExamId)) || (exams.length > 0 ? exams[0] : null);
  }, [exams, selectedExamId]);

  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.code || e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

  // Exam Shifts from active session
  const examShifts = useMemo(() => {
    if (Array.isArray(activeExam?.shifts) && activeExam.shifts.length > 0) {
      return activeExam.shifts;
    }
    const defaultShifts = [
      {
        id: 'shift_1',
        name: 'Shift 1 (Morning)',
        startTime: activeExam?.defaultStartTime || '09:00 AM',
        endTime: activeExam?.defaultEndTime || '11:00 AM',
      },
    ];
    if (activeExam?.hasSecondShift || activeExam?.secondStartTime) {
      defaultShifts.push({
        id: 'shift_2',
        name: 'Shift 2 (Afternoon)',
        startTime: activeExam?.secondStartTime || '02:00 PM',
        endTime: activeExam?.secondEndTime || '04:00 PM',
      });
    }
    return defaultShifts;
  }, [activeExam]);

  // Routine Rows State
  const [rows, setRows] = useState([]);

  const loadExamSubjects = useCallback(() => {
    if (!selectedExamId) {
      setRows([]);
      return;
    }
    const stored = examStore.getExamSubjects(tenantId, selectedExamId) || [];
    setRows(stored);
  }, [tenantId, selectedExamId]);

  useEffect(() => {
    loadExamSubjects();
  }, [loadExamSubjects]);

  // Real-time listener for subject updates across the application
  useEffect(() => {
    const handleUpdate = () => {
      loadExamSubjects();
    };
    window.addEventListener('spr_exam_subjects_updated', handleUpdate);
    window.addEventListener('spr_exams_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_exam_subjects_updated', handleUpdate);
      window.removeEventListener('spr_exams_updated', handleUpdate);
    };
  }, [loadExamSubjects]);

  // Derive Unique Invigilation Slots dynamically including ALL exam dates and shifts
  const dutySlots = useMemo(() => {
    const slotMap = new Map();

    const createInitialSlot = (date, shift, dayIndex = 1) => {
      const rosterDuty = activeExam?.dutyRoster?.[`${date}___${shift.id}`] || {};
      return {
        id: `${date}___${shift.id}`,
        examId: String(activeExam?.id || ''),
        examDate: date,
        dayIndex,
        shiftId: shift.id,
        shiftName: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        invigilatorId: rosterDuty.invigilatorId || '',
        invigilatorName: rosterDuty.invigilatorName || '',
        roomNo: rosterDuty.roomNo || '',
        notes: rosterDuty.notes || '',
        subjects: [],
        classes: [],
        departmentIds: [],
        classIds: [],
        subjectsCount: 0,
      };
    };

    // 1. Gather ALL configured exam days and shifts from activeExam.scheduleDays
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      activeExam.scheduleDays.forEach((d, dayIdx) => {
        if (d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK') {
          const shiftCount = typeof d.shiftCount === 'number'
            ? Math.max(1, Math.min(d.shiftCount, examShifts.length))
            : (d.type === 'DUAL_EXAM' ? Math.min(2, examShifts.length) : 1);

          const applicableShifts = examShifts.slice(0, shiftCount);
          applicableShifts.forEach((shift) => {
            const key = `${d.date}___${shift.id}`;
            const slot = createInitialSlot(d.date, shift, dayIdx + 1);
            slotMap.set(key, slot);
          });
        }
      });
    }

    // 2. If no scheduleDays configured, fallback to activeExam.startDate & endDate range
    if (slotMap.size === 0 && activeExam?.startDate && activeExam?.endDate) {
      const dates = generateDateRange(activeExam.startDate, activeExam.endDate);
      dates.forEach((dt, dayIdx) => {
        examShifts.forEach((shift) => {
          const key = `${dt}___${shift.id}`;
          const slot = createInitialSlot(dt, shift, dayIdx + 1);
          slotMap.set(key, slot);
        });
      });
    }

    // 3. Overlay / aggregate any scheduled subject routine rows
    if (Array.isArray(rows) && rows.length > 0) {
      rows.forEach((r) => {
        if (!r.examDate) return;
        const sId = r.shiftId || 'shift_1';
        const key = `${r.examDate}___${sId}`;
        let slot = slotMap.get(key);

        if (!slot) {
          const matchedShift = examShifts.find((s) => s.id === sId) || {
            id: sId,
            name: r.shiftName || 'Shift 1 (Morning)',
            startTime: r.startTime || '09:00 AM',
            endTime: r.endTime || '11:00 AM',
          };
          slot = createInitialSlot(r.examDate, matchedShift);
          slotMap.set(key, slot);
        }

        slot.subjectsCount += 1;
        if (r.subjectName && !slot.subjects.includes(r.subjectName)) {
          slot.subjects.push(r.subjectName);
        }
        if (r.className && !slot.classes.includes(r.className)) {
          slot.classes.push(r.className);
        }
        if (r.departmentId && !slot.departmentIds.includes(String(r.departmentId))) {
          slot.departmentIds.push(String(r.departmentId));
        }
        if (r.classId && !slot.classIds.includes(String(r.classId))) {
          slot.classIds.push(String(r.classId));
        }

        const rowInvId = r.invigilatorId || r.teacherId;
        const rowInvName = r.invigilatorName || r.teacherName;
        if (rowInvId && !slot.invigilatorId) {
          slot.invigilatorId = rowInvId;
          slot.invigilatorName = rowInvName;
        }
        if (r.roomNo && !slot.roomNo) {
          slot.roomNo = r.roomNo;
        }
        if (r.notes && !slot.notes) {
          slot.notes = r.notes;
        }
      });
    }

    // Return sorted list by date and shift
    return Array.from(slotMap.values()).sort((a, b) => {
      if (a.examDate !== b.examDate) return a.examDate.localeCompare(b.examDate);
      return a.shiftId.localeCompare(b.shiftId);
    });
  }, [activeExam, examShifts, rows]);

  // Filters
  const [filterExamDate, setFilterExamDate] = useState('ALL');
  const [filterTeacherId, setFilterTeacherId] = useState('ALL');

  const dateFilterOptions = useMemo(() => {
    const dates = Array.from(new Set(dutySlots.map((s) => s.examDate)));
    return [
      { value: 'ALL', label: 'All Exam Dates' },
      ...dates.map((d) => ({
        value: d,
        label: `${formatShortDateLabel(d)} (${d})`,
      })),
    ];
  }, [dutySlots]);

  const filteredSlots = useMemo(() => {
    return dutySlots.filter((s) => {
      if (filterExamDate !== 'ALL' && s.examDate !== filterExamDate) {
        return false;
      }
      if (filterTeacherId !== 'ALL') {
        if (filterTeacherId === 'UNASSIGNED') {
          if (s.invigilatorId || s.invigilatorName) return false;
        } else if (String(s.invigilatorId) !== String(filterTeacherId)) {
          return false;
        }
      }
      return true;
    });
  }, [dutySlots, filterExamDate, filterTeacherId]);

  // Drawer Registration for Invigilation Duty Assignment
  useDrawerRegistration(
    'invigilation_duty',
    (params) => {
      const slotId = params.get('slotId');
      const targetSlot = dutySlots.find((s) => s.id === slotId) || null;

      return {
        title: 'Assign Hall Invigilator',
        subtitle: `Exam Duty Schedule for ${formatShortDateLabel(targetSlot?.examDate)}`,
        category: 'Invigilation',
        size: 'md',
        width: 'md',
        content: (
          <InvigilationDutyDrawerForm
            key={`duty-drawer-${slotId || 'new'}`}
            slotData={targetSlot}
            activeExam={activeExam}
            teachers={teachers}
            onSave={(savedSlot) => {
              handleSaveSlotDuty(savedSlot);
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [dutySlots, activeExam, teachers, closeDrawer]
  );

  // Universal Auto-Populate Invigilation Roster Drawer Registration
  useDrawerRegistration(
    'auto_populate_invigilation',
    () => {
      return {
        title: 'Auto-Populate Invigilation Roster',
        subtitle: `Fair rotation and duty assignment for ${activeExam?.name || 'Active Session'}`,
        category: 'Invigilation',
        size: 'md',
        width: 'md',
        content: (
          <UniversalAutoPopulateDrawer
            key={`auto-populate-invigilation-${selectedExamId}`}
            domainKey="invigilation_duty_roster"
            context={{
              tenantId,
              activeExam,
              teachers,
              examShifts,
              dutySlots,
            }}
            onSuccess={() => {
              loadExamSubjects();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [tenantId, activeExam, teachers, examShifts, dutySlots, selectedExamId, loadExamSubjects, closeDrawer]
  );

  const handleOpenDutyDrawer = useCallback((slot) => {
    if (!slot) return;
    openDrawer('invigilation_duty', { slotId: slot.id });
  }, [openDrawer]);

  const handleOpenAutoPopulateDrawer = useCallback(() => {
    openDrawer('auto_populate_invigilation');
  }, [openDrawer]);

  const handleSaveSlotDuty = useCallback((savedSlot) => {
    if (!savedSlot || !selectedExamId) return;

    // 1. Update session-level duty roster map
    const dutyKey = `${savedSlot.examDate}___${savedSlot.shiftId}`;
    const currentExam = examStore.getExamById(tenantId, selectedExamId);
    const currentRoster = currentExam?.dutyRoster || {};
    const updatedRoster = {
      ...currentRoster,
      [dutyKey]: {
        invigilatorId: savedSlot.invigilatorId || '',
        invigilatorName: savedSlot.invigilatorName || '',
        roomNo: savedSlot.roomNo || '',
        notes: savedSlot.notes || '',
      },
    };
    examStore.updateExam(tenantId, selectedExamId, { dutyRoster: updatedRoster });

    // 2. Update all matching rows in examStore for this date and shift
    const currentRows = examStore.getExamSubjects(tenantId, selectedExamId) || [];
    let updatedCount = 0;

    const updatedRows = currentRows.map((r) => {
      if (r.examDate === savedSlot.examDate && (r.shiftId || 'shift_1') === savedSlot.shiftId) {
        updatedCount++;
        return {
          ...r,
          invigilatorId: savedSlot.invigilatorId || '',
          invigilatorName: savedSlot.invigilatorName || '',
          teacherId: savedSlot.invigilatorId || '',
          teacherName: savedSlot.invigilatorName || '',
          roomNo: savedSlot.roomNo || r.roomNo || '',
          notes: savedSlot.notes || r.notes || '',
        };
      }
      return r;
    });

    if (updatedCount > 0) {
      examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, updatedRows);
      setRows(updatedRows);
      showToast(`Assigned ${savedSlot.invigilatorName || 'Invigilator'} to ${updatedCount} subject slots on ${formatShortDateLabel(savedSlot.examDate)}.`, 'success');
    } else {
      showToast(`Assigned ${savedSlot.invigilatorName || 'Invigilator'} for ${formatShortDateLabel(savedSlot.examDate)}.`, 'success');
      loadExamSubjects();
    }
  }, [tenantId, selectedExamId, showToast, loadExamSubjects]);

  const handleClearSlotInvigilator = useCallback((slot) => {
    if (!slot || !selectedExamId) return;

    // 1. Clear session-level duty roster map
    const dutyKey = `${slot.examDate}___${slot.shiftId}`;
    const currentExam = examStore.getExamById(tenantId, selectedExamId);
    if (currentExam?.dutyRoster) {
      const updatedRoster = { ...currentExam.dutyRoster };
      delete updatedRoster[dutyKey];
      examStore.updateExam(tenantId, selectedExamId, { dutyRoster: updatedRoster });
    }

    // 2. Clear all matching rows in examStore
    const currentRows = examStore.getExamSubjects(tenantId, selectedExamId) || [];
    const updatedRows = currentRows.map((r) => {
      if (r.examDate === slot.examDate && (r.shiftId || 'shift_1') === slot.shiftId) {
        return {
          ...r,
          invigilatorId: '',
          invigilatorName: '',
          teacherId: '',
          teacherName: '',
        };
      }
      return r;
    });

    examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, updatedRows);
    setRows(updatedRows);
    showToast(`Cleared invigilator assignment for ${formatShortDateLabel(slot.examDate)}.`, 'info');
  }, [tenantId, selectedExamId, showToast]);

  // ─── Table Columns (Exact 4 columns: Exam Date, Schedule/Timing, Invigilator, Actions) ───
  const columns = useMemo(() => {
    return [
      // ─── 1. Exam Date ─────────────────────────────────────────────────────
      {
        key: 'examDate',
        title: 'Exam Date',
        headerClassName: 'w-[25%] min-w-[150px]',
        className: 'w-[25%] min-w-[150px] align-middle',
        render: (slot) => (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <CalendarIcon className="w-4 h-4 theme-accent shrink-0 opacity-90" />
              <span className="font-bold text-xs sm:text-sm theme-text-primary font-mono whitespace-nowrap">
                {formatShortDateLabel(slot.examDate)}
              </span>
            </div>
            <div className="text-[11px] theme-text-secondary font-mono pl-5">
              {slot.examDate}
            </div>
          </div>
        ),
      },

      // ─── 2. Schedule / Timing ─────────────────────────────────────────────
      {
        key: 'schedule',
        title: 'Schedule / Timing',
        headerClassName: 'w-[35%] min-w-[180px]',
        className: 'w-[35%] min-w-[180px] align-middle',
        render: (slot) => (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm theme-text-primary">
                {slot.shiftName || 'Shift 1'}
              </span>
              {slot.roomNo && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded theme-bg-sub border theme-border font-sans font-semibold theme-text-secondary">
                  <BuildingLibraryIcon className="w-3 h-3 theme-accent" />
                  <span>{slot.roomNo}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary font-mono">
              <ClockIcon className="w-3.5 h-3.5 theme-text-secondary shrink-0 opacity-60" />
              <span className="font-medium whitespace-nowrap">
                {slot.startTime || '09:00 AM'} – {slot.endTime || '11:00 AM'}
              </span>
            </div>
          </div>
        ),
      },

      // ─── 3. Invigilator ───────────────────────────────────────────────────
      {
        key: 'invigilator',
        title: 'Invigilator',
        headerClassName: 'w-[30%] min-w-[160px]',
        className: 'w-[30%] min-w-[160px] align-middle',
        render: (slot) => {
          if (!slot.invigilatorName && !slot.invigilatorId) {
            return (
              <span className="text-[11px] px-2.5 py-1 rounded-md theme-bg-sub theme-text-secondary border theme-border opacity-70 italic inline-block">
                Unassigned
              </span>
            );
          }

          return (
            <div className="flex items-center gap-2.5 min-w-0 py-1">
              <div className="w-7 h-7 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs border theme-border">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
                  {slot.invigilatorName || `Teacher #${slot.invigilatorId}`}
                </div>
                <div className="text-[10px] theme-text-secondary font-medium truncate">
                  Hall Duty Supervisor
                </div>
              </div>
            </div>
          );
        },
      },

      // ─── 4. Actions ───────────────────────────────────────────────────────
      {
        key: 'actions',
        title: 'Actions',
        align: 'right',
        headerClassName: 'w-20 min-w-[80px] text-right',
        className: 'w-20 min-w-[80px] text-right align-middle',
        render: (slot) => (
          <ActionMenu
            items={[
              {
                label: slot.invigilatorId || slot.invigilatorName ? 'Change Invigilator' : 'Assign Invigilator',
                icon: EditIcon,
                onClick: () => handleOpenDutyDrawer(slot),
              },
              ...(slot.invigilatorId || slot.invigilatorName
                ? [
                    {
                      label: 'Clear Duty',
                      icon: TrashIcon,
                      danger: true,
                      onClick: () => handleClearSlotInvigilator(slot),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ];
  }, [handleOpenDutyDrawer, handleClearSlotInvigilator]);

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* ── 1. Unified Control Header: Session & Auto-Populate (Row 1), Date & Invigilator (Row 2) ── */}
      <SubjectMatrixHeader
        examOptions={examOptions}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        inlineSessionSelector={false}
        onAutoPopulate={handleOpenAutoPopulateDrawer}
        autoPopulateLabel="Auto-Populate Roster"
        autoPopulateTitle="Automatically balance and assign faculty hall invigilation duties across all exam dates and shifts"
        showSearch={false}
        showDepartmentFilter={false}
        showClassFilter={false}
        showExamDateFilter={true}
        filterExamDate={filterExamDate}
        setFilterExamDate={setFilterExamDate}
        showTeacherFilter={true}
        teacherLabel="Invigilator"
        filterTeacherId={filterTeacherId}
        setFilterTeacherId={setFilterTeacherId}
        dateFilterOptions={dateFilterOptions}
        totalCount={dutySlots.length}
        filteredCount={filteredSlots.length}
        itemLabel={filteredSlots.length === 1 ? 'duty slot' : 'duty slots'}
      />

      {/* ── 2. Presentation Table ── */}
      <DataTable
        columns={columns}
        data={filteredSlots}
        keyExtractor={(slot) => slot.id}
        emptyTitle="No Invigilation Slots Available"
        emptySubMessage="No exam dates or routines configured for the selected examination session."
        emptyIcon={UserIcon}
      />
    </div>
  );
}

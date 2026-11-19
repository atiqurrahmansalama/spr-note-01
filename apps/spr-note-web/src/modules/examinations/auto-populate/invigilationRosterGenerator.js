/**
 * invigilationRosterGenerator.js
 * Enterprise Domain Generator for Examination Hall Invigilator Duty Roster.
 * Automatically distributes, balances, and rotates faculty hall supervision duties across exam dates & shifts.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Zero Hardcoded Logic: dynamic staff harvesting from context, API, and active stores
 * - Supports multiple duty strategies: BALANCED_ROTATION, SUBJECT_TEACHER_EXCLUSION, SPECIFIC_TEACHER, CLEAR_ALL
 * - Supports conflict & overwrite policies: REPLACE vs FILL_EMPTY_ONLY
 * - Synchronizes with activeExam.dutyRoster and all subject routine entries in examStore
 * - Provides rich live simulation metrics (toCreate, toUpdate, preserved, toRemove)
 * - Zero hardcoded colors, zero emojis in UI
 */

import BaseGenerator from '@/utils/auto-populate/BaseGenerator';
import { balanceDailyGuardByDateShift } from '@/utils/auto-populate/workloadBalancer';
import { examStore } from '@/stores/examStore';
import { readJSON } from '@/stores/coreStore';
import { generateDateRange, formatShortDateLabel } from '@/modules/examinations/exam-schedules/utils/examScheduleUtils';

export class InvigilationRosterGenerator extends BaseGenerator {
  constructor() {
    super({
      domainKey: 'invigilation_duty_roster',
      title: 'Hall Invigilation Duty Roster',
      description: 'Auto-populate and balance faculty hall supervision duties across all exam dates and shifts.',
      category: 'Examinations',
      targetStore: 'examStore',
      defaultStrategies: {
        invigilatorStrategy: 'BALANCED_ROTATION',
        invigilatorTeacherId: '',
        invigilatorTeacherName: '',
        overwriteMode: 'REPLACE',
        roomNo: '',
      },
    });
  }

  getSchema(context = {}) {
    const { activeExam = null } = context;
    return {
      title: 'Auto-Populate Invigilation Roster',
      subtitle: activeExam ? `For ${activeExam.name}` : 'Configure duty assignment rules',
      strategies: [
        {
          key: 'invigilatorStrategy',
          label: 'Duty Distribution Strategy',
          type: 'select',
          options: [
            {
              value: 'BALANCED_ROTATION',
              label: 'Fair Faculty Rotation (By Date & Shift)',
              description: 'Equitably distributes all available teachers across daily hall guard duty slots to balance workload.',
            },
            {
              value: 'SUBJECT_TEACHER_EXCLUSION',
              label: 'Independent Faculty Allocation (Exclude Subject Teacher)',
              description: 'Assigns faculty members who do not teach the scheduled subjects to maintain impartial exam supervision.',
            },
            {
              value: 'SPECIFIC_TEACHER',
              label: 'Designated Single Supervisor',
              description: 'Assigns one selected faculty member as the primary invigilator for target duty slots.',
            },
            {
              value: 'CLEAR_ALL',
              label: 'Clear All Assignments (Reset to Unassigned)',
              description: 'Resets all duty roster assignments so you can assign or adjust them manually.',
            },
          ],
          default: 'BALANCED_ROTATION',
        },
        {
          key: 'overwriteMode',
          label: 'Existing Data & Conflict Policy',
          type: 'select',
          options: [
            {
              value: 'REPLACE',
              label: 'Replace / Overwrite All Slots',
              description: 'Recalculates and overrides all invigilator duty assignments across all slots.',
            },
            {
              value: 'FILL_EMPTY_ONLY',
              label: 'Fill Unassigned Slots Only',
              description: 'Preserves existing manual assignments and only assigns teachers to unallocated slots.',
            },
          ],
          default: 'REPLACE',
        },
      ],
      defaultOptions: {
        invigilatorStrategy: 'BALANCED_ROTATION',
        invigilatorTeacherId: '',
        invigilatorTeacherName: '',
        overwriteMode: 'REPLACE',
        roomNo: '',
      },
    };
  }

  validate(context = {}, options = {}) {
    const { activeExam } = context;
    const { invigilatorStrategy = 'BALANCED_ROTATION', invigilatorTeacherId = '' } = options;
    const errors = [];
    const warnings = [];

    if (!activeExam || !activeExam.id) {
      errors.push('No active examination session selected.');
    }

    if (invigilatorStrategy === 'SPECIFIC_TEACHER' && !invigilatorTeacherId) {
      errors.push('Please select a designated supervisor teacher.');
    }

    const tenantId = context.tenantId || 'default';
    const storedSubjects = activeExam?.id ? (examStore.getExamSubjects(tenantId, activeExam.id) || []) : [];
    const hasScheduleDays = Array.isArray(activeExam?.scheduleDays) && activeExam.scheduleDays.length > 0;
    const hasDateRange = Boolean(activeExam?.startDate && activeExam?.endDate);

    if (storedSubjects.length === 0 && !hasScheduleDays && !hasDateRange) {
      warnings.push('No exam routine subjects or schedule days found. Default dates will be generated.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  simulate(context = {}, options = {}) {
    const { tenantId = 'default', activeExam, teachers = [], examShifts = [], dutySlots = [] } = context;
    const {
      invigilatorStrategy = 'BALANCED_ROTATION',
      invigilatorTeacherId = '',
      invigilatorTeacherName = '',
      overwriteMode = 'REPLACE',
      roomNo = '',
    } = options;

    // ── 1. Dynamically Harvest & Normalize Teaching Staff Pool ───────────────
    const rawStaffList = (Array.isArray(teachers) && teachers.length > 0)
      ? teachers
      : (typeof window !== 'undefined' ? readJSON(`spr_staff_cache_${tenantId}`, []) : []);

    const teachingStaff = rawStaffList.filter((t) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });

    const effectiveStaffList = teachingStaff.length > 0 ? teachingStaff : rawStaffList;

    let teacherPool = effectiveStaffList.map((t) => {
      const name = (
        t.name_en ||
        t.name ||
        t.full_name ||
        (t.first_name ? `${t.first_name} ${t.last_name || ''}`.trim() : '') ||
        (t.user ? `${t.user.first_name || ''} ${t.user.last_name || ''}`.trim() || t.user.username : '') ||
        t.user_name ||
        t.username ||
        (t.employee_id ? `Teacher (${t.employee_id})` : `Teacher #${t.id || '1'}`)
      );
      return {
        id: String(t.id || t.user_id || t.userId || (typeof t.user === 'object' ? t.user?.id : t.user) || ''),
        name: name || 'Teacher',
        departmentId: t.department_id || (typeof t.department === 'object' ? t.department?.id : t.department) || '',
        raw: t,
      };
    }).filter((t) => t.id && t.name);

    // Fallback: Harvest assigned teachers from curriculum books
    if (teacherPool.length === 0) {
      const harvested = [];
      const allBooks = typeof window !== 'undefined' ? readJSON(`spr_curriculum_syllabus_${tenantId}`, []) : [];
      allBooks.forEach((b) => {
        const rawTeacher = b.teacher;
        const tId = String(b.teacherId || b.teacher_id || b.assignedTeacherId || (typeof rawTeacher === 'object' ? (rawTeacher?.id || rawTeacher?.user_id) : (typeof rawTeacher === 'number' ? String(rawTeacher) : '')) || '');
        const tName = b.teacherName || b.teacher_name || b.assignedTeacherName || (typeof rawTeacher === 'object' ? (rawTeacher?.name || rawTeacher?.name_en || rawTeacher?.full_name) : (typeof rawTeacher === 'string' && isNaN(Number(rawTeacher)) ? rawTeacher : ''));

        if (tName && !harvested.some((h) => h.name.toLowerCase() === tName.toLowerCase())) {
          harvested.push({
            id: tId || `teach_harvest_${harvested.length + 1}`,
            name: tName,
            departmentId: b.departmentId || b.department_id || '',
          });
        }
      });
      if (harvested.length > 0) {
        teacherPool = harvested;
      }
    }

    // ── 2. Resolve Active Shifts ──────────────────────────────────────────────
    const resolvedShifts = (Array.isArray(examShifts) && examShifts.length > 0)
      ? examShifts
      : (Array.isArray(activeExam?.shifts) && activeExam.shifts.length > 0)
        ? activeExam.shifts
        : [
            { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: activeExam?.defaultStartTime || '09:00 AM', endTime: activeExam?.defaultEndTime || '11:00 AM' },
          ];

    if (activeExam?.hasSecondShift || activeExam?.secondStartTime) {
      if (!resolvedShifts.some((s) => s.id === 'shift_2')) {
        resolvedShifts.push({
          id: 'shift_2',
          name: 'Shift 2 (Afternoon)',
          startTime: activeExam?.secondStartTime || '02:00 PM',
          endTime: activeExam?.secondEndTime || '04:00 PM',
        });
      }
    }

    // ── 3. Harvest All Unique Exam Date & Shift Duty Slots ─────────────────────
    const slotMap = new Map();
    const storedSubjects = activeExam?.id ? (examStore.getExamSubjects(tenantId, activeExam.id) || []) : [];

    // 3a. Ingest existing duty slots passed via context
    if (Array.isArray(dutySlots) && dutySlots.length > 0) {
      dutySlots.forEach((s) => {
        const sId = s.shiftId || 'shift_1';
        const key = `${s.examDate}___${sId}`;
        slotMap.set(key, {
          date: s.examDate,
          shiftId: sId,
          shiftName: s.shiftName || 'Shift 1',
          startTime: s.startTime || '09:00 AM',
          endTime: s.endTime || '11:00 AM',
          existingInvigilatorId: s.invigilatorId || '',
          existingInvigilatorName: s.invigilatorName || '',
          existingRoomNo: s.roomNo || '',
          subjects: s.subjects || [],
          subjectTeacherIds: [],
        });
      });
    }

    // 3b. Ingest from activeExam.scheduleDays
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      activeExam.scheduleDays.forEach((d) => {
        if (d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK') {
          const shiftCount = typeof d.shiftCount === 'number'
            ? Math.max(1, Math.min(d.shiftCount, resolvedShifts.length))
            : (d.type === 'DUAL_EXAM' ? Math.min(2, resolvedShifts.length) : 1);

          resolvedShifts.slice(0, shiftCount).forEach((shift) => {
            const key = `${d.date}___${shift.id}`;
            const rosterDuty = activeExam?.dutyRoster?.[key] || {};
            if (!slotMap.has(key)) {
              slotMap.set(key, {
                date: d.date,
                shiftId: shift.id,
                shiftName: shift.name,
                startTime: shift.startTime,
                endTime: shift.endTime,
                existingInvigilatorId: rosterDuty.invigilatorId || '',
                existingInvigilatorName: rosterDuty.invigilatorName || '',
                existingRoomNo: rosterDuty.roomNo || '',
                subjects: [],
                subjectTeacherIds: [],
              });
            }
          });
        }
      });
    }

    // 3c. Overlay stored exam routine rows
    storedSubjects.forEach((r) => {
      if (r.examDate) {
        const sId = r.shiftId || 'shift_1';
        const key = `${r.examDate}___${sId}`;
        let slot = slotMap.get(key);

        if (!slot) {
          const shift = resolvedShifts.find((s) => s.id === sId) || {
            id: sId,
            name: r.shiftName || 'Shift 1',
            startTime: r.startTime || '09:00 AM',
            endTime: r.endTime || '11:00 AM',
          };
          const rosterDuty = activeExam?.dutyRoster?.[key] || {};
          slot = {
            date: r.examDate,
            shiftId: shift.id,
            shiftName: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            existingInvigilatorId: rosterDuty.invigilatorId || r.invigilatorId || r.teacherId || '',
            existingInvigilatorName: rosterDuty.invigilatorName || r.invigilatorName || r.teacherName || '',
            existingRoomNo: rosterDuty.roomNo || r.roomNo || '',
            subjects: [],
            subjectTeacherIds: [],
          };
          slotMap.set(key, slot);
        }

        if (r.subjectName && !slot.subjects.includes(r.subjectName)) {
          slot.subjects.push(r.subjectName);
        }
        const subTeacherId = String(r.examinerId || r.teacherId || r.subjectTeacherId || '');
        if (subTeacherId && !slot.subjectTeacherIds.includes(subTeacherId)) {
          slot.subjectTeacherIds.push(subTeacherId);
        }
        if (!slot.existingInvigilatorId && (r.invigilatorId || r.teacherId)) {
          slot.existingInvigilatorId = r.invigilatorId || r.teacherId || '';
          slot.existingInvigilatorName = r.invigilatorName || r.teacherName || '';
        }
        if (!slot.existingRoomNo && r.roomNo) {
          slot.existingRoomNo = r.roomNo;
        }
      }
    });

    // 3d. Fallback date range if slot map is empty
    if (slotMap.size === 0) {
      let dates = [];
      if (activeExam?.startDate && activeExam?.endDate) {
        dates = generateDateRange(activeExam.startDate, activeExam.endDate);
      }
      if (dates.length === 0 && activeExam?.startDate) {
        const s = new Date(activeExam.startDate);
        if (!isNaN(s.getTime())) {
          for (let i = 0; i < 7; i++) {
            const d = new Date(s);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
          }
        }
      }
      if (dates.length === 0) dates = [new Date().toISOString().split('T')[0]];

      dates.forEach((dt) => {
        resolvedShifts.forEach((shift) => {
          const key = `${dt}___${shift.id}`;
          const rosterDuty = activeExam?.dutyRoster?.[key] || {};
          slotMap.set(key, {
            date: dt,
            shiftId: shift.id,
            shiftName: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            existingInvigilatorId: rosterDuty.invigilatorId || '',
            existingInvigilatorName: rosterDuty.invigilatorName || '',
            existingRoomNo: rosterDuty.roomNo || '',
            subjects: [],
            subjectTeacherIds: [],
          });
        });
      });
    }

    const slots = Array.from(slotMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.shiftId.localeCompare(b.shiftId);
    });

    // ── 4. Apply Multi-Strategy Invigilator Distribution ──────────────────────
    const guardMap = balanceDailyGuardByDateShift(slots, teacherPool);
    const updatedRoster = {};
    const previewSlots = [];
    let rotationIndex = 0;

    slots.forEach((slot) => {
      const slotKey = `${slot.date}___${slot.shiftId}`;
      const prevId = slot.existingInvigilatorId || '';
      const prevName = slot.existingInvigilatorName || '';
      let invId = '';
      let invName = '';

      // Check if we should preserve existing assignment
      if (overwriteMode === 'FILL_EMPTY_ONLY' && prevId) {
        invId = prevId;
        invName = prevName;
      } else if (invigilatorStrategy === 'CLEAR_ALL') {
        invId = '';
        invName = '';
      } else if (invigilatorStrategy === 'SPECIFIC_TEACHER') {
        const matched = teacherPool.find((t) => String(t.id) === String(invigilatorTeacherId));
        invId = String(invigilatorTeacherId || (matched ? matched.id : ''));
        invName = invigilatorTeacherName || matched?.name || (invId ? `Teacher #${invId}` : '');
      } else if (invigilatorStrategy === 'SUBJECT_TEACHER_EXCLUSION') {
        // Find a teacher in the pool who is NOT a subject teacher for this slot
        const candidates = teacherPool.filter((t) => !slot.subjectTeacherIds.includes(String(t.id)));
        const effectiveCandidates = candidates.length > 0 ? candidates : teacherPool;

        if (effectiveCandidates.length > 0) {
          const teacher = effectiveCandidates[rotationIndex % effectiveCandidates.length];
          rotationIndex++;
          invId = String(teacher.id);
          invName = teacher.name;
        } else {
          invId = '';
          invName = '';
        }
      } else {
        // BALANCED_ROTATION (Default)
        const guard = guardMap.get(slotKey);
        invId = guard?.id || '';
        invName = guard?.name || '';
      }

      const assignedRoom = roomNo || slot.existingRoomNo || 'Main Examination Hall';

      updatedRoster[slotKey] = {
        invigilatorId: invId,
        invigilatorName: invName,
        roomNo: assignedRoom,
        notes: '',
      };

      previewSlots.push({
        id: slotKey,
        examDate: slot.date,
        shiftId: slot.shiftId,
        shiftName: slot.shiftName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        invigilatorId: invId,
        invigilatorName: invName,
        previousInvigilatorId: prevId,
        previousInvigilatorName: prevName,
        roomNo: assignedRoom,
        subjects: slot.subjects,
      });
    });

    // ── 5. Generate Diff Metrics ──────────────────────────────────────────────
    const toCreate = previewSlots.filter((s) => s.invigilatorId && !s.previousInvigilatorId);
    const toUpdate = previewSlots.filter((s) => s.invigilatorId && s.previousInvigilatorId && s.invigilatorId !== s.previousInvigilatorId);
    const toRemove = previewSlots.filter((s) => !s.invigilatorId && s.previousInvigilatorId);
    const preserved = previewSlots.filter((s) => s.previousInvigilatorId && (s.invigilatorId === s.previousInvigilatorId));

    return {
      domainKey: this.domainKey,
      items: previewSlots,
      rosterMap: updatedRoster,
      toCreate,
      toUpdate,
      toRemove,
      preserved,
      summary: {
        totalFinal: previewSlots.length,
        createdCount: toCreate.length,
        updatedCount: toUpdate.length,
        preservedCount: preserved.length,
        removedCount: toRemove.length,
        totalSlots: previewSlots.length,
        assignedCount: previewSlots.filter((s) => s.invigilatorId).length,
        unassignedCount: previewSlots.filter((s) => !s.invigilatorId).length,
        strategy: invigilatorStrategy,
        overwriteMode,
      },
    };
  }

  execute(context = {}, options = {}, simulationResult = null) {
    const { tenantId = 'default', activeExam } = context;
    if (!activeExam || !activeExam.id) {
      throw new Error('Active exam session is missing.');
    }

    const sim = simulationResult || this.simulate(context, options);
    const updatedRoster = sim.rosterMap || {};

    // 1. Update session-level duty roster in examStore
    examStore.updateExam(tenantId, activeExam.id, { dutyRoster: updatedRoster });

    // 2. Synchronize all matching subject routine rows in examStore
    const currentRows = examStore.getExamSubjects(tenantId, activeExam.id) || [];
    let syncedCount = 0;

    const updatedRows = currentRows.map((r) => {
      const key = `${r.examDate}___${r.shiftId || 'shift_1'}`;
      const duty = updatedRoster[key];
      if (duty) {
        syncedCount++;
        return {
          ...r,
          invigilatorId: duty.invigilatorId || '',
          invigilatorName: duty.invigilatorName || '',
          teacherId: duty.invigilatorId || '',
          teacherName: duty.invigilatorName || '',
          roomNo: duty.roomNo || r.roomNo || '',
        };
      }
      return r;
    });

    if (updatedRows.length > 0) {
      examStore.bulkUpsertExamSubjects(tenantId, activeExam.id, updatedRows);
    }

    return {
      success: true,
      message: `Successfully populated invigilation duty roster for ${sim.items.length} slots (${sim.summary?.assignedCount || 0} assigned).`,
      data: sim.items,
      summary: sim.summary,
    };
  }
}

export const invigilationRosterGenerator = new InvigilationRosterGenerator();
export default invigilationRosterGenerator;


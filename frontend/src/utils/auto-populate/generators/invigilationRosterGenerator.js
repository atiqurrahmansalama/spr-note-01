/**
 * invigilationRosterGenerator.js
 * Domain Generator for Examination Hall Invigilator Duty Roster.
 * Automatically distributes and balances hall supervision duties across exam dates & shifts.
 */

import BaseGenerator from '../BaseGenerator';
import { balanceDailyGuardByDateShift } from '../workloadBalancer';
import { examStore } from '../../stores/examStore';
import { generateDateRange } from '../../../modules/examinations/exam-schedules/utils/examScheduleUtils';

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
        roomNo: 'Main Hall',
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
              description: 'Evenly distributes all available teachers across daily hall guard duty slots.',
            },
            {
              value: 'SPECIFIC_TEACHER',
              label: 'Designated Single Supervisor',
              description: 'Assigns one selected teacher as the primary invigilator for all slots.',
            },
            {
              value: 'CLEAR_ALL',
              label: 'Clear All Assignments (Reset to Unassigned)',
              description: 'Resets all duty roster assignments so you can fill them manually.',
            },
          ],
          default: 'BALANCED_ROTATION',
        },
      ],
    };
  }

  validate(context = {}) {
    const { activeExam } = context;
    const errors = [];
    if (!activeExam) {
      errors.push('No active examination session selected.');
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  simulate(context = {}, options = {}) {
    const { tenantId, activeExam, teachers = [], examShifts = [] } = context;
    const {
      invigilatorStrategy = 'BALANCED_ROTATION',
      invigilatorTeacherId = '',
      invigilatorTeacherName = '',
      roomNo = 'Main Hall',
    } = options;

    const teachingStaff = teachers.filter((t) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });

    const teacherPool = teachingStaff.length > 0
      ? teachingStaff.map((t) => ({
          id: String(t.id),
          name: t.name_en || t.name || t.full_name || 'Teacher',
        }))
      : [
          { id: 'teach_101', name: 'Maulana Abdur Rahman' },
          { id: 'teach_102', name: 'Mufti Mahmud Hasan' },
          { id: 'teach_103', name: 'Qari Sirajul Islam' },
          { id: 'teach_104', name: 'Maulana Ibrahim Khalil' },
        ];

    const resolvedShifts = examShifts.length > 0 ? examShifts : [
      { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
    ];

    // Determine all slot keys
    const slots = [];
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      activeExam.scheduleDays.forEach((d) => {
        if (d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK') {
          const shiftCount = typeof d.shiftCount === 'number'
            ? Math.max(1, Math.min(d.shiftCount, resolvedShifts.length))
            : (d.type === 'DUAL_EXAM' ? Math.min(2, resolvedShifts.length) : 1);

          resolvedShifts.slice(0, shiftCount).forEach((shift) => {
            slots.push({
              date: d.date,
              shiftId: shift.id,
              shiftName: shift.name,
              startTime: shift.startTime,
              endTime: shift.endTime,
            });
          });
        }
      });
    }

    if (slots.length === 0 && activeExam?.startDate && activeExam?.endDate) {
      const dates = generateDateRange(activeExam.startDate, activeExam.endDate);
      dates.forEach((dt) => {
        resolvedShifts.forEach((shift) => {
          slots.push({
            date: dt,
            shiftId: shift.id,
            shiftName: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
          });
        });
      });
    }

    const guardMap = balanceDailyGuardByDateShift(slots, teacherPool);
    const updatedRoster = {};
    const previewSlots = [];

    slots.forEach((slot) => {
      const slotKey = `${slot.date}___${slot.shiftId}`;
      let invId = '';
      let invName = '';

      if (invigilatorStrategy === 'BALANCED_ROTATION') {
        const guard = guardMap.get(slotKey);
        invId = guard?.id || '';
        invName = guard?.name || '';
      } else if (invigilatorStrategy === 'SPECIFIC_TEACHER') {
        invId = String(invigilatorTeacherId || '');
        invName = invigilatorTeacherName || '';
      }

      updatedRoster[slotKey] = {
        invigilatorId: invId,
        invigilatorName: invName,
        roomNo,
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
        roomNo,
      });
    });

    return {
      domainKey: this.domainKey,
      items: previewSlots,
      rosterMap: updatedRoster,
      summary: {
        totalSlots: previewSlots.length,
        assignedCount: previewSlots.filter((s) => s.invigilatorId).length,
        unassignedCount: previewSlots.filter((s) => !s.invigilatorId).length,
        strategy: invigilatorStrategy,
      },
    };
  }

  execute(context = {}, options = {}, simulationResult = null) {
    const { tenantId, activeExam } = context;
    if (!activeExam || !activeExam.id) {
      throw new Error('Active exam session is missing.');
    }

    const sim = simulationResult || this.simulate(context, options);
    const updatedRoster = sim.rosterMap || {};

    // 1. Update session duty roster
    examStore.updateExam(tenantId, activeExam.id, { dutyRoster: updatedRoster });

    // 2. Synchronize all matching rows in examStore
    const currentRows = examStore.getExamSubjects(tenantId, activeExam.id) || [];
    const updatedRows = currentRows.map((r) => {
      const key = `${r.examDate}___${r.shiftId || 'shift_1'}`;
      const duty = updatedRoster[key];
      if (duty) {
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

    examStore.bulkUpsertExamSubjects(tenantId, activeExam.id, updatedRows);

    return {
      success: true,
      message: `Successfully updated invigilation roster for ${sim.items.length} slots.`,
      data: sim.items,
      summary: sim.summary,
    };
  }
}

export const invigilationRosterGenerator = new InvigilationRosterGenerator();
export default invigilationRosterGenerator;

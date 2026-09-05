/**
 * examRoutineGenerator.js
 * Domain Generator for Examination Subject Routine Matrix.
 * Generates structured exam routine rows from curriculum syllabus books with:
 * - Shift & Date slot distribution
 * - Rotational or Subject-Teacher Hall Invigilator assignment
 * - Paper Setter & Examiner allocation
 * - Marks breakdown template inheritance (CQ, MCQ, Viva, Full Marks)
 * - Safe REPLACE, APPEND, and MERGE conflict resolution
 */

import BaseGenerator from '../BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from '../conflictResolver';
import { balanceDailyGuardByDateShift, matchSubjectTeacher } from '../workloadBalancer';
import { examStore } from '../../stores/examStore';

export class ExamRoutineGenerator extends BaseGenerator {
  constructor() {
    super({
      domainKey: 'exam_routine_matrix',
      title: 'Subject Routine Matrix',
      description: 'Auto-populate subject examination schedules, shifts, invigilators, and examiners from curriculum syllabus.',
      category: 'Examinations',
      targetStore: 'examStore',
      defaultStrategies: {
        invigilatorStrategy: 'BALANCED_ROTATION',
        invigilatorTeacherId: '',
        invigilatorTeacherName: '',
        examinerStrategy: 'SUBJECT_TEACHER',
        examinerTeacherId: '',
        examinerTeacherName: '',
        overwriteMode: CONFLICT_MODES.REPLACE_ALL,
      },
    });
  }

  getSchema(context = {}) {
    const { activeExam = null, participatingClasses = [], allAvailableClasses = [], existingRowsCount = 0 } = context;
    const targetClasses = participatingClasses.length > 0 ? participatingClasses : allAvailableClasses;

    return {
      title: 'Auto-Populate Examination Routine',
      subtitle: activeExam ? `For ${activeExam.name} (${targetClasses.length} Classes)` : 'Configure generation rules',
      strategies: [
        {
          key: 'invigilatorStrategy',
          label: 'Hall Invigilator (Guard) Assignment',
          type: 'select',
          options: [
            {
              value: 'BALANCED_ROTATION',
              label: 'Rotational Daily Guard (By Exam Date)',
              description: 'Assigns daily hall duty guards rotating day-by-day so all subjects in a day\'s slot share the same invigilator.',
            },
            {
              value: 'SUBJECT_TEACHER',
              label: 'Assigned Subject / Period Teacher',
              description: 'Assigns each respective curriculum book\'s period teacher as hall supervisor.',
            },
            {
              value: 'SPECIFIC_TEACHER',
              label: 'Designated Single Invigilator',
              description: 'Assigns one specific designated faculty member to all dates and slots.',
            },
            {
              value: 'UNASSIGNED',
              label: 'Leave Unassigned (Manual Duty Roster)',
              description: 'Leaves invigilator slot empty so you can assign duty roster manually.',
            },
          ],
          default: 'BALANCED_ROTATION',
        },
        {
          key: 'examinerStrategy',
          label: 'Paper Setter & Examiner (Grader)',
          type: 'select',
          options: [
            {
              value: 'SUBJECT_TEACHER',
              label: 'Assigned Curriculum Subject Teacher',
              description: 'Assigns the subject\'s teacher as question paper setter and script evaluator.',
            },
            {
              value: 'SAME_AS_INVIGILATOR',
              label: 'Same as Hall Invigilator',
              description: 'Copies the hall invigilator assignment to the examiner field.',
            },
            {
              value: 'SPECIFIC_TEACHER',
              label: 'Designated Chief Examiner',
              description: 'Assigns one specific chief examiner across all generated subjects.',
            },
            {
              value: 'UNASSIGNED',
              label: 'Leave Unassigned',
              description: 'Leaves examiner slot blank for later assignment.',
            },
          ],
          default: 'SUBJECT_TEACHER',
        },
        {
          key: 'overwriteMode',
          label: 'Existing Routine Handling',
          type: 'select',
          options: [
            {
              value: CONFLICT_MODES.REPLACE_ALL,
              label: 'Replace All Existing Entries (Fresh Routine)',
              description: 'Cleans previous routine rows and generates a pristine, complete schedule.',
            },
            {
              value: CONFLICT_MODES.APPEND_MISSING,
              label: 'Append Only Missing Subjects',
              description: 'Preserves your custom-configured rows and only fills in missing curriculum subjects.',
            },
            {
              value: CONFLICT_MODES.MERGE_UPDATE,
              label: 'Merge & Update Details (Preserve Custom Overrides)',
              description: 'Updates teachers and timings while preserving your existing room numbers and notes.',
            },
          ],
          default: existingRowsCount > 0 ? CONFLICT_MODES.REPLACE_ALL : CONFLICT_MODES.REPLACE_ALL,
        },
      ],
    };
  }

  validate(context = {}, options = {}) {
    const { activeExam = null, participatingClasses = [], allAvailableClasses = [] } = context;
    const errors = [];
    const warnings = [];

    if (!activeExam) {
      errors.push('No active examination session selected.');
    }

    const targetClasses = participatingClasses.length > 0 ? participatingClasses : allAvailableClasses;
    if (targetClasses.length === 0) {
      errors.push('No participating classes configured for this exam session.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  simulate(context = {}, options = {}) {
    const {
      tenantId,
      activeExam,
      participatingClasses = [],
      allAvailableClasses = [],
      availableCurriculumBooks = [],
      teachers = [],
      examShifts = [],
    } = context;

    const {
      invigilatorStrategy = 'BALANCED_ROTATION',
      invigilatorTeacherId = '',
      invigilatorTeacherName = '',
      examinerStrategy = 'SUBJECT_TEACHER',
      examinerTeacherId = '',
      examinerTeacherName = '',
      overwriteMode = CONFLICT_MODES.REPLACE_ALL,
    } = options;

    const targetClasses = participatingClasses.length > 0 ? participatingClasses : allAvailableClasses;
    const defaultFullMarks = Number(activeExam?.defaultFullMarks || activeExam?.targetFullMarks || 100);

    // Prepare active teacher pool
    const teachingStaff = teachers.filter((t) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });

    const fallbackFaculty = [
      { id: 'teach_101', name: 'Maulana Abdur Rahman' },
      { id: 'teach_102', name: 'Mufti Mahmud Hasan' },
      { id: 'teach_103', name: 'Qari Sirajul Islam' },
      { id: 'teach_104', name: 'Maulana Ibrahim Khalil' },
      { id: 'teach_105', name: 'Ustadh Tariqul Islam' },
      { id: 'teach_106', name: 'Maulana Aminul Islam' },
    ];

    const teacherPool = teachingStaff.length > 0
      ? teachingStaff.map((t) => ({
          id: String(t.id),
          name: t.name_en || t.name || t.full_name || t.user_name || 'Teacher',
        }))
      : fallbackFaculty;

    // Generate ordered schedule slots
    const resolvedShifts = examShifts.length > 0 ? examShifts : [
      { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
    ];

    const examSlots = [];
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      activeExam.scheduleDays.forEach((d) => {
        if (d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK') {
          const shiftCount = typeof d.shiftCount === 'number'
            ? Math.max(1, Math.min(d.shiftCount, resolvedShifts.length))
            : (d.type === 'DUAL_EXAM' ? Math.min(2, resolvedShifts.length) : 1);

          const applicableShifts = resolvedShifts.slice(0, shiftCount);
          applicableShifts.forEach((shift) => {
            examSlots.push({
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

    if (examSlots.length === 0) {
      const fallbackDate = activeExam?.startDate || '2026-10-10';
      resolvedShifts.forEach((shift) => {
        examSlots.push({
          date: fallbackDate,
          shiftId: shift.id,
          shiftName: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        });
      });
    }

    // Map rotational daily guard for invigilators
    const slotInvigilatorMap = balanceDailyGuardByDateShift(examSlots, teacherPool);

    // Compute generated subject routine rows
    const generatedItems = [];
    let sequenceCounter = 1;

    targetClasses.forEach((cls) => {
      const clsIdStr = String(cls.id);
      const clsName = String(cls.name || cls.class_name || '').toLowerCase().trim();

      // Find matching curriculum books
      let books = availableCurriculumBooks.filter((b) => {
        const bClassId = String(b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || '').trim();
        const bClassName = String(b.className || b.class_name || '').toLowerCase().trim();
        if (bClassId && (bClassId === clsIdStr || clsIdStr.includes(bClassId))) return true;
        if (clsName && bClassName && (bClassName === clsName || bClassName.includes(clsName) || clsName.includes(bClassName))) return true;
        return false;
      });

      if (books.length === 0) {
        books = [
          {
            id: `book_gen_${cls.id}_1`,
            name: `${cls.name || 'Class'} General Subject`,
            code: 'GEN-01',
            departmentId: cls.departmentId || cls.department_id || '',
            departmentName: cls.departmentName || cls.department_name || '',
          },
        ];
      }

      books.forEach((book, bookIdx) => {
        const slot = examSlots[bookIdx % examSlots.length];
        const slotKey = `${slot.date}___${slot.shiftId}`;

        // 1. Determine Invigilator
        let invId = '';
        let invName = '';
        if (invigilatorStrategy === 'BALANCED_ROTATION') {
          const guard = slotInvigilatorMap.get(slotKey);
          if (guard) {
            invId = guard.id;
            invName = guard.name;
          }
        } else if (invigilatorStrategy === 'SUBJECT_TEACHER') {
          const matched = matchSubjectTeacher(book, teacherPool);
          invId = matched.id;
          invName = matched.name;
        } else if (invigilatorStrategy === 'SPECIFIC_TEACHER') {
          invId = String(invigilatorTeacherId || '');
          invName = invigilatorTeacherName || '';
        }

        // 2. Determine Examiner
        let exmId = '';
        let exmName = '';
        if (examinerStrategy === 'SUBJECT_TEACHER') {
          const matched = matchSubjectTeacher(book, teacherPool);
          exmId = matched.id;
          exmName = matched.name;
        } else if (examinerStrategy === 'SAME_AS_INVIGILATOR') {
          exmId = invId;
          exmName = invName;
        } else if (examinerStrategy === 'SPECIFIC_TEACHER') {
          exmId = String(examinerTeacherId || '');
          exmName = examinerTeacherName || '';
        }

        const bookFullMarks = Number(book.fullMarks || book.full_marks || defaultFullMarks);
        const bookPassMarks = Number(book.passMarks || book.pass_marks || Math.round(bookFullMarks * 0.4));

        generatedItems.push({
          id: `routine_${activeExam?.id}_${cls.id}_${book.id || bookIdx}_${Date.now()}_${sequenceCounter}`,
          examId: String(activeExam?.id || ''),
          examName: activeExam?.name || 'Exam',
          classId: String(cls.id),
          className: cls.name || cls.class_name || 'Class',
          departmentId: String(book.departmentId || cls.departmentId || cls.department_id || ''),
          departmentName: book.departmentName || cls.departmentName || cls.department_name || '',
          sectionId: '',
          sectionName: 'All Sections',
          subjectId: String(book.id || `sub_${bookIdx}`),
          subjectName: book.name || book.title || book.subject_name || 'Subject',
          subjectCode: book.code || book.subject_code || '',
          bookId: String(book.id || ''),
          bookName: book.name || book.title || '',
          examDate: slot.date,
          dayOfWeek: new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short' }),
          shiftId: slot.shiftId,
          shiftName: slot.shiftName,
          startTime: slot.startTime,
          endTime: slot.endTime,
          roomNo: 'Main Hall',
          invigilatorId: invId,
          invigilatorName: invName,
          teacherId: invId,
          teacherName: invName,
          examinerId: exmId,
          examinerName: exmName,
          evaluatorId: exmId,
          evaluatorName: exmName,
          fullMarks: bookFullMarks,
          passMarks: bookPassMarks,
          sequence: sequenceCounter++,
          notes: '',
        });
      });
    });

    // Retrieve currently stored items
    const existingItems = examStore.getExamSubjects(tenantId, activeExam?.id) || [];

    // Run universal conflict resolution
    const resolved = resolveConflicts({
      existingItems,
      generatedItems,
      keyExtractor: (item) => `${item.classId}____${item.subjectId || item.subjectCode || item.subjectName}`,
      conflictMode: overwriteMode,
      customMerger: (exist, gen) => ({
        ...exist,
        ...gen,
        roomNo: exist.roomNo || gen.roomNo || 'Main Hall',
        notes: exist.notes || gen.notes || '',
        id: exist.id,
      }),
    });

    return {
      domainKey: this.domainKey,
      items: resolved.finalItems,
      toCreate: resolved.toCreate,
      toUpdate: resolved.toUpdate,
      toPreserve: resolved.toPreserve,
      toRemove: resolved.toRemove,
      conflictsCount: resolved.conflictsCount,
      summary: {
        totalGenerated: generatedItems.length,
        totalFinal: resolved.finalItems.length,
        createdCount: resolved.toCreate.length,
        updatedCount: resolved.toUpdate.length,
        preservedCount: resolved.toPreserve.length,
        removedCount: resolved.toRemove.length,
        targetClassesCount: targetClasses.length,
        conflictMode: overwriteMode,
      },
    };
  }

  execute(context = {}, options = {}, simulationResult = null) {
    const { tenantId, activeExam } = context;
    if (!activeExam || !activeExam.id) {
      throw new Error('Active exam session is missing.');
    }

    const sim = simulationResult || this.simulate(context, options);
    const finalItems = sim.items || [];

    // 1. Commit to examStore
    examStore.bulkUpsertExamSubjects(tenantId, activeExam.id, finalItems);

    // 2. Synchronize active session duty roster map
    const rosterMap = { ...(activeExam.dutyRoster || {}) };
    finalItems.forEach((r) => {
      if (r.examDate && r.shiftId && (r.invigilatorId || r.invigilatorName)) {
        const key = `${r.examDate}___${r.shiftId}`;
        if (!rosterMap[key]) {
          rosterMap[key] = {
            invigilatorId: r.invigilatorId || '',
            invigilatorName: r.invigilatorName || '',
            roomNo: r.roomNo || '',
            notes: r.notes || '',
          };
        }
      }
    });
    examStore.updateExam(tenantId, activeExam.id, { dutyRoster: rosterMap });

    return {
      success: true,
      message: `Successfully populated ${finalItems.length} subject routine entries for ${activeExam.name}.`,
      data: finalItems,
      summary: sim.summary,
    };
  }
}

export const examRoutineGenerator = new ExamRoutineGenerator();
export default examRoutineGenerator;

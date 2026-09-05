/**
 * classTimetableGenerator.js
 * Domain Generator for Weekly Academic Class Routine & Timetable Matrix.
 * Generates weekly period slots for classes based on curriculum subject requirements and teacher availability.
 */

import BaseGenerator from '../BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from '../conflictResolver';
import { matchSubjectTeacher } from '../workloadBalancer';

export class ClassTimetableGenerator extends BaseGenerator {
  constructor() {
    super({
      domainKey: 'class_timetable_matrix',
      title: 'Academic Class Timetable Matrix',
      description: 'Auto-populate weekly period timetable from curriculum books and teacher allocations.',
      category: 'Learning & Routine',
      targetStore: 'learningStore',
      defaultStrategies: {
        periodsPerDay: 6,
        workingDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        overwriteMode: CONFLICT_MODES.REPLACE_ALL,
      },
    });
  }

  getSchema(context = {}) {
    const { targetClass = null } = context;
    return {
      title: 'Auto-Populate Class Timetable',
      subtitle: targetClass ? `For ${targetClass.name}` : 'Configure weekly class routine rules',
      strategies: [
        {
          key: 'periodsPerDay',
          label: 'Daily Periods',
          type: 'select',
          options: [
            { value: 4, label: '4 Periods / Day' },
            { value: 5, label: '5 Periods / Day' },
            { value: 6, label: '6 Periods / Day (Standard)' },
            { value: 7, label: '7 Periods / Day' },
          ],
          default: 6,
        },
        {
          key: 'overwriteMode',
          label: 'Existing Routine Handling',
          type: 'select',
          options: [
            { value: CONFLICT_MODES.REPLACE_ALL, label: 'Replace All (Fresh Timetable)' },
            { value: CONFLICT_MODES.APPEND_MISSING, label: 'Fill Empty Slots Only' },
          ],
          default: CONFLICT_MODES.REPLACE_ALL,
        },
      ],
    };
  }

  validate(context = {}) {
    const { targetClass, curriculumBooks = [] } = context;
    const errors = [];
    if (!targetClass) errors.push('Target class must be specified.');
    if (curriculumBooks.length === 0) errors.push('No curriculum books configured for target class.');
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  simulate(context = {}, options = {}) {
    const {
      targetClass,
      curriculumBooks = [],
      teachers = [],
      existingRoutines = [],
    } = context;

    const {
      periodsPerDay = 6,
      workingDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      overwriteMode = CONFLICT_MODES.REPLACE_ALL,
    } = options;

    const generatedItems = [];
    let bookIndex = 0;

    workingDays.forEach((dayName) => {
      for (let pNum = 1; pNum <= periodsPerDay; pNum++) {
        const book = curriculumBooks[bookIndex % curriculumBooks.length];
        bookIndex++;

        const matchedTeacher = matchSubjectTeacher(book, teachers);

        generatedItems.push({
          id: `routine_${targetClass.id}_${dayName}_p${pNum}_${Date.now()}`,
          classId: String(targetClass.id),
          className: targetClass.name,
          day: dayName,
          periodNumber: pNum,
          periodName: `Period ${pNum}`,
          subjectId: String(book?.id || ''),
          subjectName: book?.name || 'Subject',
          teacherId: matchedTeacher.id,
          teacherName: matchedTeacher.name,
          roomNo: targetClass.roomNo || 'Room 101',
        });
      }
    });

    const resolved = resolveConflicts({
      existingItems: existingRoutines,
      generatedItems,
      keyExtractor: (item) => `${item.classId}__${item.day}__${item.periodNumber}`,
      conflictMode: overwriteMode,
    });

    return {
      domainKey: this.domainKey,
      items: resolved.finalItems,
      toCreate: resolved.toCreate,
      toUpdate: resolved.toUpdate,
      summary: {
        totalSlots: resolved.finalItems.length,
        createdCount: resolved.toCreate.length,
        updatedCount: resolved.toUpdate.length,
      },
    };
  }

  execute(context = {}, options = {}, simulationResult = null) {
    const sim = simulationResult || this.simulate(context, options);
    return {
      success: true,
      message: `Generated ${sim.items.length} timetable periods for ${context.targetClass?.name || 'Class'}.`,
      data: sim.items,
      summary: sim.summary,
    };
  }
}

export const classTimetableGenerator = new ClassTimetableGenerator();
export default classTimetableGenerator;

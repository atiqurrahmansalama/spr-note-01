/**
 * classTimetableGenerator.js
 * Domain Generator for Weekly Academic Class Routine & Timetable Matrix.
 * Generates weekly period slots for classes based on curriculum subject requirements and teacher availability.
 */

import BaseGenerator from '@/utils/auto-populate/BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from '@/utils/auto-populate/conflictResolver';
import { matchSubjectTeacher } from '@/utils/auto-populate/workloadBalancer';

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
        const book = curriculumBooks[bookIndex % (curriculumBooks.length || 1)];
        bookIndex++;

        const matchedTeacher = matchSubjectTeacher(book, teachers);

        generatedItems.push({
          id: `routine_${targetClass?.id || 'cls'}_${dayName}_p${pNum}_${Date.now()}`,
          classId: String(targetClass?.id || ''),
          className: targetClass?.name || 'Class',
          day: dayName,
          periodNumber: pNum,
          bookId: String(book?.id || ''),
          subjectName: book?.name || book?.title || 'Subject',
          teacherId: matchedTeacher?.id ? String(matchedTeacher.id) : '',
          teacherName: matchedTeacher?.name || '',
          roomNo: 'Classroom',
        });
      }
    });

    const resolved = resolveConflicts({
      existingItems: existingRoutines,
      generatedItems,
      keyExtractor: (item) => `${item.classId}____${item.day}____${item.periodNumber}`,
      conflictMode: overwriteMode,
      customMerger: (exist, gen) => ({
        ...gen,
        ...exist,
        id: exist.id || gen.id,
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
        conflictMode: overwriteMode,
      },
    };
  }

  execute(context = {}, options = {}, simulationResult = null) {
    const sim = simulationResult || this.simulate(context, options);
    const finalItems = sim.items || [];

    return {
      success: true,
      message: `Successfully populated weekly timetable with ${finalItems.length} period slots.`,
      data: finalItems,
      summary: sim.summary,
    };
  }
}

export const classTimetableGenerator = new ClassTimetableGenerator();
export default classTimetableGenerator;

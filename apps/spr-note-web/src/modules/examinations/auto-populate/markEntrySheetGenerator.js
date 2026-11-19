/**
 * markEntrySheetGenerator.js
 * Domain Generator for Examination Student Mark Entry Sheets & Grading Rosters.
 * Pre-populates student mark entry sheets from active student enrollment rosters.
 */

import BaseGenerator from '@/utils/auto-populate/BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from '@/utils/auto-populate/conflictResolver';

export class MarkEntrySheetGenerator extends BaseGenerator {
  constructor() {
    super({
      domainKey: 'mark_entry_sheets',
      title: 'Student Mark Entry Sheets',
      description: 'Auto-populate student assessment rosters from active class/section enrollments.',
      category: 'Examinations',
      targetStore: 'examStore',
      defaultStrategies: {
        defaultStatus: 'PRESENT',
        defaultObtainedMarks: '',
        overwriteMode: CONFLICT_MODES.APPEND_MISSING,
      },
    });
  }

  getSchema(context = {}) {
    const { subjectName = 'Subject', className = 'Class' } = context;
    return {
      title: 'Auto-Populate Mark Entry Roster',
      subtitle: `${subjectName} — ${className}`,
      strategies: [
        {
          key: 'defaultStatus',
          label: 'Initial Attendance Status',
          type: 'select',
          options: [
            { value: 'PRESENT', label: 'Mark All Present (Default)' },
            { value: 'UNMARKED', label: 'Leave Unmarked' },
          ],
          default: 'PRESENT',
        },
        {
          key: 'overwriteMode',
          label: 'Existing Marks Handling',
          type: 'select',
          options: [
            { value: CONFLICT_MODES.APPEND_MISSING, label: 'Preserve Entered Marks & Add Missing Students (Recommended)' },
            { value: CONFLICT_MODES.REPLACE_ALL, label: 'Reset All (Clear All Entered Marks)' },
          ],
          default: CONFLICT_MODES.APPEND_MISSING,
        },
      ],
    };
  }

  validate(context = {}) {
    const { students = [] } = context;
    const errors = [];
    if (!students || students.length === 0) {
      errors.push('No enrolled students found for the target class/section.');
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  simulate(context = {}, options = {}) {
    const {
      examId,
      subjectId,
      classId,
      sectionId,
      students = [],
      existingMarks = [],
    } = context;

    const {
      defaultStatus = 'PRESENT',
      overwriteMode = CONFLICT_MODES.APPEND_MISSING,
    } = options;

    const generatedItems = students.map((student, idx) => ({
      id: `mark_${examId}_${subjectId}_${student.id}`,
      examId: String(examId || ''),
      subjectId: String(subjectId || ''),
      classId: String(classId || ''),
      sectionId: String(sectionId || ''),
      studentId: String(student.id),
      studentName: student.name || student.full_name || 'Student',
      rollNo: student.roll_number || student.rollNo || idx + 1,
      attendanceStatus: defaultStatus,
      marks: {
        theory: '',
        mcq: '',
        practical: '',
        viva: '',
        total: '',
      },
      isAbsent: defaultStatus === 'ABSENT',
      comments: '',
    }));

    const resolved = resolveConflicts({
      existingItems: existingMarks,
      generatedItems,
      keyExtractor: (item) => `${item.studentId}`,
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
      message: `Successfully populated mark entry roster for ${finalItems.length} students.`,
      data: finalItems,
      summary: sim.summary,
    };
  }
}

export const markEntrySheetGenerator = new MarkEntrySheetGenerator();
export default markEntrySheetGenerator;

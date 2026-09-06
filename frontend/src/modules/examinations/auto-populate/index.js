/**
 * examinations/auto-populate/index.js
 * Domain Auto-Populate Plugin Module for Examinations.
 * Registers domain generators with the universal AutoPopulateEngine.
 */

import autoPopulateEngine from '@/utils/auto-populate/AutoPopulateEngine';
import examRoutineGenerator from './examRoutineGenerator';
import invigilationRosterGenerator from './invigilationRosterGenerator';
import markEntrySheetGenerator from './markEntrySheetGenerator';

// Register examination domain generator plugins
autoPopulateEngine.register(examRoutineGenerator);
autoPopulateEngine.register(invigilationRosterGenerator);
autoPopulateEngine.register(markEntrySheetGenerator);

export {
  examRoutineGenerator,
  invigilationRosterGenerator,
  markEntrySheetGenerator,
};

export default {
  examRoutineGenerator,
  invigilationRosterGenerator,
  markEntrySheetGenerator,
};

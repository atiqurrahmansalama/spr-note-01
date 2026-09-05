/**
 * auto-populate/index.js
 * Universal Auto-Populate Framework - Central Entrypoint & Registry Initializer.
 */

import autoPopulateEngine from './AutoPopulateEngine';
import BaseGenerator from './BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from './conflictResolver';
import { balanceRoundRobin, balanceDailyGuardByDateShift, matchSubjectTeacher } from './workloadBalancer';

// Domain Generators
import examRoutineGenerator from './generators/examRoutineGenerator';
import invigilationRosterGenerator from './generators/invigilationRosterGenerator';
import classTimetableGenerator from './generators/classTimetableGenerator';
import markEntrySheetGenerator from './generators/markEntrySheetGenerator';

// Register standard domain plugins
autoPopulateEngine.register(examRoutineGenerator);
autoPopulateEngine.register(invigilationRosterGenerator);
autoPopulateEngine.register(classTimetableGenerator);
autoPopulateEngine.register(markEntrySheetGenerator);

export {
  autoPopulateEngine,
  BaseGenerator,
  CONFLICT_MODES,
  resolveConflicts,
  balanceRoundRobin,
  balanceDailyGuardByDateShift,
  matchSubjectTeacher,
  // Generators
  examRoutineGenerator,
  invigilationRosterGenerator,
  classTimetableGenerator,
  markEntrySheetGenerator,
};

export default autoPopulateEngine;

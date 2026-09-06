/**
 * auto-populate/index.js
 * Universal Auto-Populate Framework — Central Micro-Kernel & Registry Initializer.
 * Exports core algorithms, base generator contract, and orchestrates domain plugins.
 */

import autoPopulateEngine from './AutoPopulateEngine';
import BaseGenerator from './BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from './conflictResolver';
import { balanceRoundRobin, balanceDailyGuardByDateShift, matchSubjectTeacher } from './workloadBalancer';

// Import domain generator plugins from their colocated feature modules
import {
  examRoutineGenerator,
  invigilationRosterGenerator,
  markEntrySheetGenerator,
} from '@/modules/examinations/auto-populate';

import {
  classTimetableGenerator,
} from '@/modules/academy/routine-curriculum/auto-populate';

export {
  autoPopulateEngine,
  BaseGenerator,
  CONFLICT_MODES,
  resolveConflicts,
  balanceRoundRobin,
  balanceDailyGuardByDateShift,
  matchSubjectTeacher,
  // Domain Generators
  examRoutineGenerator,
  invigilationRosterGenerator,
  markEntrySheetGenerator,
  classTimetableGenerator,
};

export default autoPopulateEngine;


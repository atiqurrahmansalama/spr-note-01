/**
 * routine-curriculum/auto-populate/index.js
 * Domain Auto-Populate Plugin Module for Academic Timetable & Curriculum Routine.
 */

import autoPopulateEngine from '@/utils/auto-populate/AutoPopulateEngine';
import classTimetableGenerator from './classTimetableGenerator';

// Register timetable generator plugin
autoPopulateEngine.register(classTimetableGenerator);

export {
  classTimetableGenerator,
};

export default {
  classTimetableGenerator,
};

/**
 * workloadBalancer.js
 * Universal Resource Balancing & Distribution Algorithms
 * Supports Round-Robin, Date-Slot Daily Guard Grouping, and Specialized Faculty Allocation.
 */

/**
 * Distributes slots across a pool of teachers equitably using Round-Robin rotation.
 * 
 * @param {Array} slots - List of slots/items to assign
 * @param {Array} teacherPool - Available faculty members [{ id, name, ... }]
 * @param {Object} [options] - Options (startIndex, maxConsecutive)
 * @returns {Array} List of assignments { slotId, teacherId, teacherName }
 */
export function balanceRoundRobin(slots = [], teacherPool = [], options = {}) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  if (!Array.isArray(teacherPool) || teacherPool.length === 0) {
    return slots.map((s) => ({
      slotId: s.id,
      teacherId: '',
      teacherName: '',
    }));
  }

  const { startIndex = 0 } = options;
  let poolIndex = startIndex;

  return slots.map((slot) => {
    const teacher = teacherPool[poolIndex % teacherPool.length];
    poolIndex++;
    return {
      slotId: slot.id,
      teacherId: String(teacher.id),
      teacherName: teacher.name || teacher.name_en || teacher.full_name || 'Teacher',
      teacherData: teacher,
    };
  });
}

/**
 * Groups slots by unique Date + Shift combinations and assigns one single guard per Date-Shift block.
 * All subject exams occurring in that same date-shift slot will inherit that same assigned invigilator.
 * 
 * @param {Array} slots - List of schedule slots [{ date, shiftId, ... }]
 * @param {Array} teacherPool - Available faculty members [{ id, name, ... }]
 * @returns {Map<string, { id: string, name: string }>} Map of "date___shiftId" -> teacher
 */
export function balanceDailyGuardByDateShift(slots = [], teacherPool = []) {
  const slotMap = new Map();
  if (!Array.isArray(teacherPool) || teacherPool.length === 0) return slotMap;

  let poolIndex = 0;
  slots.forEach((slot) => {
    const key = `${slot.date || slot.examDate}___${slot.shiftId || 'shift_1'}`;
    if (!slotMap.has(key)) {
      const teacher = teacherPool[poolIndex % teacherPool.length];
      poolIndex++;
      slotMap.set(key, {
        id: String(teacher.id),
        name: teacher.name || teacher.name_en || teacher.full_name || 'Teacher',
        teacherData: teacher,
      });
    }
  });

  return slotMap;
}

/**
 * Matches a subject's assigned teacher from curriculum books.
 * Falls back to department head or unassigned if not found.
 * 
 * @param {Object} book - Curriculum book object
 * @param {Array} teacherPool - List of teachers
 * @returns {{ id: string, name: string }}
 */
export function matchSubjectTeacher(book = {}, teacherPool = []) {
  const tId = book.teacherId || book.teacher_id || (typeof book.teacher === 'object' ? book.teacher?.id : book.teacher);
  const tName = book.teacherName || book.teacher_name || (typeof book.teacher === 'object' ? (book.teacher?.name || book.teacher?.full_name) : '');

  if (tId) {
    const matched = teacherPool.find((t) => String(t.id) === String(tId));
    if (matched) {
      return {
        id: String(matched.id),
        name: matched.name || matched.name_en || matched.full_name || tName || 'Teacher',
      };
    }
    if (tName) {
      return { id: String(tId), name: tName };
    }
  }

  return { id: '', name: '' };
}

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
 * Matches a subject's assigned teacher from curriculum books against the teacher pool.
 * Supports all schema property variations (teacherId, teacher_id, assignedTeacherId, teacher object/string, teacherName, teacher_name).
 * 
 * @param {Object} book - Curriculum book object
 * @param {Array} teacherPool - List of active teachers [{ id, name, ... }]
 * @returns {{ id: string, name: string }}
 */
export function matchSubjectTeacher(book = {}, teacherPool = []) {
  if (!book || typeof book !== 'object') return { id: '', name: '' };

  const rawTeacher = book.teacher;
  const tId = book.teacherId || book.teacher_id || book.assignedTeacherId || book.assigned_teacher_id || (typeof rawTeacher === 'object' ? (rawTeacher?.id || rawTeacher?.user_id) : (typeof rawTeacher === 'number' ? String(rawTeacher) : ''));
  const tName = book.teacherName || book.teacher_name || book.assignedTeacherName || book.assigned_teacher_name || (typeof rawTeacher === 'object' ? (rawTeacher?.name || rawTeacher?.name_en || rawTeacher?.full_name || rawTeacher?.username) : (typeof rawTeacher === 'string' && isNaN(Number(rawTeacher)) ? rawTeacher : ''));

  // 1. Direct ID match against teacher pool
  if (tId) {
    const matchedById = Array.isArray(teacherPool) ? teacherPool.find((t) => String(t.id) === String(tId)) : null;
    if (matchedById) {
      return {
        id: String(matchedById.id),
        name: matchedById.name || matchedById.name_en || matchedById.full_name || tName || 'Teacher',
      };
    }
  }

  // 2. Direct Name match against teacher pool
  if (tName) {
    const cleanName = String(tName).trim().toLowerCase();
    const matchedByName = Array.isArray(teacherPool) ? teacherPool.find((t) => {
      const poolName = String(t.name || t.name_en || t.full_name || '').trim().toLowerCase();
      return poolName === cleanName || poolName.includes(cleanName) || cleanName.includes(poolName);
    }) : null;

    if (matchedByName) {
      return {
        id: String(matchedByName.id),
        name: matchedByName.name || matchedByName.name_en || matchedByName.full_name || tName,
      };
    }

    // Preserve the clean name from curriculum even if ID is not in active pool
    return {
      id: String(tId || `teach_${cleanName.replace(/[^a-z0-9]/gi, '_')}`),
      name: String(tName).trim(),
    };
  }

  // 3. Fallback if tId is provided without name
  if (tId) {
    return {
      id: String(tId),
      name: `Teacher #${tId}`,
    };
  }

  return { id: '', name: '' };
}

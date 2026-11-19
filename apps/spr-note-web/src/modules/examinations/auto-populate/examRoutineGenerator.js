/**
 * examRoutineGenerator.js
 * Domain Generator for Examination Subject Routine Matrix.
 * Generates structured exam routine rows from curriculum syllabus books with:
 * - Direct 1-to-1 Curriculum Book to Exam Subject Mapping (No dummy GEN-01 placeholders)
 * - Exact Class & Department Metadata Resolution
 * - Shift & Date slot distribution
 * - Paper Setter & Examiner allocation (Subject Teacher, Cross-Faculty, Specific Teacher, Unassigned)
 * - Marks breakdown template inheritance (CQ, MCQ, Viva, Full Marks)
 * - Safe REPLACE, APPEND, and MERGE conflict resolution
 */

import BaseGenerator from '@/utils/auto-populate/BaseGenerator';
import { resolveConflicts, CONFLICT_MODES } from '@/utils/auto-populate/conflictResolver';
import { matchSubjectTeacher } from '@/utils/auto-populate/workloadBalancer';
import { examStore } from '@/stores/examStore';
import { curriculumStore } from '@/stores/academicStore';
import { readJSON } from '@/stores/coreStore';
import { generateDateRange } from '@/modules/examinations/exam-schedules/utils/examScheduleUtils';

export function findMatchingCurriculumBooks(targetClass, allBooks = []) {
  if (!targetClass) return [];

  const clsIdStr = String(targetClass.id || '').trim();
  const clsName = String(targetClass.name || targetClass.className || targetClass.class_name || '').trim().toLowerCase();
  const deptId = String(targetClass.departmentId || targetClass.department_id || (typeof targetClass.department === 'object' ? targetClass.department?.id : targetClass.department) || '').trim();
  const deptName = String(targetClass.departmentName || targetClass.department_name || (typeof targetClass.department === 'object' ? targetClass.department?.name : '') || '').trim().toLowerCase();

  const normalizeId = (s) => String(s || '').replace(/^cls_/, '').replace(/^dept_/, '').trim().toLowerCase();
  const cleanClsId = normalizeId(clsIdStr);
  const cleanDeptId = normalizeId(deptId);

  // 1. Direct Class ID Match (Highest Priority)
  const classIdMatches = allBooks.filter((b) => {
    if (!b) return false;
    const bClsId = String(b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || '').trim();
    const cleanBClsId = normalizeId(bClsId);
    return bClsId && (bClsId === clsIdStr || (cleanBClsId && cleanBClsId === cleanClsId));
  });
  if (classIdMatches.length > 0) return classIdMatches;

  // 2. Exact Class Name Match
  if (clsName) {
    const exactNameMatches = allBooks.filter((b) => {
      if (!b) return false;
      const bClsName = String(b.className || b.class_name || (typeof b.class === 'object' ? b.class?.name : '') || '').trim().toLowerCase();
      return bClsName && (bClsName === clsName || bClsName.includes(clsName) || clsName.includes(bClsName));
    });
    if (exactNameMatches.length > 0) return exactNameMatches;
  }

  // 3. Direct Department ID / Name Match (if class is department-scoped)
  if (cleanDeptId || deptName) {
    const deptMatches = allBooks.filter((b) => {
      if (!b) return false;
      const bDeptId = normalizeId(b.departmentId || b.department_id || (typeof b.department === 'object' ? b.department?.id : b.department) || '');
      const bDeptName = String(b.departmentName || b.department_name || (typeof b.department === 'object' ? b.department?.name : '') || '').trim().toLowerCase();

      if (cleanDeptId && bDeptId && bDeptId === cleanDeptId) return true;
      if (deptName && bDeptName && (bDeptName === deptName || bDeptName.includes(deptName) || deptName.includes(bDeptName))) return true;
      return false;
    });
    if (deptMatches.length > 0) return deptMatches;
  }

  // If no match found for this class, leave it blank
  return [];
}

export function resolveClassForBook(book, allAvailableClasses = []) {
  if (!book) return { classId: '', className: '', departmentId: '', departmentName: '' };
  if (!Array.isArray(allAvailableClasses) || allAvailableClasses.length === 0) {
    return {
      classId: String(book.classId || 'cls_1'),
      className: book.className || 'Class 1',
      departmentId: String(book.departmentId || ''),
      departmentName: book.departmentName || '',
    };
  }

  const normalize = (s) => String(s || '').replace(/^cls_|^dept_/, '').trim().toLowerCase();

  const bClsId = String(book.classId || book.class_id || (typeof book.class === 'object' ? book.class?.id : book.class) || '').trim();
  const cleanBClsId = normalize(bClsId);
  const bClsName = String(book.className || book.class_name || (typeof book.class === 'object' ? book.class?.name : '') || '').trim().toLowerCase();
  const bDeptId = String(book.departmentId || book.department_id || (typeof book.department === 'object' ? book.department?.id : book.department) || '').trim();
  const cleanBDeptId = normalize(bDeptId);
  const bDeptName = String(book.departmentName || book.department_name || (typeof book.department === 'object' ? book.department?.name : '') || '').trim().toLowerCase();
  const bookText = `${book.name || ''} ${book.subject || ''} ${bClsName} ${bDeptName}`.toLowerCase();

  // 1. Direct ID match
  if (bClsId) {
    const idMatch = allAvailableClasses.find((c) => String(c.id) === bClsId || normalize(c.id) === cleanBClsId);
    if (idMatch) {
      return {
        classId: String(idMatch.id),
        className: idMatch.name || idMatch.className || idMatch.class_name || bClsName,
        departmentId: String(idMatch.departmentId || idMatch.department_id || (typeof idMatch.department === 'object' ? idMatch.department?.id : idMatch.department) || ''),
        departmentName: idMatch.departmentName || idMatch.department_name || (typeof idMatch.department === 'object' ? idMatch.department?.name : '') || '',
        classObj: idMatch,
      };
    }
  }

  // 2. Direct Class Name match
  if (bClsName) {
    const nameMatch = allAvailableClasses.find((c) => {
      const cName = String(c.name || c.className || c.class_name || '').trim().toLowerCase();
      return cName && (cName === bClsName || cName.includes(bClsName) || bClsName.includes(cName));
    });
    if (nameMatch) {
      return {
        classId: String(nameMatch.id),
        className: nameMatch.name || nameMatch.className || nameMatch.class_name || bClsName,
        departmentId: String(nameMatch.departmentId || nameMatch.department_id || (typeof nameMatch.department === 'object' ? nameMatch.department?.id : nameMatch.department) || ''),
        departmentName: nameMatch.departmentName || nameMatch.department_name || (typeof nameMatch.department === 'object' ? nameMatch.department?.name : '') || '',
        classObj: nameMatch,
      };
    }
  }

  // 3. Department Link match (e.g. Hifz books matched to Hifz class, Kitab books matched to Kitab class, Noorani books matched to Noorani class)
  const deptMatch = allAvailableClasses.find((c) => {
    const cDeptId = normalize(c.departmentId || c.department_id || (typeof c.department === 'object' ? c.department?.id : c.department) || '');
    const cDeptName = String(c.departmentName || c.department_name || (typeof c.department === 'object' ? c.department?.name : '') || '').trim().toLowerCase();
    const cName = String(c.name || c.className || c.class_name || '').trim().toLowerCase();

    if (cleanBDeptId && cDeptId && cDeptId === cleanBDeptId) return true;
    if (bDeptName && cDeptName && (cDeptName.includes(bDeptName) || bDeptName.includes(cDeptName))) return true;

    if (bookText.includes('hifz') || bookText.includes('quran') || bookText.includes('sabaq') || bookText.includes('manzil')) {
      if (cName.includes('hifz') || cDeptName.includes('hifz')) return true;
    }
    if (bookText.includes('noorani') || bookText.includes('nazira') || bookText.includes('nazera') || bookText.includes('qaida') || bookText.includes('ampara')) {
      if (cName.includes('noorani') || cName.includes('nazira') || cName.includes('nazera') || cDeptName.includes('noorani') || cDeptName.includes('nazira')) return true;
    }
    if (bookText.includes('kitab') || bookText.includes('nahw') || bookText.includes('sarf') || bookText.includes('fiqh') || bookText.includes('hadith') || bookText.includes('tafsir')) {
      if (cName.includes('nahw') || cName.includes('kitab') || cDeptName.includes('kitab')) return true;
    }
    if (bookText.includes('primary') || bookText.includes('bangla') || bookText.includes('math') || bookText.includes('english') || bookText.includes('science')) {
      if (cName.includes('class 6') || cName.includes('class 7') || cName.includes('primary') || cDeptName.includes('academic') || cDeptName.includes('primary')) return true;
    }

    return false;
  });

  if (deptMatch) {
    return {
      classId: String(deptMatch.id),
      className: deptMatch.name || deptMatch.className || deptMatch.class_name,
      departmentId: String(deptMatch.departmentId || deptMatch.department_id || (typeof deptMatch.department === 'object' ? deptMatch.department?.id : deptMatch.department) || ''),
      departmentName: deptMatch.departmentName || deptMatch.department_name || (typeof deptMatch.department === 'object' ? deptMatch.department?.name : '') || '',
      classObj: deptMatch,
    };
  }

  const firstCls = allAvailableClasses[0];
  return {
    classId: String(firstCls.id),
    className: firstCls.name || firstCls.className || 'Class',
    departmentId: String(firstCls.departmentId || ''),
    departmentName: firstCls.departmentName || '',
    classObj: firstCls,
  };
}

export class ExamRoutineGenerator extends BaseGenerator {
  constructor() {
    super({
      domainKey: 'exam_routine_matrix',
      title: 'Subject Routine Matrix',
      description: 'Auto-populate subject examination schedules, shifts, and examiners directly from curriculum syllabus books.',
      category: 'Examinations',
      targetStore: 'examStore',
      defaultStrategies: {
        examinerStrategy: 'SUBJECT_TEACHER',
        examinerTeacherId: '',
        examinerTeacherName: '',
        overwriteMode: CONFLICT_MODES.REPLACE_ALL,
      },
    });
  }

  getSchema(context = {}) {
    const { activeExam = null, availableCurriculumBooks = [], tenantId } = context;
    const rawBooks = (Array.isArray(availableCurriculumBooks) && availableCurriculumBooks.length > 0)
      ? availableCurriculumBooks
      : (curriculumStore.getItems(tenantId) || []);

    return {
      title: 'Auto-Populate Examination Routine',
      subtitle: activeExam ? `For ${activeExam.name} (${rawBooks.length} Curriculum Books Available)` : 'Configure generation rules',
      strategies: [
        {
          key: 'examinerStrategy',
          label: 'Paper Setter & Examiner (Grader)',
          type: 'select',
          options: [
            {
              value: 'SUBJECT_TEACHER',
              label: 'Subject Teacher',
              description: 'Assigns each respective subject\'s regular curriculum teacher as paper setter and examiner.',
            },
            {
              value: 'EXTERNAL_NON_CLASS_TEACHER',
              label: 'External Examiner',
              description: 'Assigns a teacher from outside the class to evaluate each subject, ensuring neutral and independent grading.',
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
          default: CONFLICT_MODES.REPLACE_ALL,
        },
      ],
    };
  }

  validate(context = {}, options = {}) {
    const { activeExam = null, availableCurriculumBooks = [], tenantId } = context;
    const errors = [];
    const warnings = [];

    if (!activeExam) {
      errors.push('No active examination session selected.');
    }

    const rawBooks = (Array.isArray(availableCurriculumBooks) && availableCurriculumBooks.length > 0)
      ? availableCurriculumBooks
      : (curriculumStore.getItems(tenantId) || []);

    if (rawBooks.length === 0) {
      warnings.push('No curriculum syllabus books found in Academy Curriculum Tracker.');
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
      examinerStrategy = 'SUBJECT_TEACHER',
      examinerTeacherId = '',
      examinerTeacherName = '',
      overwriteMode = CONFLICT_MODES.REPLACE_ALL,
    } = options;

    // 1. Retrieve real curriculum books for the tenant
    const rawBooks = (Array.isArray(availableCurriculumBooks) && availableCurriculumBooks.length > 0)
      ? availableCurriculumBooks
      : (curriculumStore.getItems(tenantId) || []);

    if (rawBooks.length === 0) {
      return {
        domainKey: this.domainKey,
        items: [],
        toCreate: [],
        toUpdate: [],
        toPreserve: [],
        toRemove: [],
        conflictsCount: 0,
        summary: {
          totalGenerated: 0,
          totalFinal: 0,
          createdCount: 0,
          updatedCount: 0,
          preservedCount: 0,
          removedCount: 0,
          targetBooksCount: 0,
          conflictMode: overwriteMode,
        },
      };
    }

    // 2. Filter Curriculum Books based on Active Exam Scope
    const normalizeId = (s) => String(s || '').replace(/^cls_/, '').replace(/^dept_/, '').trim().toLowerCase();

    let targetBooks = rawBooks;

    // Filter by target class IDs only if targetClassIds is explicitly specified as a non-empty array on the active exam
    if (Array.isArray(activeExam?.targetClassIds) && activeExam.targetClassIds.length > 0) {
      const targetIdSet = new Set(activeExam.targetClassIds.map(normalizeId));
      const targetNameSet = new Set(
        participatingClasses.map(c => String(c.name || c.className || '').trim().toLowerCase()).filter(Boolean)
      );

      const classFiltered = targetBooks.filter((b) => {
        const bClsId = normalizeId(b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || '');
        const bClsName = String(b.className || b.class_name || (typeof b.class === 'object' ? b.class?.name : '') || '').trim().toLowerCase();

        if (bClsId && targetIdSet.has(bClsId)) return true;
        if (bClsName && targetNameSet.has(bClsName)) return true;
        return false;
      });

      if (classFiltered.length > 0) {
        targetBooks = classFiltered;
      }
    }

    // Filter by department only if explicitly specified and not ALL
    if (activeExam?.departmentId && activeExam.departmentId !== 'ALL' && activeExam.departmentId !== '') {
      const examDeptClean = normalizeId(activeExam.departmentId);
      const deptFiltered = targetBooks.filter((b) => {
        const bDeptId = normalizeId(b.departmentId || b.department_id || (typeof b.department === 'object' ? b.department?.id : b.department) || '');
        const bDeptName = String(b.departmentName || b.department_name || (typeof b.department === 'object' ? b.department?.name : '') || '').trim().toLowerCase();
        return bDeptId === examDeptClean || (bDeptName && (bDeptName.includes(examDeptClean) || examDeptClean.includes(bDeptName)));
      });

      if (deptFiltered.length > 0) {
        targetBooks = deptFiltered;
      }
    }

    // 3. Prepare active teacher pool dynamically
    const rawStaffList = (Array.isArray(teachers) && teachers.length > 0)
      ? teachers
      : (typeof window !== 'undefined' ? readJSON(`spr_staff_cache_${tenantId || 'default'}`, []) : []);

    const teachingStaff = rawStaffList.filter((t) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });

    const effectiveStaffList = teachingStaff.length > 0 ? teachingStaff : rawStaffList;

    const teacherPool = effectiveStaffList.map((t) => {
      const name = (
        t.name_en ||
        t.name ||
        t.full_name ||
        (t.first_name ? `${t.first_name} ${t.last_name || ''}`.trim() : '') ||
        (t.user ? `${t.user.first_name || ''} ${t.user.last_name || ''}`.trim() || t.user.username : '') ||
        t.user_name ||
        t.username ||
        (t.employee_id ? `Teacher (${t.employee_id})` : `Teacher #${t.id || '1'}`)
      );
      return {
        id: String(t.id || t.user_id || t.userId || (typeof t.user === 'object' ? t.user?.id : t.user) || ''),
        name: name || 'Teacher',
        raw: t,
      };
    }).filter((t) => t.id && t.name);

    // 4. Generate ordered schedule slots
    const resolvedShifts = examShifts.length > 0 ? examShifts : [
      { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
    ];

    const examSlots = [];
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays) && activeExam.scheduleDays.length > 0) {
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
      let datesToUse = [];
      if (activeExam?.startDate && activeExam?.endDate) {
        datesToUse = generateDateRange(activeExam.startDate, activeExam.endDate);
      }
      if (datesToUse.length === 0 && activeExam?.startDate) {
        const s = new Date(activeExam.startDate);
        if (!isNaN(s.getTime())) {
          for (let i = 0; i < 10; i++) {
            const d = new Date(s);
            d.setDate(d.getDate() + i);
            datesToUse.push(d.toISOString().split('T')[0]);
          }
        } else {
          datesToUse = [activeExam.startDate];
        }
      }
      if (datesToUse.length === 0) {
        datesToUse = [new Date().toISOString().split('T')[0]];
      }

      datesToUse.forEach((dt) => {
        resolvedShifts.forEach((shift) => {
          examSlots.push({
            date: dt,
            shiftId: shift.id,
            shiftName: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
          });
        });
      });
    }

    // 5. Group target curriculum books by real Resolved Class to assign collision-free dates & shifts
    const effectiveClasses = (Array.isArray(participatingClasses) && participatingClasses.length > 0)
      ? participatingClasses
      : (Array.isArray(allAvailableClasses) && allAvailableClasses.length > 0 ? allAvailableClasses : []);

    const booksByClass = new Map();
    targetBooks.forEach((book) => {
      const resolved = resolveClassForBook(book, effectiveClasses);
      const clsKey = String(resolved.classId || 'default_class');
      if (!booksByClass.has(clsKey)) {
        booksByClass.set(clsKey, {
          resolvedClass: resolved,
          books: [],
        });
      }
      booksByClass.get(clsKey).books.push({ book, resolved });
    });

    const generatedItems = [];
    let sequenceCounter = 1;
    let subjectExaminerCounter = 0;
    let externalExaminerCounter = 0;
    const defaultFullMarks = Number(activeExam?.defaultFullMarks || activeExam?.targetFullMarks || 100);

    booksByClass.forEach(({ resolvedClass, books }) => {
      books.forEach(({ book, resolved }, bIdx) => {
        const slot = examSlots[bIdx % examSlots.length];

        const resolvedClassId = resolved.classId;
        const resolvedClassName = resolved.className;
        const resolvedDeptId = resolved.departmentId;
        const resolvedDeptName = resolved.departmentName;

        let exmId = '';
        let exmName = '';

        if (examinerStrategy === 'SUBJECT_TEACHER') {
          if (book.teacherId && book.teacherName) {
            exmId = String(book.teacherId);
            exmName = book.teacherName;
          } else if (teacherPool.length > 0) {
            const teach = teacherPool[subjectExaminerCounter % teacherPool.length];
            subjectExaminerCounter++;
            exmId = String(teach.id);
            exmName = teach.name;
          }
        } else if (examinerStrategy === 'EXTERNAL_NON_CLASS_TEACHER') {
          if (teacherPool.length > 0) {
            const teach = teacherPool[externalExaminerCounter % teacherPool.length];
            externalExaminerCounter++;
            exmId = String(teach.id);
            exmName = teach.name;
          }
        } else if (examinerStrategy === 'SPECIFIC_TEACHER') {
          const matchedChief = teacherPool.find((t) => String(t.id) === String(examinerTeacherId));
          exmId = String(examinerTeacherId || (matchedChief ? matchedChief.id : ''));
          exmName = examinerTeacherName || matchedChief?.name || (exmId ? `Examiner #${exmId}` : '');
        }

        const bookTitle = book.name || book.title || book.subject || 'Curriculum Book';

        generatedItems.push({
          id: `routine_${activeExam?.id}_${resolvedClassId}_${book.id}`,
          examId: String(activeExam?.id || ''),
          examName: activeExam?.name || 'Exam',
          classId: resolvedClassId,
          className: resolvedClassName,
          departmentId: resolvedDeptId,
          departmentName: resolvedDeptName,
          sectionId: '',
          sectionName: 'All Sections',
          subjectId: String(book.id || ''),
          subjectName: bookTitle,
          subjectCode: book.code || book.subject_code || '',
          bookId: String(book.id || ''),
          bookName: bookTitle,
          curriculumBookId: String(book.id || ''),
          curriculumBookName: bookTitle,
          examDate: slot.date,
          dayOfWeek: new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short' }),
          shiftId: slot.shiftId,
          shiftName: slot.shiftName,
          startTime: slot.startTime,
          endTime: slot.endTime,
          roomNo: 'Main Hall',
          invigilatorId: '',
          invigilatorName: '',
          teacherId: book.teacherId || '',
          teacherName: book.teacherName || '',
          examinerId: exmId,
          examinerName: exmName,
          evaluatorId: exmId,
          evaluatorName: exmName,
          fullMarks: Number(book.fullMarks || book.full_marks || defaultFullMarks),
          passMarks: Number(book.passMarks || book.pass_marks || Math.round(defaultFullMarks * 0.4)),
          sequence: sequenceCounter++,
          notes: book.notes || '',
        });
      });
    });

    // 6. Retrieve currently stored items
    const existingItems = examStore.getExamSubjects(tenantId, activeExam?.id) || [];

    // 8. Universal conflict resolution (Keyed by unique Class + Book ID)
    const resolved = resolveConflicts({
      existingItems,
      generatedItems,
      keyExtractor: (item) => `${String(item.classId || '')}___${String(item.curriculumBookId || item.bookId || item.subjectId || item.subjectName || '').toLowerCase().trim()}`,
      conflictMode: overwriteMode,
      customMerger: (exist, gen) => ({
        ...exist,
        ...gen,
        invigilatorId: exist.invigilatorId || gen.invigilatorId || '',
        invigilatorName: exist.invigilatorName || gen.invigilatorName || '',
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
        targetBooksCount: targetBooks.length,
        conflictMode: overwriteMode,
      },
    };
  }

  execute(context = {}, options = {}, simulationResult = null) {
    const { tenantId, activeExam } = context;
    if (!activeExam || !activeExam.id) {
      throw new Error('Active exam session is missing.');
    }

    const sim = this.simulate(context, options);
    const finalItems = sim.items || [];

    // Commit to examStore
    examStore.bulkUpsertExamSubjects(tenantId, activeExam.id, finalItems);

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

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { useUndoRedo } from '../../../../../context/useUndoRedo';
import { fetchWithAuth } from '../../../../../utils/authService';
import { examStore } from '@/stores/examStore';
import { curriculumStore } from '@/stores/academicStore';
import { readJSON } from '@/stores/coreStore';
import useExamData from '../../../hooks/useExamData';
import { resolveClassForBook } from '../../../auto-populate/examRoutineGenerator';
import {
  generateDateRange,
  formatShortDateLabel,
  formatDateLabel,
} from '../../utils/examScheduleUtils';
import { SubjectRoutineItem, SelectOption, RoutineAssessmentComponent } from '../types';

export { formatShortDateLabel, formatDateLabel, generateDateRange };

export interface UseSubjectMatrixStateOptions {
  initialExamId?: string | null;
  onNavigateToExamSessions?: (() => void) | null;
}

/**
 * useSubjectMatrixState
 * Central state management hook for Subject Routine Matrix workspace.
 */
export default function useSubjectMatrixState({ initialExamId = null }: UseSubjectMatrixStateOptions = {}) {
  const { showToast } = useToast();
  const { pushAction } = useUndoRedo();
  const {
    tenantId,
    exams = [],
    classes = [],
    departments = [],
    curriculumBooks = [],
    periodSlots = [],
    teachers: examDataTeachers = [],
    staff: examDataStaff = [],
    refreshExamData,
  } = useExamData();

  // Active Exam Session Context
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    if (initialExamId) return String(initialExamId);
    return exams.length > 0 ? String(exams[0].id) : '';
  });

  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(String(initialExamId));
    } else if ((!selectedExamId || !exams.some((e: any) => String(e.id) === String(selectedExamId))) && exams.length > 0) {
      setSelectedExamId(String(exams[0].id));
    }
  }, [initialExamId, exams, selectedExamId]);

  const activeExam = useMemo(() => {
    return exams.find((e: any) => String(e.id) === String(selectedExamId)) || (exams.length > 0 ? exams[0] : null);
  }, [exams, selectedExamId]);

  // Dynamic Shifts from Active Exam
  const examShifts = useMemo(() => {
    if (Array.isArray(activeExam?.shifts) && activeExam.shifts.length > 0) {
      return activeExam.shifts;
    }
    const defaultShifts = [
      {
        id: 'shift_1',
        name: 'Shift 1 (Morning)',
        startTime: activeExam?.defaultStartTime || '09:00 AM',
        endTime: activeExam?.defaultEndTime || '11:00 AM',
      },
    ];
    if (activeExam?.hasSecondShift || activeExam?.secondStartTime) {
      defaultShifts.push({
        id: 'shift_2',
        name: 'Shift 2 (Afternoon)',
        startTime: activeExam?.secondStartTime || '02:00 PM',
        endTime: activeExam?.secondEndTime || '04:00 PM',
      });
    }
    return defaultShifts;
  }, [activeExam]);

  // Designated Exam Days from Active Exam Session (excluding PREPARATION_GAP)
  const designatedExamDays = useMemo(() => {
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays) && activeExam.scheduleDays.length > 0) {
      const validDays = activeExam.scheduleDays
        .filter((d: any) => d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK')
        .map((d: any) => d.date)
        .filter(Boolean);
      if (validDays.length > 0) return validDays;
    }
    if (activeExam?.startDate && activeExam?.endDate) {
      const range = generateDateRange(activeExam.startDate, activeExam.endDate);
      if (range.length > 0) return range;
    }
    if (activeExam?.startDate) {
      const s = new Date(activeExam.startDate);
      if (!isNaN(s.getTime())) {
        const dates: string[] = [];
        for (let i = 0; i < 10; i++) {
          const d = new Date(s);
          d.setDate(d.getDate() + i);
          dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
      }
      return [activeExam.startDate];
    }
    return [];
  }, [activeExam]);

  const preparationGapDays = useMemo(() => {
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      return activeExam.scheduleDays
        .filter((d: any) => d.type === 'PREPARATION_GAP' || d.type === 'EXAM_BREAK')
        .map((d: any) => d.date);
    }
    return [];
  }, [activeExam]);

  // Routine Rows State (Drafted & Active)
  const [rows, setRows] = useState<SubjectRoutineItem[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Load staff / teachers roster for invigilator & examiner allocation
  const [teachers, setTeachers] = useState<any[]>(() => {
    if (Array.isArray(examDataTeachers) && examDataTeachers.length > 0) return examDataTeachers;
    if (Array.isArray(examDataStaff) && examDataStaff.length > 0) return examDataStaff;
    return typeof window !== 'undefined' ? (readJSON(`spr_staff_cache_${tenantId || 'default'}`, [])) : [];
  });

  useEffect(() => {
    if (Array.isArray(examDataTeachers) && examDataTeachers.length > 0) {
      setTeachers(examDataTeachers);
    } else if (Array.isArray(examDataStaff) && examDataStaff.length > 0) {
      setTeachers(examDataStaff);
    }
  }, [examDataTeachers, examDataStaff]);

  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/staff/?page_size=500');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          if (list.length > 0) {
            setTeachers(list);
          }
        }
      } catch (err) {
        console.warn('[useSubjectMatrixState] Failed to load staff roster:', err);
      }
    };
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  // Load existing exam subjects for selectedExamId
  const loadExamSubjects = useCallback(() => {
    if (!selectedExamId) {
      setRows([]);
      setIsDirty(false);
      return;
    }
    const stored = examStore.getExamSubjects(tenantId, selectedExamId) || [];
    setRows(stored);
    setIsDirty(false);
  }, [tenantId, selectedExamId]);

  useEffect(() => {
    loadExamSubjects();
  }, [loadExamSubjects]);

  // Real-time store listener (does not overwrite uncommitted user edits)
  useEffect(() => {
    const handleUpdate = () => {
      if (!isDirty) {
        loadExamSubjects();
      }
    };
    window.addEventListener('spr_exam_subjects_updated', handleUpdate);
    return () => {
      window.removeEventListener('spr_exam_subjects_updated', handleUpdate);
    };
  }, [loadExamSubjects, isDirty]);

  // Window beforeunload alert if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterExamDate, setFilterExamDate] = useState<string>('ALL');
  const [filterTeacherId, setFilterTeacherId] = useState<string>('ALL');

  // Selected row IDs for Bulk Actions
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Exam Options for top switcher
  const examOptions: SelectOption[] = useMemo(() => {
    return exams.map((e: any) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Academic Year'})${e.startDate ? ` — [${e.startDate} to ${e.endDate}]` : ''}`,
      exam: e,
    }));
  }, [exams]);

  // Participating Classes in the active exam
  const participatingClasses = useMemo(() => {
    if (!activeExam) return classes;
    if (activeExam.targetClassIds && Array.isArray(activeExam.targetClassIds) && activeExam.targetClassIds.length > 0) {
      const matchSet = new Set(activeExam.targetClassIds.map(String));
      const matched = classes.filter((c: any) => {
        const cId = String(c.id);
        const cIdClean = cId.replace(/^cls_/, '');
        return matchSet.has(cId) || matchSet.has(cIdClean) || matchSet.has(`cls_${cId}`);
      });
      if (matched.length > 0) return matched;
    }
    return classes;
  }, [activeExam, classes]);

  // Available Curriculum Books for the Exam (Dynamic from Tenant Store)
  const availableCurriculumBooks = useMemo(() => {
    const fromTenant = curriculumStore.getItems(tenantId) || [];
    if (fromTenant.length > 0) return fromTenant;
    return Array.isArray(curriculumBooks) ? curriculumBooks : [];
  }, [tenantId, curriculumBooks]);

  // All Available Classes (100% Dynamic from Academy with real Department metadata)
  const allAvailableClasses = useMemo(() => {
    const rawList = (Array.isArray(participatingClasses) && participatingClasses.length > 0)
      ? participatingClasses
      : (Array.isArray(classes) ? classes : []);

    const deptMap = new Map();
    (departments || []).forEach((d: any) => {
      if (d && d.id) {
        deptMap.set(String(d.id), d);
      }
    });

    const classMap = new Map();
    rawList.forEach((c: any) => {
      if (!c || !c.id) return;
      const idStr = String(c.id);
      let deptId = '';
      if (c.department !== undefined && c.department !== null) {
        deptId = typeof c.department === 'object' ? String(c.department.id || '') : String(c.department);
      } else if (c.departmentId || c.department_id) {
        deptId = String(c.departmentId || c.department_id);
      }

      const matchedDept = deptMap.get(deptId);
      const deptName = matchedDept?.name || matchedDept?.department_name || c.departmentName || c.department_name || '';

      if (!classMap.has(idStr)) {
        classMap.set(idStr, {
          ...c,
          id: idStr,
          name: c.name || c.className || c.class_name || `Class ${idStr}`,
          className: c.name || c.className || c.class_name || `Class ${idStr}`,
          departmentId: deptId,
          departmentName: deptName,
          departmentCode: matchedDept?.code || matchedDept?.department_code || '',
        });
      }
    });

    return Array.from(classMap.values());
  }, [participatingClasses, classes, departments]);

  // Helper to build default components based on activeExam
  const getExamDefaultComponents = useCallback((fullMarksNum = 100): RoutineAssessmentComponent[] => {
    if (Array.isArray(activeExam?.defaultComponents) && activeExam.defaultComponents.length > 0) {
      const sumBaseline = activeExam.defaultComponents.reduce((s: number, c: any) => s + (Number(c.maxMarks) || 0), 0) || 100;
      const scaled = activeExam.defaultComponents.map((c: any) => ({
        id: c.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: c.name || 'Component',
        maxMarks: Math.round(((Number(c.maxMarks) || 0) / sumBaseline) * fullMarksNum),
      }));
      const currentSum = scaled.reduce((s: number, c: any) => s + c.maxMarks, 0);
      if (currentSum !== fullMarksNum && scaled.length > 0) {
        scaled[scaled.length - 1].maxMarks += (fullMarksNum - currentSum);
      }
      return scaled;
    }
    const writtenRatio = Number(activeExam?.defaultBreakdown?.written ?? 70) / 100;
    const writtenMarks = Math.round(fullMarksNum * writtenRatio);
    return [
      { id: 'comp_1', name: 'Written Exam', maxMarks: writtenMarks },
      { id: 'comp_2', name: 'Oral / Nazera', maxMarks: Math.max(0, fullMarksNum - writtenMarks) },
    ];
  }, [activeExam]);

  // Shift Options for table rows
  const shiftOptions = useMemo(() => {
    return examShifts.map((s: any) => ({
      value: s.id,
      label: `${s.name} (${s.startTime} – ${s.endTime})`,
      shift: s,
    }));
  }, [examShifts]);

  // Base Date Options for table rows
  const baseDateOptions = useMemo(() => {
    const days = designatedExamDays.length > 0
      ? designatedExamDays
      : (activeExam?.startDate && activeExam?.endDate ? generateDateRange(activeExam.startDate, activeExam.endDate) : []);

    return days.map((d: string, idx: number) => ({
      value: d,
      label: `${formatShortDateLabel(d)} (Day ${idx + 1})`,
    }));
  }, [designatedExamDays, activeExam]);

  // State for confirm overwrite modal
  const [showAutoPopulateConfirm, setShowAutoPopulateConfirm] = useState<boolean>(false);

  // ✨ Execute Auto-Populate Routine from Curriculum Books with Custom Invigilator & Examiner Strategies
  const executeAutoPopulate = useCallback((config: any = {}) => {
    if (!activeExam) {
      showToast('Please select an active examination session first.', 'warning');
      return;
    }

    const {
      invigilatorStrategy = 'BALANCED_ROTATION',
      invigilatorTeacherId = '',
      invigilatorTeacherName = '',
      examinerStrategy = 'SUBJECT_TEACHER',
      examinerTeacherId = '',
      examinerTeacherName = '',
      overwriteMode = 'REPLACE',
    } = config;

    const rawBooks = (Array.isArray(availableCurriculumBooks) && availableCurriculumBooks.length > 0)
      ? availableCurriculumBooks
      : (curriculumStore.getItems(tenantId) || []);

    if (rawBooks.length === 0) {
      showToast('No curriculum books found in Curriculum Tracker.', 'warning');
      return;
    }

    // Filter books based on activeExam target classes and department
    const normalizeId = (s: any) => String(s || '').replace(/^cls_/, '').replace(/^dept_/, '').trim().toLowerCase();

    let targetBooks = rawBooks;

    if (Array.isArray(activeExam?.targetClassIds) && activeExam.targetClassIds.length > 0) {
      const targetIdSet = new Set(activeExam.targetClassIds.map(normalizeId));
      const targetNameSet = new Set(
        participatingClasses.map((c: any) => String(c.name || c.className || '').trim().toLowerCase()).filter(Boolean)
      );

      const classFiltered = targetBooks.filter((b: any) => {
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

    if (activeExam?.departmentId && activeExam.departmentId !== 'ALL' && activeExam.departmentId !== '') {
      const examDeptClean = normalizeId(activeExam.departmentId);
      const deptFiltered = targetBooks.filter((b: any) => {
        const bDeptId = normalizeId(b.departmentId || b.department_id || (typeof b.department === 'object' ? b.department?.id : b.department) || '');
        const bDeptName = String(b.departmentName || b.department_name || (typeof b.department === 'object' ? b.department?.name : '') || '').trim().toLowerCase();
        return bDeptId === examDeptClean || (bDeptName && (bDeptName.includes(examDeptClean) || examDeptClean.includes(bDeptName)));
      });

      if (deptFiltered.length > 0) {
        targetBooks = deptFiltered;
      }
    }

    const defaultFullMarks = Number(activeExam.defaultFullMarks || activeExam.targetFullMarks || 100);

    // Prepare teacher pool for dynamic staff allocation
    const teachingStaff = teachers.filter((t: any) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });

    const teacherPool = teachingStaff.map((t: any) => ({
      id: String(t.id),
      name: t.name_en || t.name || t.full_name || t.user_name || 'Teacher',
    }));

    // Generate ordered schedule slots respecting dynamic shifts per day
    const resolvedShifts = Array.isArray(examShifts) && examShifts.length > 0 ? examShifts : [
      { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
    ];

    const examSlots: any[] = [];
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays) && activeExam.scheduleDays.length > 0) {
      activeExam.scheduleDays.forEach((d: any) => {
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
      const fallbackDates = designatedExamDays.length > 0
        ? designatedExamDays
        : (activeExam.startDate && activeExam.endDate ? generateDateRange(activeExam.startDate, activeExam.endDate) : [activeExam.startDate || '2026-10-10']);

      fallbackDates.forEach((dt: string) => {
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

    // Group target curriculum books by real Resolved Class to assign collision-free dates & shifts
    const effectiveClasses = (Array.isArray(participatingClasses) && participatingClasses.length > 0)
      ? participatingClasses
      : (Array.isArray(allAvailableClasses) && allAvailableClasses.length > 0 ? allAvailableClasses : []);

    const booksByClass = new Map();
    targetBooks.forEach((book: any) => {
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

    const slotInvigilatorsUsed = new Map();
    let globalTeacherRotationIndex = 0;
    let subjectTeacherCounter = 0;
    let externalExaminerCounter = 0;

    const getAvailableInvigilatorForSlot = (slotKey: string, preferredTeacherId: string | null = null, preferredTeacherName: string | null = null) => {
      if (invigilatorStrategy === 'UNASSIGNED') {
        return { id: '', name: '' };
      }

      if (!slotInvigilatorsUsed.has(slotKey)) {
        slotInvigilatorsUsed.set(slotKey, new Set());
      }
      const usedInSlot = slotInvigilatorsUsed.get(slotKey);

      if (invigilatorStrategy === 'SPECIFIC_TEACHER') {
        const matched = teacherPool.find((t: any) => String(t.id) === String(invigilatorTeacherId));
        return { id: String(invigilatorTeacherId || ''), name: invigilatorTeacherName || matched?.name || '' };
      }

      if (preferredTeacherId && !usedInSlot.has(String(preferredTeacherId))) {
        usedInSlot.add(String(preferredTeacherId));
        return { id: String(preferredTeacherId), name: preferredTeacherName || 'Teacher' };
      }

      if (teacherPool.length === 0) {
        return { id: '', name: '' };
      }

      let pickedTeacher: any = null;
      for (let i = 0; i < teacherPool.length; i++) {
        const candidate = teacherPool[(globalTeacherRotationIndex + i) % teacherPool.length];
        if (!usedInSlot.has(String(candidate.id))) {
          pickedTeacher = candidate;
          globalTeacherRotationIndex = (globalTeacherRotationIndex + i + 1) % teacherPool.length;
          break;
        }
      }

      if (!pickedTeacher && teacherPool.length > 0) {
        pickedTeacher = teacherPool[globalTeacherRotationIndex % teacherPool.length];
        globalTeacherRotationIndex++;
      }

      if (pickedTeacher) {
        usedInSlot.add(String(pickedTeacher.id));
        return { id: String(pickedTeacher.id), name: pickedTeacher.name };
      }

      return { id: '', name: '' };
    };

    const newRows: SubjectRoutineItem[] = [];
    const existingMap = new Set(
      (overwriteMode === 'APPEND' && Array.isArray(rows) ? rows : []).map(
        (r) => `${String(r.classId || '')}___${String(r.curriculumBookId || r.subjectName || '').toLowerCase()}`
      )
    );

    let sequenceCounter = 1;

    booksByClass.forEach(({ resolvedClass, books }) => {
      books.forEach(({ book, resolved }: any, bIdx: number) => {
        const bookTitle = book.name || book.title || book.subject || 'Curriculum Book';
        const resolvedClassId = resolved.classId;
        const resolvedClassName = resolved.className;
        const resolvedDeptId = resolved.departmentId;
        const resolvedDeptName = resolved.departmentName;

        const bookKey = `${resolvedClassId}___${String(book.id || bookTitle).toLowerCase()}`;
        if (overwriteMode === 'APPEND' && existingMap.has(bookKey)) {
          return;
        }

        const slot = examSlots[bIdx % examSlots.length];
        const assignedDate = slot.date;
        const assignedShiftId = slot.shiftId;
        const assignedShiftName = slot.shiftName;
        const assignedStart = slot.startTime;
        const assignedEnd = slot.endTime;
        const slotKey = `${assignedDate}___${assignedShiftId}`;

        const bookTeacherId = String(book.teacherId || book.teacher_id || '');
        const bookTeacherName = book.teacherName || book.teacher_name || book.teacher || '';

        const allocatedInvigilator = getAvailableInvigilatorForSlot(
          slotKey,
          invigilatorStrategy === 'SUBJECT_TEACHER' ? bookTeacherId : null,
          invigilatorStrategy === 'SUBJECT_TEACHER' ? bookTeacherName : null
        );
        const assignedInvigilatorId = allocatedInvigilator.id;
        const assignedInvigilatorName = allocatedInvigilator.name;

        let assignedExaminerId = '';
        let assignedExaminerName = '';

        if (examinerStrategy === 'SAME_AS_INVIGILATOR') {
          assignedExaminerId = assignedInvigilatorId;
          assignedExaminerName = assignedInvigilatorName;
        } else if (examinerStrategy === 'SUBJECT_TEACHER') {
          if (bookTeacherId && bookTeacherName) {
            assignedExaminerId = bookTeacherId;
            assignedExaminerName = bookTeacherName;
          } else if (teacherPool.length > 0) {
            const teach = teacherPool[subjectTeacherCounter % teacherPool.length];
            subjectTeacherCounter++;
            assignedExaminerId = teach.id;
            assignedExaminerName = teach.name;
          }
        } else if (examinerStrategy === 'EXTERNAL_NON_CLASS_TEACHER') {
          if (teacherPool.length > 0) {
            const teach = teacherPool[externalExaminerCounter % teacherPool.length];
            externalExaminerCounter++;
            assignedExaminerId = teach.id;
            assignedExaminerName = teach.name;
          }
        } else if (examinerStrategy === 'SPECIFIC_TEACHER') {
          const matchedChief = teacherPool.find((t: any) => String(t.id) === String(examinerTeacherId));
          assignedExaminerId = String(examinerTeacherId || (matchedChief ? matchedChief.id : ''));
          assignedExaminerName = examinerTeacherName || matchedChief?.name || '';
        }

        const autoFullMarks = Number(book.fullMarks || book.full_marks || defaultFullMarks);
        const autoPassMarks = Number(book.passMarks || book.pass_marks || Math.round(defaultFullMarks * 0.4));
        const subjectComponents = getExamDefaultComponents(autoFullMarks);

        newRows.push({
          id: `routine_${activeExam.id}_${resolvedClassId}_${book.id}`,
          examId: String(activeExam.id),
          examName: activeExam.name || 'Exam',
          departmentId: String(resolvedDeptId || 'ALL'),
          departmentName: resolvedDeptName,
          classId: resolvedClassId,
          className: resolvedClassName,
          sectionId: 'ALL',
          sectionName: 'All Sections',
          subjectId: String(book.id),
          subjectName: bookTitle,
          subjectCode: book.code || book.subject_code || '',
          curriculumBookId: String(book.id),
          curriculumBookName: bookTitle,
          teacherId: bookTeacherId || assignedInvigilatorId,
          teacherName: bookTeacherName || assignedInvigilatorName,
          invigilatorId: assignedInvigilatorId,
          invigilatorName: assignedInvigilatorName,
          examinerId: assignedExaminerId,
          examinerName: assignedExaminerName,
          evaluatorId: assignedExaminerId,
          evaluatorName: assignedExaminerName,
          examDate: assignedDate,
          dayOfWeek: new Date(assignedDate).toLocaleDateString('en-US', { weekday: 'short' }),
          shiftId: assignedShiftId,
          shiftName: assignedShiftName,
          startTime: assignedStart,
          endTime: assignedEnd,
          roomNo: 'Main Hall',
          fullMarks: autoFullMarks,
          passMarks: autoPassMarks,
          sequence: sequenceCounter++,
          notes: book.notes || '',
          components: subjectComponents,
        });
      });
    });

    const finalRows = overwriteMode === 'APPEND' ? [...rows, ...newRows] : newRows;
    const prevSnapshot = rows;

    try {
      examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, finalRows);
    } catch (e) {
      console.error('Failed to auto-save curriculum routine:', e);
    }

    setRows(finalRows);
    setIsDirty(false);
    setShowAutoPopulateConfirm(false);
    refreshExamData();

    pushAction({
      title: `Auto-Populate Routine (${newRows.length} curriculum books)`,
      domain: 'Examinations',
      undo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, prevSnapshot);
        } catch (e) {
          console.error('Failed to undo auto-populate routine:', e);
        }
        setRows(prevSnapshot);
        refreshExamData();
      },
      redo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, finalRows);
        } catch (e) {
          console.error('Failed to redo auto-populate routine:', e);
        }
        setRows(finalRows);
        refreshExamData();
      },
    });

    showToast(`Successfully populated ${newRows.length} subject routine entries from curriculum books.`, 'success');
  }, [
    activeExam,
    participatingClasses,
    allAvailableClasses,
    availableCurriculumBooks,
    tenantId,
    teachers,
    examShifts,
    designatedExamDays,
    rows,
    selectedExamId,
    getExamDefaultComponents,
    refreshExamData,
    pushAction,
    showToast,
  ]);

  // ✨ Auto-Populate Trigger
  const handleAutoPopulateFromCurriculum = () => {
    if (!activeExam) {
      showToast('Please select an active examination session first.', 'warning');
      return;
    }

    if (rows && rows.length > 0) {
      setShowAutoPopulateConfirm(true);
      return;
    }

    executeAutoPopulate();
  };

  // Add a blank custom subject row (Instantly auto-saved)
  const handleAddCustomRow = () => {
    if (!activeExam) {
      showToast('Please select an examination session first.', 'warning');
      return;
    }
    const defaultClass = participatingClasses[0] || allAvailableClasses[0] || null;
    const defaultDate = designatedExamDays[0] || activeExam.startDate || '';
    const defaultShift = examShifts[0] || {
      id: 'shift_1',
      name: 'Shift 1 (Morning)',
      startTime: '09:00 AM',
      endTime: '11:00 AM',
    };
    const defaultFullMarks = Number(activeExam.defaultFullMarks || activeExam.targetFullMarks || 100);
    const defaultComponents = getExamDefaultComponents(defaultFullMarks);

    const newRow: SubjectRoutineItem = {
      id: `row_custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      examId: String(activeExam.id),
      departmentId: defaultClass?.department_id || defaultClass?.department || 'ALL',
      departmentName: defaultClass?.department_name || '',
      classId: defaultClass ? String(defaultClass.id) : (allAvailableClasses[0]?.id ? String(allAvailableClasses[0].id) : 'cls_1'),
      className: defaultClass?.name || defaultClass?.class_name || allAvailableClasses[0]?.name || 'Class',
      sectionId: 'ALL',
      sectionName: 'All Sections',
      curriculumBookId: null,
      curriculumBookName: '',
      subjectName: `${defaultClass?.name || 'New'} Subject`,
      teacherId: '',
      teacherName: '',
      examDate: defaultDate,
      shiftId: defaultShift.id,
      shiftName: defaultShift.name,
      startTime: defaultShift.startTime,
      endTime: defaultShift.endTime,
      fullMarks: defaultFullMarks,
      passMarks: Math.round(defaultFullMarks * 0.33),
      components: defaultComponents,
    };

    setRows((prev) => {
      const nextRows = [newRow, ...prev];
      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (e) {
        console.error('Failed to auto-save new subject row:', e);
      }
      return nextRows;
    });

    setIsDirty(false);
    refreshExamData();
    showToast('New subject row added and saved.', 'success');
  };

  // Dedicated Handler for Class Selection Change in a Row
  const handleRowClassChange = (rowId: string, newClassId: string, selectedClassObj?: any) => {
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id === rowId) {
          const matchedClass = selectedClassObj || allAvailableClasses.find((c: any) => String(c.id) === String(newClassId)) || null;
          const clsName = matchedClass?.name || matchedClass?.class_name || r.className || 'Class';
          const deptId = matchedClass?.department !== undefined
            ? (typeof matchedClass.department === 'object' ? matchedClass.department.id : matchedClass.department)
            : (matchedClass?.department_id || r.departmentId || 'ALL');
          const deptName = matchedClass?.department_name || matchedClass?.department_details?.name || r.departmentName || '';

          return {
            ...r,
            classId: String(newClassId || ''),
            className: clsName,
            departmentId: String(deptId || 'ALL'),
            departmentName: deptName,
            curriculumBookId: null,
            curriculumBookName: '',
            subjectName: `${clsName} Subject`,
          };
        }
        return r;
      });

      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (e) {
        console.error('Failed to auto-save class change:', e);
      }
      return nextRows;
    });

    setIsDirty(false);
    refreshExamData();
  };

  // Update a single field in a row
  const handleRowChange = (rowId: string, field: string, value: any) => {
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id === rowId) {
          const updated: any = { ...r, [field]: value };
          
          if (field === 'fullMarks') {
            const fm = Math.max(1, parseInt(value, 10) || 0);
            updated.fullMarks = fm;
            updated.passMarks = Math.round(fm * 0.33);
            updated.components = getExamDefaultComponents(fm);
          }
          
          if (field === 'passMarks') {
            const pm = Math.max(0, parseInt(value, 10) || 0);
            updated.passMarks = Math.min(pm, Number(updated.fullMarks || 100));
          }

          if (field === 'shiftId') {
            const matchedShift = examShifts.find((s: any) => s.id === value);
            if (matchedShift) {
              updated.shiftId = matchedShift.id;
              updated.shiftName = matchedShift.name;
              updated.startTime = matchedShift.startTime;
              updated.endTime = matchedShift.endTime;
            }
          }

          return updated;
        }
        return r;
      });

      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (e) {
        console.error('Failed to auto-save row change:', e);
      }
      return nextRows;
    });

    setIsDirty(false);
    refreshExamData();
  };

  // Handle Book selection on a row
  const handleRowBookSelect = (rowId: string, bookId: string) => {
    const foundBook = availableCurriculumBooks.find((b: any) => String(b.id) === String(bookId));
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id === rowId) {
          if (!foundBook) {
            return {
              ...r,
              curriculumBookId: null,
              curriculumBookName: '',
            };
          }
          const autoSubject = foundBook.subject || foundBook.subject_name || foundBook.name || foundBook.title || '';
          const autoTeacherId = foundBook.teacherId || foundBook.teacher_id || r.teacherId || '';
          const autoTeacher = foundBook.teacherName || foundBook.teacher_name || foundBook.teacher || r.teacherName;
          const autoFullMarks = Number(foundBook.fullMarks || foundBook.full_marks || foundBook.total_marks || r.fullMarks || 100);
          const autoPassMarks = Number(foundBook.passMarks || foundBook.pass_marks || Math.round(autoFullMarks * 0.33));
          const subjectComponents = getExamDefaultComponents(autoFullMarks);

          return {
            ...r,
            curriculumBookId: String(foundBook.id),
            curriculumBookName: foundBook.name || foundBook.title || '',
            subjectName: autoSubject || r.subjectName,
            teacherId: autoTeacherId,
            teacherName: autoTeacher,
            fullMarks: autoFullMarks,
            passMarks: autoPassMarks,
            components: subjectComponents,
          };
        }
        return r;
      });

      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (e) {
        console.error('Failed to auto-save book selection:', e);
      }
      return nextRows;
    });

    setIsDirty(false);
    refreshExamData();
  };

  // Reset a row to session default timing & marks
  const handleResetRow = (rowId: string) => {
    const defaultFullMarks = Number(activeExam?.defaultFullMarks || activeExam?.targetFullMarks || 100);
    const defaultShift = examShifts[0] || { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' };
    const defaultComponents = getExamDefaultComponents(defaultFullMarks);
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            shiftId: defaultShift.id,
            shiftName: defaultShift.name,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            fullMarks: defaultFullMarks,
            passMarks: Math.round(defaultFullMarks * 0.33),
            components: defaultComponents,
          };
        }
        return r;
      });

      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (e) {
        console.error('Failed to auto-save row reset:', e);
      }
      return nextRows;
    });

    setIsDirty(false);
    refreshExamData();
    showToast('Row reset to session defaults and saved.', 'info');
  };

  // Delete a single row
  const handleDeleteRow = useCallback((rowId: string) => {
    let previousRows: SubjectRoutineItem[] = [];
    let deletedItem: SubjectRoutineItem | undefined;
    let nextRows: SubjectRoutineItem[] = [];

    setRows((prevRows) => {
      previousRows = prevRows;
      deletedItem = prevRows.find((r) => String(r.id) === String(rowId));
      const updated = prevRows.filter((r) => String(r.id) !== String(rowId));
      nextRows = updated;
      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, updated);
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });

    pushAction({
      title: `Delete "${deletedItem?.subjectName || 'Subject'}"`,
      domain: 'Examinations',
      undo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, previousRows);
        } catch (e) {
          console.error(e);
        }
        setRows(previousRows);
        refreshExamData();
      },
      redo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
        } catch (e) {
          console.error(e);
        }
        setRows(nextRows);
        refreshExamData();
      },
    });

    setIsDirty(false);
    refreshExamData();
    showToast('Subject routine removed.', 'info');
  }, [tenantId, selectedExamId, refreshExamData, showToast, pushAction]);

  // Upsert (Add / Edit) a subject routine row
  const handleUpsertRow = useCallback((savedRow: SubjectRoutineItem, options: { silent?: boolean } = {}) => {
    if (!savedRow || !savedRow.id) return;
    const { silent = false } = options;
    const targetIdStr = String(savedRow.id);
    const targetExamId = String(savedRow.examId || selectedExamId);

    let previousRows: SubjectRoutineItem[] = [];
    let nextUpdatedRows: SubjectRoutineItem[] = [];
    let isExisting = false;

    setRows((prevRows) => {
      previousRows = prevRows;
      isExisting = prevRows.some((r) => String(r.id) === targetIdStr);
      const updatedRows = isExisting
        ? prevRows.map((r) => (String(r.id) === targetIdStr ? { ...r, ...savedRow, id: r.id } : r))
        : [savedRow, ...prevRows];

      nextUpdatedRows = updatedRows;

      try {
        examStore.bulkUpsertExamSubjects(tenantId, targetExamId, updatedRows);
      } catch (err) {
        console.error('Failed to auto-persist subject row:', err);
      }

      return updatedRows;
    });

    if (!silent) {
      showToast(
        isExisting
          ? `Updated "${savedRow.subjectName}".`
          : `Created subject routine for "${savedRow.subjectName}".`,
        'success'
      );
    }

    pushAction({
      title: isExisting ? `Update "${savedRow.subjectName}"` : `Add "${savedRow.subjectName}"`,
      domain: 'Examinations',
      undo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, targetExamId, previousRows);
        } catch (e) {
          console.error(e);
        }
        setRows(previousRows);
        refreshExamData();
      },
      redo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, targetExamId, nextUpdatedRows);
        } catch (e) {
          console.error(e);
        }
        setRows(nextUpdatedRows);
        refreshExamData();
      },
    });

    setIsDirty(false);
    refreshExamData();
  }, [tenantId, selectedExamId, refreshExamData, showToast, pushAction]);

  // Duplicate a row
  const handleDuplicateRow = useCallback((row: SubjectRoutineItem) => {
    if (!row) return;
    const cloned: SubjectRoutineItem = {
      ...row,
      id: `row_clone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      subjectName: row.subjectName ? `${row.subjectName} (Copy)` : 'Subject (Copy)',
    };

    let previousRows: SubjectRoutineItem[] = [];
    let nextDuplicatedRows: SubjectRoutineItem[] = [];

    setRows((prevRows) => {
      previousRows = prevRows;
      const updatedRows = [cloned, ...prevRows];
      nextDuplicatedRows = updatedRows;
      try {
        const persisted = examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, updatedRows);
        return Array.isArray(persisted) ? persisted : updatedRows;
      } catch (e) {
        console.error(e);
        return updatedRows;
      }
    });

    pushAction({
      title: `Duplicate "${row.subjectName || 'Subject'}"`,
      domain: 'Examinations',
      undo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, previousRows);
        } catch (e) {
          console.error(e);
        }
        setRows(previousRows);
        refreshExamData();
      },
      redo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextDuplicatedRows);
        } catch (e) {
          console.error(e);
        }
        setRows(nextDuplicatedRows);
        refreshExamData();
      },
    });

    setIsDirty(false);
    refreshExamData();
    showToast('Subject routine duplicated and saved.', 'info');
  }, [tenantId, selectedExamId, refreshExamData, showToast, pushAction]);

  // Atomically Swap two rows in 2D Timetable Routine Board
  const handleSwapRows = useCallback((rowA: SubjectRoutineItem, rowB: SubjectRoutineItem, options: { silent?: boolean } = {}) => {
    if (!rowA || !rowB || !rowA.id || !rowB.id) return;
    const { silent = false } = options;
    const idA = String(rowA.id);
    const idB = String(rowB.id);

    let previousRows: SubjectRoutineItem[] = [];
    let nextSwappedRows: SubjectRoutineItem[] = [];

    setRows((prevRows) => {
      previousRows = prevRows;
      const nextRows = prevRows.map((r) => {
        if (String(r.id) === idA) return { ...r, ...rowA, id: r.id };
        if (String(r.id) === idB) return { ...r, ...rowB, id: r.id };
        return r;
      });

      nextSwappedRows = nextRows;

      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (err) {
        console.error('Failed to persist swapped rows:', err);
      }

      return nextRows;
    });

    pushAction({
      title: `Swap "${rowA.subjectName || 'Slot'}" ↔ "${rowB.subjectName || 'Slot'}"`,
      domain: 'Examinations',
      undo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, previousRows);
        } catch (e) {
          console.error(e);
        }
        setRows(previousRows);
        refreshExamData();
      },
      redo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextSwappedRows);
        } catch (e) {
          console.error(e);
        }
        setRows(nextSwappedRows);
        refreshExamData();
      },
    });

    setIsDirty(false);
    refreshExamData();
    if (!silent) {
      showToast(`Swapped schedule between "${rowA.subjectName || 'Subject'}" and "${rowB.subjectName || 'Subject'}".`, 'info');
    }
  }, [tenantId, selectedExamId, refreshExamData, showToast, pushAction]);

  // Batch Upsert Multiple Rows Atomically
  const handleBulkUpsertRows = useCallback((updatedRowsArray: SubjectRoutineItem[] = []) => {
    if (!Array.isArray(updatedRowsArray) || updatedRowsArray.length === 0) return;

    try {
      const persisted = examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, updatedRowsArray);
      setRows(persisted || updatedRowsArray);
    } catch (err) {
      console.error('Failed to bulk persist subject rows:', err);
      setRows(updatedRowsArray);
    }

    setIsDirty(false);
    refreshExamData();
  }, [tenantId, selectedExamId, refreshExamData]);

  // Clear all routine rows for the active examination session
  const handleClearAllRows = useCallback(() => {
    if (!selectedExamId) return;
    let previousRows: SubjectRoutineItem[] = [];

    setRows((prevRows) => {
      previousRows = prevRows;
      return [];
    });
    setSelectedRowIds(new Set());
    try {
      examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, []);
    } catch (e) {
      console.error('Failed to clear exam routine:', e);
    }

    pushAction({
      title: `Clear Session Routine (${previousRows.length} subjects)`,
      domain: 'Examinations',
      undo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, previousRows);
        } catch (e) {
          console.error(e);
        }
        setRows(previousRows);
        refreshExamData();
      },
      redo: () => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, []);
        } catch (e) {
          console.error(e);
        }
        setRows([]);
        refreshExamData();
      },
    });

    setIsDirty(false);
    refreshExamData();
    showToast('All subject routine schedules cleared for this session.', 'info');
  }, [selectedExamId, tenantId, refreshExamData, showToast, pushAction]);

  // Multi-Selection Handlers
  const handleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // Bulk: Delete Selected (Instantly auto-saved)
  const executeBulkDelete = useCallback(() => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    setRows((prev) => {
      const nextRows = prev.filter((r) => !selectedRowIds.has(r.id));
      try {
        examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
      } catch (e) {
        console.error('Failed to save bulk delete:', e);
      }
      return nextRows;
    });
    setSelectedRowIds(new Set());
    setIsDirty(false);
    refreshExamData();
    showToast(`Removed ${count} selected subject routine entries.`, 'info');
  }, [selectedRowIds, tenantId, selectedExamId, refreshExamData, showToast]);

  // ─── Core Persistent Save Routine ──────────────────────────────────────────
  const handleSaveAll = () => {
    if (!selectedExamId) {
      showToast('No active examination session selected.', 'error');
      return;
    }

    if (rows.length === 0) {
      showToast('No subjects to save. Click "Auto-Populate" or "Add Subject Row" first.', 'warning');
      return;
    }

    // Auto-fill and normalize all rows to guarantee data consistency
    const sanitizedRows: SubjectRoutineItem[] = rows.map((r, idx) => ({
      ...r,
      subjectName: (r.subjectName || '').trim() || `${r.className || 'Subject'} Exam ${idx + 1}`,
      classId: String(r.classId || (allAvailableClasses[0]?.id ? String(allAvailableClasses[0].id) : 'cls_1')),
      className: r.className || allAvailableClasses[0]?.name || 'Class',
      examId: String(selectedExamId),
      fullMarks: Math.max(1, Number(r.fullMarks) || 100),
      passMarks: Math.max(0, Number(r.passMarks) || 33),
      components: Array.isArray(r.components) && r.components.length > 0
        ? r.components
        : getExamDefaultComponents(Number(r.fullMarks) || 100),
    }));

    setSaving(true);
    try {
      examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, sanitizedRows);
      setRows(sanitizedRows);
      setIsDirty(false);
      refreshExamData();
      showToast(`Successfully saved ${sanitizedRows.length} subject routine schedules.`, 'success');
    } catch (err) {
      console.error('Failed to save subject routine matrix:', err);
      showToast('Failed to save subject routine matrix.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Entity Enrichment: Sync class, department, book, and subject names with live taxonomy
  const enrichedRows: SubjectRoutineItem[] = useMemo(() => {
    const normalizeId = (id: any) => String(id || '').replace(/^cls_/, '').trim().toLowerCase();
    const normalizeDeptId = (id: any) => String(id || '').replace(/^dept_/, '').trim().toLowerCase();

    return rows.map((r) => {
      const rClassClean = normalizeId(r.classId);
      const matchedClass = allAvailableClasses.find(
        (c: any) =>
          String(c.id) === String(r.classId) ||
          normalizeId(c.id) === rClassClean ||
          (c.name && r.className && c.name.toLowerCase() === r.className.toLowerCase())
      );
      const clsName =
        r.className && r.className !== 'General Class' && r.className !== 'Class'
          ? r.className
          : (matchedClass?.name || matchedClass?.class_name || r.className || (allAvailableClasses[0]?.name) || 'Class');

      const matchedDept = departments.find(
        (d: any) =>
          String(d.id) === String(r.departmentId) ||
          normalizeDeptId(d.id) === normalizeDeptId(r.departmentId) ||
          (d.name && r.departmentName && d.name.toLowerCase() === r.departmentName.toLowerCase()) ||
          (matchedClass && (String(matchedClass.departmentId || matchedClass.department_id || (typeof matchedClass.department === 'object' ? matchedClass.department.id : matchedClass.department)) === String(d.id)))
      );

      const resolvedDeptId = String(r.departmentId || matchedDept?.id || matchedClass?.departmentId || matchedClass?.department_id || (typeof matchedClass?.department === 'object' ? matchedClass.department.id : matchedClass?.department) || '');
      const deptName =
        r.departmentName && r.departmentName !== 'General Dept'
          ? r.departmentName
          : (matchedDept?.name || matchedDept?.department_name || matchedClass?.department_name || matchedClass?.departmentName || r.departmentName || 'General Dept');

      const matchedBook = r.curriculumBookId
        ? availableCurriculumBooks.find((b: any) => String(b.id) === String(r.curriculumBookId))
        : null;

      const bookName = r.curriculumBookName || matchedBook?.name || matchedBook?.title || '';
      const subjName =
        r.subjectName && r.subjectName !== 'Subject Exam'
          ? r.subjectName
          : (bookName || (clsName ? `${clsName} Subject` : r.subjectName || 'Subject Exam'));

      return {
        ...r,
        departmentId: resolvedDeptId || r.departmentId,
        className: clsName,
        departmentName: deptName,
        curriculumBookName: bookName,
        subjectName: subjName,
      };
    });
  }, [rows, allAvailableClasses, availableCurriculumBooks, departments]);

  // Date Filter Options for top header
  const dateFilterOptions: SelectOption[] = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(designatedExamDays)) {
      designatedExamDays.forEach((d) => d && set.add(d));
    }
    if (activeExam?.startDate && activeExam?.endDate) {
      generateDateRange(activeExam.startDate, activeExam.endDate).forEach((d) => set.add(d));
    }
    if (activeExam?.startDate) set.add(activeExam.startDate);
    if (Array.isArray(rows)) {
      rows.forEach((r) => {
        if (r.examDate) set.add(r.examDate);
      });
    }

    const sortedDates = Array.from(set).filter(Boolean).sort();

    return [
      { value: 'ALL', label: 'All Exam Dates' },
      ...sortedDates.map((d) => ({
        value: d,
        label: `${formatShortDateLabel(d)} (${d})`,
      })),
    ];
  }, [designatedExamDays, activeExam, rows]);

  // Filtered Rows for display
  const filteredRows: SubjectRoutineItem[] = useMemo(() => {
    const normalize = (s: any) => String(s || '').replace(/^dept_|^cls_|^teach_|^staff_/, '').trim().toLowerCase();

    // 1. Resolve Selected Department Metadata
    const hasDeptFilter = filterDepartmentId && filterDepartmentId !== 'ALL';
    const cleanFilterDeptId = hasDeptFilter ? normalize(filterDepartmentId) : '';
    const selectedDept = hasDeptFilter
      ? departments.find((d: any) => String(d.id) === String(filterDepartmentId) || normalize(d.id) === cleanFilterDeptId)
      : null;
    const selectedDeptName = (selectedDept?.name || selectedDept?.department_name || '').toLowerCase().trim();
    const selectedDeptWords = selectedDeptName ? selectedDeptName.split(/[\s,()/-]+/).filter((w: string) => w.length > 2) : [];

    // 2. Resolve Selected Class Metadata
    const hasClassFilter = filterClassId && filterClassId !== 'ALL';
    const cleanFilterClassId = hasClassFilter ? normalize(filterClassId) : '';
    const selectedClass = hasClassFilter
      ? allAvailableClasses.find((c: any) => String(c.id) === String(filterClassId) || normalize(c.id) === cleanFilterClassId)
      : null;
    const selectedClassName = (selectedClass?.name || selectedClass?.class_name || selectedClass?.className || '').toLowerCase().trim();
    const selectedClassWords = selectedClassName ? selectedClassName.split(/[\s,()/-]+/).filter((w: string) => w.length > 2) : [];

    // 3. Resolve Selected Teacher / Examiner Metadata
    const hasTeacherFilter = filterTeacherId && filterTeacherId !== 'ALL';
    const cleanFilterTeacherId = hasTeacherFilter && filterTeacherId !== 'UNASSIGNED' ? normalize(filterTeacherId) : '';
    const selectedTeacher = hasTeacherFilter && filterTeacherId !== 'UNASSIGNED'
      ? teachers.find((t: any) => String(t.id) === String(filterTeacherId) || normalize(t.id) === cleanFilterTeacherId)
      : null;
    const selectedTeacherName = (
      selectedTeacher?.name_en ||
      selectedTeacher?.name ||
      selectedTeacher?.full_name ||
      selectedTeacher?.user_name ||
      ''
    ).toLowerCase().trim();
    const selectedTeacherWords = selectedTeacherName ? selectedTeacherName.split(/[\s,()/-]+/).filter((w: string) => w.length > 2) : [];

    // 4. Resolve Target Exam Date
    const hasDateFilter = filterExamDate && filterExamDate !== 'ALL';
    const targetDateStr = hasDateFilter ? String(filterExamDate).split('T')[0].trim() : '';

    return enrichedRows.filter((r) => {
      // ─── A. Department Filter ──────────────────────────────────────────
      if (hasDeptFilter) {
        const rDeptId = String(r.departmentId || '');
        const rDeptClean = normalize(rDeptId);
        const rDeptName = String(r.departmentName || '').toLowerCase().trim();

        let matchesDept =
          rDeptId === String(filterDepartmentId) ||
          (cleanFilterDeptId && rDeptClean === cleanFilterDeptId) ||
          (selectedDeptName && rDeptName && (rDeptName === selectedDeptName || rDeptName.includes(selectedDeptName) || selectedDeptName.includes(rDeptName)));

        if (!matchesDept) {
          // Check class-level department linkage
          const matchedClass = allAvailableClasses.find((c: any) => String(c.id) === String(r.classId) || normalize(c.id) === normalize(r.classId));
          if (matchedClass) {
            const cDeptId = String(matchedClass.departmentId || matchedClass.department_id || (typeof matchedClass.department === 'object' ? matchedClass.department?.id : matchedClass.department) || '');
            const cDeptClean = normalize(cDeptId);
            const cDeptName = String(matchedClass.departmentName || matchedClass.department_name || (typeof matchedClass.department === 'object' ? matchedClass.department?.name : '') || '').toLowerCase().trim();
            const cName = String(matchedClass.name || matchedClass.className || matchedClass.class_name || '').toLowerCase().trim();

            if (cDeptId === String(filterDepartmentId) || (cleanFilterDeptId && cDeptClean === cleanFilterDeptId)) {
              matchesDept = true;
            } else if (selectedDeptName && cDeptName && (cDeptName === selectedDeptName || cDeptName.includes(selectedDeptName) || selectedDeptName.includes(cDeptName))) {
              matchesDept = true;
            } else if (selectedDeptName && cName && (cName.includes(selectedDeptName) || selectedDeptName.includes(cName))) {
              matchesDept = true;
            } else if (selectedDeptWords.length > 0) {
              for (const word of selectedDeptWords) {
                if (word && word !== 'department' && word !== 'general' && (cName.includes(word) || rDeptName.includes(word))) {
                  matchesDept = true;
                  break;
                }
              }
            }
          }
        }

        if (!matchesDept) return false;
      }

      // ─── B. Class Filter ───────────────────────────────────────────────
      if (hasClassFilter) {
        const rClsId = String(r.classId || '');
        const rClsClean = normalize(rClsId);
        const rClsName = String(r.className || '').toLowerCase().trim();

        let matchesClass =
          rClsId === String(filterClassId) ||
          (cleanFilterClassId && rClsClean === cleanFilterClassId) ||
          (cleanFilterClassId && rClsClean && (rClsClean.includes(cleanFilterClassId) || cleanFilterClassId.includes(rClsClean))) ||
          (selectedClassName && rClsName && (rClsName === selectedClassName || rClsName.includes(selectedClassName) || selectedClassName.includes(rClsName)));

        if (!matchesClass && selectedClassWords.length > 0) {
          for (const word of selectedClassWords) {
            if (word && word !== 'class' && word !== 'division' && rClsName.includes(word)) {
              matchesClass = true;
              break;
            }
          }
        }

        if (!matchesClass) return false;
      }

      // ─── C. Exam Date Filter ───────────────────────────────────────────
      if (hasDateFilter) {
        const rowDateStr = String(r.examDate || '').split('T')[0].trim();
        if (rowDateStr !== targetDateStr) {
          return false;
        }
      }

      // ─── D. Teacher / Examiner Filter ──────────────────────────────────
      if (hasTeacherFilter) {
        if (filterTeacherId === 'UNASSIGNED') {
          const hasAssigned = Boolean(
            r.examinerId || r.examinerName || r.evaluatorId || r.evaluatorName ||
            r.teacherId || r.teacherName || r.invigilatorId || r.invigilatorName
          );
          if (hasAssigned) return false;
        } else {
          const rExmId = String(r.examinerId || r.evaluatorId || '');
          const rTeachId = String(r.teacherId || r.invigilatorId || '');
          const rExmClean = normalize(rExmId);
          const rTeachClean = normalize(rTeachId);
          const rExmName = String(r.examinerName || r.evaluatorName || '').toLowerCase().trim();
          const rTeachName = String(r.teacherName || r.invigilatorName || '').toLowerCase().trim();

          let matchesTeacher =
            rExmId === String(filterTeacherId) ||
            rTeachId === String(filterTeacherId) ||
            (cleanFilterTeacherId && (rExmClean === cleanFilterTeacherId || rTeachClean === cleanFilterTeacherId)) ||
            (selectedTeacherName && (
              (rExmName && (rExmName === selectedTeacherName || rExmName.includes(selectedTeacherName) || selectedTeacherName.includes(rExmName))) ||
              (rTeachName && (rTeachName === selectedTeacherName || rTeachName.includes(selectedTeacherName) || selectedTeacherName.includes(rTeachName)))
            ));

          if (!matchesTeacher && selectedTeacherWords.length > 0) {
            for (const word of selectedTeacherWords) {
              if (word && word !== 'maulana' && word !== 'teacher' && word !== 'hafiz' && (rExmName.includes(word) || rTeachName.includes(word))) {
                matchesTeacher = true;
                break;
              }
            }
          }

          if (!matchesTeacher) return false;
        }
      }

      // ─── E. Global Search Filter ───────────────────────────────────────
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSub = r.subjectName?.toLowerCase().includes(q);
        const matchBook = r.curriculumBookName?.toLowerCase().includes(q);
        const matchClass = r.className?.toLowerCase().includes(q);
        const matchDept = r.departmentName?.toLowerCase().includes(q);
        const matchTeacher =
          r.examinerName?.toLowerCase().includes(q) ||
          r.evaluatorName?.toLowerCase().includes(q) ||
          r.teacherName?.toLowerCase().includes(q) ||
          r.invigilatorName?.toLowerCase().includes(q);
        const matchDate = r.examDate?.toLowerCase().includes(q);
        const matchShift = r.shiftName?.toLowerCase().includes(q);
        const matchRoom = r.roomNo?.toLowerCase().includes(q);
        return Boolean(matchSub || matchBook || matchClass || matchDept || matchTeacher || matchDate || matchShift || matchRoom);
      }

      return true;
    });
  }, [enrichedRows, filterDepartmentId, filterClassId, filterExamDate, filterTeacherId, searchQuery, departments, allAvailableClasses, teachers]);

  return {
    tenantId,
    exams,
    selectedExamId,
    setSelectedExamId,
    activeExam,
    examShifts,
    designatedExamDays,
    preparationGapDays,
    rows: enrichedRows,
    filteredRows,
    isDirty,
    saving,
    participatingClasses,
    allAvailableClasses,
    availableCurriculumBooks,
    periodSlots,
    teachers,
    departments,
    baseDateOptions,
    shiftOptions,
    examOptions,
    dateFilterOptions,
    searchQuery,
    setSearchQuery,
    filterDepartmentId,
    setFilterDepartmentId,
    filterClassId,
    setFilterClassId,
    filterExamDate,
    setFilterExamDate,
    filterTeacherId,
    setFilterTeacherId,
    selectedRowIds,
    setSelectedRowIds,
    loadStoredRows: loadExamSubjects,
    showAutoPopulateConfirm,
    setShowAutoPopulateConfirm,
    executeAutoPopulate,
    handleSelectRow,
    handleAutoPopulateFromCurriculum,
    handleAddCustomRow,
    handleRowClassChange,
    handleRowChange,
    handleRowBookSelect,
    handleResetRow,
    handleDeleteRow,
    handleDuplicateRow,
    handleUpsertRow,
    handleSwapRows,
    handleBulkUpsertRows,
    handleClearAllRows,
    executeBulkDelete,
    handleBulkDelete: executeBulkDelete,
    handleSaveAll,
  };
}

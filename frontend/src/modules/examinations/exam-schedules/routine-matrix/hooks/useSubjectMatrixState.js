import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { fetchWithAuth } from '../../../../../utils/authService';
import { examStore } from '../../../../../utils/stores/examStore';
import { curriculumStore } from '../../../../../utils/stores/academicStore';
import useExamData from '../../../hooks/useExamData';

/**
 * Helper to generate an array of YYYY-MM-DD strings between two dates
 */
const generateDateRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatShortDateLabel = (dateStr) => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayName = DAY_NAMES[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  const dayNum = d.getDate();
  return `${dayName}, ${dayNum} ${monthName}`;
};

/**
 * useSubjectMatrixState
 * Central state management hook for Subject Routine Matrix workspace.
 */
export default function useSubjectMatrixState({ initialExamId = null } = {}) {
  const { showToast } = useToast();
  const {
    tenantId,
    exams = [],
    classes = [],
    curriculumBooks = [],
    refreshExamData,
  } = useExamData();

  // Active Exam Session Context
  const [selectedExamId, setSelectedExamId] = useState(() => {
    if (initialExamId) return String(initialExamId);
    return exams.length > 0 ? String(exams[0].id) : '';
  });

  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(String(initialExamId));
    } else if ((!selectedExamId || !exams.some((e) => String(e.id) === String(selectedExamId))) && exams.length > 0) {
      setSelectedExamId(String(exams[0].id));
    }
  }, [initialExamId, exams, selectedExamId]);

  const activeExam = useMemo(() => {
    return exams.find((e) => String(e.id) === String(selectedExamId)) || (exams.length > 0 ? exams[0] : null);
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
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      return activeExam.scheduleDays
        .filter((d) => d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK')
        .map((d) => d.date);
    }
    if (activeExam?.startDate && activeExam?.endDate) {
      return generateDateRange(activeExam.startDate, activeExam.endDate);
    }
    return [];
  }, [activeExam]);

  const preparationGapDays = useMemo(() => {
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      return activeExam.scheduleDays
        .filter((d) => d.type === 'PREPARATION_GAP' || d.type === 'EXAM_BREAK')
        .map((d) => d.date);
    }
    return [];
  }, [activeExam]);

  // Routine Rows State (Drafted & Active)
  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load staff / teachers roster for invigilator allocation
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/staff/?page_size=500');
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setTeachers(list);
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
    const handleBeforeUnload = (e) => {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('ALL');
  const [filterClassId, setFilterClassId] = useState('ALL');
  const [filterExamDate, setFilterExamDate] = useState('ALL');
  const [filterTeacherId, setFilterTeacherId] = useState('ALL');

  // Selected row IDs for Bulk Actions
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Exam Options for top switcher
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Academic Year'})${e.startDate ? ` — [${e.startDate} to ${e.endDate}]` : ''}`,
      exam: e,
    }));
  }, [exams]);

  // Participating Classes in the active exam
  const participatingClasses = useMemo(() => {
    if (!activeExam) return classes;
    if (activeExam.targetClassIds && Array.isArray(activeExam.targetClassIds) && activeExam.targetClassIds.length > 0) {
      return classes.filter((c) => activeExam.targetClassIds.map(String).includes(String(c.id)));
    }
    return classes;
  }, [activeExam, classes]);

  // All Available Classes (Combined & Deduplicated)
  const allAvailableClasses = useMemo(() => {
    const fromParticipating = participatingClasses || [];
    const fromAll = classes || [];
    const combined = [...fromParticipating, ...fromAll];
    const seen = new Set();
    return combined.filter((c) => {
      if (!c || !c.id || seen.has(String(c.id))) return false;
      seen.add(String(c.id));
      return true;
    });
  }, [participatingClasses, classes]);

  // Available Curriculum Books for the Exam
  const availableCurriculumBooks = useMemo(() => {
    const fromTenant = curriculumStore.getItems(tenantId) || [];
    const fromDefault = tenantId !== 'default' ? curriculumStore.getItems('default') || [] : [];
    const combined = [...fromTenant, ...fromDefault, ...(curriculumBooks || [])];
    const seen = new Set();
    return combined.filter((item) => {
      if (!item || !item.id || seen.has(String(item.id))) return false;
      seen.add(String(item.id));
      return true;
    });
  }, [tenantId, curriculumBooks]);

  // Helper to build default components based on activeExam
  const getExamDefaultComponents = useCallback((fullMarksNum = 100) => {
    if (Array.isArray(activeExam?.defaultComponents) && activeExam.defaultComponents.length > 0) {
      const sumBaseline = activeExam.defaultComponents.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0) || 100;
      const scaled = activeExam.defaultComponents.map((c) => ({
        id: c.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: c.name || 'Component',
        maxMarks: Math.round(((Number(c.maxMarks) || 0) / sumBaseline) * fullMarksNum),
      }));
      const currentSum = scaled.reduce((s, c) => s + c.maxMarks, 0);
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
    return examShifts.map((s) => ({
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

    return days.map((d, idx) => ({
      value: d,
      label: `${formatShortDateLabel(d)} (Day ${idx + 1})`,
    }));
  }, [designatedExamDays, activeExam]);

  // State for confirm overwrite modal
  const [showAutoPopulateConfirm, setShowAutoPopulateConfirm] = useState(false);

  // ✨ Execute Auto-Populate Routine from Curriculum Books
  const executeAutoPopulate = useCallback(() => {
    if (!activeExam) {
      showToast('Please select an active examination session first.', 'warning');
      return;
    }

    const targetClasses = participatingClasses.length > 0 ? participatingClasses : allAvailableClasses;
    if (targetClasses.length === 0) {
      showToast('No participating classes configured for this exam session.', 'warning');
      return;
    }

    const defaultFullMarks = Number(activeExam.defaultFullMarks || activeExam.targetFullMarks || 100);

    // Prepare teacher pool for random / balanced invigilator distribution
    const teachingStaff = teachers.filter((t) => {
      const type = t.staff_type || t.type;
      return !type || type === 'TEACHING';
    });

    const fallbackFaculty = [
      { id: 'teach_101', name: 'Maulana Abdur Rahman' },
      { id: 'teach_102', name: 'Mufti Mahmud Hasan' },
      { id: 'teach_103', name: 'Qari Sirajul Islam' },
      { id: 'teach_104', name: 'Maulana Ibrahim Khalil' },
      { id: 'teach_105', name: 'Ustadh Tariqul Islam' },
      { id: 'teach_106', name: 'Maulana Aminul Islam' },
      { id: 'teach_107', name: 'Mufti Nurul Huda' },
      { id: 'teach_108', name: 'Ustadh Anwar Hossain' },
    ];

    const teacherPool = teachingStaff.length > 0
      ? teachingStaff.map((t) => ({
          id: String(t.id),
          name: t.name_en || t.name || t.full_name || t.user_name || 'Teacher',
        }))
      : fallbackFaculty;

    // Generate ordered schedule slots respecting dynamic shifts per day
    const examSlots = [];
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      activeExam.scheduleDays.forEach((d) => {
        if (d.type !== 'PREPARATION_GAP' && d.type !== 'EXAM_BREAK') {
          const shiftCount = typeof d.shiftCount === 'number'
            ? Math.max(1, Math.min(d.shiftCount, examShifts.length))
            : (d.type === 'DUAL_EXAM' ? Math.min(2, examShifts.length) : 1);
          
          const applicableShifts = examShifts.slice(0, shiftCount);
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
      const fallbackDates = designatedExamDays.length > 0 ? designatedExamDays : [activeExam.startDate || ''];
      fallbackDates.forEach((dt) => {
        examShifts.forEach((shift) => {
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

    const newRows = [];

    targetClasses.forEach((cls) => {
      const clsIdStr = String(cls.id);
      const clsName = cls.name || cls.class_name || 'Class';
      const clsDeptId = cls.department !== undefined ? (typeof cls.department === 'object' ? cls.department.id : cls.department) : (cls.department_id || '');

      // Find matching curriculum books for this class
      const classBooks = availableCurriculumBooks.filter((b) => {
        const bClassId = String(b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || '').trim();
        const bClassName = String(b.className || b.class_name || '').toLowerCase().trim();
        const targetNameClean = clsName.toLowerCase().trim();

        if (bClassId && (bClassId === clsIdStr || clsIdStr.includes(bClassId))) return true;
        if (targetNameClean && bClassName && (bClassName === targetNameClean || bClassName.includes(targetNameClean) || targetNameClean.includes(bClassName))) return true;
        return false;
      });

      if (classBooks.length > 0) {
        let slotIndex = 0;
        classBooks.forEach((book) => {
          const autoSubject = book.subject || book.subject_name || book.name || book.title || 'Subject';
          
          // Initial teacher allocation: respect existing teacher or randomly pick from teacherPool
          let autoTeacherId = book.teacherId || book.teacher_id || '';
          let autoTeacher = book.teacherName || book.teacher_name || book.teacher || '';
          if (!autoTeacherId || !autoTeacher) {
            const randomTeacher = teacherPool[Math.floor(Math.random() * teacherPool.length)];
            autoTeacherId = randomTeacher.id;
            autoTeacher = randomTeacher.name;
          }

          const autoFullMarks = Number(book.fullMarks || book.full_marks || book.total_marks || defaultFullMarks);
          const autoPassMarks = Number(book.passMarks || book.pass_marks || Math.round(autoFullMarks * 0.33));
          
          const currentSlot = examSlots[slotIndex % examSlots.length];
          const assignedDate = currentSlot.date;
          const assignedShiftId = currentSlot.shiftId;
          const assignedShiftName = currentSlot.shiftName;
          const assignedStart = currentSlot.startTime;
          const assignedEnd = currentSlot.endTime;

          const subjectComponents = getExamDefaultComponents(autoFullMarks);

          newRows.push({
            id: `row_auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            examId: String(activeExam.id),
            departmentId: String(clsDeptId || 'ALL'),
            departmentName: cls.department_name || '',
            classId: clsIdStr,
            className: clsName,
            sectionId: 'ALL',
            sectionName: 'All Sections',
            curriculumBookId: String(book.id),
            curriculumBookName: book.name || book.title || '',
            subjectName: autoSubject,
            teacherId: autoTeacherId,
            teacherName: autoTeacher,
            examDate: assignedDate,
            shiftId: assignedShiftId,
            shiftName: assignedShiftName,
            startTime: assignedStart,
            endTime: assignedEnd,
            fullMarks: autoFullMarks,
            passMarks: autoPassMarks,
            components: subjectComponents,
          });

          slotIndex++;
        });
      } else {
        const currentSlot = examSlots[0] || {
          date: activeExam.startDate || '',
          shiftId: examShifts[0]?.id || 'shift_1',
          shiftName: examShifts[0]?.name || 'Shift 1 (Morning)',
          startTime: examShifts[0]?.startTime || '09:00 AM',
          endTime: examShifts[0]?.endTime || '11:00 AM',
        };

        const fallbackComponents = getExamDefaultComponents(defaultFullMarks);
        const randomTeacher = teacherPool[Math.floor(Math.random() * teacherPool.length)];

        newRows.push({
          id: `row_auto_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          examId: String(activeExam.id),
          departmentId: String(clsDeptId || 'ALL'),
          departmentName: cls.department_name || '',
          classId: clsIdStr,
          className: clsName,
          sectionId: 'ALL',
          sectionName: 'All Sections',
          curriculumBookId: null,
          curriculumBookName: '',
          subjectName: `${clsName} Subject`,
          teacherId: randomTeacher.id,
          teacherName: randomTeacher.name,
          examDate: currentSlot.date,
          shiftId: currentSlot.shiftId,
          shiftName: currentSlot.shiftName,
          startTime: currentSlot.startTime,
          endTime: currentSlot.endTime,
          fullMarks: defaultFullMarks,
          passMarks: Math.round(defaultFullMarks * 0.33),
          components: fallbackComponents,
        });
      }
    });

    try {
      examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, newRows);
    } catch (e) {
      console.error('Failed to auto-save curriculum routine:', e);
    }

    setRows(newRows);
    setIsDirty(false);
    setShowAutoPopulateConfirm(false);
    refreshExamData();
    showToast(`Generated and saved ${newRows.length} subject routine entries from curriculum with invigilators assigned.`, 'success');
  }, [
    activeExam,
    participatingClasses,
    allAvailableClasses,
    teachers,
    examShifts,
    designatedExamDays,
    availableCurriculumBooks,
    getExamDefaultComponents,
    tenantId,
    selectedExamId,
    refreshExamData,
    showToast,
  ]);

  // ✨ Auto-Populate Trigger (Checks for existing rows and prompts confirmation if needed)
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

    const newRow = {
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
  const handleRowClassChange = (rowId, newClassId, selectedClassObj) => {
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id === rowId) {
          const matchedClass = selectedClassObj || allAvailableClasses.find((c) => String(c.id) === String(newClassId)) || null;
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
  const handleRowChange = (rowId, field, value) => {
    setRows((prev) => {
      const nextRows = prev.map((r) => {
        if (r.id === rowId) {
          const updated = { ...r, [field]: value };
          
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
            const matchedShift = examShifts.find((s) => s.id === value);
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
  const handleRowBookSelect = (rowId, bookId) => {
    const foundBook = availableCurriculumBooks.find((b) => String(b.id) === String(bookId));
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
  const handleResetRow = (rowId) => {
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
  const handleDeleteRow = useCallback((rowId) => {
    setRows((prevRows) => {
      const updated = prevRows.filter((r) => String(r.id) !== String(rowId));
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
    setIsDirty(false);
    refreshExamData();
    showToast('Subject routine removed.', 'info');
  }, [tenantId, selectedExamId, refreshExamData, showToast]);

  // Upsert (Add / Edit) a subject routine row
  const handleUpsertRow = useCallback((savedRow) => {
    if (!savedRow || !savedRow.id) return;
    const targetIdStr = String(savedRow.id);
    const targetExamId = String(savedRow.examId || selectedExamId);

    setRows((prevRows) => {
      const isExisting = prevRows.some((r) => String(r.id) === targetIdStr);
      const updatedRows = isExisting
        ? prevRows.map((r) => (String(r.id) === targetIdStr ? { ...r, ...savedRow, id: r.id } : r))
        : [savedRow, ...prevRows];

      // Schedule persistence outside of state updater
      setTimeout(() => {
        try {
          examStore.bulkUpsertExamSubjects(tenantId, targetExamId, updatedRows);
        } catch (err) {
          console.error('Failed to auto-persist subject row:', err);
        }
      }, 0);

      showToast(
        isExisting
          ? `Updated "${savedRow.subjectName}".`
          : `Created subject routine for "${savedRow.subjectName}".`,
        'success'
      );

      return updatedRows;
    });

    setIsDirty(false);
  }, [tenantId, selectedExamId, showToast]);

  // Duplicate a row
  const handleDuplicateRow = useCallback((row) => {
    if (!row) return;
    const cloned = {
      ...row,
      id: `row_clone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      subjectName: row.subjectName ? `${row.subjectName} (Copy)` : 'Subject (Copy)',
    };
    setRows((prevRows) => {
      const updatedRows = [cloned, ...prevRows];
      try {
        const persisted = examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, updatedRows);
        return Array.isArray(persisted) ? persisted : updatedRows;
      } catch (e) {
        console.error(e);
        return updatedRows;
      }
    });
    setIsDirty(false);
    refreshExamData();
    showToast('Subject routine duplicated and saved.', 'info');
  }, [tenantId, selectedExamId, refreshExamData, showToast]);

  // Multi-Selection Handlers
  const handleSelectRow = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // Bulk: Delete Selected (Instantly auto-saved)
  const handleBulkDelete = () => {
    if (selectedRowIds.size === 0) return;
    if (window.confirm(`Delete ${selectedRowIds.size} selected subject routine entries?`)) {
      setRows((prev) => {
        const nextRows = prev.filter((r) => !selectedRowIds.has(r.id));
        try {
          examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, nextRows);
        } catch (e) {
          console.error(e);
        }
        return nextRows;
      });
      setSelectedRowIds(new Set());
      setIsDirty(false);
      refreshExamData();
      showToast('Selected entries removed and saved.', 'info');
    }
  };

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
    const sanitizedRows = rows.map((r, idx) => ({
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
  const enrichedRows = useMemo(() => {
    return rows.map((r) => {
      const matchedClass = allAvailableClasses.find(
        (c) => String(c.id) === String(r.classId)
      );
      const clsName =
        r.className && r.className !== 'General Class' && r.className !== 'Class'
          ? r.className
          : (matchedClass?.name || matchedClass?.class_name || r.className || (allAvailableClasses[0]?.name) || 'Class');
      
      const deptName =
        r.departmentName && r.departmentName !== 'General Dept'
          ? r.departmentName
          : (matchedClass?.department_name || matchedClass?.departmentName || r.departmentName || 'General Dept');

      const matchedBook = r.curriculumBookId
        ? availableCurriculumBooks.find((b) => String(b.id) === String(r.curriculumBookId))
        : null;

      const bookName = r.curriculumBookName || matchedBook?.name || matchedBook?.title || '';
      const subjName =
        r.subjectName && r.subjectName !== 'Subject Exam'
          ? r.subjectName
          : (bookName || (clsName ? `${clsName} Subject` : r.subjectName || 'Subject Exam'));

      return {
        ...r,
        className: clsName,
        departmentName: deptName,
        curriculumBookName: bookName,
        subjectName: subjName,
      };
    });
  }, [rows, allAvailableClasses, availableCurriculumBooks]);

  // Date Filter Options for top header
  const dateFilterOptions = useMemo(() => {
    const days = designatedExamDays.length > 0
      ? designatedExamDays
      : (activeExam?.startDate && activeExam?.endDate ? generateDateRange(activeExam.startDate, activeExam.endDate) : []);

    return [
      { value: 'ALL', label: 'All Exam Dates' },
      ...days.map((d) => ({
        value: d,
        label: `${formatShortDateLabel(d)} (${d})`,
      })),
    ];
  }, [designatedExamDays, activeExam]);

  // Filtered Rows for display
  const filteredRows = useMemo(() => {
    return enrichedRows.filter((r) => {
      if (filterDepartmentId !== 'ALL' && String(r.departmentId) !== String(filterDepartmentId)) {
        return false;
      }
      if (filterClassId !== 'ALL' && String(r.classId) !== String(filterClassId)) {
        return false;
      }
      if (filterExamDate !== 'ALL' && String(r.examDate) !== String(filterExamDate)) {
        return false;
      }
      if (filterTeacherId !== 'ALL') {
        if (filterTeacherId === 'UNASSIGNED') {
          if (r.teacherId || r.teacherName) return false;
        } else if (String(r.teacherId) !== String(filterTeacherId)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = r.subjectName?.toLowerCase().includes(q);
        const matchBook = r.curriculumBookName?.toLowerCase().includes(q);
        const matchClass = r.className?.toLowerCase().includes(q);
        const matchTeacher = r.teacherName?.toLowerCase().includes(q);
        const matchRoom = r.roomNo?.toLowerCase().includes(q);
        return matchSub || matchBook || matchClass || matchTeacher || matchRoom;
      }
      return true;
    });
  }, [enrichedRows, filterDepartmentId, filterClassId, filterExamDate, filterTeacherId, searchQuery]);

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
    handleBulkDelete,
    handleSaveAll,
  };
}

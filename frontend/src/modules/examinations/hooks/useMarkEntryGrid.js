import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { examStore } from '@/stores/examStore';

/**
 * useMarkEntryGrid
 * High-performance spreadsheet-like mark entry console hook with:
 * - Universal useAutoSave integration (Debounced, robust, silent persistence)
 * - Keyboard navigation (Arrow keys, Enter auto-advance to next student, 'A' hotkey for absent)
 * - Real-time zero-lag boundary validation (0 to maxMarks)
 * - Auto component calculation, aggregate sum, and live grading evaluation
 * - Bulk fill operations (Max marks, Pass marks, Toggle Absent, Clear, Preset remarks)
 * - Real-time statistical counters (Pass rate, Average, Highest score, Grade counts)
 * - Multi-stage draft, lock state, and supervisor override management
 * - CSV export and import support
 */
export default function useMarkEntryGrid({
  tenantId = 'default',
  examId = '',
  examSubjectId = '',
  students = [],
  examSubject = null,
  gradingRules = [],
  onSaveSuccess,
}) {
  const { showToast } = useToast();

  const [marksGrid, setMarksGrid] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { studentIndex, compIndex }

  // Components breakdown (e.g. [{ id: 'comp_1', name: 'Written Exam', maxMarks: 70 }, { id: 'comp_2', name: 'Oral / Nazera', maxMarks: 30 }])
  const components = useMemo(() => {
    if (examSubject?.components && Array.isArray(examSubject.components) && examSubject.components.length > 0) {
      return examSubject.components.map((c, idx) => ({
        id: c.id || `comp_${idx}`,
        name: c.name || `Component ${idx + 1}`,
        maxMarks: Number(c.maxMarks) || 100,
      }));
    }
    return [{ id: 'comp_0', name: 'Written Exam', maxMarks: Number(examSubject?.fullMarks) || 100 }];
  }, [examSubject]);

  const fullMarks = Number(examSubject?.fullMarks) || 100;
  const passMarks = Number(examSubject?.passMarks) || 33;

  // Universal Auto-Save Integration
  const {
    status: autoSaveStatus,
    lastSavedAt: lastSavedTime,
    forceSave,
    setLastSavedAt,
    setStatus: setAutoSaveStatus,
    resetSavedState,
  } = useAutoSave({
    data: marksGrid,
    enabled: Boolean(examId && examSubjectId && students.length > 0),
    isLocked: isLocked && !isSupervisorUnlocked,
    debounceMs: 600,
    validate: () => Object.keys(validationErrors).length === 0,
    onSave: async (currentGrid) => {
      const entries = Object.values(currentGrid).map((item) => ({
        ...item,
        fullMarks,
        passMarks,
        status: 'DRAFT',
      }));

      if (entries.length > 0) {
        examStore.saveBatchMarks(tenantId, {
          examId,
          examSubjectId,
          marksEntries: entries,
          status: 'DRAFT',
        });
        onSaveSuccess?.();
      }
    },
  });

  // Track previously loaded subject and student count to prevent wiping user edits on re-render
  const lastLoadedRef = useRef({ tenantId: '', examId: '', examSubjectId: '', studentCount: 0 });

  // Initialize grid from store or students
  useEffect(() => {
    if (!examId || !examSubjectId) {
      setMarksGrid({});
      lastLoadedRef.current = { tenantId: '', examId: '', examSubjectId: '', studentCount: 0 };
      return;
    }

    const prev = lastLoadedRef.current;
    if (
      prev.tenantId === tenantId &&
      prev.examId === examId &&
      prev.examSubjectId === examSubjectId &&
      prev.studentCount === students.length &&
      students.length > 0
    ) {
      return;
    }

    lastLoadedRef.current = { tenantId, examId, examSubjectId, studentCount: students.length };

    const existingMarks = examStore.getExamMarks(tenantId, examId, examSubjectId);
    const existingMap = new Map();
    let anySubmitted = false;
    let latestUpdatedAt = null;

    existingMarks.forEach((m) => {
      existingMap.set(String(m.studentId), m);
      if (m.status === 'SUBMITTED' || m.status === 'APPROVED' || m.status === 'LOCKED') {
        anySubmitted = true;
      }
      if (m.updatedAt) {
        if (!latestUpdatedAt || new Date(m.updatedAt) > new Date(latestUpdatedAt)) {
          latestUpdatedAt = m.updatedAt;
        }
      }
    });

    const initialGrid = {};
    students.forEach((st) => {
      const stId = String(st.id);
      const saved = existingMap.get(stId);

      const componentMarks = {};
      components.forEach((comp, idx) => {
        const key = `comp_${idx}`;
        componentMarks[key] = saved?.componentMarks?.[key] !== undefined && saved?.componentMarks?.[key] !== null
          ? String(saved.componentMarks[key])
          : '';
      });

      const isAbsent = Boolean(saved?.isAbsent);
      const obtainedMarks = saved ? (saved.obtainedMarks !== undefined && saved.obtainedMarks !== null ? saved.obtainedMarks : '') : '';

      initialGrid[stId] = {
        studentId: stId,
        studentName: st.name_en || st.name || 'Student',
        studentRoll: st.roll_number || st.roll || st.uniq_id || '',
        studentUniqId: st.uniq_id || '',
        classId: examSubject?.classId || '',
        sectionId: typeof st.section === 'object' ? st.section?.id : (st.section || st.section_id || ''),
        componentMarks,
        obtainedMarks,
        isAbsent,
        teacherRemarks: saved?.teacherRemarks || '',
        status: saved?.status || 'DRAFT',
      };
    });

    setMarksGrid(initialGrid);
    setIsLocked(anySubmitted);
    setIsSupervisorUnlocked(false);
    setValidationErrors({});

    const formattedTime = latestUpdatedAt
      ? new Date(latestUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : null;

    resetSavedState(initialGrid, formattedTime);
  }, [tenantId, examId, examSubjectId, students, components, examSubject, resetSavedState]);

  // Update a single component mark for a student
  // Update a single component mark for a student
  const handleCellChange = useCallback((studentId, compKey, rawValue, maxAllowed) => {
    const rawStr = typeof rawValue === 'string'
      ? rawValue
      : (rawValue?.target?.value !== undefined ? String(rawValue.target.value) : String(rawValue ?? ''));
    const val = rawStr.trim();
    const cellId = `${studentId}_${compKey}`;

    // Clear error
    setValidationErrors((prev) => {
      if (!prev[cellId]) return prev;
      const next = { ...prev };
      delete next[cellId];
      return next;
    });

    if (val === '') {
      setMarksGrid((prev) => {
        const current = prev[studentId] || {};
        const compMarks = { ...(current.componentMarks || {}), [compKey]: '' };

        let sum = 0;
        let hasAny = false;
        Object.values(compMarks).forEach((v) => {
          if (v !== '') {
            sum += Number(v) || 0;
            hasAny = true;
          }
        });

        return {
          ...prev,
          [studentId]: {
            ...current,
            componentMarks: compMarks,
            obtainedMarks: hasAny ? sum : '',
          },
        };
      });
      return;
    }

    // Check if user pressed 'a' or 'abs'
    if (val.toLowerCase() === 'a' || val.toLowerCase() === 'abs') {
      setMarksGrid((prev) => {
        const current = prev[studentId] || {};
        return {
          ...prev,
          [studentId]: {
            ...current,
            isAbsent: true,
            obtainedMarks: 0,
          },
        };
      });
      return;
    }

    const num = Number(val);
    if (isNaN(num) || num < 0) {
      setValidationErrors((prev) => ({ ...prev, [cellId]: 'Enter valid number' }));
      return;
    }

    if (num > maxAllowed) {
      setValidationErrors((prev) => ({
        ...prev,
        [cellId]: `Max allowed: ${maxAllowed}`,
      }));
      showToast(`Cannot enter ${num}. Maximum mark allowed for this component is ${maxAllowed}.`, 'warning');
      return;
    }

    setMarksGrid((prev) => {
      const current = prev[studentId] || {};
      const compMarks = { ...(current.componentMarks || {}), [compKey]: String(num) };

      let sum = 0;
      Object.values(compMarks).forEach((v) => {
        if (v !== '') sum += Number(v) || 0;
      });

      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent: false,
          componentMarks: compMarks,
          obtainedMarks: sum,
        },
      };
    });
  }, [showToast]);

  // Toggle student absent status
  const handleToggleAbsent = useCallback((studentId) => {
    setMarksGrid((prev) => {
      const current = prev[studentId] || {};
      const isAbsent = !current.isAbsent;

      let sum = 0;
      let hasAny = false;
      if (!isAbsent && current.componentMarks) {
        Object.values(current.componentMarks).forEach((v) => {
          if (v !== '') {
            sum += Number(v) || 0;
            hasAny = true;
          }
        });
      }

      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent,
          obtainedMarks: isAbsent ? 0 : (hasAny ? sum : ''),
        },
      };
    });
  }, []);

  // Update teacher remarks for a student
  const handleRemarksChange = useCallback((studentId, remarks) => {
    const text = typeof remarks === 'string'
      ? remarks
      : (remarks?.target?.value !== undefined ? String(remarks.target.value) : String(remarks ?? ''));
    setMarksGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        teacherRemarks: text,
      },
    }));
  }, []);

  // Bulk Operations
  const fillFullMarks = useCallback(() => {
    if (isLocked && !isSupervisorUnlocked) return;
    setMarksGrid((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stId) => {
        const item = next[stId];
        if (item.isAbsent) return;
        const compMarks = {};
        let total = 0;
        components.forEach((c, idx) => {
          compMarks[`comp_${idx}`] = String(c.maxMarks);
          total += Number(c.maxMarks) || 0;
        });
        next[stId] = {
          ...item,
          componentMarks: compMarks,
          obtainedMarks: total,
        };
      });
      return next;
    });
    setValidationErrors({});
    showToast('Filled all active students with full component marks.', 'info');
  }, [isLocked, isSupervisorUnlocked, components, showToast]);

  const fillPassingMarks = useCallback(() => {
    if (isLocked && !isSupervisorUnlocked) return;
    setMarksGrid((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stId) => {
        const item = next[stId];
        if (item.isAbsent) return;
        const compMarks = {};
        let runningSum = 0;
        const ratio = fullMarks > 0 ? passMarks / fullMarks : 0.33;

        components.forEach((c, idx) => {
          const compPass = Math.ceil(c.maxMarks * ratio);
          compMarks[`comp_${idx}`] = String(compPass);
          runningSum += compPass;
        });

        next[stId] = {
          ...item,
          componentMarks: compMarks,
          obtainedMarks: runningSum,
        };
      });
      return next;
    });
    setValidationErrors({});
    showToast(`Filled all active students with passing marks (${passMarks}/${fullMarks}).`, 'info');
  }, [isLocked, isSupervisorUnlocked, components, fullMarks, passMarks, showToast]);

  const clearAllMarks = useCallback(() => {
    if (isLocked && !isSupervisorUnlocked) return;
    setMarksGrid((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stId) => {
        const compMarks = {};
        components.forEach((_, idx) => {
          compMarks[`comp_${idx}`] = '';
        });
        next[stId] = {
          ...next[stId],
          componentMarks: compMarks,
          obtainedMarks: '',
          isAbsent: false,
          teacherRemarks: '',
        };
      });
      return next;
    });
    setValidationErrors({});
    showToast('Cleared all entered marks.', 'info');
  }, [isLocked, isSupervisorUnlocked, components, showToast]);

  const toggleAllAbsent = useCallback((status) => {
    if (isLocked && !isSupervisorUnlocked) return;
    setMarksGrid((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((stId) => {
        const item = next[stId];
        next[stId] = {
          ...item,
          isAbsent: status,
          obtainedMarks: status ? 0 : '',
        };
      });
      return next;
    });
    showToast(status ? 'Marked all students as Absent.' : 'Marked all students as Present.', 'info');
  }, [isLocked, isSupervisorUnlocked, showToast]);


  // Keyboard navigation handler: Arrow keys, Enter, Tab with active cell selection and skipping absent rows
  const handleKeyDown = useCallback((e, studentIndex, compIndex, totalStudents, totalComps) => {
    const key = e.key;
    const isEnter = key === 'Enter';
    const isArrowDown = key === 'ArrowDown';
    const isArrowUp = key === 'ArrowUp';
    const isArrowRight = key === 'ArrowRight';
    const isArrowLeft = key === 'ArrowLeft';
    const isTab = key === 'Tab';

    if (!isEnter && !isArrowDown && !isArrowUp && !isArrowRight && !isArrowLeft && !isTab) {
      return;
    }

    const val = e.target.value || '';
    const selStart = e.target.selectionStart ?? 0;
    const selEnd = e.target.selectionEnd ?? 0;
    const isEntirelySelected = (selStart === 0 && selEnd === val.length);
    const isAtEnd = (selStart === val.length);
    const isAtStart = (selStart === 0 && selEnd === 0);

    const focusCellInput = (targetId, nextStudentIdx, nextCompIdx) => {
      const el = document.getElementById(targetId);
      if (el && !el.disabled) {
        el.focus();
        if (typeof el.select === 'function') {
          el.select();
        }
        setActiveCell({ studentIndex: nextStudentIdx, compIndex: nextCompIdx });
        return true;
      }
      return false;
    };

    // If on a number mark cell and plain ArrowUp / ArrowDown is pressed (without Ctrl/Alt),
    // let CustomInput's native number stepping (increment/decrement value) handle it!
    if (typeof compIndex === 'number' && (isArrowUp || isArrowDown) && !e.ctrlKey && !e.altKey) {
      return;
    }

    // 1. Move DOWN (Enter without shift, or Ctrl/Alt+ArrowDown, or ArrowDown on remarks)
    if ((isEnter && !e.shiftKey) || (isArrowDown && (e.ctrlKey || e.altKey || compIndex === 'remarks'))) {
      e.preventDefault();
      for (let r = studentIndex + 1; r < totalStudents; r++) {
        const targetId = `cell_${r}_${compIndex}`;
        if (focusCellInput(targetId, r, compIndex)) {
          return;
        }
      }
      return;
    }

    // 2. Move UP (Shift+Enter, or Ctrl/Alt+ArrowUp, or ArrowUp on remarks)
    if ((isEnter && e.shiftKey) || (isArrowUp && (e.ctrlKey || e.altKey || compIndex === 'remarks'))) {
      e.preventDefault();
      for (let r = studentIndex - 1; r >= 0; r--) {
        const targetId = `cell_${r}_${compIndex}`;
        if (focusCellInput(targetId, r, compIndex)) {
          return;
        }
      }
      return;
    }

    // 3. Move RIGHT (ArrowRight or Tab without shift)
    if ((isArrowRight && (isEntirelySelected || isAtEnd)) || (isTab && !e.shiftKey)) {
      e.preventDefault();

      if (typeof compIndex === 'number') {
        // Try next component on same student
        if (compIndex + 1 < totalComps) {
          const targetId = `cell_${studentIndex}_${compIndex + 1}`;
          if (focusCellInput(targetId, studentIndex, compIndex + 1)) return;
        }
        // Try remarks on same student
        const remarksId = `cell_${studentIndex}_remarks`;
        if (focusCellInput(remarksId, studentIndex, 'remarks')) return;

        // Wrap to first component of next student
        for (let r = studentIndex + 1; r < totalStudents; r++) {
          const firstCompId = `cell_${r}_0`;
          if (focusCellInput(firstCompId, r, 0)) return;
        }
      } else if (compIndex === 'remarks') {
        // Move to first component of next student
        for (let r = studentIndex + 1; r < totalStudents; r++) {
          const firstCompId = `cell_${r}_0`;
          if (focusCellInput(firstCompId, r, 0)) return;
        }
      }
      return;
    }

    // 4. Move LEFT (ArrowLeft or Tab with shift)
    if ((isArrowLeft && (isEntirelySelected || isAtStart)) || (isTab && e.shiftKey)) {
      e.preventDefault();

      if (compIndex === 'remarks') {
        // Move to last component of same student
        const lastCompIdx = Math.max(0, totalComps - 1);
        const targetId = `cell_${studentIndex}_${lastCompIdx}`;
        if (focusCellInput(targetId, studentIndex, lastCompIdx)) return;
      } else if (typeof compIndex === 'number' && compIndex > 0) {
        // Move to previous component of same student
        const targetId = `cell_${studentIndex}_${compIndex - 1}`;
        if (focusCellInput(targetId, studentIndex, compIndex - 1)) return;
      } else if (typeof compIndex === 'number' && compIndex === 0) {
        // Move to remarks (or last component) of previous student
        const lastCompIdx = Math.max(0, totalComps - 1);
        for (let r = studentIndex - 1; r >= 0; r--) {
          const remarksId = `cell_${r}_remarks`;
          if (focusCellInput(remarksId, r, 'remarks')) return;
          const lastCompId = `cell_${r}_${lastCompIdx}`;
          if (focusCellInput(lastCompId, r, lastCompIdx)) return;
        }
      }
      return;
    }
  }, []);

  // Save marks as DRAFT or SUBMITTED
  const handleSave = async (targetStatus = 'DRAFT') => {
    if (Object.keys(validationErrors).length > 0) {
      showToast('Please resolve validation errors before saving marks.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const entries = Object.values(marksGrid).map((item) => ({
        ...item,
        fullMarks,
        passMarks,
        status: targetStatus,
      }));

      examStore.saveBatchMarks(tenantId, {
        examId,
        examSubjectId,
        marksEntries: entries,
        status: targetStatus,
      });

      if (targetStatus === 'SUBMITTED') {
        setIsLocked(true);
        setIsSupervisorUnlocked(false);
        setAutoSaveStatus('saved');
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast('Marks successfully submitted to Exam Controller and locked.', 'success');
      } else {
        setAutoSaveStatus('saved');
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast('Marks draft saved successfully.', 'success');
      }

      onSaveSuccess?.();
    } catch {
      showToast('Failed to save marks. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Supervisor override unlock
  const handleSupervisorUnlock = () => {
    setIsSupervisorUnlocked(true);
    setIsLocked(false);
    showToast('Mark sheet unlocked with Exam Controller supervisor privilege.', 'info');
  };

  // Export Marksheet to CSV
  const exportToCsv = useCallback(() => {
    if (students.length === 0) return;
    const header = ['Roll', 'Unique ID', 'Student Name', 'Absent?', ...components.map((c) => `${c.name} (${c.maxMarks})`), `Total (${fullMarks})`, 'Grade', 'Status', 'Remarks'];
    const rows = students.map((st) => {
      const stId = String(st.id);
      const row = marksGrid[stId] || {};
      const isAbsent = Boolean(row.isAbsent);
      const obtained = isAbsent ? 0 : Number(row.obtainedMarks) || 0;
      const pct = fullMarks > 0 ? (obtained / fullMarks) * 100 : 0;
      const gradeEval = examStore.evaluateGrade(pct, gradingRules);
      const isPassed = !isAbsent && obtained >= passMarks;

      const compValues = components.map((_, idx) => row.componentMarks?.[`comp_${idx}`] ?? '');

      return [
        `"${st.roll_number || st.roll || st.uniq_id || ''}"`,
        `"${st.uniq_id || ''}"`,
        `"${st.name_en || st.name || 'Student'}"`,
        isAbsent ? 'YES' : 'NO',
        ...compValues,
        isAbsent ? 'ABS' : (row.obtainedMarks !== '' ? row.obtainedMarks : ''),
        isAbsent ? 'ABS' : gradeEval.grade,
        isAbsent ? 'ABSENT' : (isPassed ? 'PASSED' : 'FAILED'),
        `"${row.teacherRemarks || ''}"`,
      ];
    });

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MarkSheet_${examSubject?.subjectName || 'Subject'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Marksheet exported to CSV successfully.', 'success');
  }, [students, marksGrid, components, fullMarks, passMarks, gradingRules, examSubject, showToast]);

  // Import Marks from CSV Text
  const importFromCsv = useCallback((csvText) => {
    if (!csvText || !csvText.trim()) {
      showToast('CSV content is empty.', 'warning');
      return false;
    }

    try {
      const lines = csvText.trim().split('\n').filter(Boolean);
      if (lines.length < 2) {
        showToast('CSV must contain a header row and data rows.', 'warning');
        return false;
      }

      const rows = lines.slice(1);
      let matchedCount = 0;

      setMarksGrid((prev) => {
        const next = { ...prev };
        rows.forEach((line) => {
          const cells = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const rollOrId = cells[0] || cells[1];
          if (!rollOrId) return;

          const targetSt = students.find(
            (s) =>
              String(s.roll_number) === rollOrId ||
              String(s.roll) === rollOrId ||
              String(s.uniq_id) === rollOrId ||
              String(s.id) === rollOrId
          );

          if (targetSt) {
            const stId = String(targetSt.id);
            const isAbsent = (cells[3] || '').toUpperCase() === 'YES';
            const compMarks = {};
            let sum = 0;
            let hasAny = false;

            components.forEach((c, idx) => {
              const val = cells[4 + idx] || '';
              if (val !== '' && !isNaN(Number(val))) {
                const cleanVal = Math.min(Number(val), c.maxMarks);
                compMarks[`comp_${idx}`] = String(cleanVal);
                sum += cleanVal;
                hasAny = true;
              } else {
                compMarks[`comp_${idx}`] = '';
              }
            });

            next[stId] = {
              ...(next[stId] || {}),
              isAbsent,
              componentMarks: compMarks,
              obtainedMarks: isAbsent ? 0 : (hasAny ? sum : ''),
              teacherRemarks: cells[4 + components.length + 3] || next[stId]?.teacherRemarks || '',
            };
            matchedCount += 1;
          }
        });
        return next;
      });

      showToast(`Successfully imported marks for ${matchedCount} students from CSV.`, 'success');
      return true;
    } catch {
      showToast('Failed to parse CSV file. Please verify format.', 'error');
      return false;
    }
  }, [students, components, showToast]);

  // Real-time Statistical Metrics
  const stats = useMemo(() => {
    const total = students.length;
    let evaluated = 0;
    let absent = 0;
    let passed = 0;
    let failed = 0;
    let totalObtained = 0;
    let highest = -1;
    let lowest = 999999;
    const gradeCounts = {};

    Object.values(marksGrid).forEach((m) => {
      if (m.isAbsent) {
        absent += 1;
        evaluated += 1;
        failed += 1;
        return;
      }
      if (m.obtainedMarks !== '' && m.obtainedMarks !== null && m.obtainedMarks !== undefined) {
        const num = Number(m.obtainedMarks) || 0;
        evaluated += 1;
        totalObtained += num;
        if (num >= passMarks) passed += 1;
        else failed += 1;
        if (num > highest) highest = num;
        if (num < lowest) lowest = num;

        const pct = fullMarks > 0 ? (num / fullMarks) * 100 : 0;
        const gradeEval = examStore.evaluateGrade(pct, gradingRules);
        const gradeKey = gradeEval.grade || 'N/A';
        gradeCounts[gradeKey] = (gradeCounts[gradeKey] || 0) + 1;
      }
    });

    const evaluatedPct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : 0;
    const averageObtained = evaluated - absent > 0 ? Math.round((totalObtained / (evaluated - absent)) * 10) / 10 : 0;

    return {
      totalStudents: total,
      evaluatedCount: evaluated,
      evaluatedPct,
      presentCount: total - absent,
      absentCount: absent,
      passedCount: passed,
      failedCount: failed,
      passRate,
      averageObtained,
      highestObtained: highest >= 0 ? highest : 0,
      lowestObtained: lowest !== 999999 ? lowest : 0,
      gradeCounts,
    };
  }, [students, marksGrid, passMarks, fullMarks, gradingRules]);

  return {
    marksGrid,
    validationErrors,
    components,
    fullMarks,
    passMarks,
    isLocked: isLocked && !isSupervisorUnlocked,
    isSupervisorUnlocked,
    saving,
    autoSaveStatus,
    lastSavedTime,
    activeCell,
    stats,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
    handleSave,
    handleSupervisorUnlock,
    fillFullMarks,
    fillPassingMarks,
    clearAllMarks,
    toggleAllAbsent,
    exportToCsv,
    importFromCsv,
  };
}

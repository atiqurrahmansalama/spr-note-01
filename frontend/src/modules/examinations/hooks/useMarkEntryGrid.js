import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { examStore } from '../../../utils/stores/examStore';

/**
 * useMarkEntryGrid
 * High-performance spreadsheet-like mark entry console hook with:
 * - Keyboard navigation (Arrow keys, Enter auto-advance to next student)
 * - Real-time zero-lag boundary validation
 * - Auto component calculation & instant total sum
 * - Multi-stage draft and locked state management
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

  // Components breakdown (e.g. [{ name: 'Written', maxMarks: 70 }, { name: 'Oral', maxMarks: 30 }])
  const components = useMemo(() => {
    if (examSubject?.components && examSubject.components.length > 0) {
      return examSubject.components;
    }
    return [{ name: 'Written', maxMarks: Number(examSubject?.fullMarks) || 100 }];
  }, [examSubject]);

  const fullMarks = Number(examSubject?.fullMarks) || 100;
  const passMarks = Number(examSubject?.passMarks) || 33;

  // Initialize grid from store or students
  useEffect(() => {
    if (!examId || !examSubjectId) return;

    const existingMarks = examStore.getExamMarks(tenantId, examId, examSubjectId);
    const existingMap = new Map();
    let anySubmitted = false;

    existingMarks.forEach((m) => {
      existingMap.set(String(m.studentId), m);
      if (m.status === 'SUBMITTED' || m.status === 'APPROVED' || m.status === 'LOCKED') {
        anySubmitted = true;
      }
    });

    const initialGrid = {};
    students.forEach((st) => {
      const stId = String(st.id);
      const saved = existingMap.get(stId);

      const componentMarks = {};
      components.forEach((comp, idx) => {
        const key = `comp_${idx}`;
        componentMarks[key] = saved?.componentMarks?.[key] !== undefined ? String(saved.componentMarks[key]) : '';
      });

      initialGrid[stId] = {
        studentId: stId,
        studentName: st.name_en || st.name || 'Student',
        studentRoll: st.roll_number || st.roll || st.uniq_id || '',
        classId: examSubject?.classId || '',
        sectionId: typeof st.section === 'object' ? st.section?.id : (st.section || st.section_id || ''),
        componentMarks,
        obtainedMarks: saved ? Number(saved.obtainedMarks) || 0 : '',
        isAbsent: Boolean(saved?.isAbsent),
        teacherRemarks: saved?.teacherRemarks || '',
        status: saved?.status || 'DRAFT',
      };
    });

    setMarksGrid(initialGrid);
    setIsLocked(anySubmitted);
    setIsSupervisorUnlocked(false);
    setValidationErrors({});
  }, [tenantId, examId, examSubjectId, students, components, examSubject]);

  // Update a single component mark for a student
  const handleCellChange = useCallback((studentId, compKey, rawValue, maxAllowed) => {
    const val = rawValue.trim();
    const cellId = `${studentId}_${compKey}`;

    // Clear error
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[cellId];
      return next;
    });

    if (val === '') {
      setMarksGrid((prev) => {
        const current = prev[studentId] || {};
        const compMarks = { ...(current.componentMarks || {}), [compKey]: '' };
        
        // Recalculate sum
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

    const num = Number(val);
    if (isNaN(num) || num < 0) {
      setValidationErrors((prev) => ({ ...prev, [cellId]: 'Must be a positive number' }));
      return;
    }

    if (num > maxAllowed) {
      setValidationErrors((prev) => ({
        ...prev,
        [cellId]: `Exceeds max limit of ${maxAllowed}`,
      }));
      showToast(`Cannot enter ${num}. Maximum marks allowed is ${maxAllowed}.`, 'warning');
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
      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent,
          obtainedMarks: isAbsent ? 0 : current.obtainedMarks,
        },
      };
    });
  }, []);

  // Update remarks
  const handleRemarksChange = useCallback((studentId, remarks) => {
    setMarksGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        teacherRemarks: remarks,
      },
    }));
  }, []);

  // Keyboard navigation handler: Arrow keys & Enter
  const handleKeyDown = useCallback((e, studentIndex, compIndex, totalStudents, totalComps) => {
    let nextStudentIndex = studentIndex;
    let nextCompIndex = compIndex;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (studentIndex + 1 < totalStudents) {
        nextStudentIndex = studentIndex + 1;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (studentIndex - 1 >= 0) {
        nextStudentIndex = studentIndex - 1;
      }
    } else if (e.key === 'ArrowRight') {
      if (e.target.selectionStart === e.target.value.length && compIndex + 1 < totalComps) {
        e.preventDefault();
        nextCompIndex = compIndex + 1;
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0 && compIndex - 1 >= 0) {
        e.preventDefault();
        nextCompIndex = compIndex - 1;
      }
    }

    if (nextStudentIndex !== studentIndex || nextCompIndex !== compIndex) {
      const nextInput = document.getElementById(`cell_${nextStudentIndex}_${nextCompIndex}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
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
        showToast('Marks successfully submitted to Exam Controller and locked.', 'success');
      } else {
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

  return {
    marksGrid,
    validationErrors,
    components,
    fullMarks,
    passMarks,
    isLocked: isLocked && !isSupervisorUnlocked,
    isSupervisorUnlocked,
    saving,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
    handleSave,
    handleSupervisorUnlock,
  };
}

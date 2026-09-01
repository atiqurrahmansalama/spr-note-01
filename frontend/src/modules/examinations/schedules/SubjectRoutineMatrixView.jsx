import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable from '../../../components/ui/DataTable';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import ActionMenu from '../../../components/ui/ActionMenu';
import Modal from '../../../components/ui/Modal';
import {
  DepartmentSelect,
  ClassSelect,
  TeacherSelect,
} from '../../../components/selectors';
import {
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  BookOpenIcon,
  SparklesIcon,
  SearchIcon,
  AcademicCapIcon,
  TimerIcon,
  EditIcon,
} from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { examStore } from '../../../utils/stores/examStore';
import { curriculumStore } from '../../../utils/stores/academicStore';
import useExamData from '../hooks/useExamData';

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

/**
 * SubjectRoutineMatrixView
 * High-productivity, table-driven examination subject routine configuration workspace.
 * Uses official project DataTable with zero hardcoded styling and pure theme tokens.
 */
export default function SubjectRoutineMatrixView({
  initialExamId = null,
  onNavigateToExamSessions,
}) {
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
    } else if (!selectedExamId && exams.length > 0) {
      setSelectedExamId(String(exams[0].id));
    }
  }, [initialExamId, exams, selectedExamId]);

  const activeExam = useMemo(() => {
    return exams.find((e) => String(e.id) === String(selectedExamId)) || null;
  }, [exams, selectedExamId]);

  // Designated Exam Days from Active Exam Session
  const designatedExamDays = useMemo(() => {
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      return activeExam.scheduleDays
        .filter((d) => d.type === 'EXAM_DAY' || d.type === 'DUAL_EXAM')
        .map((d) => d.date);
    }
    if (activeExam?.startDate && activeExam?.endDate) {
      return generateDateRange(activeExam.startDate, activeExam.endDate);
    }
    return [];
  }, [activeExam]);

  // Routine Rows State (Drafted & Active)
  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Real-time store listener
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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('ALL');
  const [filterClassId, setFilterClassId] = useState('ALL');

  // Selected row IDs for Bulk Actions
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Bulk Operations State
  const [showBulkTimeModal, setShowBulkTimeModal] = useState(false);
  const [bulkStartTime, setBulkStartTime] = useState('09:00 AM');
  const [bulkEndTime, setBulkEndTime] = useState('11:00 AM');

  const [showBulkTeacherModal, setShowBulkTeacherModal] = useState(false);
  const [bulkTeacherName, setBulkTeacherName] = useState('');

  // Component Breakdown Modal State
  const [editingComponentRowId, setEditingComponentRowId] = useState(null);
  const [componentDrafts, setComponentDrafts] = useState([]);

  // Exam Options for top switcher
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Year'})${e.startDate ? ` — [${e.startDate} to ${e.endDate}]` : ''}`,
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

  // Available Curriculum Books for the Exam
  const availableCurriculumBooks = useMemo(() => {
    const fromTenant = curriculumStore.getItems(tenantId) || [];
    const fromDefault = tenantId !== 'default' ? curriculumStore.getItems('default') || [] : [];
    const combined = [...fromTenant, ...fromDefault, ...(curriculumBooks || [])];
    const seen = new Set();
    return combined.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [tenantId, curriculumBooks]);

  // ✨ Auto-Populate Routine from Curriculum Books
  const handleAutoPopulateFromCurriculum = () => {
    if (!activeExam) {
      showToast('Please select an active examination session first.', 'warning');
      return;
    }

    const targetClasses = participatingClasses.length > 0 ? participatingClasses : classes;
    if (targetClasses.length === 0) {
      showToast('No participating classes configured for this exam session.', 'warning');
      return;
    }

    const defaultStart = activeExam?.defaultStartTime || '09:00 AM';
    const defaultEnd = activeExam?.defaultEndTime || '11:00 AM';
    const secondStart = activeExam?.secondStartTime || '02:00 PM';
    const secondEnd = activeExam?.secondEndTime || '04:00 PM';
    const writtenRatio = Number(activeExam?.defaultBreakdown?.written ?? 70) / 100;

    // Generate ordered schedule slots respecting single and dual exam shifts
    const examSlots = [];
    if (activeExam?.scheduleDays && Array.isArray(activeExam.scheduleDays)) {
      activeExam.scheduleDays.forEach((d) => {
        if (d.type === 'EXAM_DAY') {
          examSlots.push({
            date: d.date,
            startTime: defaultStart,
            endTime: defaultEnd,
          });
        } else if (d.type === 'DUAL_EXAM') {
          examSlots.push({
            date: d.date,
            startTime: defaultStart,
            endTime: defaultEnd,
          });
          examSlots.push({
            date: d.date,
            startTime: secondStart,
            endTime: secondEnd,
          });
        }
      });
    }

    if (examSlots.length === 0) {
      const fallbackDates = designatedExamDays.length > 0 ? designatedExamDays : [activeExam.startDate || ''];
      fallbackDates.forEach((dt) => {
        examSlots.push({
          date: dt,
          startTime: defaultStart,
          endTime: defaultEnd,
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
          const autoTeacher = book.teacherName || book.teacher_name || book.teacher || '';
          const autoFullMarks = Number(book.fullMarks || book.full_marks || book.total_marks || 100);
          const autoPassMarks = Number(book.passMarks || book.pass_marks || Math.round(autoFullMarks * 0.33));
          
          const currentSlot = examSlots[slotIndex % examSlots.length];
          const assignedDate = currentSlot.date;
          const assignedStart = currentSlot.startTime;
          const assignedEnd = currentSlot.endTime;

          const autoWritten = Math.round(autoFullMarks * writtenRatio);
          const autoOral = autoFullMarks - autoWritten;

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
            teacherName: autoTeacher,
            examDate: assignedDate,
            startTime: assignedStart,
            endTime: assignedEnd,
            fullMarks: autoFullMarks,
            passMarks: autoPassMarks,
            components: [
              { name: 'Written', maxMarks: autoWritten },
              { name: 'Oral / Nazera', maxMarks: autoOral },
            ],
          });

          slotIndex++;
        });
      } else {
        const currentSlot = examSlots[0] || { date: activeExam.startDate || '', startTime: defaultStart, endTime: defaultEnd };
        const autoWritten = Math.round(100 * writtenRatio);
        const autoOral = 100 - autoWritten;

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
          teacherName: '',
          examDate: currentSlot.date,
          startTime: currentSlot.startTime,
          endTime: currentSlot.endTime,
          fullMarks: 100,
          passMarks: 33,
          components: [
            { name: 'Written', maxMarks: autoWritten },
            { name: 'Oral / Nazera', maxMarks: autoOral },
          ],
        });
      }
    });

    setRows(newRows);
    setIsDirty(true);
    showToast(`Generated ${newRows.length} subject routine entries from curriculum.`, 'success');
  };

  // Add a blank custom subject row
  const handleAddCustomRow = () => {
    if (!activeExam) {
      showToast('Please select an examination session first.', 'warning');
      return;
    }
    const defaultClass = participatingClasses[0] || classes[0] || null;
    const defaultDate = designatedExamDays[0] || activeExam.startDate || '';
    const defaultStart = activeExam?.defaultStartTime || '09:00 AM';
    const defaultEnd = activeExam?.defaultEndTime || '11:00 AM';
    const writtenMarks = Number(activeExam?.defaultBreakdown?.written ?? 70);
    const oralMarks = Number(activeExam?.defaultBreakdown?.oral ?? 30);

    const newRow = {
      id: `row_custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      examId: String(activeExam.id),
      departmentId: defaultClass?.department_id || 'ALL',
      departmentName: defaultClass?.department_name || '',
      classId: defaultClass ? String(defaultClass.id) : '',
      className: defaultClass?.name || 'Class',
      sectionId: 'ALL',
      sectionName: 'All Sections',
      curriculumBookId: null,
      curriculumBookName: '',
      subjectName: '',
      teacherName: '',
      examDate: defaultDate,
      startTime: defaultStart,
      endTime: defaultEnd,
      fullMarks: 100,
      passMarks: 33,
      components: [
        { name: 'Written', maxMarks: writtenMarks },
        { name: 'Oral / Nazera', maxMarks: oralMarks },
      ],
    };

    setRows((prev) => [newRow, ...prev]);
    setIsDirty(true);
  };

  // Update a single field in a row
  const handleRowChange = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const updated = { ...r, [field]: value };
          if (field === 'fullMarks') {
            const fm = Math.max(1, parseInt(value, 10) || 0);
            updated.fullMarks = fm;
            updated.passMarks = Math.round(fm * 0.33);
            if (updated.components && updated.components.length > 0) {
              const writtenRatio = Number(activeExam?.defaultBreakdown?.written ?? 70) / 100;
              const written = Math.round(fm * writtenRatio);
              updated.components = [
                { name: 'Written', maxMarks: written },
                { name: 'Oral / Nazera', maxMarks: fm - written },
              ];
            }
          }
          return updated;
        }
        return r;
      })
    );
    setIsDirty(true);
  };

  // Handle Book selection on a row
  const handleRowBookSelect = (rowId, bookId, classId) => {
    const foundBook = availableCurriculumBooks.find((b) => String(b.id) === String(bookId));
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          if (!foundBook) {
            return {
              ...r,
              curriculumBookId: null,
              curriculumBookName: '',
            };
          }
          const autoSubject = foundBook.subject || foundBook.subject_name || foundBook.name || foundBook.title || '';
          const autoTeacher = foundBook.teacherName || foundBook.teacher_name || foundBook.teacher || r.teacherName;
          const autoFullMarks = Number(foundBook.fullMarks || foundBook.full_marks || foundBook.total_marks || r.fullMarks || 100);
          const autoPassMarks = Number(foundBook.passMarks || foundBook.pass_marks || Math.round(autoFullMarks * 0.33));
          const writtenRatio = Number(activeExam?.defaultBreakdown?.written ?? 70) / 100;
          const autoWritten = Math.round(autoFullMarks * writtenRatio);
          const autoOral = autoFullMarks - autoWritten;

          return {
            ...r,
            curriculumBookId: String(foundBook.id),
            curriculumBookName: foundBook.name || foundBook.title || '',
            subjectName: autoSubject || r.subjectName,
            teacherName: autoTeacher,
            fullMarks: autoFullMarks,
            passMarks: autoPassMarks,
            components: [
              { name: 'Written', maxMarks: autoWritten },
              { name: 'Oral / Nazera', maxMarks: autoOral },
            ],
          };
        }
        return r;
      })
    );
    setIsDirty(true);
  };

  // Delete a single row
  const handleDeleteRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    setIsDirty(true);
  };

  // Duplicate a row
  const handleDuplicateRow = (row) => {
    const cloned = {
      ...row,
      id: `row_clone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      subjectName: `${row.subjectName} (Copy)`,
    };
    setRows((prev) => [cloned, ...prev]);
    setIsDirty(true);
    showToast('Row duplicated.', 'info');
  };

  // Multi-Selection Handlers
  const handleSelectRow = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // Bulk: Apply Time Slot to Selected
  const handleApplyBulkTime = () => {
    if (selectedRowIds.size === 0) return;
    setRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return { ...r, startTime: bulkStartTime, endTime: bulkEndTime };
        }
        return r;
      })
    );
    setIsDirty(true);
    setShowBulkTimeModal(false);
    showToast(`Time slot applied to ${selectedRowIds.size} subjects.`, 'success');
  };

  // Bulk: Auto-Distribute Dates across Exam Days
  const handleDistributeDates = () => {
    if (selectedRowIds.size === 0) {
      showToast('Select one or more rows to distribute dates.', 'warning');
      return;
    }
    const days = designatedExamDays.length > 0 ? designatedExamDays : [activeExam?.startDate || ''];
    let dIdx = 0;

    setRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          const assigned = days[dIdx % days.length];
          dIdx++;
          return { ...r, examDate: assigned };
        }
        return r;
      })
    );
    setIsDirty(true);
    showToast(`Distributed dates across ${days.length} active exam days.`, 'success');
  };

  // Bulk: Apply Examiner Teacher
  const handleApplyBulkTeacher = () => {
    if (selectedRowIds.size === 0) return;
    setRows((prev) =>
      prev.map((r) => {
        if (selectedRowIds.has(r.id)) {
          return { ...r, teacherName: bulkTeacherName };
        }
        return r;
      })
    );
    setIsDirty(true);
    setShowBulkTeacherModal(false);
    showToast(`Examiner assigned to ${selectedRowIds.size} subjects.`, 'success');
  };

  // Bulk: Delete Selected
  const handleBulkDelete = () => {
    if (selectedRowIds.size === 0) return;
    if (window.confirm(`Delete ${selectedRowIds.size} selected subject routine entries?`)) {
      setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
      setSelectedRowIds(new Set());
      setIsDirty(true);
      showToast('Selected entries removed.', 'info');
    }
  };

  // Component Breakdown Modal Handlers
  const handleOpenComponentModal = (row) => {
    setEditingComponentRowId(row.id);
    setComponentDrafts(
      row.components && row.components.length > 0
        ? JSON.parse(JSON.stringify(row.components))
        : [
            { name: 'Written', maxMarks: 70 },
            { name: 'Oral / Nazera', maxMarks: 30 },
          ]
    );
  };

  const handleSaveComponentBreakdown = () => {
    const targetRow = rows.find((r) => r.id === editingComponentRowId);
    if (!targetRow) return;

    const sum = componentDrafts.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0);
    if (sum !== Number(targetRow.fullMarks)) {
      showToast(`Component marks sum (${sum}) must equal Full Marks (${targetRow.fullMarks}).`, 'warning');
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.id === editingComponentRowId) {
          return { ...r, components: componentDrafts };
        }
        return r;
      })
    );
    setIsDirty(true);
    setEditingComponentRowId(null);
    showToast('Marks breakdown saved.', 'success');
  };

  // Save All Changes
  const handleSaveAll = () => {
    if (!selectedExamId) {
      showToast('No active examination session selected.', 'error');
      return;
    }

    // Validation: Check subject names
    const invalidRow = rows.find((r) => !r.subjectName.trim() || !r.classId);
    if (invalidRow) {
      showToast('Each row must have a valid Subject Name.', 'warning');
      return;
    }

    setSaving(true);
    try {
      examStore.bulkUpsertExamSubjects(tenantId, selectedExamId, rows);
      setIsDirty(false);
      refreshExamData();
      showToast(`Successfully saved ${rows.length} subject routine schedules.`, 'success');
    } catch {
      showToast('Failed to save subject routine matrix.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Rows for display
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterDepartmentId !== 'ALL' && String(r.departmentId) !== String(filterDepartmentId)) {
        return false;
      }
      if (filterClassId !== 'ALL' && String(r.classId) !== String(filterClassId)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = r.subjectName?.toLowerCase().includes(q);
        const matchBook = r.curriculumBookName?.toLowerCase().includes(q);
        const matchClass = r.className?.toLowerCase().includes(q);
        const matchTeacher = r.teacherName?.toLowerCase().includes(q);
        return matchSub || matchBook || matchClass || matchTeacher;
      }
      return true;
    });
  }, [rows, filterDepartmentId, filterClassId, searchQuery]);

  // Project DataTable Columns Definition (Without TARGET CLASS column)
  const columns = useMemo(() => {
    return [
      // {
      //   key: 'index',
      //   title: '#',
      //   headerClassName: 'w-10 text-center',
      //   className: 'text-center text-slate-400 font-mono text-[11px]',
      //   render: (_val, _row, idx) => idx + 1,
      // },
      {
        key: 'curriculumBook',
        title: 'Curriculum Book',
        headerClassName: 'min-w-[180px]',
        className: 'min-w-[180px]',
        render: (_val, row) => {
          const rowClassBooks = availableCurriculumBooks.filter((b) => {
            const bClassId = String(b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || '').trim();
            const bClassName = String(b.className || b.class_name || '').toLowerCase().trim();
            const targetNameClean = (row.className || '').toLowerCase().trim();
            if (bClassId && (bClassId === String(row.classId) || String(row.classId).includes(bClassId))) return true;
            if (targetNameClean && bClassName && (bClassName === targetNameClean || bClassName.includes(targetNameClean) || targetNameClean.includes(bClassName))) return true;
            return false;
          });

          const bookOpts = [
            ...rowClassBooks.map((b) => ({
              value: String(b.id),
              label: b.subject ? `${b.name || b.title} — [${b.subject}]` : b.name || b.title || 'Book',
            })),
            { value: '', label: 'None' },
          ];

          return (
            <CustomSelect
              value={row.curriculumBookId || ''}
              options={bookOpts}
              placeholder="Select Book..."
              onChange={(val) => handleRowBookSelect(row.id, val, row.classId)}
            />
          );
        },
      },
      // {
      //   key: 'subjectName',
      //   title: 'Subject Name',
      //   headerClassName: 'min-w-[180px]',
      //   className: 'min-w-[180px]',
      //   render: (_val, row) => (
      //     <CustomInput
      //       value={row.subjectName}
      //       placeholder="Subject Title (e.g. Hadith Studies)"
      //       onChange={(val) => handleRowChange(row.id, 'subjectName', val)}
      //       required
      //     />
      //   ),
      // },
      {
        key: 'examDate',
        title: 'Exam Date',
        headerClassName: 'min-w-[160px]',
        className: 'min-w-[160px]',
        render: (_val, row) => {
          const dateOpts = designatedExamDays.map((d) => ({
            value: d,
            label: d,
          }));

          return dateOpts.length > 0 ? (
            <CustomSelect
              value={row.examDate}
              options={dateOpts}
              placeholder="Select Exam Date..."
              onChange={(val) => handleRowChange(row.id, 'examDate', val)}
            />
          ) : (
            <CustomInput
              type="date"
              value={row.examDate}
              onChange={(val) => handleRowChange(row.id, 'examDate', val)}
            />
          );
        },
      },
      {
        key: 'timeSlot',
        title: 'Time Slot',
        headerClassName: 'min-w-[160px]',
        className: 'min-w-[160px]',
        render: (_val, row) => (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={row.startTime || '09:00 AM'}
              onChange={(e) => handleRowChange(row.id, 'startTime', e.target.value)}
              className="w-20 px-1.5 py-1 text-[11px] rounded-md border theme-border theme-bg-surface text-center font-mono"
              title="Start Time"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="text"
              value={row.endTime || '11:00 AM'}
              onChange={(e) => handleRowChange(row.id, 'endTime', e.target.value)}
              className="w-20 px-1.5 py-1 text-[11px] rounded-md border theme-border theme-bg-surface text-center font-mono"
              title="End Time"
            />
          </div>
        ),
      },
      {
        key: 'teacherName',
        title: 'Examiner Teacher',
        headerClassName: 'min-w-[170px]',
        className: 'min-w-[170px]',
        render: (_val, row) => (
          <TeacherSelect
            value={row.teacherName}
            label={false}
            allowAll={false}
            placeholder="Assign Teacher..."
            onChange={(val, teacherObj) =>
              handleRowChange(row.id, 'teacherName', teacherObj?.name || teacherObj?.label || val || '')
            }
          />
        ),
      },
      {
        key: 'marks',
        title: 'Marks (Full/Pass)',
        headerClassName: 'w-28 text-center',
        className: 'w-28 text-center',
        render: (_val, row) => (
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={1}
              value={row.fullMarks}
              onChange={(e) => handleRowChange(row.id, 'fullMarks', e.target.value)}
              className="w-12 px-1 py-1 text-[11px] rounded-md border theme-border theme-bg-surface text-center font-bold"
              title="Full Marks"
            />
            <span className="text-slate-400 font-bold">/</span>
            <input
              type="number"
              min={1}
              max={row.fullMarks}
              value={row.passMarks}
              onChange={(e) => handleRowChange(row.id, 'passMarks', e.target.value)}
              className="w-12 px-1 py-1 text-[11px] rounded-md border theme-border theme-bg-surface text-center theme-text-secondary"
              title="Pass Marks"
            />
          </div>
        ),
      },
      {
        key: 'breakdown',
        title: 'Breakdown',
        headerClassName: 'w-24 text-center',
        className: 'w-24 text-center',
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => handleOpenComponentModal(row)}
            className="px-2 py-1 rounded-lg text-[10px] font-bold theme-bg-sub border theme-border hover:border-[var(--accent-main)]/50 transition-all cursor-pointer truncate max-w-[90px]"
            title="Click to edit sub-component marks breakdown"
          >
            {row.components && row.components.length > 0
              ? `${row.components.length} Parts`
              : 'Default'}
          </button>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        headerClassName: 'w-12 text-center',
        className: 'w-12 text-center',
        render: (_val, row, idx) => (
          <ActionMenu
            buttonClassName="p-1 rounded-lg border-0 shadow-none hover:theme-bg-sub"
            actions={[
              {
                label: 'Duplicate Row',
                icon: PlusIcon,
                onClick: () => handleDuplicateRow(row),
              },
              {
                label: 'Delete Row',
                icon: TrashIcon,
                danger: true,
                onClick: () => handleDeleteRow(row.id),
              },
            ]}
            align="right"
            ariaLabel={`Actions for row ${idx + 1}`}
          />
        ),
      },
    ];
  }, [availableCurriculumBooks, designatedExamDays]);

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* 1. Exam Session Selection & Context Banner */}
      <div className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <CustomSelect
              label="Active Examination Session"
              options={examOptions}
              value={selectedExamId}
              onChange={(val) => {
                if (isDirty && !window.confirm('You have unsaved changes in the matrix. Switch exam session anyway?')) {
                  return;
                }
                setSelectedExamId(val);
                setSelectedRowIds(new Set());
              }}
              placeholder="Select Examination Session..."
              required
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CustomButton
              variant="soft"
              size="sm"
              icon={SparklesIcon}
              onClick={handleAutoPopulateFromCurriculum}
              title="Automatically generate rows for all curriculum books belonging to this exam"
            >
              Auto-Populate from Curriculum
            </CustomButton>

            <CustomButton
              variant="sub"
              size="sm"
              icon={PlusIcon}
              onClick={handleAddCustomRow}
            >
              Add Subject Row
            </CustomButton>

            <CustomButton
              variant="primary"
              size="sm"
              icon={CheckIcon}
              loading={saving}
              loadingText="Saving..."
              onClick={handleSaveAll}
              className={isDirty ? 'ring-2 ring-[var(--accent-main)]' : ''}
            >
              {isDirty ? 'Save All Changes *' : 'Save Routine Matrix'}
            </CustomButton>
          </div>
        </div>

        {/* Session Metrics Strip */}
        {activeExam && (
          <div className="pt-2 border-t theme-border flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border font-medium flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Window:</span>
              <strong className="theme-text-primary font-mono">
                {activeExam.startDate || 'N/A'} ➔ {activeExam.endDate || 'N/A'}
              </strong>
            </span>

            <span className="px-2.5 py-1 rounded-lg theme-bg-accent-soft border border-[var(--accent-main)]/20 theme-accent font-medium flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>Designated Exam Days:</span>
              <strong className="font-bold">{designatedExamDays.length} Days</strong>
            </span>

            <span className="px-2.5 py-1 rounded-lg theme-bg-sub border theme-border font-medium flex items-center gap-1.5">
              <AcademicCapIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Participating Classes:</span>
              <strong className="theme-text-primary">{participatingClasses.length} Classes</strong>
            </span>

            <span className="px-2.5 py-1 rounded-lg theme-bg-surface border theme-border text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 ml-auto">
              <span>Total Scheduled:</span>
              <strong className="theme-text-primary font-bold">{rows.length} Subjects</strong>
            </span>
          </div>
        )}
      </div>

      {/* 2. Filter & Bulk Actions Bar */}
      <div className="p-3 rounded-xl border theme-border theme-bg-surface shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="w-48 sm:w-56">
            <CustomInput
              placeholder="Search subject, book, teacher..."
              icon={SearchIcon}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="w-40">
            <DepartmentSelect
              value={filterDepartmentId}
              allowAll={true}
              allValue="ALL"
              allLabel="All Departments"
              onChange={setFilterDepartmentId}
            />
          </div>

          <div className="w-40">
            <ClassSelect
              value={filterClassId}
              departmentId={filterDepartmentId}
              allowAll={true}
              allValue="ALL"
              allLabel="All Classes"
              onChange={setFilterClassId}
            />
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedRowIds.size > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-lg theme-bg-sub/60 border theme-border animate-fade-in">
            <span className="text-xs font-bold theme-accent px-2">
              {selectedRowIds.size} selected
            </span>

            <CustomButton
              size="xs"
              variant="sub"
              icon={TimerIcon}
              onClick={() => setShowBulkTimeModal(true)}
            >
              Set Time
            </CustomButton>

            <CustomButton
              size="xs"
              variant="sub"
              icon={CalendarIcon}
              onClick={handleDistributeDates}
              title="Spread selected subjects across session exam days"
            >
              Distribute Dates
            </CustomButton>

            <CustomButton
              size="xs"
              variant="sub"
              icon={EditIcon}
              onClick={() => setShowBulkTeacherModal(true)}
            >
              Set Examiner
            </CustomButton>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
              title="Delete Selected Rows"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Official Project DataTable (Without TARGET CLASS column) */}
      <DataTable
        columns={columns}
        data={filteredRows}
        keyExtractor={(item) => item.id}
        selectable={true}
        selectedIds={selectedRowIds}
        onSelectRow={(id) => handleSelectRow(id)}
        onSelectAll={(selectedIds) => setSelectedRowIds(new Set(selectedIds))}
        emptyTitle="No Subject Routines Found"
        emptySubMessage="Click 'Auto-Populate from Curriculum' or 'Add Subject Row' to configure subject schedules."
        emptyIcon={BookOpenIcon}
        compact={true}
      />

      {/* ─── MODAL 1: Bulk Time Slot Application ────────────────────────────────── */}
      {showBulkTimeModal && (
        <Modal
          isOpen={showBulkTimeModal}
          onClose={() => setShowBulkTimeModal(false)}
          title="Apply Time Slot to Selected Subjects"
          size="sm"
        >
          <div className="space-y-4 p-1">
            <p className="text-xs theme-text-secondary">
              Update the start and end examination times for all {selectedRowIds.size} selected subjects at once.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Start Time"
                value={bulkStartTime}
                onChange={setBulkStartTime}
                placeholder="e.g. 09:00 AM"
              />
              <CustomInput
                label="End Time"
                value={bulkEndTime}
                onChange={setBulkEndTime}
                placeholder="e.g. 11:00 AM"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
              <CustomButton
                variant="sub"
                size="sm"
                onClick={() => setShowBulkTimeModal(false)}
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="primary"
                size="sm"
                icon={CheckIcon}
                onClick={handleApplyBulkTime}
              >
                Apply Time
              </CustomButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 2: Bulk Teacher Assignment ──────────────────────────────────── */}
      {showBulkTeacherModal && (
        <Modal
          isOpen={showBulkTeacherModal}
          onClose={() => setShowBulkTeacherModal(false)}
          title="Assign Examiner to Selected Subjects"
          size="sm"
        >
          <div className="space-y-4 p-1">
            <p className="text-xs theme-text-secondary">
              Assign an examiner or invigilator teacher to all {selectedRowIds.size} selected subjects.
            </p>

            <TeacherSelect
              label="Examiner Teacher"
              value={bulkTeacherName}
              allowAll={false}
              placeholder="Select Teacher..."
              onChange={(val, obj) => setBulkTeacherName(obj?.name || obj?.label || val || '')}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
              <CustomButton
                variant="sub"
                size="sm"
                onClick={() => setShowBulkTeacherModal(false)}
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="primary"
                size="sm"
                icon={CheckIcon}
                onClick={handleApplyBulkTeacher}
              >
                Assign Examiner
              </CustomButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 3: Sub-Component Breakdown Fine-Tuning ───────────────────────── */}
      {editingComponentRowId && (
        <Modal
          isOpen={Boolean(editingComponentRowId)}
          onClose={() => setEditingComponentRowId(null)}
          title="Marks Sub-Component Breakdown"
          size="md"
        >
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold theme-text-secondary">
                Breakdown Components (Sum must equal Full Marks):
              </span>
              <CustomButton
                size="xs"
                variant="sub"
                icon={PlusIcon}
                onClick={() =>
                  setComponentDrafts((prev) => [...prev, { name: 'New Component', maxMarks: 10 }])
                }
              >
                Add Part
              </CustomButton>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {componentDrafts.map((comp, cIdx) => (
                <div
                  key={cIdx}
                  className="flex items-center gap-2 p-2 rounded-lg border theme-border theme-bg-sub/30"
                >
                  <div className="flex-1">
                    <CustomInput
                      placeholder="Part (e.g. Written, Oral, Tajweed)"
                      value={comp.name}
                      onChange={(val) => {
                        const next = [...componentDrafts];
                        next[cIdx].name = val;
                        setComponentDrafts(next);
                      }}
                    />
                  </div>
                  <div className="w-24">
                    <CustomInput
                      type="number"
                      min={0}
                      suffix="pts"
                      value={comp.maxMarks}
                      onChange={(val) => {
                        const next = [...componentDrafts];
                        next[cIdx].maxMarks = Math.max(0, parseInt(val, 10) || 0);
                        setComponentDrafts(next);
                      }}
                    />
                  </div>
                  {componentDrafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setComponentDrafts((prev) => prev.filter((_, i) => i !== cIdx))
                      }
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t theme-border text-xs">
              <span className="font-bold theme-text-secondary">
                Current Sum:{' '}
                <strong className="theme-text-primary">
                  {componentDrafts.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0)} pts
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <CustomButton
                  variant="sub"
                  size="sm"
                  onClick={() => setEditingComponentRowId(null)}
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  variant="primary"
                  size="sm"
                  icon={CheckIcon}
                  onClick={handleSaveComponentBreakdown}
                >
                  Save Breakdown
                </CustomButton>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

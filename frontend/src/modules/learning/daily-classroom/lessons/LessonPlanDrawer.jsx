import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import {
  CheckIcon,
  BookOpenIcon,
  CalendarIcon,
  EditIcon,
  ChecklistIcon,
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';
import { learningStore } from '../../../../utils/stores/learningStore';
import { curriculumStore, getOrdinalPeriodLabel } from '../../../../utils/localStore';
import { useAcademicData } from '../../useAcademicData';
import { useTenant } from '../../../../context/TenantContext';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';

const SCOPE_OPTIONS = [
  { value: 'CLASS_WIDE', label: 'Class Wide (All Enrolled Students)' },
  { value: 'SPECIFIC_STUDENTS', label: 'Specific Students (Individual Assignment)' },
];

export default function LessonPlanDrawer({
  lesson = null,
  defaultDepartmentId = '',
  defaultClassId = '',
  defaultSectionId = '',
  defaultPeriodId = '',
  defaultBookId = '',
  defaultDate = '',
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const {
    departments = [],
    classes = [],
    sections = [],
    students = [],
    periodSlots = [],
    teachers = [],
    staff = [],
  } = useAcademicData() || {};
  const tenantId = activeTenantId || 'default';

  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || lesson?.department_id || '');
  const [classId, setClassId] = useState(defaultClassId || lesson?.academic_class || '');
  const [sectionId, setSectionId] = useState(defaultSectionId || lesson?.section || '');
  const [periodSlotId, setPeriodSlotId] = useState(defaultPeriodId || lesson?.period_slot || '');
  const [curriculumBookId, setCurriculumBookId] = useState(lesson?.curriculum_book_id || defaultBookId || '');
  const [curriculumBookName, setCurriculumBookName] = useState(lesson?.curriculum_book_name || '');
  const [subjectName, setSubjectName] = useState(lesson?.subject_name || '');
  const [teacherName, setTeacherName] = useState(lesson?.teacher_name || '');
  const [lessonDate, setLessonDate] = useState(defaultDate || lesson?.lesson_date || new Date().toISOString().split('T')[0]);
  const [lessonTitle, setLessonTitle] = useState(lesson?.lesson_title || '');
  const [startUnit, setStartUnit] = useState(lesson?.start_unit || '');
  const [endUnit, setEndUnit] = useState(lesson?.end_unit || '');
  const [homeworkTask, setHomeworkTask] = useState(lesson?.homework_task || '');
  const [lessonInstructions, setLessonInstructions] = useState(lesson?.lesson_instructions || '');
  const [assignedScope, setAssignedScope] = useState(() => {
    const raw = lesson?.assigned_scope;
    if (raw === 'INDIVIDUAL_STUDENT' || raw === 'SPECIFIC_STUDENTS') return 'SPECIFIC_STUDENTS';
    return 'CLASS_WIDE';
  });
  const [targetStudentIds, setTargetStudentIds] = useState(() => {
    if (Array.isArray(lesson?.target_student_ids)) return lesson.target_student_ids.map(String);
    if (lesson?.target_student_id) return [String(lesson.target_student_id)];
    return [];
  });
  const [saving, setSaving] = useState(false);

  // Curriculum books for tenant
  const [curriculumBooks, setCurriculumBooks] = useState([]);
  useEffect(() => {
    try {
      const items = curriculumStore.getItems(tenantId) || [];
      setCurriculumBooks(items);
    } catch {}
  }, [tenantId]);

  // Initial populate / sync when editing or defaults change
  useEffect(() => {
    if (lesson) {
      setDepartmentId(lesson.department_id || '');
      setClassId(lesson.academic_class || '');
      setSectionId(lesson.section || '');
      setPeriodSlotId(lesson.period_slot || '');
      setCurriculumBookId(lesson.curriculum_book_id || '');
      setCurriculumBookName(lesson.curriculum_book_name || '');
      setSubjectName(lesson.subject_name || '');
      setTeacherName(lesson.teacher_name || '');
      setLessonDate(lesson.lesson_date || new Date().toISOString().split('T')[0]);
      setLessonTitle(lesson.lesson_title || '');
      setStartUnit(lesson.start_unit || '');
      setEndUnit(lesson.end_unit || '');
      setHomeworkTask(lesson.homework_task || '');
      setLessonInstructions(lesson.lesson_instructions || '');
      const raw = lesson.assigned_scope;
      setAssignedScope(raw === 'INDIVIDUAL_STUDENT' || raw === 'SPECIFIC_STUDENTS' ? 'SPECIFIC_STUDENTS' : 'CLASS_WIDE');
      if (Array.isArray(lesson.target_student_ids)) {
        setTargetStudentIds(lesson.target_student_ids.map(String));
      } else if (lesson.target_student_id) {
        setTargetStudentIds([String(lesson.target_student_id)]);
      } else {
        setTargetStudentIds([]);
      }
    } else {
      if (defaultClassId) setClassId(defaultClassId);
      if (defaultSectionId && defaultSectionId !== 'ALL') setSectionId(defaultSectionId);
      if (defaultPeriodId && defaultPeriodId !== 'ALL') setPeriodSlotId(defaultPeriodId);
      if (defaultBookId) setCurriculumBookId(defaultBookId);
      if (defaultDate) setLessonDate(defaultDate);
    }
  }, [lesson, defaultClassId, defaultSectionId, defaultPeriodId, defaultBookId, defaultDate]);

  // Filter classes by department if selected
  const filteredClasses = useMemo(() => {
    if (!departmentId) return classes;
    return classes.filter((c) => {
      const cDept = c.department !== undefined ? c.department : c.department_id;
      const cDeptId = typeof cDept === 'object' ? String(cDept?.id || '') : String(cDept || '');
      return cDeptId === String(departmentId);
    });
  }, [classes, departmentId]);

  // Filter sections belonging to selected class
  const filteredSections = useMemo(() => {
    if (!classId) return sections;
    return sections.filter((s) => {
      const rawCls = s.student_class !== undefined ? s.student_class : (s.class_id || s.class);
      const sClsId = typeof rawCls === 'object' ? String(rawCls?.id || '') : String(rawCls || '');
      return sClsId === String(classId);
    });
  }, [sections, classId]);

  // Filter students belonging to selected class & section
  const filteredStudents = useMemo(() => {
    if (!classId) return students;
    return students.filter((st) => {
      const stCls = st.student_class !== undefined ? st.student_class : (st.class_id || st.class);
      const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');
      if (stClsId !== String(classId)) return false;
      if (sectionId) {
        const stSec = st.section !== undefined ? st.section : (st.section_id || st.student_section);
        const stSecId = typeof stSec === 'object' ? String(stSec?.id || '') : String(stSec || '');
        if (stSecId && stSecId !== String(sectionId)) return false;
      }
      return true;
    });
  }, [students, classId, sectionId]);

  // Filter curriculum books for class
  const availableBooks = useMemo(() => {
    if (!classId) return curriculumBooks;
    return curriculumBooks.filter((b) => !b.classId || String(b.classId) === String(classId));
  }, [curriculumBooks, classId]);

  const selectedBook = useMemo(() => {
    return availableBooks.find((b) => String(b.id) === String(curriculumBookId)) ||
      curriculumBooks.find((b) => String(b.id) === String(curriculumBookId));
  }, [availableBooks, curriculumBooks, curriculumBookId]);

  const resolveBookTeacher = useCallback((b) => {
    if (!b) return '';
    const raw = b.teacherName || b.teacher_name || b.instructor || b.teacher || b.assignedTeacher || '';
    let name = typeof raw === 'object'
      ? (raw?.name_en || raw?.user_name || raw?.name || raw?.full_name || '')
      : String(raw || '');

    if (!name && (b.teacherId || b.teacher_id)) {
      const targetId = String(b.teacherId || b.teacher_id);
      const matched =
        teachers.find((t) => String(t.id) === targetId || String(t.teacher_id) === targetId || String(t.user) === targetId) ||
        staff.find((s) => String(s.id) === targetId || String(s.employee_id) === targetId);
      if (matched) {
        name = matched.name_en || matched.user_name || matched.name || matched.full_name || '';
      }
    }
    return name;
  }, [teachers, staff]);

  // Synchronize book info if selectedBook changes
  useEffect(() => {
    if (selectedBook) {
      if (selectedBook.name) setCurriculumBookName(selectedBook.name);
      if (selectedBook.subject) setSubjectName(selectedBook.subject);

      // Auto-select Assigned Teacher from the selected book
      const autoTeacher = resolveBookTeacher(selectedBook);
      if (autoTeacher) {
        setTeacherName(autoTeacher);
      }

      if (selectedBook.startPage) setStartUnit(String(selectedBook.startPage));
      if (selectedBook.endPage) setEndUnit(String(selectedBook.endPage));
    }
  }, [selectedBook, resolveBookTeacher]);

  // Bound checks on pages based on selected book
  const bookMinPage = selectedBook ? Number(selectedBook.startPage || 1) : 1;
  const bookMaxPage = selectedBook ? Number(selectedBook.endPage || 9999) : undefined;

  const handleStartPageChange = (val) => {
    const rawVal = typeof val === 'string' ? val : val?.target?.value || '';
    if (rawVal === '') {
      setStartUnit('');
      return;
    }
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    if (bookMaxPage && num > bookMaxPage) {
      setStartUnit(String(bookMaxPage));
      showToast(`Start page cannot exceed book end page (${bookMaxPage}).`, 'warning');
      return;
    }
    setStartUnit(String(num));
  };

  const handleEndPageChange = (val) => {
    const rawVal = typeof val === 'string' ? val : val?.target?.value || '';
    if (rawVal === '') {
      setEndUnit('');
      return;
    }
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    if (bookMaxPage && num > bookMaxPage) {
      setEndUnit(String(bookMaxPage));
      showToast(`End page cannot exceed book max page (${bookMaxPage}).`, 'warning');
      return;
    }
    setEndUnit(String(num));
  };

  // Progress stats for selected book
  const bookProgressStats = useMemo(() => {
    if (!selectedBook) return null;
    const start = Number(selectedBook.startPage) || 1;
    const end = Number(selectedBook.endPage) || start;
    const current = Number(selectedBook.currentPage) || 0;
    const total = Number(selectedBook.totalPages) || Math.max(1, end - start + 1);
    const covered = Math.max(0, Math.min(total, current >= start ? current - start + 1 : current));
    const remaining = Math.max(0, total - covered);
    const pct = Math.min(100, Math.round((covered / total) * 100));

    return {
      startPage: start,
      endPage: end,
      currentPage: current,
      totalPages: total,
      coveredPages: covered,
      remainingPages: remaining,
      percentage: pct,
    };
  }, [selectedBook]);

  // Options for Dropdowns
  const classOptions = [
    { value: '', label: 'Select Class Division' },
    ...filteredClasses.map((c) => ({ value: String(c.id), label: c.name || c.class_name })),
  ];

  const sectionOptions = [
    { value: '', label: 'All Sections' },
    ...filteredSections.map((s) => ({ value: String(s.id), label: s.section_name || 'Section' })),
  ];

  const periodOptions = [
    { value: '', label: 'No Specific Period' },
    ...periodSlots.map((p) => ({
      value: String(p.id),
      label: `${p.period_name || getOrdinalPeriodLabel(p.order || 1)}${p.start_time && p.end_time ? ` (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})` : ''}`,
    })),
  ];

  const bookOptions = [
    { value: '', label: 'None' },
    ...availableBooks.map((b) => ({
      value: String(b.id),
      label: `${b.name}${b.subject ? ` (${b.subject})` : ''}`,
    })),
  ];

  const teacherOptions = useMemo(() => {
    const list = [{ value: '', label: 'None (Unassigned)' }];
    const seen = new Set();

    // 1. Live teachers & staff from roster
    [...teachers, ...staff].forEach((t) => {
      const name =
        t.name_en ||
        t.user_name ||
        t.name ||
        (t.first_name ? `${t.first_name} ${t.last_name || ''}`.trim() : '') ||
        t.full_name ||
        t.employee_id ||
        '';
      if (name && !seen.has(name)) {
        seen.add(name);
        const desig = t.designation || t.designation_name || t.rank_name || t.job_title || t.role || '';
        list.push({
          value: name,
          label: desig ? `${name} (${desig})` : name,
        });
      }
    });

    // 2. Instructors assigned in syllabus books
    curriculumBooks.forEach((b) => {
      const tName = b.teacherName || b.teacher_name || b.instructor || '';
      if (tName && !seen.has(tName)) {
        seen.add(tName);
        list.push({ value: tName, label: tName });
      }
    });

    // 3. Current active selection fallback
    if (teacherName && !seen.has(teacherName)) {
      seen.add(teacherName);
      list.push({ value: teacherName, label: teacherName });
    }

    return list;
  }, [teacherName, teachers, staff, curriculumBooks]);

  const handleStudentSelectionToggle = (stId) => {
    setTargetStudentIds((prev) => {
      const exists = prev.includes(stId);
      if (exists) return prev.filter((id) => id !== stId);
      return [...prev, stId];
    });
  };

  const handleSelectAllStudents = () => {
    if (targetStudentIds.length === filteredStudents.length) {
      setTargetStudentIds([]);
    } else {
      setTargetStudentIds(filteredStudents.map((s) => String(s.id)));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!classId) {
      showToast('Please select a target class division.', 'warning');
      return;
    }
    if (!lessonTitle.trim()) {
      showToast('Lesson Title is required.', 'warning');
      return;
    }

    if (assignedScope === 'SPECIFIC_STUDENTS' && targetStudentIds.length === 0) {
      showToast('Please select at least one student for individual assignment.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const matchedClass = classes.find((c) => String(c.id) === String(classId));
      const matchedSection = sections.find((s) => String(s.id) === String(sectionId));
      const matchedPeriod = periodSlots.find((p) => String(p.id) === String(periodSlotId));
      const matchedDept = departments.find((d) => String(d.id) === String(departmentId));

      const payload = {
        id: lesson?.id || `lesson_${Date.now()}`,
        academic_class: classId,
        class_name: matchedClass ? (matchedClass.name || matchedClass.class_name) : 'Academic Class',
        department_id: departmentId || (matchedClass?.department || null),
        department_name: matchedDept ? matchedDept.name : (matchedClass?.department_name || ''),
        section: sectionId || null,
        section_name: matchedSection ? (matchedSection.section_name || 'Section') : null,
        period_slot: periodSlotId || null,
        period_name: matchedPeriod ? (matchedPeriod.period_name || getOrdinalPeriodLabel(matchedPeriod.order || 1)) : null,
        period_time: matchedPeriod?.start_time && matchedPeriod?.end_time
          ? `${matchedPeriod.start_time.slice(0, 5)} - ${matchedPeriod.end_time.slice(0, 5)}`
          : null,
        period_order: matchedPeriod?.order || null,
        curriculum_book_id: curriculumBookId || null,
        curriculum_book_name: curriculumBookName || (selectedBook?.name || null),
        subject_name: subjectName.trim() || 'General Studies',
        teacher_name: teacherName.trim() || (selectedBook?.teacherName || ''),
        lesson_date: lessonDate,
        lesson_title: lessonTitle.trim(),
        start_unit: startUnit ? String(startUnit) : '',
        end_unit: endUnit ? String(endUnit) : '',
        homework_task: homeworkTask.trim() || '',
        lesson_instructions: lessonInstructions.trim() || '',
        assigned_scope: assignedScope,
        target_student_ids: assignedScope === 'SPECIFIC_STUDENTS' ? targetStudentIds : [],
        target_student_id: assignedScope === 'SPECIFIC_STUDENTS' && targetStudentIds.length === 1 ? targetStudentIds[0] : null,
      };

      learningStore.saveDailyLesson(tenantId, payload);
      showToast(lesson ? 'Daily lesson plan updated.' : 'Daily lesson assigned successfully.', 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast('Failed to save daily lesson.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none">
      <form onSubmit={handleSubmit} className="@container p-4 sm:p-6 space-y-6 text-left">
        {/* Section 1: Academic Target & Schedule */}
        <DrawerSection title="Academic Target & Schedule" icon={CalendarIcon}>
          <div className="space-y-4">
            {/* Complementary Row 1: Delivery Date & Period Slot */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <ReusableCalendar
                label="Lesson Delivery Date"
                selectedDate={lessonDate}
                onSelectDate={setLessonDate}
                placeholder="Select Date"
              />
              <CustomSelect
                label="Class Routine Period"
                options={periodOptions}
                value={periodSlotId}
                onChange={setPeriodSlotId}
              />
            </div>

            {/* Complementary Row 2: Target Class & Section */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomSelect
                label="Target Class Division"
                options={classOptions}
                value={classId}
                onChange={(val) => {
                  setClassId(val);
                  setSectionId('');
                  setTargetStudentIds([]);
                }}
                required
              />
              <CustomSelect
                label="Target Section"
                options={sectionOptions}
                value={sectionId}
                onChange={setSectionId}
              />
            </div>

            {/* Assigned Teacher (Locked to selected curriculum book instructor) */}
            <CustomSelect
              label="Assigned Teacher"
              options={teacherOptions}
              value={teacherName}
              onChange={setTeacherName}
              searchable={false}
              disabled={Boolean(curriculumBookId)}
              placeholder="Select assigned teacher..."
            />

            {/* Assignment Scope */}
            <div className="space-y-2">
              <CustomSelect
                label="Assignment Scope"
                options={SCOPE_OPTIONS}
                value={assignedScope}
                onChange={(val) => {
                  setAssignedScope(val);
                  if (val === 'CLASS_WIDE') setTargetStudentIds([]);
                }}
              />

              {/* Specific Students Multi-Selector */}
              {assignedScope === 'SPECIFIC_STUDENTS' && (
                <div className="p-3 rounded-2xl border theme-border theme-bg-sub/30 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-semibold theme-text-primary">
                      Selected Students ({targetStudentIds.length} / {filteredStudents.length})
                    </span>
                    {filteredStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllStudents}
                        className="text-xs font-semibold theme-text-accent hover:underline cursor-pointer"
                      >
                        {targetStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {filteredStudents.length === 0 ? (
                    <p className="text-xs theme-text-secondary italic py-2">
                      No students enrolled in the selected class division.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                      {filteredStudents.map((st) => {
                        const isSelected = targetStudentIds.includes(String(st.id));
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'theme-bg-accent/10 border-[var(--accent-main)] theme-text-primary font-semibold shadow-2xs'
                                : 'theme-bg-surface theme-border theme-text-secondary hover:theme-bg-sub/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleStudentSelectionToggle(String(st.id))}
                                className="rounded theme-border theme-accent cursor-pointer"
                              />
                              <span>{st.name_en || st.name}</span>
                            </div>
                            <span className="text-[11px] theme-text-secondary">
                              {st.uniq_id || st.roll_number || 'N/A'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DrawerSection>

        {/* Section 2: Curriculum Book & Lesson Plan */}
        <DrawerSection title="Curriculum Book & Lesson Plan" icon={BookOpenIcon}>
          <div className="space-y-4">
            <CustomSelect
              label="Curriculum Book"
              options={bookOptions}
              value={curriculumBookId}
              onChange={(val) => {
                setCurriculumBookId(val);
                if (!val) {
                  setCurriculumBookName('');
                  return;
                }
                const b =
                  availableBooks.find((item) => String(item.id) === String(val)) ||
                  curriculumBooks.find((item) => String(item.id) === String(val));
                if (b) {
                  setCurriculumBookName(b.name || '');
                  if (b.subject) setSubjectName(b.subject);

                  // Auto-select Assigned Teacher from the selected book
                  const autoTeacher = resolveBookTeacher(b);
                  if (autoTeacher) {
                    setTeacherName(autoTeacher);
                  }

                  if (b.startPage) setStartUnit(String(b.startPage));
                  if (b.endPage) setEndUnit(String(b.endPage));
                }
              }}
            />

            {/* Dynamic Milestone Progress Banner */}
            {selectedBook && bookProgressStats && (
              <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/40 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-4 h-4 theme-accent" />
                    <span className="text-xs font-bold theme-text-primary">
                      {selectedBook.name} Syllabus Milestone
                    </span>
                  </div>
                  <span className="text-xs font-semibold theme-text-accent">
                    {selectedBook.semester || 'All Semesters'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] theme-text-secondary">
                    <span>
                      {bookProgressStats.currentPage > 0
                        ? `Completed up to Page ${bookProgressStats.currentPage}`
                        : 'Not started yet (Page 0)'}
                    </span>
                    <span className="font-bold theme-text-primary">
                      {bookProgressStats.percentage}% ({bookProgressStats.coveredPages}/{bookProgressStats.totalPages} pgs)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full theme-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 theme-bg-accent"
                      style={{ width: `${bookProgressStats.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className="grid grid-cols-2 @[360px]:grid-cols-4 gap-2 pt-2 border-t theme-border text-[11px]">
                  <div>
                    <span className="block theme-text-secondary text-[10px] uppercase tracking-wider font-semibold">Start Page</span>
                    <span className="font-bold theme-text-primary">{bookProgressStats.startPage}</span>
                  </div>
                  <div>
                    <span className="block theme-text-secondary text-[10px] uppercase tracking-wider font-semibold">Target End</span>
                    <span className="font-bold theme-text-primary">{bookProgressStats.endPage}</span>
                  </div>
                  <div>
                    <span className="block theme-text-secondary text-[10px] uppercase tracking-wider font-semibold">Current Page</span>
                    <span className="font-bold theme-accent">{bookProgressStats.currentPage || '—'}</span>
                  </div>
                  <div>
                    <span className="block theme-text-secondary text-[10px] uppercase tracking-wider font-semibold">Remaining</span>
                    <span className="font-bold theme-text-primary">{bookProgressStats.remainingPages} pgs</span>
                  </div>
                </div>
              </div>
            )}

            <CustomInput
              label="Lesson Title"
              placeholder="e.g. Bab al-Makharij wa Sifat, Surah Al-Kahf (Ayah 1-20)..."
              value={lessonTitle}
              onChange={(val) => setLessonTitle(typeof val === 'string' ? val : val?.target?.value || '')}
              required
            />

            {/* Complementary Row: Start Page & End Page */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Start Page"
                type="number"
                min={bookMinPage}
                max={bookMaxPage || undefined}
                placeholder={selectedBook ? `e.g. ${bookMinPage}` : 'e.g. 1'}
                value={startUnit}
                onChange={handleStartPageChange}
              />

              <CustomInput
                label="End Page"
                type="number"
                min={startUnit ? Math.max(bookMinPage, parseInt(startUnit, 10) || bookMinPage) : bookMinPage}
                max={bookMaxPage || undefined}
                placeholder={selectedBook ? `e.g. ${bookMaxPage}` : 'e.g. 20'}
                value={endUnit}
                onChange={handleEndPageChange}
                helperText={selectedBook ? `Total: ${selectedBook.totalPages || bookMaxPage} pages` : ''}
              />
            </div>
          </div>
        </DrawerSection>

        {/* Section 3: Homework & Guidance Instructions */}
        <DrawerSection title="Homework & Instructions" icon={ChecklistIcon}>
          <div className="space-y-4">
            <CustomInput
              type="textarea"
              rows={2}
              label="Homework Task"
              placeholder="e.g. Memorize lines 15-25 of Mandhumat al-Jazariyyah, Solve exercise 4..."
              value={homeworkTask}
              onChange={(val) => setHomeworkTask(typeof val === 'string' ? val : val?.target?.value || '')}
            />

            <CustomInput
              type="textarea"
              rows={3}
              label="Instructions"
              placeholder="Detailed instructions for classroom delivery, articulation checks, notes..."
              value={lessonInstructions}
              onChange={(val) => setLessonInstructions(typeof val === 'string' ? val : val?.target?.value || '')}
            />
          </div>
        </DrawerSection>

        {/* Drawer Footer */}
        <DrawerFooter>
          <CustomButton
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </CustomButton>
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            icon={CheckIcon}
          >
            {lesson ? 'Update Lesson' : 'Assign Sabaq'}
          </CustomButton>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}

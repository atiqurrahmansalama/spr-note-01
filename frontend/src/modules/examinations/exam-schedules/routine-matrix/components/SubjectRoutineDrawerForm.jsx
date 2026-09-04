import React, { useState, useMemo, useEffect } from 'react';
import { DrawerContainer, DrawerBanner, DrawerSection, DrawerFooter } from '../../../../../components/layout';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../../../components/ui/CustomCheckbox';
import CustomButton from '../../../../../components/ui/CustomButton';
import {
  DepartmentSelect,
  ClassSelect,
  SectionSelect,
  TeacherSelect,
} from '../../../../../components/selectors';
import {
  AcademicCapIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
} from '../../../../../components/ui/Icons';
import { formatShortDateLabel } from '../hooks/useSubjectMatrixState';

const EVALUATION_TYPE_OPTIONS = [
  { value: 'WRITTEN_THEORY', label: 'Theory / Written Examination' },
  { value: 'ORAL_VIVA', label: 'Oral / Viva / Nazera Examination' },
  { value: 'PRACTICAL_LAB', label: 'Practical / Lab Examination' },
  { value: 'MCQ_OBJECTIVE', label: 'MCQ / Objective Paper' },
  { value: 'COMPOSITE', label: 'Composite (Theory + Viva / MCQ)' },
];

/**
 * SubjectRoutineDrawerForm
 * Enterprise Right Sidebar Drawer Form for Creating and Editing Exam Subject Routines.
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Zero double-padding (padding="none")
 * - Streamlined Section Separation (No boxed cards)
 * - Reusable Selectors (DepartmentSelect, ClassSelect, SectionSelect, TeacherSelect)
 */
export default function SubjectRoutineDrawerForm({
  mode = 'add',
  initialData = null,
  activeExam = null,
  allAvailableClasses = [],
  availableCurriculumBooks = [],
  examShifts = [],
  designatedExamDays = [],
  onSave,
  onCancel,
}) {
  const isEditMode = mode === 'edit' || (Boolean(initialData?.id) && mode !== 'add');

  // Breakdown Enabled Toggle State
  const [breakdownEnabled, setBreakdownEnabled] = useState(() => {
    if (initialData) {
      if (initialData.breakdownEnabled !== undefined) {
        return Boolean(initialData.breakdownEnabled);
      }
      return Array.isArray(initialData.components) && initialData.components.length > 0;
    }
    return true;
  });

  // Form State Initialization
  const [formData, setFormData] = useState(() => {
    const defaultClass = allAvailableClasses.find(c => String(c.id) === String(initialData?.classId)) || allAvailableClasses[0] || null;
    const defaultShift = examShifts.find(s => String(s.id) === String(initialData?.shiftId)) || examShifts[0] || {
      id: 'shift_1',
      name: 'Shift 1 (Morning)',
      startTime: '09:00 AM',
      endTime: '11:00 AM',
    };
    const defaultFull = Number(activeExam?.defaultFullMarks || activeExam?.targetFullMarks || 100);
    const defaultPass = Math.round(defaultFull * 0.33);

    const matchedBook = initialData?.curriculumBookId
      ? availableCurriculumBooks.find((b) => String(b.id) === String(initialData.curriculumBookId))
      : null;

    if (initialData) {
      const clsName = initialData.className || defaultClass?.name || defaultClass?.class_name || '';
      const deptId = initialData.departmentId || defaultClass?.departmentId || defaultClass?.department_id || (typeof defaultClass?.department === 'object' ? defaultClass?.department?.id : defaultClass?.department) || '';
      const deptName = initialData.departmentName || defaultClass?.departmentName || defaultClass?.department_name || 'General Dept';
      const bookName = initialData.curriculumBookName || matchedBook?.name || matchedBook?.title || '';

      return {
        id: initialData.id,
        examId: initialData.examId || activeExam?.id || '',
        classId: initialData.classId ? String(initialData.classId) : (defaultClass?.id ? String(defaultClass.id) : ''),
        className: clsName,
        departmentId: deptId ? String(deptId) : '',
        departmentName: deptName,
        sectionId: initialData.sectionId ? String(initialData.sectionId) : '',
        sectionName: initialData.sectionName || 'All Sections',
        curriculumBookId: initialData.curriculumBookId ? String(initialData.curriculumBookId) : '',
        curriculumBookName: bookName,
        subjectName: initialData.subjectName || '',
        subjectCode: initialData.subjectCode || '',
        evaluationType: initialData.evaluationType || 'COMPOSITE',
        examDate: initialData.examDate || designatedExamDays[0] || activeExam?.startDate || '',
        shiftId: initialData.shiftId || defaultShift.id,
        shiftName: initialData.shiftName || defaultShift.name,
        startTime: initialData.startTime || defaultShift.startTime,
        endTime: initialData.endTime || defaultShift.endTime,
        roomNo: initialData.roomNo || '',
        teacherId: initialData.teacherId ? String(initialData.teacherId) : '',
        teacherName: initialData.teacherName || '',
        notes: initialData.notes || '',
        fullMarks: Number(initialData.fullMarks || defaultFull),
        passMarks: Number(initialData.passMarks || defaultPass),
        components: Array.isArray(initialData.components) && initialData.components.length > 0
          ? initialData.components
          : [
              { id: 'comp_1', name: 'Written Exam', maxMarks: Math.round(defaultFull * 0.7) },
              { id: 'comp_2', name: 'Oral / Nazera', maxMarks: defaultFull - Math.round(defaultFull * 0.7) },
            ],
      };
    }

    return {
      id: `subj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      examId: activeExam?.id || '',
      classId: defaultClass?.id ? String(defaultClass.id) : '',
      className: defaultClass?.name || defaultClass?.class_name || '',
      departmentId: defaultClass?.departmentId || defaultClass?.department_id || (typeof defaultClass?.department === 'object' ? defaultClass?.department?.id : defaultClass?.department) || '',
      departmentName: defaultClass?.departmentName || defaultClass?.department_name || 'General Dept',
      sectionId: '',
      sectionName: 'All Sections',
      curriculumBookId: '',
      curriculumBookName: '',
      subjectName: '',
      subjectCode: '',
      evaluationType: 'COMPOSITE',
      examDate: designatedExamDays[0] || activeExam?.startDate || '',
      shiftId: defaultShift.id,
      shiftName: defaultShift.name,
      startTime: defaultShift.startTime,
      endTime: defaultShift.endTime,
      roomNo: '',
      teacherId: '',
      teacherName: '',
      notes: '',
      fullMarks: defaultFull,
      passMarks: defaultPass,
      components: [
        { id: 'comp_1', name: 'Written Exam', maxMarks: Math.round(defaultFull * 0.7) },
        { id: 'comp_2', name: 'Oral / Nazera', maxMarks: defaultFull - Math.round(defaultFull * 0.7) },
      ],
    };
  });

  // Dynamic Class-Filtered Curriculum Books
  const classMatchingBooks = useMemo(() => {
    const rowClassId = String(formData.classId || '').trim();
    const rowClassNameClean = String(formData.className || '').toLowerCase().trim();

    if (!rowClassId && !rowClassNameClean) return [];

    return availableCurriculumBooks.filter((b) => {
      const bClassId = String(
        b.classId || b.class_id || (typeof b.class === 'object' ? b.class?.id : b.class) || ''
      ).trim();
      const bClassName = String(b.className || b.class_name || '').toLowerCase().trim();

      if (rowClassId && bClassId && (bClassId === rowClassId || rowClassId.includes(bClassId))) return true;
      if (
        rowClassNameClean &&
        bClassName &&
        (bClassName === rowClassNameClean ||
          bClassName.includes(rowClassNameClean) ||
          rowClassNameClean.includes(bClassName))
      )
        return true;
      return false;
    });
  }, [formData.classId, formData.className, availableCurriculumBooks]);

  // Book Select Options
  const bookOptions = useMemo(() => {
    return [
      ...classMatchingBooks.map((b) => ({
        value: String(b.id),
        label: b.subject ? `${b.name || b.title} (${b.subject})` : b.name || b.title || 'Book',
        bookObj: b,
      })),
      { value: 'CUSTOM', label: 'Custom / Non-Curriculum Subject' },
    ];
  }, [classMatchingBooks]);

  // Date Options
  const dateOptions = useMemo(() => {
    return designatedExamDays.map((d) => ({
      value: d,
      label: `${formatShortDateLabel(d)} (${d})`,
    }));
  }, [designatedExamDays]);

  // Shift Options
  const shiftOptions = useMemo(() => {
    return examShifts.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.startTime} – ${s.endTime})`,
      shiftObj: s,
    }));
  }, [examShifts]);

  // Handlers
  const handleDepartmentChange = (deptId, deptObj) => {
    const deptTitle = deptObj?.name || deptObj?.department_name || deptObj?.label || '';
    setFormData((prev) => ({
      ...prev,
      departmentId: deptId || '',
      departmentName: deptTitle,
    }));
  };

  const handleClassChange = (selectedVal, selectedClassObj) => {
    const clsName = selectedClassObj?.name || selectedClassObj?.class_name || selectedClassObj?.label || '';
    const deptId = selectedClassObj?.department_id || selectedClassObj?.departmentId || formData.departmentId || '';
    const deptName = selectedClassObj?.department_name || selectedClassObj?.departmentName || formData.departmentName || 'General Dept';

    setFormData((prev) => ({
      ...prev,
      classId: selectedVal || '',
      className: clsName,
      departmentId: deptId,
      departmentName: deptName,
      curriculumBookId: '',
      curriculumBookName: '',
      subjectName: prev.subjectName || (clsName ? `${clsName} Subject` : ''),
    }));
  };

  const handleSectionChange = (secVal, secObj) => {
    const secTitle = secVal === 'ALL' || !secVal ? 'All Sections' : (secObj?.name || secObj?.section_name || secObj?.label || secVal);
    setFormData((prev) => ({
      ...prev,
      sectionId: secVal === 'ALL' ? '' : secVal,
      sectionName: secTitle,
    }));
  };

  const handleBookChange = (bookId) => {
    if (bookId === 'CUSTOM' || !bookId) {
      setFormData((prev) => ({
        ...prev,
        curriculumBookId: '',
        curriculumBookName: '',
      }));
      return;
    }

    const selectedBook = classMatchingBooks.find((b) => String(b.id) === String(bookId));
    if (selectedBook) {
      const bookTitle = selectedBook.name || selectedBook.title || selectedBook.subject || 'Subject Exam';
      const autoTeacherId = selectedBook.teacherId || selectedBook.teacher_id || formData.teacherId || '';
      const autoTeacherName = selectedBook.teacherName || selectedBook.teacher_name || selectedBook.teacher || formData.teacherName || '';

      setFormData((prev) => ({
        ...prev,
        curriculumBookId: String(selectedBook.id),
        curriculumBookName: bookTitle,
        subjectName: prev.subjectName ? prev.subjectName : bookTitle,
        subjectCode: selectedBook.code || selectedBook.book_code || prev.subjectCode,
        teacherId: autoTeacherId,
        teacherName: autoTeacherName,
      }));
    }
  };

  const handleShiftChange = (shiftId) => {
    const selected = examShifts.find((s) => s.id === shiftId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        shiftId: selected.id,
        shiftName: selected.name,
        startTime: selected.startTime,
        endTime: selected.endTime,
      }));
    }
  };

  // Assessment Component Handlers
  const handleToggleBreakdown = (checked) => {
    setBreakdownEnabled(checked);
    if (checked) {
      if (!formData.components || formData.components.length === 0) {
        const total = Number(formData.fullMarks || 100);
        const p1 = Math.round(total * 0.7);
        const p2 = Math.max(0, total - p1);
        setFormData((prev) => ({
          ...prev,
          components: [
            { id: `comp_${Date.now()}_1`, name: 'Written Exam', maxMarks: p1 },
            { id: `comp_${Date.now()}_2`, name: 'Oral / Nazera', maxMarks: p2 },
          ],
        }));
      }
    }
  };

  const handleAddComponent = () => {
    const defaultFull = Number(formData.fullMarks || 100);
    const existingTotal = (formData.components || []).reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);
    const remaining = Math.max(0, defaultFull - existingTotal);
    const nextIdx = (formData.components || []).length + 1;
    setFormData((prev) => ({
      ...prev,
      components: [
        ...(prev.components || []),
        {
          id: `comp_${Date.now()}_${nextIdx}`,
          name: `Assessment Component ${nextIdx}`,
          maxMarks: remaining > 0 ? remaining : 10,
        },
      ],
    }));
  };

  const handleRemoveComponent = (idx) => {
    setFormData((prev) => ({
      ...prev,
      components: (prev.components || []).filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateComponent = (idx, field, value) => {
    setFormData((prev) => {
      const nextComps = [...(prev.components || [])];
      nextComps[idx] = {
        ...nextComps[idx],
        [field]: field === 'maxMarks' ? (value === '' ? '' : Math.max(0, parseInt(value, 10) || 0)) : value,
      };
      return {
        ...prev,
        components: nextComps,
      };
    });
  };

  const handleAutoBalance = () => {
    const total = Number(formData.fullMarks || 100);
    const comps = formData.components || [];
    if (!comps.length) {
      setFormData((prev) => ({
        ...prev,
        components: [
          { id: `comp_${Date.now()}_1`, name: 'Written Exam', maxMarks: Math.round(total * 0.7) },
          { id: `comp_${Date.now()}_2`, name: 'Oral / Nazera', maxMarks: total - Math.round(total * 0.7) },
        ],
      }));
      return;
    }
    const currentSum = comps.reduce((s, c) => s + (Number(c.maxMarks) || 0), 0);
    if (currentSum === total) return;

    const diff = total - currentSum;
    const updated = [...comps];
    const lastIdx = updated.length - 1;
    updated[lastIdx] = {
      ...updated[lastIdx],
      maxMarks: Math.max(0, (Number(updated[lastIdx].maxMarks) || 0) + diff),
    };
    setFormData((prev) => ({ ...prev, components: updated }));
  };

  const componentsTotalMarks = useMemo(() => {
    if (!breakdownEnabled) return Number(formData.fullMarks || 100);
    return (formData.components || []).reduce((acc, c) => acc + (Number(c.maxMarks) || 0), 0);
  }, [breakdownEnabled, formData.components, formData.fullMarks]);

  const parsedTargetMarks = Number(formData.fullMarks) || 100;
  const isMarksSumBalanced = !breakdownEnabled || componentsTotalMarks === parsedTargetMarks;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.subjectName || !formData.subjectName.trim()) {
      alert('Please enter a valid Subject Exam Title.');
      return;
    }
    if (!formData.classId) {
      alert('Please select a target Academic Class.');
      return;
    }

    const matchedClass = allAvailableClasses.find((c) => String(c.id) === String(formData.classId));
    const resolvedClassName = formData.className || matchedClass?.name || matchedClass?.class_name || 'Class';
    const resolvedDeptId = formData.departmentId || matchedClass?.department_id || (typeof matchedClass?.department === 'object' ? matchedClass?.department?.id : matchedClass?.department) || 'ALL';
    const resolvedDeptName = formData.departmentName || matchedClass?.department_name || matchedClass?.departmentName || 'General Dept';

    const matchedBook = formData.curriculumBookId
      ? availableCurriculumBooks.find((b) => String(b.id) === String(formData.curriculumBookId))
      : null;
    const resolvedBookName = formData.curriculumBookName || matchedBook?.name || matchedBook?.title || '';

    const matchedShift = examShifts.find((s) => String(s.id) === String(formData.shiftId)) || examShifts[0];
    const resolvedShiftName = formData.shiftName || matchedShift?.name || 'Shift 1 (Morning)';
    const resolvedStartTime = formData.startTime || matchedShift?.startTime || '09:00 AM';
    const resolvedEndTime = formData.endTime || matchedShift?.endTime || '11:00 AM';

    const payload = {
      ...formData,
      id: String(formData.id || initialData?.id || `subj_${Date.now()}`),
      examId: String(formData.examId || activeExam?.id || ''),
      subjectName: formData.subjectName.trim(),
      classId: String(formData.classId),
      className: resolvedClassName,
      departmentId: String(resolvedDeptId),
      departmentName: resolvedDeptName,
      sectionId: formData.sectionId || 'ALL',
      sectionName: formData.sectionName || 'All Sections',
      curriculumBookId: formData.curriculumBookId ? String(formData.curriculumBookId) : null,
      curriculumBookName: resolvedBookName,
      subjectCode: formData.subjectCode || '',
      evaluationType: formData.evaluationType || 'COMPOSITE',
      roomNo: formData.roomNo || '',
      teacherId: formData.teacherId ? String(formData.teacherId) : '',
      teacherName: formData.teacherName || '',
      notes: formData.notes || '',
      shiftId: matchedShift?.id || formData.shiftId || 'shift_1',
      shiftName: resolvedShiftName,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      examDate: formData.examDate || designatedExamDays[0] || activeExam?.startDate || '',
      fullMarks: Number(formData.fullMarks || 100),
      passMarks: Number(formData.passMarks || 33),
      breakdownEnabled: Boolean(breakdownEnabled),
      components: breakdownEnabled
        ? (formData.components || []).map((c) => ({
            ...c,
            name: c.name?.trim() || 'Component',
            maxMarks: Number(c.maxMarks) || 0,
          }))
        : [],
    };

    onSave(payload);
  };

  return (
    <DrawerContainer padding="none" spacing="none">
      <form onSubmit={handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* Top Context Banner */}
        <DrawerBanner
          icon={AcademicCapIcon}
          title={isEditMode ? `Edit Subject: ${formData.subjectName || 'Subject Routine'}` : 'Add New Subject Routine'}
          subtitle={activeExam ? `Exam Session: ${activeExam.name} (${activeExam.academicYearName || 'Term'})` : 'Institutional Examination Routine'}
          badge={isEditMode ? 'Edit Mode' : 'New Routine'}
        />

        {/* ─── SECTION 1: Academic Scope (Dept, Class, Section, Hall) ───────────── */}
        <DrawerSection
          title="Academic Scope & Location"
          icon={BuildingLibraryIcon}
        >
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <DepartmentSelect
              label="Department Scope"
              value={formData.departmentId}
              allowAll={true}
              allLabel="All Departments (Institution-Wide)"
              placeholder="Select Department..."
              onChange={handleDepartmentChange}
            />

            <ClassSelect
              label="Target Academic Class"
              value={formData.classId}
              departmentId={formData.departmentId}
              classes={allAvailableClasses}
              allowAll={false}
              placeholder="Select Class..."
              required
              onChange={handleClassChange}
            />

            <SectionSelect
              label="Section Scope"
              value={formData.sectionId || 'ALL'}
              classId={formData.classId}
              allowAll={true}
              allValue="ALL"
              allLabel="All Sections (Class-Wide)"
              placeholder="Select Section Scope..."
              onChange={handleSectionChange}
            />

            <CustomInput
              label="Exam Room / Hall"
              value={formData.roomNo}
              onChange={(val) => setFormData((prev) => ({ ...prev, roomNo: val }))}
              placeholder="e.g. Hall 204, Central Auditorium"
              icon={BuildingLibraryIcon}
            />
          </div>
        </DrawerSection>

        {/* ─── SECTION 2: Subject & Curriculum Book ────────────────────────────── */}
        <DrawerSection
          title="Subject & Curriculum Book"
          icon={BookOpenIcon}
        >
          <div className="space-y-3.5">
            <CustomSelect
              label="Curriculum Textbook"
              value={formData.curriculumBookId || (formData.subjectName ? 'CUSTOM' : '')}
              options={bookOptions}
              icon={BookOpenIcon}
              placeholder={
                formData.classId
                  ? classMatchingBooks.length > 0
                    ? `Select Book (${classMatchingBooks.length} available for ${formData.className})...`
                    : 'No curriculum books found (Choose Custom Subject)...'
                  : 'Select Target Class first...'
              }
              disabled={!formData.classId}
              onChange={handleBookChange}
            />

            <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3.5">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Subject Examination Title"
                  value={formData.subjectName}
                  onChange={(val) => setFormData((prev) => ({ ...prev, subjectName: val }))}
                  placeholder="e.g. Arabic Grammar 1st Paper"
                  required
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* ─── SECTION 3: Schedule & Shift Timing ──────────────────────────────── */}
        <DrawerSection
          title="Schedule & Time Slot"
          icon={CalendarIcon}
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
              {dateOptions.length > 0 ? (
                <CustomSelect
                  label="Designated Examination Date"
                  value={formData.examDate}
                  options={dateOptions}
                  icon={CalendarIcon}
                  onChange={(val) => setFormData((prev) => ({ ...prev, examDate: val }))}
                  required
                />
              ) : (
                <CustomInput
                  type="date"
                  label="Examination Date"
                  value={formData.examDate}
                  onChange={(val) => setFormData((prev) => ({ ...prev, examDate: val }))}
                  required
                />
              )}

              {shiftOptions.length > 0 ? (
                <CustomSelect
                  label="Exam Shift"
                  value={formData.shiftId}
                  options={shiftOptions}
                  icon={ClockIcon}
                  onChange={handleShiftChange}
                />
              ) : (
                <CustomInput
                  label="Shift Name"
                  value={formData.shiftName || 'Shift 1 (Morning)'}
                  onChange={(val) => setFormData((prev) => ({ ...prev, shiftName: val }))}
                  icon={ClockIcon}
                />
              )}
            </div>
          </div>
        </DrawerSection>

        {/* ─── SECTION 4: Invigilation & Examiner ─────────────────────────────── */}
        <DrawerSection
          title="Examiner & Invigilation"
          icon={UserIcon}
        >
          <div className="space-y-3.5">
            <TeacherSelect
              label="Assigned Examiner"
              value={formData.teacherId}
              allowAll={false}
              searchable={true}
              placeholder="Search & assign teacher..."
              onChange={(selectedVal, teacherObj) => {
                const teacherNameStr =
                  teacherObj?.name_en ||
                  teacherObj?.name ||
                  teacherObj?.full_name ||
                  teacherObj?.user_name ||
                  teacherObj?.label ||
                  '';
                setFormData((prev) => ({
                  ...prev,
                  teacherId: selectedVal || '',
                  teacherName: teacherNameStr,
                }));
              }}
            />

            <CustomInput
              label="Invigilation Notes / Instructions"
              value={formData.notes}
              onChange={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
              placeholder="e.g. Roll 1–40 in Hall A, Calculators strictly prohibited"
              icon={DocumentTextIcon}
            />
          </div>
        </DrawerSection>

        {/* ─── SECTION 5: Marks & Assessment Components Breakdown ─────────────── */}
        <DrawerSection
          title="Marks & Assessment Components Breakdown"
          subtitle="Configure baseline evaluation marks scale and component distribution"
          icon={SparklesIcon}
        >
          <div className="space-y-3.5">
            {/* Dynamic Full Marks Baseline Setting Card */}
            <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-xs font-bold theme-text-primary block">
                  Full Marks (Max Marks Scale)
                </span>
                <span className="text-[11px] theme-text-secondary block">
                  Set baseline examination marks scale (e.g. 50, 75, 100 pts).
                </span>
              </div>
              <div className="w-28 shrink-0">
                <CustomInput
                  type="number"
                  min={1}
                  max={1000}
                  allowDecimals={false}
                  suffix="pts"
                  value={formData.fullMarks}
                  onChange={(val) => {
                    const fVal = Math.max(1, Number(val) || 100);
                    setFormData((prev) => ({
                      ...prev,
                      fullMarks: fVal,
                      passMarks: Math.round(fVal * 0.33),
                    }));
                  }}
                  required
                />
              </div>
            </div>

            {/* Enable Toggle Card for Marks Breakdown (Reused from Create Examination Session) */}
            <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5 pr-2 min-w-0">
                <span className="text-xs font-bold theme-text-primary block">
                  Enable Assessment Components Breakdown
                </span>
                <span className="text-[11px] theme-text-secondary block">
                  Divide subject full marks into separate components like Written, Oral, Practical, MCQ.
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {breakdownEnabled && (
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-sub border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden @[480px]:inline text-[11px]">Add Component</span>
                    <span className="@[480px]:hidden text-[11px]">Add</span>
                  </button>
                )}
                <CustomCheckbox
                  checked={breakdownEnabled}
                  onChange={handleToggleBreakdown}
                  size="md"
                />
              </div>
            </div>

            {/* Dynamic Assessment Component Rows (When breakdown is enabled) */}
            {breakdownEnabled && (
              <div className="space-y-3.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs animate-fade-in">
                <div className="space-y-2.5">
                  {(formData.components || []).map((comp, idx) => (
                    <div
                      key={comp.id || `comp-${idx}`}
                      className="p-3.5 rounded-xl border theme-border theme-bg-surface space-y-3 shadow-2xs hover:shadow-xs transition-all duration-150 animate-fade-in"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold theme-text-primary">
                            Assessment Component {idx + 1}
                          </span>
                        </div>

                        {(formData.components || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(idx)}
                            title="Remove component"
                            className="text-[11px] font-semibold theme-text-secondary hover:text-rose-500 cursor-pointer flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:theme-bg-danger-soft active:scale-95 shrink-0"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span className="hidden @[480px]:inline">Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-2.5">
                        <div className="@[480px]:col-span-2">
                          <CustomInput
                            label="Component Title"
                            placeholder="e.g. Written Exam, Oral, MCQ, Practical"
                            value={comp.name}
                            onChange={(val) => handleUpdateComponent(idx, 'name', val)}
                            required
                          />
                        </div>
                        <div>
                          <CustomInput
                            label="Max Marks"
                            type="number"
                            min={0}
                            max={1000}
                            allowDecimals={false}
                            suffix="pts"
                            value={comp.maxMarks}
                            onChange={(val) => handleUpdateComponent(idx, 'maxMarks', val)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Balance Indicator Footer */}
                <div className="flex items-center justify-between text-xs pt-2 border-t theme-border">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold theme-text-secondary">Components Sum:</span>
                    {!isMarksSumBalanced && (
                      <button
                        type="button"
                        onClick={handleAutoBalance}
                        className="text-[11px] font-bold theme-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <SparklesIcon className="w-3 h-3" />
                        <span>Auto-Balance to {formData.fullMarks} pts</span>
                      </button>
                    )}
                  </div>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full font-mono text-[11px] shadow-2xs border transition-all ${
                      isMarksSumBalanced
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                        : 'theme-bg-danger-soft theme-danger border border-[var(--danger-main)]/25'
                    }`}
                  >
                    {componentsTotalMarks} / {formData.fullMarks} pts {!isMarksSumBalanced && '(Must equal Full Marks)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Drawer Action Footer */}
        <DrawerFooter
          onCancel={onCancel}
          cancelLabel="Cancel"
          onSubmit={true}
          onSave={handleSubmit}
          saveLabel={isEditMode ? 'Update Subject Routine' : 'Create Subject Routine'}
          isSaveDisabled={breakdownEnabled && !isMarksSumBalanced}
        />
      </form>
    </DrawerContainer>
  );
}

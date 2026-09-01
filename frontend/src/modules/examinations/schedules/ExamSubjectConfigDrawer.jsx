import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import CustomTimePicker from '../../../components/ui/CustomTimePicker';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import {
  DepartmentSelect,
  ClassSelect,
  SectionSelect,
  TeacherSelect,
} from '../../../components/selectors';
import {
  BookOpenIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  TimerIcon,
} from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { examStore } from '../../../utils/stores/examStore';
import { curriculumStore } from '../../../utils/stores/academicStore';

/**
 * ExamSubjectConfigDrawer
 * Drawer for scheduling exam subjects, setting exam dates, full marks,
 * pass marks, and dynamic sub-component breakdowns.
 * Universal Dynamic Curriculum Integration:
 * 1. Department ➔ 2. Class ➔ 3. Section ➔ 4. Curriculum Book ➔ 5. Subject Name ➔ 6. Examiner Teacher
 */
export default function ExamSubjectConfigDrawer({
  subjectConfig = null,
  exam = null,
  examId = '',
  tenantId = 'default',
  departmentOptions = [],
  classOptions = [],
  sectionOptions = [],
  curriculumBooks: propCurriculumBooks = [],
  teachers = [],
  staff = [],
  onSaveSuccess,
  onCancel,
}) {
  const { showToast } = useToast();

  const [departmentId, setDepartmentId] = useState(
    subjectConfig?.departmentId || exam?.departmentId || 'ALL'
  );
  const [classId, setClassId] = useState(
    subjectConfig?.classId ? String(subjectConfig.classId) : ''
  );
  const [selectedClassObj, setSelectedClassObj] = useState(null);
  const [className, setClassName] = useState(
    subjectConfig?.className || ''
  );
  const [sectionId, setSectionId] = useState(
    subjectConfig?.sectionId || 'ALL'
  );
  const [curriculumBookId, setCurriculumBookId] = useState(
    subjectConfig?.curriculumBookId || ''
  );
  const [subjectName, setSubjectName] = useState(
    subjectConfig?.subjectName || ''
  );
  const [teacherName, setTeacherName] = useState(
    subjectConfig?.teacherName || ''
  );

  // Live Curriculum Books from Local & Tenant Store with Realtime Event Sync
  const [liveCurriculumBooks, setLiveCurriculumBooks] = useState(() => {
    const fromTenant = curriculumStore.getItems(tenantId) || [];
    const fromDefault = tenantId !== 'default' ? curriculumStore.getItems('default') || [] : [];
    const combined = [...fromTenant, ...fromDefault, ...(propCurriculumBooks || [])];
    const seen = new Set();
    return combined.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  });

  // Re-sync curriculum books when store updates
  const reloadCurriculumBooks = useCallback(() => {
    const fromTenant = curriculumStore.getItems(tenantId) || [];
    const fromDefault = tenantId !== 'default' ? curriculumStore.getItems('default') || [] : [];
    const combined = [...fromTenant, ...fromDefault, ...(propCurriculumBooks || [])];
    const seen = new Set();
    const unique = combined.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    setLiveCurriculumBooks(unique);
  }, [tenantId, propCurriculumBooks]);

  useEffect(() => {
    reloadCurriculumBooks();
    window.addEventListener('spr_curriculum_updated', reloadCurriculumBooks);
    window.addEventListener('spr_curriculum_kitabs_updated', reloadCurriculumBooks);
    window.addEventListener('storage', reloadCurriculumBooks);
    return () => {
      window.removeEventListener('spr_curriculum_updated', reloadCurriculumBooks);
      window.removeEventListener('spr_curriculum_kitabs_updated', reloadCurriculumBooks);
      window.removeEventListener('storage', reloadCurriculumBooks);
    };
  }, [reloadCurriculumBooks]);

  // Extract designated exam days from session
  const configuredExamDays = useMemo(() => {
    if (exam?.scheduleDays && Array.isArray(exam.scheduleDays)) {
      return exam.scheduleDays.filter((d) => d.type === 'EXAM_DAY').map((d) => d.date);
    }
    return [];
  }, [exam]);

  const [examDate, setExamDate] = useState(
    subjectConfig?.examDate || configuredExamDays[0] || exam?.startDate || ''
  );
  const [startTime, setStartTime] = useState(subjectConfig?.startTime || '09:00 AM');
  const [endTime, setEndTime] = useState(subjectConfig?.endTime || '11:00 AM');
  const [fullMarks, setFullMarks] = useState(subjectConfig?.fullMarks ?? 100);
  const [passMarks, setPassMarks] = useState(subjectConfig?.passMarks ?? 33);

  // Dynamic Sub-Components: [{ name: 'Written', maxMarks: 70 }, { name: 'Oral / Nazera', maxMarks: 30 }]
  const [components, setComponents] = useState(() => {
    if (subjectConfig?.components && subjectConfig.components.length > 0) {
      return subjectConfig.components;
    }
    return [
      { name: 'Written', maxMarks: 70 },
      { name: 'Oral / Nazera', maxMarks: 30 },
    ];
  });

  const [saving, setSaving] = useState(false);

  // Helper to extract clean Class ID from book
  const getBookClassId = (b) => {
    if (!b) return null;
    if (b.classId !== undefined && b.classId !== null) return String(b.classId);
    if (b.class_id !== undefined && b.class_id !== null) return String(b.class_id);
    if (typeof b.class === 'object' && b.class !== null) return String(b.class.id || b.class.value || '');
    if (typeof b.class === 'number' || typeof b.class === 'string') return String(b.class);
    return null;
  };

  // Helper to extract clean Class Name from book
  const getBookClassName = (b) => {
    if (!b) return '';
    if (typeof b.className === 'string') return b.className;
    if (typeof b.class_name === 'string') return b.class_name;
    if (typeof b.class === 'object' && b.class !== null) return b.class.name || b.class.label || '';
    if (typeof b.class_details === 'object' && b.class_details !== null) return b.class_details.name || '';
    return '';
  };

  // Multi-Strategy Matching for Curriculum Books by Selected Class
  const matchingClassBooks = useMemo(() => {
    if (!classId && !className) return liveCurriculumBooks;

    const targetIdStr = String(classId || '').trim();
    const targetNameClean = String(className || selectedClassObj?.name || selectedClassObj?.label || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');

    // 1. Direct match on class ID or class Name
    const directMatches = liveCurriculumBooks.filter((b) => {
      const bClassId = getBookClassId(b);
      const bNameClean = getBookClassName(b)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '');

      if (targetIdStr && bClassId && (bClassId === targetIdStr || targetIdStr === String(bClassId))) {
        return true;
      }
      if (Array.isArray(b.classIds) && b.classIds.map(String).includes(targetIdStr)) {
        return true;
      }
      if (Array.isArray(b.classes) && b.classes.some((c) => String(typeof c === 'object' ? c.id : c) === targetIdStr)) {
        return true;
      }
      if (targetNameClean && bNameClean) {
        if (
          bNameClean === targetNameClean ||
          bNameClean.includes(targetNameClean) ||
          targetNameClean.includes(bNameClean)
        ) {
          return true;
        }
      }
      return false;
    });

    if (directMatches.length > 0) {
      return directMatches;
    }

    // 2. Department-level match
    if (departmentId && departmentId !== 'ALL') {
      const deptMatches = liveCurriculumBooks.filter((b) => {
        const bDeptId = String(b.departmentId || b.department_id || (typeof b.department === 'object' ? b.department?.id : b.department) || '');
        return bDeptId && bDeptId === String(departmentId);
      });
      if (deptMatches.length > 0) return deptMatches;
    }

    // 3. Fallback to all curriculum books
    return liveCurriculumBooks;
  }, [liveCurriculumBooks, classId, className, selectedClassObj, departmentId]);

  // Options for Curriculum Book Dropdown
  const bookOptions = useMemo(() => {
    const list = matchingClassBooks.map((b) => {
      const bookTitle = b.name || b.title || b.book_name || '';
      const subjectTitle = b.subject || b.subject_name || '';
      const displayLabel = bookTitle
        ? `${bookTitle}${subjectTitle && subjectTitle !== bookTitle ? ` — [${subjectTitle}]` : ''}`
        : subjectTitle || 'Curriculum Book';

      return {
        value: String(b.id),
        label: displayLabel,
        book: b,
      };
    });

    return [
      ...list,
      { value: 'CUSTOM_SUBJECT', label: '+ Other / Custom Subject (Manual Entry)' },
    ];
  }, [matchingClassBooks]);

  // Handle Class Selection
  const handleClassChange = (selectedVal, classObj) => {
    const newClassId = selectedVal ? String(selectedVal) : '';
    const newClassName = classObj?.name || classObj?.class_name || classObj?.label || '';
    setClassId(newClassId);
    setSelectedClassObj(classObj || null);
    setClassName(newClassName);
    setCurriculumBookId('');
    setSubjectName('');
  };

  // Handle Book / Subject Select & Auto-populate Subject Name, Teacher, Marks
  const handleBookSelect = (val) => {
    setCurriculumBookId(val);
    if (val === 'CUSTOM_SUBJECT') {
      setSubjectName('');
      return;
    }
    const found = matchingClassBooks.find((b) => String(b.id) === String(val)) ||
                  liveCurriculumBooks.find((b) => String(b.id) === String(val));
    if (found) {
      // Auto-populate Subject Name based on the selected Book (Subject title preferred, else book title)
      const autoSubjectName = found.subject || found.subject_name || found.name || found.title || '';
      setSubjectName(autoSubjectName);

      if (found.teacherName || found.teacher_name || found.teacher) {
        setTeacherName(found.teacherName || found.teacher_name || found.teacher);
      }
      if (found.fullMarks || found.full_marks || found.total_marks || found.marks) {
        const fm = Number(found.fullMarks || found.full_marks || found.total_marks || found.marks);
        if (fm > 0) {
          setFullMarks(fm);
          setPassMarks(
            found.passMarks || found.pass_marks
              ? Number(found.passMarks || found.pass_marks)
              : Math.round(fm * 0.33)
          );
        }
      }
    }
  };

  // Auto-select first book when class or matchingClassBooks changes in new addition mode
  useEffect(() => {
    if (!subjectConfig?.id && classId) {
      if (matchingClassBooks.length > 0) {
        const first = matchingClassBooks[0];
        setCurriculumBookId(String(first.id));
        setSubjectName(first.subject || first.subject_name || first.name || first.title || '');
        if (first.teacherName || first.teacher_name || first.teacher) {
          setTeacherName(first.teacherName || first.teacher_name || first.teacher);
        }
        if (first.fullMarks || first.full_marks || first.total_marks || first.marks) {
          const fm = Number(first.fullMarks || first.full_marks || first.total_marks || first.marks);
          if (fm > 0) {
            setFullMarks(fm);
            setPassMarks(
              first.passMarks || first.pass_marks
                ? Number(first.passMarks || first.pass_marks)
                : Math.round(fm * 0.33)
            );
          }
        }
      } else {
        setCurriculumBookId('CUSTOM_SUBJECT');
        setSubjectName('');
      }
    }
  }, [classId, matchingClassBooks, subjectConfig]);

  const handleAddComponent = () => {
    setComponents((prev) => [...prev, { name: 'New Component', maxMarks: 10 }]);
  };

  const handleUpdateComponent = (index, field, value) => {
    setComponents((prev) => {
      const next = [...prev];
      if (field === 'maxMarks') {
        next[index] = { ...next[index], [field]: Math.max(0, parseInt(value, 10) || 0) };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveComponent = (index) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const componentsTotalMarks = components.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      showToast('Subject Name is required.', 'warning');
      return;
    }
    if (!classId) {
      showToast('Target Class is required.', 'warning');
      return;
    }
    if (components.length > 0 && componentsTotalMarks !== Number(fullMarks)) {
      showToast(`Component marks sum (${componentsTotalMarks}) must equal Full Marks (${fullMarks}).`, 'warning');
      return;
    }

    const activeExamId = examId || exam?.id;
    if (!activeExamId) {
      showToast('Examination Session context is missing.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        examId: activeExamId,
        departmentId: departmentId || 'ALL',
        classId: String(classId),
        className: className || selectedClassObj?.name || 'Class',
        sectionId: sectionId || 'ALL',
        curriculumBookId: curriculumBookId === 'CUSTOM_SUBJECT' ? null : curriculumBookId,
        subjectName: subjectName.trim(),
        teacherName: teacherName.trim(),
        examDate,
        startTime,
        endTime,
        fullMarks: Number(fullMarks) || 100,
        passMarks: Number(passMarks) || 33,
        components: components.map((c) => ({
          name: c.name.trim(),
          maxMarks: Number(c.maxMarks) || 0,
        })),
      };

      if (subjectConfig?.id) {
        examStore.updateExamSubject(tenantId, subjectConfig.id, payload);
        showToast('Subject routine configuration updated.', 'success');
      } else {
        examStore.addExamSubject(tenantId, payload);
        showToast('Subject added to examination schedule.', 'success');
      }

      onSaveSuccess?.();
    } catch {
      showToast('Failed to save subject configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isCustomSubjectSelected =
    curriculumBookId === 'CUSTOM_SUBJECT' ||
    (!curriculumBookId && !bookOptions.some((o) => o.value === curriculumBookId));

  return (
    <DrawerContainer padding="none">
      <form onSubmit={handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* 1. Target Scope & Subject Hierarchy */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <BookOpenIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Target Class & Subject Information
            </h3>
          </div>

          {/* Row 1: Department & Target Class */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <DepartmentSelect
              label="Department / Faculty"
              value={departmentId}
              allowAll={true}
              allValue="ALL"
              allLabel="All Departments"
              onChange={(newDeptId) => {
                setDepartmentId(newDeptId || 'ALL');
                setClassId('');
                setClassName('');
                setSelectedClassObj(null);
                setCurriculumBookId('');
                setSubjectName('');
              }}
            />
            <ClassSelect
              label="Target Class"
              value={classId}
              departmentId={departmentId}
              allowedClassIds={exam?.targetClassIds && exam.targetClassIds.length > 0 ? exam.targetClassIds : null}
              allowAll={false}
              autoSelectFirst={true}
              required={true}
              onChange={handleClassChange}
            />
          </div>

          {/* Row 2: Target Section & Curriculum Book / Kitab */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <SectionSelect
              label="Target Section"
              classId={classId}
              value={sectionId}
              allowAll={true}
              allValue="ALL"
              allLabel="All Sections (Class Wide)"
              onChange={setSectionId}
            />
            <CustomSelect
              label="Curriculum Book / Kitab"
              options={bookOptions}
              value={curriculumBookId || (isCustomSubjectSelected ? 'CUSTOM_SUBJECT' : (bookOptions[0]?.value || ''))}
              onChange={handleBookSelect}
              placeholder="Select Curriculum Book..."
              searchable={bookOptions.length > 5}
              required
            />
          </div>

          {/* Row 3: Subject Name (Auto-populated from Book, fully customizable) */}
          <div>
            <CustomInput
              label="Subject Name (Exam Course Title)"
              placeholder="e.g. Hadith Studies / Arabic Syntax / Tafsir"
              value={subjectName}
              onChange={setSubjectName}
              required
            />
          </div>

          {/* Row 4: Examiner / Invigilator Teacher (Placed below Subject Name) */}
          <div>
            <TeacherSelect
              label="Examiner / Invigilator Teacher"
              value={teacherName}
              allowAll={false}
              placeholder="Select Assigned Teacher..."
              onChange={(val, teacherObj) => setTeacherName(teacherObj?.name || teacherObj?.label || val || '')}
            />
          </div>
        </div>

        {/* 2. Schedule & Timing */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <TimerIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Date & Examination Timing
            </h3>
          </div>

          {/* Quick-Select Configured Exam Days */}
          {configuredExamDays.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl border theme-border theme-bg-sub/30">
              <span className="text-[11px] font-bold theme-text-secondary block">
                Designated Exam Days for this Session:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {configuredExamDays.map((dt) => {
                  const isSelected = examDate === dt;
                  return (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setExamDate(dt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'theme-bg-accent text-white border-[var(--accent-main)] shadow-2xs'
                          : 'theme-bg-surface theme-border theme-text-primary hover:border-[var(--accent-main)]/50'
                      }`}
                    >
                      {dt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <ReusableCalendar
            label="Exam Date"
            selectedDate={examDate}
            onSelectDate={setExamDate}
            minDate={exam?.startDate}
            maxDate={exam?.endDate}
          />

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <CustomTimePicker
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
            />
            <CustomTimePicker
              label="End Time"
              value={endTime}
              onChange={setEndTime}
            />
          </div>
        </div>

        {/* 3. Marks & Components Breakdown */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b theme-border">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Marks & Sub-Component Breakdown
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                componentsTotalMarks === Number(fullMarks)
                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                  : 'theme-bg-sub theme-text-secondary border theme-border'
              }`}
            >
              Components Total: {componentsTotalMarks} / {fullMarks}
            </span>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <CustomInput
              label="Full Marks (Total)"
              type="number"
              min={1}
              value={fullMarks}
              onChange={(val) => setFullMarks(parseInt(val, 10) || 0)}
              required
            />
            <CustomInput
              label="Pass Marks"
              type="number"
              min={1}
              max={fullMarks}
              value={passMarks}
              onChange={(val) => setPassMarks(parseInt(val, 10) || 0)}
              required
            />
          </div>

          {/* Sub-Components List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold theme-text-secondary">Sub-Components Distribution:</span>
              <CustomButton
                type="button"
                variant="sub"
                size="xs"
                icon={PlusIcon}
                onClick={handleAddComponent}
              >
                Add Component
              </CustomButton>
            </div>

            <div className="space-y-2">
              {components.map((comp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg border theme-border theme-bg-sub/30"
                >
                  <div className="flex-1">
                    <CustomInput
                      placeholder="Component (e.g. Written, Nazera, Tajweed)"
                      value={comp.name}
                      onChange={(val) => handleUpdateComponent(idx, 'name', val)}
                    />
                  </div>
                  <div className="w-24">
                    <CustomInput
                      type="number"
                      min={0}
                      suffix="pts"
                      value={comp.maxMarks}
                      onChange={(val) => handleUpdateComponent(idx, 'maxMarks', val)}
                    />
                  </div>
                  {components.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer shrink-0"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <CustomButton
              type="button"
              variant="sub"
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
              loadingText="Saving..."
              icon={CheckIcon}
            >
              {subjectConfig ? 'Update Subject' : 'Add to Schedule'}
            </CustomButton>
          </div>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}

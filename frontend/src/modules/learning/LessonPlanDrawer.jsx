import React, { useState, useEffect, useMemo } from 'react';
import CustomInput from '../../components/ui/CustomInput';
import CustomSelect from '../../components/ui/CustomSelect';
import ReusableCalendar from '../../components/common/ReusableCalendar';
import { CheckIcon, BookOpenIcon } from '../../components/ui/Icons';
import { useToast } from '../../context/ToastContext';
import { learningStore } from '../../utils/stores/learningStore';
import { curriculumStore } from '../../utils/localStore';
import { useAcademicData } from './useAcademicData';
import { useTenant } from '../../context/TenantContext';

const SCOPE_OPTIONS = [
  { value: 'CLASS_WIDE', label: 'Entire Class / Section' },
  { value: 'GROUP_WIDE', label: 'Student Group' },
  { value: 'INDIVIDUAL_STUDENT', label: 'Individual Students' },
];

export default function LessonPlanDrawer({
  lesson = null,
  defaultClassId = '',
  defaultPeriodId = '',
  defaultBookId = '',
  defaultDate = '',
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { classes, sections, periodSlots } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const [classId, setClassId] = useState(defaultClassId || '');
  const [sectionId, setSectionId] = useState('');
  const [periodSlotId, setPeriodSlotId] = useState(defaultPeriodId || '');
  const [curriculumBookId, setCurriculumBookId] = useState(lesson?.curriculum_book_id || defaultBookId || '');
  const [curriculumBookName, setCurriculumBookName] = useState(lesson?.curriculum_book_name || '');
  const [subjectName, setSubjectName] = useState('Quran Daily Sabaq');
  const [teacherName, setTeacherName] = useState('');
  const [lessonDate, setLessonDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonTopic, setLessonTopic] = useState('');
  const [startUnit, setStartUnit] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [lessonInstructions, setLessonInstructions] = useState('');
  const [assignedScope, setAssignedScope] = useState('CLASS_WIDE');
  const [saving, setSaving] = useState(false);

  const classOptions = classes.map((c) => ({
    value: String(c.id),
    label: c.name || 'Class',
  }));

  const filteredSections = sections.filter((s) => !classId || String(s.student_class) === String(classId));
  const sectionOptions = [
    { value: '', label: 'All Sections' },
    ...filteredSections.map((s) => ({
      value: String(s.id),
      label: s.section_name || 'Section',
    })),
  ];

  const filteredPeriods = periodSlots.filter((p) => {
    if (!classId) return true;
    if (!p.student_class && !p.class_id && !p.class) return true;
    const pClsId = typeof p.student_class === 'object' ? p.student_class?.id : p.student_class || p.class_id || p.class;
    return String(pClsId) === String(classId);
  });

  const periodOptions = [
    { value: '', label: 'General / All-Day Lesson Slot' },
    ...filteredPeriods.map((p) => {
      const timeStr = p.start_time && p.end_time ? ` (${p.start_time} - ${p.end_time})` : '';
      return {
        value: String(p.id),
        label: `${p.period_name || 'Period'}${timeStr}`,
        period_order: p.period_order,
      };
    }),
  ];

  const curriculumBooks = useMemo(() => {
    try {
      const allBooks = curriculumStore.getItems(tenantId);
      return allBooks.filter((b) => {
        const matchClass = !classId || !b.classId || String(b.classId) === String(classId);
        const matchPeriod = !periodSlotId || !b.periodSlotId || String(b.periodSlotId) === String(periodSlotId);
        return matchClass && matchPeriod;
      });
    } catch {
      return [];
    }
  }, [tenantId, classId, periodSlotId]);

  const bookOptions = useMemo(() => [
    { value: '', label: 'Custom / Direct Subject Entry' },
    ...curriculumBooks.map((b) => ({
      value: String(b.id),
      label: `${b.name} (${b.subject || 'Curriculum'})`,
    })),
  ], [curriculumBooks]);

  const handleBookSelect = (selectedId) => {
    setCurriculumBookId(selectedId);
    if (!selectedId) {
      setCurriculumBookName('');
      return;
    }
    const found = curriculumBooks.find((b) => String(b.id) === String(selectedId));
    if (found) {
      setCurriculumBookName(found.name || '');
      if (found.subject) setSubjectName(found.subject);
      if (!lessonTitle || lessonTitle.trim() === '') {
        setLessonTitle(`${found.name}: Lesson`);
      }
      if (found.teacherName && !teacherName) {
        setTeacherName(found.teacherName);
      }
      if (found.currentPage && !startUnit) {
        setStartUnit(`Page ${found.currentPage + 1}`);
      }
    }
  };

  useEffect(() => {
    if (lesson) {
      setClassId(lesson.academic_class || '');
      setSectionId(lesson.section || '');
      setPeriodSlotId(lesson.period_slot || '');
      setCurriculumBookId(lesson.curriculum_book_id || '');
      setCurriculumBookName(lesson.curriculum_book_name || '');
      setSubjectName(lesson.subject_name || 'Quran Daily Sabaq');
      setTeacherName(lesson.teacher_name || '');
      setLessonDate(lesson.lesson_date || new Date().toISOString().split('T')[0]);
      setLessonTitle(lesson.lesson_title || '');
      setLessonTopic(lesson.lesson_topic || '');
      setStartUnit(lesson.start_unit || '');
      setEndUnit(lesson.end_unit || '');
      setLessonInstructions(lesson.lesson_instructions || '');
      setAssignedScope(lesson.assigned_scope || 'CLASS_WIDE');
    } else {
      if (defaultClassId) setClassId(defaultClassId);
      if (defaultPeriodId) setPeriodSlotId(defaultPeriodId);
      if (defaultDate) setLessonDate(defaultDate);
      if (defaultBookId) {
        handleBookSelect(defaultBookId);
      }
    }
  }, [lesson, defaultClassId, defaultPeriodId, defaultBookId, defaultDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!classId) {
      showToast({ type: 'error', message: 'Please select an academic class.' });
      return;
    }
    if (!lessonTitle.trim()) {
      showToast({ type: 'error', message: 'Lesson title is required.' });
      return;
    }

    const selectedCls = classes.find((c) => String(c.id) === String(classId));
    const selectedSec = sections.find((s) => String(s.id) === String(sectionId));
    const selectedPeriod = periodSlots.find((p) => String(p.id) === String(periodSlotId));
    const timeStr = selectedPeriod?.start_time && selectedPeriod?.end_time
      ? `${selectedPeriod.start_time} - ${selectedPeriod.end_time}`
      : '';

    setSaving(true);
    try {
      const payload = {
        id: lesson?.id,
        academic_class: classId,
        class_name: selectedCls?.name || 'Class',
        section: sectionId || null,
        section_name: selectedSec?.section_name || 'All Sections',
        period_slot: periodSlotId || null,
        period_name: selectedPeriod?.period_name || (selectedPeriod?.period_order ? `Period ${selectedPeriod.period_order}` : ''),
        period_order: selectedPeriod?.period_order || null,
        period_time: timeStr,
        curriculum_book_id: curriculumBookId || '',
        curriculum_book_name: curriculumBookName || '',
        subject_name: subjectName,
        teacher_name: teacherName,
        lesson_date: lessonDate,
        lesson_title: lessonTitle,
        lesson_topic: lessonTopic,
        start_unit: startUnit,
        end_unit: endUnit,
        lesson_instructions: lessonInstructions,
        assigned_scope: assignedScope,
      };

      learningStore.saveDailyLesson(tenantId, payload);
      showToast({
        type: 'success',
        message: lesson ? 'Daily lesson updated successfully.' : 'Daily lesson assigned successfully.',
      });
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to save lesson plan.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomSelect
          label="Academic Class"
          options={classOptions}
          value={classId}
          onChange={setClassId}
          required
        />

        <CustomSelect
          label="Section"
          options={sectionOptions}
          value={sectionId}
          onChange={setSectionId}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomSelect
          label="Class Period Slot"
          options={periodOptions}
          value={periodSlotId}
          onChange={setPeriodSlotId}
        />

        <ReusableCalendar
          label="Assigned Date"
          selectedDate={lessonDate}
          onSelectDate={(val) => setLessonDate(val)}
          placeholder="Select Date"
        />
      </div>

      <div>
        <CustomSelect
          label="Curriculum Book / Kitab (From Syllabus)"
          options={bookOptions}
          value={curriculumBookId}
          onChange={handleBookSelect}
          placeholder="Select Assigned Book from Syllabus..."
          size="md"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomInput
          label="Subject / Book"
          placeholder="e.g. Quran Hifz, Mishkat, Nahw"
          value={subjectName}
          onChange={(val) => setSubjectName(typeof val === 'string' ? val : val?.target?.value || '')}
          required
        />

        <CustomSelect
          label="Target Scope"
          options={SCOPE_OPTIONS}
          value={assignedScope}
          onChange={setAssignedScope}
        />
      </div>

      <CustomInput
        label="Lesson Title"
        placeholder="e.g. Surah Al-Kahf (Ayah 1-20) or Chapter 4 Recitation"
        value={lessonTitle}
        onChange={(val) => setLessonTitle(typeof val === 'string' ? val : val?.target?.value || '')}
        required
      />

      <CustomInput
        label="Lesson Topic / Focus"
        placeholder="e.g. Tajweed Rules, Waqf rules, Hadith analysis"
        value={lessonTopic}
        onChange={(val) => setLessonTopic(typeof val === 'string' ? val : val?.target?.value || '')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomInput
          label="Starting Unit / Ayah / Page"
          placeholder="e.g. Ayah 1 or Page 12"
          value={startUnit}
          onChange={(val) => setStartUnit(typeof val === 'string' ? val : val?.target?.value || '')}
        />

        <CustomInput
          label="Ending Unit / Ayah / Page"
          placeholder="e.g. Ayah 20 or Page 14"
          value={endUnit}
          onChange={(val) => setEndUnit(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <div>
        <CustomInput
          label="Assigned Instructor / Ustadh"
          placeholder="e.g. Mawlana Abdur Rashid"
          value={teacherName}
          onChange={(val) => setTeacherName(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <div>
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
          Lesson Instructions & Guidelines for Student Portal
        </label>
        <textarea
          rows={3}
          placeholder="Detailed guidance, homework checklist, pronunciation focus..."
          value={lessonInstructions}
          onChange={(e) => setLessonInstructions(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border theme-border theme-bg-sub theme-text-primary placeholder:theme-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t theme-border flex items-center justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary cursor-pointer transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white theme-bg-accent hover:opacity-90 shadow-md flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
        >
          <CheckIcon className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : lesson ? 'Update Lesson' : 'Assign Sabaq'}</span>
        </button>
      </div>
    </form>
  );
}

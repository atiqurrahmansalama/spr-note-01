import React, { useState, useEffect } from 'react';
import CustomInput from '../../components/ui/CustomInput';
import CustomSelect from '../../components/ui/CustomSelect';
import ReusableCalendar from '../../components/common/ReusableCalendar';
import { CheckIcon } from '../../components/ui/Icons';
import { useToast } from '../../context/ToastContext';
import { learningStore } from '../../utils/stores/learningStore';
import { useAcademicData } from './useAcademicData';
import { useTenant } from '../../context/TenantContext';

const SUBMISSION_TYPE_OPTIONS = [
  { value: 'WRITTEN_TEXT', label: 'Written Notes in Diary' },
  { value: 'FILE_UPLOAD', label: 'Worksheet / File Upload' },
  { value: 'VERBAL_RECITATION', label: 'Verbal Recitation Task' },
];

export default function HomeworkDrawer({
  homework = null,
  defaultClassId = '',
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { classes, sections } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const [classId, setClassId] = useState(defaultClassId || '');
  const [sectionId, setSectionId] = useState('');
  const [subjectName, setSubjectName] = useState('Tajweed & Grammar');
  const [teacherName, setTeacherName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [dueTime, setDueTime] = useState('20:00');
  const [maxMarks, setMaxMarks] = useState(10);
  const [submissionType, setSubmissionType] = useState('WRITTEN_TEXT');
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

  useEffect(() => {
    if (homework) {
      setClassId(homework.academic_class || '');
      setSectionId(homework.section || '');
      setSubjectName(homework.subject_name || 'Tajweed & Grammar');
      setTeacherName(homework.teacher_name || '');
      setTitle(homework.title || '');
      setDescription(homework.description || '');
      setDueDate(homework.due_date || '');
      setDueTime(homework.due_time || '20:00');
      setMaxMarks(homework.max_marks || 10);
      setSubmissionType(homework.submission_type || 'WRITTEN_TEXT');
    } else if (defaultClassId) {
      setClassId(defaultClassId);
    }
  }, [homework, defaultClassId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!classId) {
      showToast({ type: 'error', message: 'Please select an academic class.' });
      return;
    }
    if (!title.trim()) {
      showToast({ type: 'error', message: 'Homework title is required.' });
      return;
    }

    const selectedCls = classes.find((c) => String(c.id) === String(classId));
    const selectedSec = sections.find((s) => String(s.id) === String(sectionId));

    setSaving(true);
    try {
      const payload = {
        id: homework?.id,
        academic_class: classId,
        class_name: selectedCls?.name || 'Class',
        section: sectionId,
        section_name: selectedSec?.section_name || 'All Sections',
        subject_name: subjectName,
        teacher_name: teacherName,
        title,
        description,
        due_date: dueDate,
        due_time: dueTime,
        max_marks: Number(maxMarks) || 10,
        submission_type: submissionType,
      };

      learningStore.saveHomework(tenantId, payload);
      showToast({
        type: 'success',
        message: homework ? 'Homework updated successfully.' : 'Homework assigned successfully.',
      });
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to save homework task.' });
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
        <CustomInput
          label="Subject / Topic"
          placeholder="e.g. Tajweed, Arabic Grammar"
          value={subjectName}
          onChange={(val) => setSubjectName(typeof val === 'string' ? val : val?.target?.value || '')}
          required
        />

        <CustomInput
          label="Assigned Instructor / Teacher"
          placeholder="e.g. Mawlana Abdur Rashid"
          value={teacherName}
          onChange={(val) => setTeacherName(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <CustomInput
        label="Homework Title"
        placeholder="e.g. Memorize 10 Vocabulary Words & Written Diary Summary"
        value={title}
        onChange={(val) => setTitle(typeof val === 'string' ? val : val?.target?.value || '')}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ReusableCalendar
          label="Due Date"
          selectedDate={dueDate}
          onSelectDate={(val) => setDueDate(val)}
          placeholder="Select Due Date"
        />

        <CustomInput
          label="Due Time"
          type="time"
          value={dueTime}
          onChange={(val) => setDueTime(typeof val === 'string' ? val : val?.target?.value || '')}
        />

        <CustomInput
          label="Maximum Marks"
          type="number"
          value={maxMarks}
          onChange={(val) => setMaxMarks(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <CustomSelect
        label="Submission Mode"
        options={SUBMISSION_TYPE_OPTIONS}
        value={submissionType}
        onChange={setSubmissionType}
      />

      <div>
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
          Detailed Instructions & Task Requirements
        </label>
        <textarea
          rows={4}
          placeholder="Provide step-by-step homework questions, exercise numbers, and evaluation criteria..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
          <span>{saving ? 'Saving...' : homework ? 'Update Homework' : 'Publish Homework'}</span>
        </button>
      </div>
    </form>
  );
}

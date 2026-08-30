import React, { useState, useEffect } from 'react';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { TargetIcon, CheckIcon } from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { learningStore } from '../../../utils/stores/learningStore';
import { useAcademicData } from '../useAcademicData';
import { useTenant } from '../../../context/TenantContext';

const TARGET_TYPE_OPTIONS = [
  { value: 'PAGE_RANGE', label: 'Page Range (e.g. Page 1 to 604)' },
  { value: 'CHAPTER_RANGE', label: 'Chapter / Unit Range (e.g. Chapter 1 to 24)' },
  { value: 'SURAH_RANGE', label: 'Surah / Para Range (e.g. Para 1 to 30)' },
  { value: 'TOPIC_COUNT', label: 'Topic / Lesson Count (e.g. 50 Lessons)' },
];

const STATUS_OPTIONS = [
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AHEAD', label: 'Ahead of Schedule' },
  { value: 'BEHIND', label: 'Behind Schedule' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'Paused' },
];

export default function GoalSettingModal({
  goal = null,
  student = null,
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { students = [] } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const [studentId, setStudentId] = useState(student?.id || '');
  const [studentName, setStudentName] = useState(student?.name_en || student?.name || '');
  const [subjectName, setSubjectName] = useState('Quran Hifz');
  const [targetTitle, setTargetTitle] = useState('Complete 30 Paras Memorization');
  const [targetType, setTargetType] = useState('SURAH_RANGE');
  const [startPoint, setStartPoint] = useState('Para 1');
  const [targetPoint, setTargetPoint] = useState('Para 30');
  const [currentProgress, setCurrentProgress] = useState('Para 0');
  const [targetDailyPace, setTargetDailyPace] = useState('2 Pages / Day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState('');
  const [status, setStatus] = useState('ON_TRACK');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setStudentId(goal.student || '');
      setStudentName(goal.student_name || '');
      setSubjectName(goal.subject_name || 'Quran Hifz');
      setTargetTitle(goal.target_title || '');
      setTargetType(goal.target_type || 'PAGE_RANGE');
      setStartPoint(goal.start_point || '1');
      setTargetPoint(goal.target_point || '100');
      setCurrentProgress(goal.current_progress || '0');
      setTargetDailyPace(goal.target_daily_pace || '');
      setStartDate(goal.start_date || '');
      setTargetEndDate(goal.target_end_date || '');
      setStatus(goal.status || 'ON_TRACK');
      setNotes(goal.notes || '');
    } else if (student) {
      setStudentId(student.id || '');
      setStudentName(student.name_en || student.name || '');
    }
  }, [goal, student]);

  const studentOptions = students.map((s) => ({
    value: String(s.id),
    label: `${s.name_en || s.name} (${s.uniq_id || s.roll_number || 'N/A'}) - ${s.student_class_name || 'Class'}`,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentId && !student) {
      showToast('Please select a student for this goal benchmark.', 'warning');
      return;
    }
    if (!targetTitle.trim()) {
      showToast('Goal title is required.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const selectedStudent = students.find((s) => String(s.id) === String(studentId)) || student;
      const payload = {
        id: goal?.id || `goal_${Date.now()}`,
        student: studentId,
        student_name: selectedStudent?.name_en || selectedStudent?.name || studentName || 'Student',
        student_uniq_id: selectedStudent?.uniq_id || selectedStudent?.roll_number || 'N/A',
        student_class: selectedStudent?.student_class || '',
        student_class_name: selectedStudent?.student_class_name || 'Division',
        subject_name: subjectName,
        target_title: targetTitle.trim(),
        target_type: targetType,
        start_point: startPoint,
        target_point: targetPoint,
        current_progress: currentProgress,
        target_daily_pace: targetDailyPace,
        start_date: startDate,
        target_end_date: targetEndDate,
        status,
        notes,
      };

      learningStore.savePacingGoal(tenantId, payload);
      showToast(goal ? 'Benchmark goal updated.' : 'New pacing goal created.', 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast('Failed to save pacing goal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="@container p-4 sm:p-6 space-y-4 text-left">
      <div className="flex items-center gap-2 pb-2 border-b theme-border">
        <TargetIcon className="w-5 h-5 theme-accent" />
        <div>
          <h4 className="text-sm font-bold theme-text-primary">
            {goal ? 'Edit Curriculum Milestone Benchmark' : 'New Student Pacing Goal'}
          </h4>
          <p className="text-[11px] theme-text-secondary">
            Set expected timeline targets, daily pace, and pacing milestones.
          </p>
        </div>
      </div>

      {!student && !goal && (
        <CustomSelect
          label="Target Student"
          options={studentOptions}
          value={studentId}
          onChange={(val) => {
            setStudentId(val);
            const found = students.find((s) => String(s.id) === String(val));
            if (found) setStudentName(found.name_en || found.name);
          }}
          required
          searchable={true}
          placeholder="Search and select student..."
        />
      )}

      <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
        <CustomInput
          label="Subject / Academic Track"
          placeholder="e.g. Quran Hifz, Tajweed, Hadith"
          value={subjectName}
          onChange={(val) => setSubjectName(typeof val === 'string' ? val : val?.target?.value || '')}
          required
        />

        <CustomSelect
          label="Goal Measurement Unit"
          options={TARGET_TYPE_OPTIONS}
          value={targetType}
          onChange={setTargetType}
          required
        />
      </div>

      <CustomInput
        label="Milestone / Target Goal Title"
        placeholder="e.g. Memorize Para 1 to 5, Complete Mishkat 1st Half"
        value={targetTitle}
        onChange={(val) => setTargetTitle(typeof val === 'string' ? val : val?.target?.value || '')}
        required
      />

      <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3">
        <CustomInput
          label="Start Milestone"
          placeholder="e.g. Para 1 or Page 1"
          value={startPoint}
          onChange={(val) => setStartPoint(typeof val === 'string' ? val : val?.target?.value || '')}
        />

        <CustomInput
          label="Target Finish Milestone"
          placeholder="e.g. Para 30 or Page 604"
          value={targetPoint}
          onChange={(val) => setTargetPoint(typeof val === 'string' ? val : val?.target?.value || '')}
          required
        />

        <CustomInput
          label="Expected Daily Pace"
          placeholder="e.g. 1.5 Pages/Day"
          value={targetDailyPace}
          onChange={(val) => setTargetDailyPace(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <div>
        <CustomInput
          label="Current Completed Milestone (Baseline)"
          placeholder="e.g. Para 5 (or Page 100)"
          value={currentProgress}
          onChange={(val) => setCurrentProgress(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3">
        <ReusableCalendar
          label="Start Date"
          selectedDate={startDate}
          onSelectDate={(val) => setStartDate(val)}
          placeholder="Select Start Date"
        />

        <ReusableCalendar
          label="Target Completion Date"
          selectedDate={targetEndDate}
          onSelectDate={(val) => setTargetEndDate(val)}
          placeholder="Select Completion Date"
        />

        <CustomSelect
          label="Schedule Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </div>

      <div>
        <CustomInput
          type="textarea"
          rows={3}
          label="Notes & Instructor Pacing Strategy"
          placeholder="Specific memorization tips, Tajweed focus, or milestone guidelines..."
          value={notes}
          onChange={setNotes}
        />
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t theme-border flex items-center justify-end gap-3 mt-6">
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
          {goal ? 'Update Goal' : 'Create Benchmark'}
        </CustomButton>
      </div>
    </form>
  );
}

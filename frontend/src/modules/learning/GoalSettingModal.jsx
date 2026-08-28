import React, { useState, useEffect } from 'react';
import CustomInput from '../../components/ui/CustomInput';
import CustomSelect from '../../components/ui/CustomSelect';
import ReusableCalendar from '../../components/common/ReusableCalendar';
import { TargetIcon, CheckIcon } from '../../components/ui/Icons';
import { useToast } from '../../context/ToastContext';
import { learningStore } from '../../utils/stores/learningStore';
import { useAcademicData } from './useAcademicData';
import { useTenant } from '../../context/TenantContext';

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
  const { students } = useAcademicData();
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
      setTargetDailyPace(goal.target_daily_pace || '2 Pages / Day');
      setStartDate(goal.start_date || new Date().toISOString().split('T')[0]);
      setTargetEndDate(goal.target_end_date || '');
      setStatus(goal.status || 'ON_TRACK');
      setNotes(goal.notes || '');
    } else if (student) {
      setStudentId(student.id);
      setStudentName(student.name_en || student.name || 'Student');
    }
  }, [goal, student]);

  const studentOptions = students.map((s) => ({
    value: String(s.id),
    label: `${s.name_en || s.name || 'Student'} (${s.uniq_id || s.roll_number || 'N/A'})`,
  }));

  const handleStudentSelect = (val) => {
    setStudentId(val);
    const selected = students.find((s) => String(s.id) === String(val));
    if (selected) {
      setStudentName(selected.name_en || selected.name || '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentId && !studentName) {
      showToast({ type: 'error', message: 'Please select a student.' });
      return;
    }
    if (!targetTitle.trim()) {
      showToast({ type: 'error', message: 'Target title is required.' });
      return;
    }

    setSaving(true);
    try {
      let pct = 0;
      try {
        const cur = parseFloat(currentProgress.replace(/[^0-9.]/g, '')) || 0;
        const tgt = parseFloat(targetPoint.replace(/[^0-9.]/g, '')) || 100;
        pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;
      } catch {}

      const payload = {
        id: goal?.id,
        student: studentId,
        student_name: studentName,
        subject_name: subjectName,
        target_title: targetTitle,
        target_type: targetType,
        start_point: startPoint,
        target_point: targetPoint,
        current_progress: currentProgress,
        progress_percentage: pct,
        target_daily_pace: targetDailyPace,
        start_date: startDate,
        target_completion_date: targetEndDate,
        status,
        notes,
      };

      learningStore.saveGoal(tenantId, payload);
      showToast({
        type: 'success',
        message: goal ? 'Academic goal updated successfully.' : 'New curriculum goal created successfully.',
      });
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to record goal.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomSelect
          label="Select Student"
          options={studentOptions}
          value={studentId}
          onChange={handleStudentSelect}
          required
        />

        <CustomInput
          label="Subject / Academic Track"
          placeholder="e.g. Quran Hifz, Mishkat, Arabic"
          value={subjectName}
          onChange={(val) => setSubjectName(typeof val === 'string' ? val : val?.target?.value || '')}
          required
        />
      </div>

      <CustomInput
        label="Milestone Goal Title"
        placeholder="e.g. Memorize 30 Paras or Finish 150 Pages of Nahw"
        value={targetTitle}
        onChange={(val) => setTargetTitle(typeof val === 'string' ? val : val?.target?.value || '')}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomSelect
          label="Target Measurement Type"
          options={TARGET_TYPE_OPTIONS}
          value={targetType}
          onChange={setTargetType}
        />

        <CustomInput
          label="Target Daily Pace"
          placeholder="e.g. 2 Pages / Day or 1 Hadith / Session"
          value={targetDailyPace}
          onChange={(val) => setTargetDailyPace(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CustomInput
          label="Start Benchmark"
          placeholder="e.g. Para 1 or Page 1"
          value={startPoint}
          onChange={(val) => setStartPoint(typeof val === 'string' ? val : val?.target?.value || '')}
        />

        <CustomInput
          label="Target End Point"
          placeholder="e.g. Para 30 or Page 604"
          value={targetPoint}
          onChange={(val) => setTargetPoint(typeof val === 'string' ? val : val?.target?.value || '')}
        />

        <CustomInput
          label="Current Progress Point"
          placeholder="e.g. Para 12"
          value={currentProgress}
          onChange={(val) => setCurrentProgress(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
          Notes & Instructor Pacing Strategy
        </label>
        <textarea
          rows={3}
          placeholder="Specific memorization tips, Tajweed focus, or milestone guidelines..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
          <span>{saving ? 'Saving...' : goal ? 'Update Goal' : 'Create Benchmark'}</span>
        </button>
      </div>
    </form>
  );
}

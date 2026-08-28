import React, { useState, useEffect } from 'react';
import CustomInput from '../../components/ui/CustomInput';
import CustomSelect from '../../components/ui/CustomSelect';
import ReusableCalendar from '../../components/common/ReusableCalendar';
import { CheckIcon, ChecklistIcon } from '../../components/ui/Icons';
import { useToast } from '../../context/ToastContext';
import { learningStore } from '../../utils/stores/learningStore';
import { useAcademicData } from './useAcademicData';
import { useTenant } from '../../context/TenantContext';

const EVAL_STATUS_OPTIONS = [
  { value: 'MASTERED', label: 'Mastered (Flawless Delivery)' },
  { value: 'SATISFACTORY', label: 'Satisfactory (Standard Delivery)' },
  { value: 'NEEDS_IMPROVEMENT', label: 'Needs Improvement (Repetition Required)' },
  { value: 'UNPREPARED', label: 'Unprepared (Sabaq Incomplete)' },
  { value: 'ABSENT', label: 'Absent (No Recitation)' },
];

const FLUENCY_RATINGS = [
  { value: 1, label: '1 - Poor' },
  { value: 2, label: '2 - Fair' },
  { value: 3, label: '3 - Good' },
  { value: 4, label: '4 - Very Good' },
  { value: 5, label: '5 - Excellent' },
];

export default function StudentAssessmentDrawer({
  studentId = '',
  date = '',
  evaluation = null,
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { students, classes, sections } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
  const [evaluationDate, setEvaluationDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [evaluationStatus, setEvaluationStatus] = useState('SATISFACTORY');
  const [subjectName, setSubjectName] = useState('Quran Daily Sabaq');
  const [lessonCovered, setLessonCovered] = useState('');
  const [startUnit, setStartUnit] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [score, setScore] = useState(10.0);
  const [maxScore, setMaxScore] = useState(10.0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [totalStucks, setTotalStucks] = useState(0);
  const [fluencyRating, setFluencyRating] = useState(5);
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [nextTarget, setNextTarget] = useState('');
  const [saving, setSaving] = useState(false);

  // Student list for select dropdown
  const studentOptions = students.map((s) => ({
    value: String(s.id),
    label: `${s.name_en || s.name || 'Student'} (${s.uniq_id || s.roll_number || 'N/A'}) - ${s.student_class_name || 'Class'}`,
  }));

  const activeStudent = students.find((s) => String(s.id) === String(selectedStudentId));

  useEffect(() => {
    if (selectedStudentId && evaluationDate) {
      // Find existing evaluation in store
      const evals = learningStore.getEvaluations(tenantId);
      const existing = evaluation || evals.find(
        (e) => String(e.student) === String(selectedStudentId) && e.evaluation_date === evaluationDate
      );

      if (existing) {
        setEvaluationStatus(existing.evaluation_status || 'SATISFACTORY');
        setSubjectName(existing.subject_name || 'Quran Daily Sabaq');
        setLessonCovered(existing.lesson_covered || '');
        setStartUnit(existing.start_unit || '');
        setEndUnit(existing.end_unit || '');
        setScore(existing.score ?? 10.0);
        setMaxScore(existing.max_score ?? 10.0);
        setTotalMistakes(existing.total_mistakes || 0);
        setTotalStucks(existing.total_stucks || 0);
        setFluencyRating(existing.fluency_rating || 5);
        setTeacherRemarks(existing.teacher_remarks || '');
        setNextTarget(existing.next_target || '');
      } else {
        // Reset to default
        setEvaluationStatus('SATISFACTORY');
        setScore(10.0);
        setTotalMistakes(0);
        setTotalStucks(0);
        setFluencyRating(5);
        setTeacherRemarks('');
        setNextTarget('');
      }
    }
  }, [selectedStudentId, evaluationDate, evaluation, tenantId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast({ type: 'error', message: 'Please select a student.' });
      return;
    }

    setSaving(true);
    try {
      const studentObj = students.find((s) => String(s.id) === String(selectedStudentId));
      const payload = {
        id: evaluation?.id || `eval_${selectedStudentId}_${evaluationDate}`,
        student: selectedStudentId,
        student_name: studentObj?.name_en || studentObj?.name || 'Student',
        student_uniq_id: studentObj?.uniq_id || studentObj?.roll_number || 'N/A',
        student_class: studentObj?.student_class || '',
        student_class_name: studentObj?.student_class_name || 'Standard Division',
        evaluation_date: evaluationDate,
        evaluation_status: evaluationStatus,
        subject_name: subjectName,
        lesson_covered: lessonCovered,
        start_unit: startUnit,
        end_unit: endUnit,
        score: Number(score) || 0,
        max_score: Number(maxScore) || 10,
        total_mistakes: Number(totalMistakes) || 0,
        total_stucks: Number(totalStucks) || 0,
        fluency_rating: Number(fluencyRating) || 5,
        teacher_remarks: teacherRemarks,
        next_target: nextTarget,
      };

      learningStore.saveEvaluation(tenantId, payload);
      showToast({
        type: 'success',
        message: `Assessment saved for ${studentObj?.name_en || 'student'} and synced to student diary.`,
      });
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to record student assessment.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
      {/* Student Banner */}
      {activeStudent && (
        <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold theme-text-accent uppercase tracking-wider block">
              {activeStudent.student_class_name || 'Academic Class'}
            </span>
            <h4 className="text-sm font-bold theme-text-primary mt-0.5">
              {activeStudent.name_en || activeStudent.name}
            </h4>
            <span className="text-xs theme-text-secondary">
              ID: {activeStudent.uniq_id || activeStudent.roll_number || 'N/A'} • Section: {activeStudent.section_name || 'Standard'}
            </span>
          </div>
          <div className="p-2 rounded-xl theme-bg-accent-soft theme-accent">
            <ChecklistIcon className="w-5 h-5" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!studentId && (
          <div className="sm:col-span-2">
            <CustomSelect
              label="Select Student"
              options={studentOptions}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              required
            />
          </div>
        )}

        <ReusableCalendar
          label="Evaluation Date"
          selectedDate={evaluationDate}
          onSelectDate={(val) => setEvaluationDate(val)}
          placeholder="Select Date"
        />

        <CustomInput
          label="Subject / Academic Track"
          placeholder="e.g. Quran Hifz, Tajweed, Hadith"
          value={subjectName}
          onChange={(val) => setSubjectName(typeof val === 'string' ? val : val?.target?.value || '')}
          required
        />
      </div>

      <CustomSelect
        label="Performance Rubric / Recitation Status"
        options={EVAL_STATUS_OPTIONS}
        value={evaluationStatus}
        onChange={setEvaluationStatus}
        required
      />

      <CustomInput
        label="Lesson / Sabaq Title Recited"
        placeholder="e.g. Surah Al-Baqarah (Ayah 1-50) or Mishkat Chapter 1"
        value={lessonCovered}
        onChange={(val) => setLessonCovered(typeof val === 'string' ? val : val?.target?.value || '')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomInput
          label="Recited From (Ayah / Page)"
          placeholder="e.g. Ayah 1 or Page 12"
          value={startUnit}
          onChange={(val) => setStartUnit(typeof val === 'string' ? val : val?.target?.value || '')}
        />

        <CustomInput
          label="Recited To (Ayah / Page)"
          placeholder="e.g. Ayah 25 or Page 13"
          value={endUnit}
          onChange={(val) => setEndUnit(typeof val === 'string' ? val : val?.target?.value || '')}
        />
      </div>

      {/* Quantitative Recitation Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border theme-border theme-bg-sub/30">
        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Mistakes Flagged
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTotalMistakes((prev) => Math.max(0, prev - 1))}
              className="w-8 h-8 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              value={totalMistakes}
              onChange={(e) => setTotalMistakes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full h-8 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setTotalMistakes((prev) => prev + 1)}
              className="w-8 h-8 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Stucks / Lukmah
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTotalStucks((prev) => Math.max(0, prev - 1))}
              className="w-8 h-8 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              value={totalStucks}
              onChange={(e) => setTotalStucks(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full h-8 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setTotalStucks((prev) => prev + 1)}
              className="w-8 h-8 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
            Score (/10)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0"
              max="10"
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
              className="w-full h-8 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setScore(5)}
              className="px-2 h-8 rounded-lg border theme-border text-xs font-semibold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub cursor-pointer"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => setScore(10)}
              className="px-2 h-8 rounded-lg border theme-border text-xs font-semibold theme-accent hover:theme-text-primary hover:theme-bg-sub cursor-pointer"
            >
              10
            </button>
          </div>
        </div>
      </div>

      <CustomSelect
        label="Fluency & Tajweed Mastery Level"
        options={FLUENCY_RATINGS}
        value={fluencyRating}
        onChange={setFluencyRating}
      />

      <div>
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-1.5">
          Teacher Remarks & Recitation Feedback (Student Diary)
        </label>
        <textarea
          rows={3}
          placeholder="Pronunciation remarks, Makhraj focus, advice for home revision..."
          value={teacherRemarks}
          onChange={(e) => setTeacherRemarks(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border theme-border theme-bg-sub theme-text-primary placeholder:theme-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <CustomInput
        label="Target Sabaq Portion for Tomorrow"
        placeholder="e.g. Next 2 Pages of Surah Al-Kahf"
        value={nextTarget}
        onChange={(val) => setNextTarget(typeof val === 'string' ? val : val?.target?.value || '')}
      />

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
          <span>{saving ? 'Saving...' : 'Save Assessment'}</span>
        </button>
      </div>
    </form>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import {
  ChecklistIcon,
  BookOpenIcon,
  CalendarIcon,
  ChartBarIcon,
  TargetIcon,
} from '../../../../components/ui/Icons';
import { useToast } from '../../../../context/ToastContext';
import { learningStore } from '../../../../utils/stores/learningStore';
import { curriculumStore } from '../../../../utils/localStore';
import { useAcademicData } from '../../useAcademicData';
import { useTenant } from '../../../../context/TenantContext';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';

const PERFORMANCE_RATINGS = [
  { value: 5, label: '5 - Excellent (Flawless Flow & Delivery)' },
  { value: 4, label: '4 - Very Good (Minor Corrections)' },
  { value: 3, label: '3 - Good (Average Rhythm & Effort)' },
  { value: 2, label: '2 - Fair (Needs Close Guidance)' },
  { value: 1, label: '1 - Poor (Needs Intensive Focus)' },
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
  const { students = [] } = useAcademicData();
  const tenantId = activeTenantId || 'default';

  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
  const [evaluationDate, setEvaluationDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [curriculumBookId, setCurriculumBookId] = useState(evaluation?.curriculum_book_id || '');
  const [curriculumBookName, setCurriculumBookName] = useState(evaluation?.curriculum_book_name || '');
  const [subjectName, setSubjectName] = useState(evaluation?.subject_name || '');
  const [lessonCovered, setLessonCovered] = useState(evaluation?.lesson_covered || '');
  const [startUnit, setStartUnit] = useState(evaluation?.start_unit || '');
  const [endUnit, setEndUnit] = useState(evaluation?.end_unit || '');
  const [recitationScore, setRecitationScore] = useState(
    evaluation?.recitation_score !== undefined
      ? evaluation.recitation_score
      : (evaluation?.score !== undefined ? evaluation.score : 10.0)
  );
  const [homeworkScore, setHomeworkScore] = useState(
    evaluation?.homework_score !== undefined
      ? evaluation.homework_score
      : 10.0
  );
  const [maxScore, setMaxScore] = useState(evaluation?.max_score !== undefined ? evaluation.max_score : 10.0);
  const [totalMistakes, setTotalMistakes] = useState(evaluation?.total_mistakes || 0);
  const [totalStucks, setTotalStucks] = useState(evaluation?.total_stucks || 0);
  const [fluencyRating, setFluencyRating] = useState(evaluation?.fluency_rating || 5);
  const [teacherRemarks, setTeacherRemarks] = useState(evaluation?.teacher_remarks || '');
  const [nextTarget, setNextTarget] = useState(evaluation?.next_target || '');
  const [saving, setSaving] = useState(false);

  // Curriculum books for tenant
  const [curriculumBooks, setCurriculumBooks] = useState([]);
  useEffect(() => {
    try {
      const items = curriculumStore.getItems(tenantId) || [];
      setCurriculumBooks(items);
    } catch {}
  }, [tenantId]);

  // Student list for select dropdown
  const studentOptions = useMemo(() => {
    return students.map((s) => ({
      value: String(s.id),
      label: `${s.name_en || s.name || 'Student'} (${s.uniq_id || s.roll_number || 'N/A'}) - ${s.student_class_name || 'Class'}`,
    }));
  }, [students]);

  const activeStudent = useMemo(() => {
    return students.find((s) => String(s.id) === String(selectedStudentId));
  }, [students, selectedStudentId]);

  // Filter books for active student class
  const availableBooks = useMemo(() => {
    if (!activeStudent) return curriculumBooks;
    const stCls = activeStudent.student_class !== undefined ? activeStudent.student_class : (activeStudent.class_id || activeStudent.class);
    const stClsId = typeof stCls === 'object' ? String(stCls?.id || '') : String(stCls || '');
    if (!stClsId) return curriculumBooks;
    return curriculumBooks.filter((b) => !b.classId || String(b.classId) === stClsId);
  }, [curriculumBooks, activeStudent]);

  const bookOptions = [
    { value: '', label: 'None (General / Direct Entry)' },
    ...availableBooks.map((b) => ({
      value: String(b.id),
      label: `${b.name}${b.subject ? ` (${b.subject})` : ''}`,
    })),
  ];

  // Sync state if student/date/evaluation changes
  useEffect(() => {
    if (selectedStudentId && evaluationDate) {
      const evals = learningStore.getEvaluations(tenantId);
      const existing = evaluation || evals.find(
        (e) => String(e.student) === String(selectedStudentId) && e.evaluation_date === evaluationDate
      );

      if (existing) {
        setCurriculumBookId(existing.curriculum_book_id || '');
        setCurriculumBookName(existing.curriculum_book_name || '');
        setSubjectName(existing.subject_name || '');
        setLessonCovered(existing.lesson_covered || '');
        setStartUnit(existing.start_unit || '');
        setEndUnit(existing.end_unit || '');
        setRecitationScore(
          existing.recitation_score !== undefined
            ? existing.recitation_score
            : (existing.score !== undefined ? existing.score : 10.0)
        );
        setHomeworkScore(
          existing.homework_score !== undefined
            ? existing.homework_score
            : 10.0
        );
        setMaxScore(existing.max_score !== undefined ? existing.max_score : 10.0);
        setTotalMistakes(existing.total_mistakes || 0);
        setTotalStucks(existing.total_stucks || 0);
        setFluencyRating(existing.fluency_rating || 5);
        setTeacherRemarks(existing.teacher_remarks || '');
        setNextTarget(existing.next_target || '');
      } else {
        setCurriculumBookId('');
        setCurriculumBookName('');
        setSubjectName('');
        setLessonCovered('');
        setStartUnit('');
        setEndUnit('');
        setRecitationScore(10.0);
        setHomeworkScore(10.0);
        setMaxScore(10.0);
        setTotalMistakes(0);
        setTotalStucks(0);
        setFluencyRating(5);
        setTeacherRemarks('');
        setNextTarget('');
      }
    }
  }, [selectedStudentId, evaluationDate, evaluation, tenantId]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select a student.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const studentObj = students.find((s) => String(s.id) === String(selectedStudentId));
      
      // Auto-compute status from quantitative scores & errors
      const rScore = Number(recitationScore) || 0;
      const mistakesCount = Number(totalMistakes) || 0;
      let computedStatus = 'SATISFACTORY';
      if (rScore >= 9 && mistakesCount === 0) {
        computedStatus = 'MASTERED';
      } else if (rScore < 5 || mistakesCount >= 5) {
        computedStatus = 'NEEDS_IMPROVEMENT';
      }

      const payload = {
        id: evaluation?.id || `eval_${selectedStudentId}_${evaluationDate}`,
        student: selectedStudentId,
        student_name: studentObj?.name_en || studentObj?.name || 'Student',
        student_uniq_id: studentObj?.uniq_id || studentObj?.roll_number || 'N/A',
        student_class: studentObj?.student_class || '',
        student_class_name: studentObj?.student_class_name || 'Standard Division',
        evaluation_date: evaluationDate,
        evaluation_status: computedStatus,
        curriculum_book_id: curriculumBookId,
        curriculum_book_name: curriculumBookName,
        subject_name: subjectName.trim() || curriculumBookName || 'General Studies',
        lesson_covered: lessonCovered.trim(),
        start_unit: startUnit.trim(),
        end_unit: endUnit.trim(),
        score: rScore,
        recitation_score: rScore,
        homework_score: Number(homeworkScore) || 0,
        max_score: Number(maxScore) || 10,
        total_mistakes: mistakesCount,
        total_stucks: Number(totalStucks) || 0,
        fluency_rating: Number(fluencyRating) || 5,
        teacher_remarks: teacherRemarks.trim(),
        next_target: nextTarget.trim(),
        evaluated_at: new Date().toISOString(),
      };

      learningStore.saveEvaluation(tenantId, payload);
      showToast(`Assessment saved for ${studentObj?.name_en || 'student'} and synced to student diary.`, 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      showToast('Failed to record student assessment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="compact">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2 text-left">
        {/* Active Student Card Banner */}
        {activeStudent ? (
          <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold theme-text-accent uppercase tracking-wider block">
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
        ) : (
          <div>
            <CustomSelect
              label="Select Student"
              options={studentOptions}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              required
              searchable={true}
              placeholder="Search & select student..."
            />
          </div>
        )}

        {/* ── Section 1: Academic Track & Lesson Covered ── */}
        <DrawerSection title="Academic Track & Lesson Covered" icon={BookOpenIcon}>
          <div className="space-y-4">
            {/* Complementary Row 1: Date & Curriculum Book */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <ReusableCalendar
                label="Evaluation Date"
                selectedDate={evaluationDate}
                onSelectDate={(val) => setEvaluationDate(val)}
                placeholder="Select Date"
              />

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
                  const b = curriculumBooks.find((item) => String(item.id) === String(val));
                  if (b) {
                    setCurriculumBookName(b.name || '');
                    if (b.subject) setSubjectName(b.subject);
                    if (b.startPage && !startUnit) setStartUnit(String(b.startPage));
                    if (b.endPage && !endUnit) setEndUnit(String(b.endPage));
                  }
                }}
              />
            </div>

            {/* Complementary Row 2: Subject Name & Lesson Title */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Subject / Academic Track"
                placeholder="e.g. Quran Studies, Hadith, Arabic"
                value={subjectName}
                onChange={setSubjectName}
                required
              />

              <CustomInput
                label="Lesson / Topic Covered"
                placeholder="e.g. Chapter 1 / Exercise 2 or Unit 4"
                value={lessonCovered}
                onChange={setLessonCovered}
              />
            </div>

            {/* Complementary Row 3: Start & End Unit */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Covered From (Page / Unit / Ayah)"
                placeholder="e.g. Page 12 or Unit 1"
                value={startUnit}
                onChange={setStartUnit}
              />

              <CustomInput
                label="Covered To (Page / Unit / Ayah)"
                placeholder="e.g. Page 15 or Unit 3"
                value={endUnit}
                onChange={setEndUnit}
              />
            </div>
          </div>
        </DrawerSection>

        {/* ── Section 2: Evaluation Metrics & Scores ── */}
        <DrawerSection title="Evaluation Metrics & Scores" icon={ChartBarIcon}>
          <div className="space-y-4">
            {/* Complementary Row 1: Mistakes & Stucks */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              {/* Mistakes Stepper */}
              <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 space-y-1.5">
                <span className="block text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
                  Mistakes Flagged
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTotalMistakes((prev) => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={totalMistakes}
                    onChange={(e) => setTotalMistakes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-7 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTotalMistakes((prev) => prev + 1)}
                    className="w-7 h-7 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Stucks / Lukmah Stepper */}
              <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 space-y-1.5">
                <span className="block text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
                  Stucks / Lukmah
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTotalStucks((prev) => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={totalStucks}
                    onChange={(e) => setTotalStucks(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-7 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTotalStucks((prev) => prev + 1)}
                    className="w-7 h-7 rounded-lg border theme-border theme-bg-surface theme-text-primary hover:theme-bg-sub flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Complementary Row 2: Lesson Score & Homework Score */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              {/* Lesson Score (/10) */}
              <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 space-y-1.5">
                <span className="block text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
                  Lesson Score (/10)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={recitationScore}
                    onChange={(e) => setRecitationScore(parseFloat(e.target.value) || 0)}
                    className="w-full h-7 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRecitationScore(5)}
                    className="px-1.5 h-7 rounded-lg border theme-border text-[11px] font-semibold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub cursor-pointer transition-colors"
                    title="Set score to 5"
                  >
                    5
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecitationScore(10)}
                    className="px-1.5 h-7 rounded-lg border theme-border text-[11px] font-semibold theme-accent hover:theme-text-primary hover:theme-bg-sub cursor-pointer transition-colors"
                    title="Set score to 10"
                  >
                    10
                  </button>
                </div>
              </div>

              {/* Homework Score (/10) */}
              <div className="p-3 rounded-xl border theme-border theme-bg-sub/40 space-y-1.5">
                <span className="block text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
                  Homework Score (/10)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={homeworkScore}
                    onChange={(e) => setHomeworkScore(parseFloat(e.target.value) || 0)}
                    className="w-full h-7 text-center text-xs font-bold rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHomeworkScore(5)}
                    className="px-1.5 h-7 rounded-lg border theme-border text-[11px] font-semibold theme-text-secondary hover:theme-text-primary hover:theme-bg-sub cursor-pointer transition-colors"
                    title="Set score to 5"
                  >
                    5
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeworkScore(10)}
                    className="px-1.5 h-7 rounded-lg border theme-border text-[11px] font-semibold theme-accent hover:theme-text-primary hover:theme-bg-sub cursor-pointer transition-colors"
                    title="Set score to 10"
                  >
                    10
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Rating */}
            <CustomSelect
              label="Mastery & Performance Rating"
              options={PERFORMANCE_RATINGS}
              value={fluencyRating}
              onChange={setFluencyRating}
            />
          </div>
        </DrawerSection>

        {/* ── Section 3: Feedback & Next Target ── */}
        <DrawerSection title="Feedback & Next Target" icon={TargetIcon}>
          <div className="space-y-4">
            <CustomInput
              type="textarea"
              rows={3}
              label="Teacher Remarks & Feedback (Student Diary)"
              placeholder="Performance remarks, focus areas, advice for home study..."
              value={teacherRemarks}
              onChange={setTeacherRemarks}
            />

            <CustomInput
              label="Next Target / Plan for Tomorrow"
              placeholder="e.g. Next Chapter / Exercise or Next 2 Pages"
              value={nextTarget}
              onChange={setNextTarget}
            />
          </div>
        </DrawerSection>

        {/* Drawer Footer with Save & Cancel */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={saving}
          isSaveDisabled={!selectedStudentId}
          saveLabel={evaluation?.id ? "Save Changes" : "Save Assessment"}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

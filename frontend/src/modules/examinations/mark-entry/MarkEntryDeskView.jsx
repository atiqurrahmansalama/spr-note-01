import React, { useState, useMemo } from 'react';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomButton from '../../../components/ui/CustomButton';
import CustomInput from '../../../components/ui/CustomInput';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import {
  EditIcon,
  CheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  SaveIcon,
  BookOpenIcon,
  AcademicCapIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';
import useExamData from '../hooks/useExamData';
import useMarkEntryGrid from '../hooks/useMarkEntryGrid';
import { examStore } from '../../../utils/stores/examStore';

/**
 * MarkEntryDeskView
 * Fast spreadsheet-like teacher console with keyboard navigation (Arrow keys, Enter),
 * real-time cell bounds validation, draft saving, submission lock, and supervisor unlock.
 */
export default function MarkEntryDeskView({ initialExamId = null, onNavigateToTabulation }) {
  const {
    tenantId,
    exams,
    examSubjects,
    students,
    classOptions,
    gradingSystems,
    refreshExamData,
  } = useExamData();

  const [selectedExamId, setSelectedExamId] = useState(initialExamId || (exams[0]?.id ? String(exams[0].id) : ''));
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Selected Exam
  const selectedExam = useMemo(() => {
    return exams.find((e) => String(e.id) === String(selectedExamId)) || null;
  }, [exams, selectedExamId]);

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
    }));
  }, [exams]);

  // Subjects for selected Exam
  const availableSubjects = useMemo(() => {
    if (!selectedExamId) return [];
    return examSubjects.filter((s) => String(s.examId) === String(selectedExamId));
  }, [examSubjects, selectedExamId]);

  const subjectOptions = useMemo(() => {
    return availableSubjects.map((s) => ({
      value: String(s.id),
      label: `${s.subjectName} — Class ${s.className} (${s.sectionName || 'All'})`,
      subject: s,
    }));
  }, [availableSubjects]);

  // Selected Subject
  const selectedSubject = useMemo(() => {
    return availableSubjects.find((s) => String(s.id) === String(selectedSubjectId)) || availableSubjects[0] || null;
  }, [availableSubjects, selectedSubjectId]);

  // Set default subject if not selected
  React.useEffect(() => {
    if (!selectedSubjectId && availableSubjects.length > 0) {
      setSelectedSubjectId(String(availableSubjects[0].id));
    }
  }, [selectedSubjectId, availableSubjects]);

  // Filter students enrolled in target class & section
  const targetStudents = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter((st) => {
      const stClassId = typeof st.class_id === 'object' ? st.class_id?.id : (st.class_id || st.student_class || st.classId);
      if (String(stClassId) !== String(selectedSubject.classId)) return false;

      if (selectedSubject.sectionId && selectedSubject.sectionId !== 'ALL') {
        const stSecId = typeof st.section === 'object' ? st.section?.id : (st.section || st.section_id || st.sectionId);
        if (String(stSecId) !== String(selectedSubject.sectionId)) return false;
      }

      return true;
    });
  }, [students, selectedSubject]);

  // Grading rules
  const activeGradingSystem = useMemo(() => {
    if (!selectedExam) return null;
    return gradingSystems.find((g) => g.id === selectedExam.gradingSystemId) || gradingSystems[0];
  }, [gradingSystems, selectedExam]);

  const {
    marksGrid,
    validationErrors,
    components,
    fullMarks,
    passMarks,
    isLocked,
    isSupervisorUnlocked,
    saving,
    handleCellChange,
    handleToggleAbsent,
    handleRemarksChange,
    handleKeyDown,
    handleSave,
    handleSupervisorUnlock,
  } = useMarkEntryGrid({
    tenantId,
    examId: selectedExamId,
    examSubjectId: selectedSubject?.id,
    students: targetStudents,
    examSubject: selectedSubject,
    gradingRules: activeGradingSystem?.rules || [],
    onSaveSuccess: () => {
      refreshExamData();
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Teacher Mark Entry Desk
          </h1>
          <p className="text-xs sm:text-sm theme-text-secondary mt-1">
            Spreadsheet-like keyboard entry console with real-time validation, draft saves, and controller locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTabulation && selectedExamId && (
            <CustomButton
              variant="sub"
              size="sm"
              onClick={() => onNavigateToTabulation(selectedExamId)}
            >
              View Tabulation Sheet
            </CustomButton>
          )}
        </div>
      </div>

      {/* Target Selector Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs">
        <CustomSelect
          label="Select Examination Term"
          options={examOptions}
          value={selectedExamId}
          onChange={(val) => {
            setSelectedExamId(val);
            setSelectedSubjectId('');
          }}
          placeholder="Choose Exam Session..."
          required
        />

        <CustomSelect
          label="Select Exam Subject & Class"
          options={subjectOptions}
          value={selectedSubjectId || (selectedSubject?.id ? String(selectedSubject.id) : '')}
          onChange={setSelectedSubjectId}
          placeholder={availableSubjects.length === 0 ? 'No subjects scheduled for this exam' : 'Choose Subject...'}
          required
        />
      </div>

      {/* Main Mark Entry Grid */}
      {!selectedExamId || !selectedSubject ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50">
          <BookOpenIcon className="w-12 h-12 mx-auto theme-text-secondary/50 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Subject Selected</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            Please select an Examination Term and a scheduled Exam Subject from the dropdowns above to begin entering marks.
          </p>
        </div>
      ) : targetStudents.length === 0 ? (
        <div className="p-12 text-center border theme-border rounded-2xl theme-bg-surface/50">
          <AcademicCapIcon className="w-12 h-12 mx-auto theme-text-secondary/50 mb-3" />
          <h3 className="text-base font-bold theme-text-primary">No Students Found in this Class</h3>
          <p className="text-xs theme-text-secondary mt-1 max-w-md mx-auto">
            No active student records enrolled under Class <strong>{selectedSubject.className}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Alert & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border theme-border theme-bg-sub/40 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold theme-text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                {selectedSubject.subjectName} (Full: {fullMarks} | Pass: {passMarks})
              </div>
              <span className="theme-text-secondary">•</span>
              <span className="theme-text-secondary">
                Students Enrolled: <strong className="theme-text-primary">{targetStudents.length}</strong>
              </span>
              <span className="theme-text-secondary">•</span>
              <span className="theme-text-secondary">
                Grading: <strong className="theme-text-primary">{activeGradingSystem?.name}</strong>
              </span>
            </div>

            {/* Lock Status & Supervisor Unlock */}
            <div className="flex items-center gap-2">
              {isLocked ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    Locked for Review
                  </span>
                  <CustomButton
                    size="xs"
                    variant="sub"
                    icon={LockOpenIcon}
                    onClick={handleSupervisorUnlock}
                  >
                    Supervisor Unlock
                  </CustomButton>
                </div>
              ) : isSupervisorUnlocked ? (
                <span className="inline-flex items-center gap-1 font-bold text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-lg">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  Supervisor Overridden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <EditIcon className="w-3.5 h-3.5" />
                  Editable Mode (Use Arrow/Enter keys)
                </span>
              )}
            </div>
          </div>

          {/* Keyboard Navigation Tip */}
          <div className="px-4 py-2 rounded-lg theme-bg-accent/5 border border-[var(--accent-main)]/20 text-[11px] theme-text-secondary flex items-center justify-between">
            <span>
              <strong className="theme-text-primary">Keyboard Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded border theme-border font-mono text-[10px] theme-bg-surface font-bold">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded border theme-border font-mono text-[10px] theme-bg-surface font-bold">↓</kbd> to jump to the next student. Use <kbd className="px-1.5 py-0.5 rounded border theme-border font-mono text-[10px] theme-bg-surface font-bold">←</kbd> <kbd className="px-1.5 py-0.5 rounded border theme-border font-mono text-[10px] theme-bg-surface font-bold">→</kbd> to shift component columns.
            </span>
          </div>

          {/* Spreadsheet Table Container */}
          <div className="border theme-border rounded-2xl overflow-hidden theme-bg-surface shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/60 font-bold theme-text-primary">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3 w-20">Roll</th>
                    <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                    <th className="py-3 px-3 w-20 text-center">Absent?</th>
                    {components.map((comp, cIdx) => (
                      <th key={cIdx} className="py-3 px-3 text-center min-w-[110px]">
                        {comp.name}
                        <span className="block text-[10px] font-normal theme-text-secondary">
                          (Max: {comp.maxMarks})
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-3 w-24 text-center">Total ({fullMarks})</th>
                    <th className="py-3 px-3 w-24 text-center">Grade</th>
                    <th className="py-3 px-4 min-w-[160px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {targetStudents.map((st, sIdx) => {
                    const stId = String(st.id);
                    const rowData = marksGrid[stId] || {};
                    const isAbsent = Boolean(rowData.isAbsent);
                    const obtained = isAbsent ? 0 : Number(rowData.obtainedMarks) || 0;
                    const percentage = fullMarks > 0 ? (obtained / fullMarks) * 100 : 0;
                    const gradeEval = examStore.evaluateGrade(percentage, activeGradingSystem?.rules || []);
                    const isPassed = !isAbsent && obtained >= passMarks;

                    return (
                      <tr
                        key={stId}
                        className={`hover:theme-bg-sub/30 transition-colors ${
                          isAbsent ? 'opacity-50 theme-bg-sub/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono theme-text-secondary">
                          {sIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold theme-text-primary">
                          {st.roll_number || st.roll || st.uniq_id || '-'}
                        </td>
                        <td className="py-2.5 px-4 font-bold theme-text-primary">
                          {st.name_en || st.name || 'Student'}
                          <span className="block text-[10px] font-normal theme-text-secondary">
                            {st.uniq_id || stId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex justify-center">
                            <CustomCheckbox
                              checked={isAbsent}
                              disabled={isLocked}
                              onChange={() => handleToggleAbsent(stId)}
                              size="sm"
                            />
                          </div>
                        </td>

                        {/* Component Cell Inputs */}
                        {components.map((comp, cIdx) => {
                          const compKey = `comp_${cIdx}`;
                          const cellId = `${stId}_${compKey}`;
                          const cellError = validationErrors[cellId];
                          const cellVal = rowData.componentMarks?.[compKey] ?? '';

                          return (
                            <td key={cIdx} className="py-2 px-2 text-center">
                              <div className="relative">
                                <input
                                  id={`cell_${sIdx}_${cIdx}`}
                                  type="text"
                                  inputMode="numeric"
                                  disabled={isLocked || isAbsent}
                                  value={isAbsent ? '0' : cellVal}
                                  onChange={(e) =>
                                    handleCellChange(stId, compKey, e.target.value, comp.maxMarks)
                                  }
                                  onKeyDown={(e) =>
                                    handleKeyDown(e, sIdx, cIdx, targetStudents.length, components.length)
                                  }
                                  className={`w-20 text-center font-mono font-bold text-xs py-1.5 px-2 rounded-lg border transition-all outline-none ${
                                    cellError
                                      ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                                      : 'theme-border theme-bg-surface theme-text-primary focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)]'
                                  } ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                                  placeholder="0"
                                />
                                {cellError && (
                                  <span className="absolute -bottom-3 left-0 right-0 text-[9px] text-rose-500 font-semibold truncate">
                                    {cellError}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Score */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-sm">
                          <span className={isPassed ? 'theme-text-primary' : 'text-rose-500'}>
                            {isAbsent ? 'ABS' : rowData.obtainedMarks !== '' ? rowData.obtainedMarks : '-'}
                          </span>
                        </td>

                        {/* Grade Evaluation */}
                        <td className="py-2.5 px-3 text-center">
                          {isAbsent ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-500">
                              Absent
                            </span>
                          ) : rowData.obtainedMarks !== '' ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isPassed
                                  ? 'theme-bg-accent/10 theme-text-accent'
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}
                            >
                              {gradeEval.grade}
                            </span>
                          ) : (
                            <span className="theme-text-secondary text-[11px]">-</span>
                          )}
                        </td>

                        {/* Teacher Remarks */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            disabled={isLocked}
                            value={rowData.teacherRemarks || ''}
                            onChange={(e) => handleRemarksChange(stId, e.target.value)}
                            placeholder="Optional remark..."
                            className="w-full text-xs py-1.5 px-2 rounded-lg border theme-border theme-bg-surface theme-text-primary outline-none focus:border-[var(--accent-main)]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs">
            <div className="text-xs theme-text-secondary">
              Total Students Evaluated:{' '}
              <strong className="theme-text-primary">
                {Object.values(marksGrid).filter((m) => m.obtainedMarks !== '').length} / {targetStudents.length}
              </strong>
            </div>

            <div className="flex items-center gap-3">
              <CustomButton
                variant="sub"
                size="md"
                disabled={isLocked}
                loading={saving}
                icon={SaveIcon}
                onClick={() => handleSave('DRAFT')}
              >
                Save Draft
              </CustomButton>

              <CustomButton
                variant="primary"
                size="md"
                disabled={isLocked}
                loading={saving}
                loadingText="Submitting..."
                icon={CheckIcon}
                onClick={() => {
                  if (window.confirm('Submit marks to Exam Controller? Editing will be locked once submitted.')) {
                    handleSave('SUBMITTED');
                  }
                }}
              >
                Submit to Exam Controller
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

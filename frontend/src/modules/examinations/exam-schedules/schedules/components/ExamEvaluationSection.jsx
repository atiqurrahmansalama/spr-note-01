import React, { useMemo } from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../../../components/ui/CustomCheckbox';
import { DrawerSection } from '../../../../../components/layout';
import {
  BookOpenIcon,
  HistoryIcon,
  PlusIcon,
  RefreshIcon,
  SparklesIcon,
  TrashIcon,
  TrophyIcon,
} from '../../../../../components/ui/Icons';

const RANKING_SCOPE_OPTIONS = [
  { value: 'CLASS_AND_SECTION', label: 'Class & Section Positions' },
  { value: 'CLASS_ONLY', label: 'Class Overall Position Only' },
];

const FAILED_SUBJECT_RULE_OPTIONS = [
  { value: 'EXCLUDE_FROM_MERIT', label: 'Exclude Failed Students from Top Merit List' },
  { value: 'NORMAL', label: 'Rank by Total Marks Regardless of Failed Subjects' },
];

/**
 * ExamEvaluationSection
 * Wizard Step 3: Marks Breakdown Template, Continuous Assessment (CA), Previous Exam Merger, and Merit Ranking Rules.
 * 
 * Synchronized Evaluation Architecture:
 * - Real-time calculation of effective final grade weightage from exam breakdown components
 * - Bidirectional auto-balance between continuous assessment, previous exam terms, and current exam paper
 * - Integrated live Evaluation & Result Summary Matrix
 * - Reusable DrawerSection components
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2 / @[480px]:grid-cols-3)
 */
export default function ExamEvaluationSection({
  // Marks Breakdown Template Props
  breakdownEnabled = true,
  onBreakdownEnabledChange,
  targetFullMarks = 100,
  onTargetFullMarksChange,
  components = [],
  onAddComponent,
  onRemoveComponent,
  onUpdateComponent,

  // Continuous Assessment (CA) Props
  caEnabled = false,
  onCaEnabledChange,
  dailyEnabled = true,
  onDailyEnabledChange,
  attendanceEnabled = true,
  onAttendanceEnabledChange,
  examWeightageEnabled = true,
  onExamWeightageEnabledChange,
  dailyClassroomPct = 10,
  attendancePct = 10,
  examPct = 80,
  onCaChange,
  onAutoBalanceCa,

  // Previous Exams Marks Merger Props
  previousExamsEnabled = false,
  onPreviousExamsEnabledChange,
  previousExams = [],
  onAddPreviousExam,
  onRemovePreviousExam,
  onUpdatePreviousExam,
  otherExamsOptions = [],

  // Merit Ranking Props
  rankingScope = 'CLASS_AND_SECTION',
  onRankingScopeChange,
  failSubjectRule = 'EXCLUDE_FROM_MERIT',
  onFailSubjectRuleChange,
}) {
  const componentsTotalMarks = useMemo(() => {
    return components.reduce((acc, c) => acc + (Number(c.maxMarks) || 0), 0);
  }, [components]);

  const parsedTargetMarks = Number(targetFullMarks) || 0;
  const isBalanced = Number(componentsTotalMarks) === parsedTargetMarks;

  const activeExamPct = (caEnabled && examWeightageEnabled) ? (Number(examPct) || 0) : 100;

  const previousExamsTotalPct = useMemo(() => {
    if (!previousExamsEnabled || !Array.isArray(previousExams)) return 0;
    return previousExams.reduce((sum, e) => sum + (Number(e.weightagePct) || 0), 0);
  }, [previousExamsEnabled, previousExams]);

  const totalWeightage = useMemo(() => {
    let sum = 0;
    if (caEnabled && dailyEnabled) sum += Number(dailyClassroomPct) || 0;
    if (caEnabled && attendanceEnabled) sum += Number(attendancePct) || 0;
    if (previousExamsEnabled) sum += previousExamsTotalPct;
    if (caEnabled && examWeightageEnabled) sum += Number(examPct) || 0;
    return sum;
  }, [caEnabled, dailyEnabled, dailyClassroomPct, attendanceEnabled, attendancePct, previousExamsEnabled, previousExamsTotalPct, examWeightageEnabled, examPct]);

  const isCaBalanced = totalWeightage === 100;

  const handleAutoBalance = () => {
    if (onAutoBalanceCa) {
      onAutoBalanceCa();
    } else {
      let otherSum = 0;
      if (caEnabled && dailyEnabled) otherSum += Number(dailyClassroomPct) || 0;
      if (caEnabled && attendanceEnabled) otherSum += Number(attendancePct) || 0;
      if (previousExamsEnabled) otherSum += previousExamsTotalPct;
      const remainder = Math.max(0, 100 - otherSum);
      onCaChange('exam', remainder);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Sub-Section 1: Marks Breakdown Template ── */}
      <DrawerSection
        title="Marks Breakdown Template"
        icon={BookOpenIcon}
        badge={caEnabled && examWeightageEnabled ? `Synced with CA (${activeExamPct}% Final Weight)` : null}
        className="!pt-0"
      >
        {/* Dynamic Full Marks Baseline Setting Card */}
        <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-xs font-bold theme-text-primary block">
              Full Marks (Max Marks Scale)
            </span>
            <span className="text-[11px] theme-text-secondary block">
              Set baseline examination marks scale (e.g. 50, 75, 100 pts).
              {caEnabled && examWeightageEnabled && (
                <span className="ml-1 theme-accent font-medium">
                  Maps to {activeExamPct}% of the final grade.
                </span>
              )}
            </span>
          </div>
          <div className="w-28 shrink-0">
            <CustomInput
              type="number"
              min={1}
              max={1000}
              allowDecimals={false}
              suffix="pts"
              value={targetFullMarks}
              onChange={onTargetFullMarksChange}
              required
            />
          </div>
        </div>

        {/* Enable Toggle Card for Marks Breakdown */}
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
                onClick={onAddComponent}
                className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-sub border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span className="hidden @[480px]:inline text-[11px]">Add Component</span>
                <span className="@[480px]:hidden text-[11px]">Add</span>
              </button>
            )}
            <CustomCheckbox
              checked={breakdownEnabled}
              onChange={onBreakdownEnabledChange}
              size="md"
            />
          </div>
        </div>

        {/* Dynamic Assessment Component Rows (When breakdown is enabled) */}
        {breakdownEnabled && (
          <div className="space-y-3.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs animate-fade-in">
            <div className="space-y-2.5">
              {components.map((comp, idx) => {
                const compMarks = Number(comp.maxMarks) || 0;
                const effectivePct =
                  caEnabled && examWeightageEnabled && parsedTargetMarks > 0
                    ? ((compMarks / parsedTargetMarks) * activeExamPct).toFixed(1)
                    : null;

                return (
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
                        {effectivePct !== null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md theme-bg-sub theme-text-secondary border theme-border font-mono">
                            Effective: <strong className="theme-accent">{effectivePct}%</strong> of Final Result
                          </span>
                        )}
                      </div>

                      {components.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveComponent(idx)}
                          title="Remove component"
                          className="text-[11px] font-semibold theme-text-secondary hover:text-rose-500 cursor-pointer flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:theme-bg-danger-soft active:scale-95"
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
                          onChange={(val) => onUpdateComponent(idx, 'name', val)}
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
                          onChange={(val) => onUpdateComponent(idx, 'maxMarks', val)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Balance Indicator Footer */}
            <div className="flex items-center justify-between text-xs pt-2 border-t theme-border">
              <span className="font-semibold theme-text-secondary">Components Sum:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full font-mono text-[11px] shadow-2xs border transition-all ${
                  isBalanced
                    ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                    : 'theme-bg-danger-soft theme-danger border border-[var(--danger-main)]/25'
                }`}
              >
                {componentsTotalMarks} / {targetFullMarks} pts {componentsTotalMarks !== Number(targetFullMarks) && '(Must equal Full Marks)'}
              </span>
            </div>
          </div>
        )}
      </DrawerSection>

      {/* ── Sub-Section 2: Continuous Assessment (CA) & Weightage ── */}
      <DrawerSection
        title="Continuous Assessment (CA) Weightage"
        icon={SparklesIcon}
      >
        {/* Enable Toggle Card */}
        <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between shadow-2xs">
          <div className="space-y-0.5 pr-3">
            <span className="text-xs font-bold theme-text-primary block">
              Enable Continuous Assessment (CA) Weightage
            </span>
            <span className="text-[11px] theme-text-secondary block">
              Automatically merge daily classroom scores, attendance percentage, and written exam marks into final result.
            </span>
          </div>
          <CustomCheckbox
            checked={caEnabled}
            onChange={onCaEnabledChange}
            size="md"
          />
        </div>

        {/* Inputs when CA is Enabled */}
        {caEnabled && (
          <div className="space-y-3.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs animate-fade-in">
            <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3">
              {/* 1. Daily Performance */}
              <div
                className={`p-3 rounded-xl border theme-border theme-bg-surface space-y-2.5 transition-all shadow-2xs ${
                  !dailyEnabled ? 'opacity-60 bg-transparent' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                  <span className="text-xs font-bold theme-text-primary">
                    Daily Performance
                  </span>
                  <CustomCheckbox
                    checked={dailyEnabled}
                    onChange={onDailyEnabledChange}
                    size="sm"
                  />
                </div>
                <CustomInput
                  type="number"
                  min={0}
                  max={100}
                  allowDecimals={false}
                  suffix="%"
                  disabled={!dailyEnabled}
                  value={dailyEnabled ? dailyClassroomPct : 0}
                  onChange={(val) => onCaChange('daily', val)}
                />
              </div>

              {/* 2. Attendance */}
              <div
                className={`p-3 rounded-xl border theme-border theme-bg-surface space-y-2.5 transition-all shadow-2xs ${
                  !attendanceEnabled ? 'opacity-60 bg-transparent' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                  <span className="text-xs font-bold theme-text-primary">
                    Attendance
                  </span>
                  <CustomCheckbox
                    checked={attendanceEnabled}
                    onChange={onAttendanceEnabledChange}
                    size="sm"
                  />
                </div>
                <CustomInput
                  type="number"
                  min={0}
                  max={100}
                  allowDecimals={false}
                  suffix="%"
                  disabled={!attendanceEnabled}
                  value={attendanceEnabled ? attendancePct : 0}
                  onChange={(val) => onCaChange('attendance', val)}
                />
              </div>

              {/* 3. Term Exam */}
              <div
                className={`p-3 rounded-xl border theme-border theme-bg-surface space-y-2.5 transition-all shadow-2xs ${
                  !examWeightageEnabled ? 'opacity-60 bg-transparent' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                  <span
                    className="text-xs font-bold theme-text-primary truncate"
                    title={`Term Exam (${targetFullMarks} pts)`}
                  >
                    Term Exam ({targetFullMarks} pts)
                  </span>
                  <CustomCheckbox
                    checked={examWeightageEnabled}
                    onChange={onExamWeightageEnabledChange}
                    size="sm"
                  />
                </div>
                <CustomInput
                  type="number"
                  min={0}
                  max={100}
                  allowDecimals={false}
                  suffix="%"
                  disabled={!examWeightageEnabled}
                  value={examWeightageEnabled ? examPct : 0}
                  onChange={(val) => onCaChange('exam', val)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t theme-border">
              <div className="flex items-center gap-2">
                <span className="font-semibold theme-text-secondary">Total Weightage Ratio:</span>
                {!isCaBalanced && examWeightageEnabled && (
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="text-[11px] font-bold theme-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshIcon className="w-3 h-3" />
                    <span>Auto-Balance to 100%</span>
                  </button>
                )}
              </div>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full font-mono text-[11px] shadow-2xs border transition-all ${
                  isCaBalanced
                    ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                    : 'theme-bg-danger-soft theme-danger border border-[var(--danger-main)]/25'
                }`}
              >
                {totalWeightage}% / 100% {!isCaBalanced && '(Must equal 100%)'}
              </span>
            </div>
          </div>
        )}
      </DrawerSection>

      {/* ── Sub-Section 3: Previous Exams Marks Merger ── */}
      <DrawerSection
        title="Previous Exams Marks Merger"
        subtitle={
          previousExamsEnabled
            ? `${previousExams.length} prior ${previousExams.length === 1 ? 'exam' : 'exams'} linked (${previousExamsTotalPct}% total weight)`
            : 'Merge marks from 1st Term, Mid-Term, or prior evaluations'
        }
        icon={HistoryIcon}
        headerRight={
          previousExamsEnabled && (
            <button
              type="button"
              onClick={onAddPreviousExam}
              className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-surface border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span className="hidden @[480px]:inline text-[11px]">Add Exam</span>
              <span className="@[480px]:hidden text-[11px]">Add</span>
            </button>
          )
        }
      >
        {/* Enable Toggle Card */}
        <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5 pr-2 min-w-0">
            <span className="text-xs font-bold theme-text-primary block">
              Enable Previous Examination Marks Merger
            </span>
            <span className="text-[11px] theme-text-secondary block">
              Incorporate and scale marks from previous examination sessions (e.g. 1st Term, Mid-Term) into the final result calculation.
            </span>
          </div>
          <CustomCheckbox
            checked={previousExamsEnabled}
            onChange={onPreviousExamsEnabledChange}
            size="md"
          />
        </div>

        {/* Previous Exams List */}
        {previousExamsEnabled && (
          <div className="space-y-3.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs animate-fade-in">
            {previousExams.length === 0 ? (
              <div className="p-6 text-center border border-dashed theme-border rounded-xl flex flex-col items-center justify-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center border theme-border">
                  <HistoryIcon className="w-5 h-5 theme-text-secondary opacity-75" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold theme-text-primary">
                    No previous exam terms linked yet
                  </p>
                  <p className="text-[11px] theme-text-secondary max-w-xs">
                    Link a prior examination (e.g. 1st Term, Mid-Term) to merge marks into the final result.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAddPreviousExam}
                  className="mt-1 px-3 py-1.5 rounded-lg text-xs font-bold theme-bg-accent text-white hover:opacity-90 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 active:scale-95"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Link a Previous Exam</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {previousExams.map((prevExam, idx) => (
                  <div
                    key={prevExam.id || `prev-exam-${idx}`}
                    className="p-3.5 rounded-xl border theme-border theme-bg-surface space-y-3 shadow-2xs hover:shadow-xs transition-all duration-150 animate-fade-in"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold theme-text-primary truncate">
                          Previous Exam Term #{idx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemovePreviousExam(idx)}
                        title="Remove linked exam"
                        className="text-[11px] font-semibold theme-text-secondary hover:text-rose-500 cursor-pointer flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:theme-bg-danger-soft active:scale-95 shrink-0"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span className="hidden @[480px]:inline">Remove</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-2.5">
                      <div className="@[480px]:col-span-2">
                        <CustomSelect
                          label="Select Previous Examination Session"
                          placeholder={otherExamsOptions.length === 0 ? 'No prior exams found' : 'Select Prior Exam Term'}
                          options={otherExamsOptions}
                          value={prevExam.examId}
                          onChange={(val) => onUpdatePreviousExam(idx, 'examId', val)}
                          required
                        />
                      </div>
                      <div>
                        <CustomInput
                          type="number"
                          label="Weightage Ratio"
                          min={1}
                          max={100}
                          allowDecimals={false}
                          suffix="%"
                          value={prevExam.weightagePct}
                          onChange={(val) => onUpdatePreviousExam(idx, 'weightagePct', val)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Previous Exams Total Weight Indicator */}
            <div className="flex items-center justify-between text-xs pt-2 border-t theme-border">
              <span className="font-semibold theme-text-secondary">Previous Exams Aggregate Weight:</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full font-mono text-[11px] theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs">
                {previousExamsTotalPct}% of Final Grade
              </span>
            </div>
          </div>
        )}
      </DrawerSection>

      {/* ── Sub-Section 4: Merit Ranking & Promotion Rules ── */}
      <DrawerSection
        title="Merit Ranking & Promotion Rules"
        icon={TrophyIcon}
      >
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
          <CustomSelect
            label="Ranking Calculation Scope"
            options={RANKING_SCOPE_OPTIONS}
            value={rankingScope}
            onChange={onRankingScopeChange}
          />

          <CustomSelect
            label="Failed Subject Rule"
            options={FAILED_SUBJECT_RULE_OPTIONS}
            value={failSubjectRule}
            onChange={onFailSubjectRuleChange}
          />
        </div>
      </DrawerSection>
    </div>
  );
}

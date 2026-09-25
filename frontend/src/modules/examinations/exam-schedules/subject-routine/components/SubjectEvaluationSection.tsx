import React from 'react';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomCheckbox from '../../../../../components/ui/CustomCheckbox';
import {
  SparklesIcon,
  HistoryIcon,
  PlusIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';
import { RoutineAssessmentComponent, RoutinePreviousExamMark } from '../types';

export interface SubjectEvaluationSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isBreakdownEnabledOnExam?: boolean;
  isPreviousExamsEnabledOnExam?: boolean;
  breakdownEnabled?: boolean;
  componentsTotalMarks?: number;
  isMarksSumBalanced?: boolean;
  defaultPreviousExamsList?: RoutinePreviousExamMark[];
  handleToggleBreakdown: (val: boolean) => void;
  handleAddComponent: () => void;
  handleRemoveComponent: (idx: number) => void;
  handleUpdateComponent: (idx: number, field: keyof RoutineAssessmentComponent, val: any) => void;
  handleAutoBalance: () => void;
  handleTogglePreviousExams: (val: boolean) => void;
  handleUpdatePreviousExamWeight: (idx: number, val: string | number) => void;
}

/**
 * SubjectEvaluationSection
 * Handles Full Marks baseline, Marks Breakdown Components (with auto-balance),
 * and Previous Exams Marks Merger configuration.
 * Streamlined Enterprise Section Headers (Zero Boxed Cards).
 */
export default function SubjectEvaluationSection({
  formData,
  setFormData,
  isBreakdownEnabledOnExam = true,
  isPreviousExamsEnabledOnExam = false,
  breakdownEnabled = true,
  componentsTotalMarks = 100,
  isMarksSumBalanced = true,
  defaultPreviousExamsList = [],
  handleToggleBreakdown,
  handleAddComponent,
  handleRemoveComponent,
  handleUpdateComponent,
  handleAutoBalance,
  handleTogglePreviousExams,
  handleUpdatePreviousExamWeight,
}: SubjectEvaluationSectionProps) {
  const previousExamsList: RoutinePreviousExamMark[] =
    Array.isArray(formData.previousExams) && formData.previousExams.length > 0
      ? formData.previousExams
      : defaultPreviousExamsList;

  return (
    <div className="space-y-6 text-left">
      {/* ─── SECTION 1: Marks & Assessment Components Breakdown ───────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Marks & Assessment Evaluation
          </h3>
        </div>

        <div className="space-y-3.5 pt-1">
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
                onChange={(val: string | number) => {
                  const fVal = Math.max(1, Number(val) || 100);
                  setFormData((prev: any) => ({
                    ...prev,
                    fullMarks: fVal,
                    passMarks: Math.round(fVal * 0.33),
                  }));
                }}
                required
              />
            </div>
          </div>

          {/* Enable Toggle Card for Marks Breakdown (Only if enabled on active exam) */}
          {isBreakdownEnabledOnExam && (
            <>
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

              {/* Dynamic Assessment Component Rows */}
              {breakdownEnabled && (
                <div className="space-y-3.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs animate-fade-in">
                  <div className="space-y-2.5">
                    {(formData.components || []).map((comp: RoutineAssessmentComponent, idx: number) => (
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
                              className="text-[11px] font-semibold theme-text-secondary hover:theme-danger cursor-pointer flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:theme-bg-danger-soft active:scale-95 shrink-0"
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
                              onChange={(val: string) => handleUpdateComponent(idx, 'name', val)}
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
                              onChange={(val: string | number) => handleUpdateComponent(idx, 'maxMarks', val)}
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
            </>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: Previous Exams Marks Merger (If enabled on active exam) ─── */}
      {isPreviousExamsEnabledOnExam && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <HistoryIcon className="w-4 h-4 theme-accent shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Previous Exams Marks Merger ({previousExamsList.length} linked)
            </h3>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Include Toggle Card */}
            <div className="p-3.5 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5 pr-2 min-w-0">
                <span className="text-xs font-bold theme-text-primary block">
                  Include Previous Exam Marks for this Subject
                </span>
                <span className="text-[11px] theme-text-secondary block">
                  Merge marks from earlier evaluation terms (e.g. 1st Term, Mid-Term) into this subject's final result.
                </span>
              </div>
              <CustomCheckbox
                checked={formData.previousExamsEnabled}
                onChange={handleTogglePreviousExams}
                size="md"
              />
            </div>

            {/* Linked Previous Exams List */}
            {formData.previousExamsEnabled && (
              <div className="space-y-2.5 p-3.5 rounded-xl border theme-border theme-bg-sub/30 shadow-2xs animate-fade-in">
                {previousExamsList.length === 0 ? (
                  <div className="p-4 text-center border border-dashed theme-border rounded-xl text-xs theme-text-secondary">
                    No linked previous exams configured in this examination session.
                  </div>
                ) : (
                  previousExamsList.map((prevExam: RoutinePreviousExamMark, idx: number) => (
                    <div
                      key={prevExam.id || `prev-${idx}`}
                      className="p-3 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--accent-main)]/20">
                          <HistoryIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold theme-text-primary truncate block">
                            {prevExam.examName || `Previous Exam Term #${idx + 1}`}
                          </span>
                          <span className="text-[10px] theme-text-secondary font-mono block">
                            Session Default: {prevExam.weightagePct || 0}% weight
                          </span>
                        </div>
                      </div>

                      <div className="w-24 shrink-0">
                        <CustomInput
                          type="number"
                          min={0}
                          max={100}
                          allowDecimals={false}
                          suffix="%"
                          value={prevExam.weightagePct ?? 0}
                          onChange={(val: string | number) => handleUpdatePreviousExamWeight(idx, val)}
                        />
                      </div>
                    </div>
                  ))
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t theme-border">
                  <span className="font-semibold theme-text-secondary">Aggregate Prior Weight:</span>
                  <span className="font-bold px-2.5 py-0.5 rounded-full font-mono text-[11px] theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 shadow-2xs">
                    {previousExamsList.reduce((acc, e) => acc + (Number(e.weightagePct) || 0), 0)}% of Final Result
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

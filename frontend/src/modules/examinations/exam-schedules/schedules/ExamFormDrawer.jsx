import React from 'react';
import CustomButton from '../../../../components/ui/CustomButton';
import { DrawerContainer, DrawerFooter } from '../../../../components/layout';
import Stepper from '../../../../components/ui/Stepper';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  TrashIcon,
} from '../../../../components/ui/Icons';
import useExamFormState from './hooks/useExamFormState';

import ExamGeneralScheduleSection from './components/ExamGeneralScheduleSection';
import ExamClassesSection from './components/ExamClassesSection';
import ExamEvaluationSection from './components/ExamEvaluationSection';

/**
 * ExamFormDrawer
 * Enterprise Right-sidebar drawer form for creating and configuring examination sessions.
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - Clean Presentation Component: All business logic & draft management encapsulated in useExamFormState.
 * - 100% Dynamic Academy Data: Department and Classes load live from Academy database.
 * - Auto-Persistence & Draft Recovery: Form changes auto-save to localStorage to survive page refresh.
 * - Department Auto-Selection: Selecting a department automatically auto-selects all corresponding classes.
 * - Dynamic Full Marks: Fully customizable baseline examination marks scale.
 * - Day-by-Day Exam Schedule & Study Gap Mapping: Pick exact dates for exams, preparation gaps, and breaks.
 * - Two-Way Master Event Calendar Sync: Automatically syncs exam sessions and gap days to masterCalendarStore.
 * - Dynamic Cascading: Terms derived directly from the selected Academic Year.
 * - Container Queries only (@[480px]:grid-cols-2 / @[480px]:grid-cols-3)
 * - Zero double-padding (padding="none")
 * - Streamlined Section Separation (No boxed cards)
 */
export default function ExamFormDrawer({
  exam = null,
  tenantId = 'default',
  academicYears = [],
  academicYearOptions = [],
  departmentOptions = [],
  gradingSystemOptions = [],
  classOptions = [],
  onSaveSuccess,
  onCancel,
}) {
  const form = useExamFormState({
    exam,
    tenantId,
    academicYears,
    academicYearOptions,
    departmentOptions,
    gradingSystemOptions,
    classOptions,
    onSaveSuccess,
  });

  return (
    <DrawerContainer padding="none" spacing="none">
      <form onSubmit={form.handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* Top Stepper Progress Bar (Clean, transparent, non-sticky) */}
        <div className="w-full pb-2">
          <Stepper
            steps={[
              { id: 1, label: 'Schedule', description: 'Session & Dates' },
              { id: 2, label: 'Classes', description: 'Faculty & Scope' },
              { id: 3, label: 'Evaluation', description: 'Marks & Rules' },
            ]}
            currentStep={form.step}
            onStepClick={(stepNum) => form.setStep(stepNum)}
            clickable={true}
            allowFutureClick={true}
            size="sm"
          />
        </div>

        {/* Restored Draft Notice Banner */}
        {form.isDraftRestored && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border theme-border theme-bg-subtle text-xs animate-fade-in">
            <div className="flex items-center gap-2 theme-text-primary font-medium">
              <HistoryIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Unsaved draft restored from your previous session.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CustomButton
                type="button"
                variant="sub"
                size="xs"
                onClick={form.handleDiscardDraft}
                icon={TrashIcon}
              >
                Discard Draft
              </CustomButton>
            </div>
          </div>
        )}

        {/* STEP 1: Examination Information & Schedule */}
        {form.step === 1 && (
          <ExamGeneralScheduleSection
            name={form.name}
            onNameChange={form.setName}
            academicYearOptions={academicYearOptions}
            academicYearId={form.academicYearId}
            onAcademicYearChange={form.setAcademicYearId}
            semesterOptions={form.semesterOptions}
            semesterId={form.semesterId}
            onSemesterChange={form.handleSemesterChange}
            gradingSystemOptions={gradingSystemOptions}
            gradingSystemId={form.gradingSystemId}
            onGradingSystemChange={form.setGradingSystemId}
            startDate={form.startDate}
            endDate={form.endDate}
            onExamDateRangeSelect={(start, end) => {
              form.setStartDate(start);
              form.setEndDate(end);
            }}
            prepStartDate={form.prepStartDate}
            prepEndDate={form.prepEndDate}
            onPrepDateRangeSelect={(start, end) => {
              form.setPrepStartDate(start);
              form.setPrepEndDate(end);
            }}
            shifts={form.shifts}
            onAddShift={form.handleAddShift}
            onRemoveShift={form.handleRemoveShift}
            onShiftChange={form.handleShiftChange}
            scheduleDays={form.scheduleDays}
            onScheduleDaysChange={form.setScheduleDays}
            description={form.description}
            onDescriptionChange={form.setDescription}
          />
        )}

        {/* STEP 2: Target Faculty & Classes */}
        {form.step === 2 && (
          <ExamClassesSection
            departmentOptions={departmentOptions}
            departmentId={form.departmentId}
            onDepartmentChange={form.handleDepartmentChange}
            visibleClasses={form.visibleClasses}
            targetClassIds={form.targetClassIds}
            onClassToggle={form.handleClassToggle}
            onSelectAllClasses={form.handleSelectAllClasses}
          />
        )}

        {/* STEP 3: Evaluation Policy & Merit Rules */}
        {form.step === 3 && (
          <ExamEvaluationSection
            breakdownEnabled={form.breakdownEnabled}
            onBreakdownEnabledChange={form.setBreakdownEnabled}
            targetFullMarks={form.targetFullMarks}
            onTargetFullMarksChange={form.handleTargetFullMarksChange}
            components={form.defaultComponents}
            onAddComponent={form.handleAddComponent}
            onRemoveComponent={form.handleRemoveComponent}
            onUpdateComponent={form.handleUpdateComponent}
            caEnabled={form.caEnabled}
            onCaEnabledChange={form.setCaEnabled}
            dailyEnabled={form.dailyEnabled}
            onDailyEnabledChange={form.setDailyEnabled}
            attendanceEnabled={form.attendanceEnabled}
            onAttendanceEnabledChange={form.setAttendanceEnabled}
            examWeightageEnabled={form.examWeightageEnabled}
            onExamWeightageEnabledChange={form.setExamWeightageEnabled}
            dailyClassroomPct={form.dailyClassroomPct}
            attendancePct={form.attendancePct}
            examPct={form.examPct}
            onCaChange={form.handleCaChange}
            onAutoBalanceCa={form.handleAutoBalanceCa}
            previousExamsEnabled={form.previousExamsEnabled}
            onPreviousExamsEnabledChange={form.setPreviousExamsEnabled}
            previousExams={form.previousExams}
            onAddPreviousExam={form.handleAddPreviousExam}
            onRemovePreviousExam={form.handleRemovePreviousExam}
            onUpdatePreviousExam={form.handleUpdatePreviousExam}
            otherExamsOptions={form.otherExamsOptions}
            rankingScope={form.rankingScope}
            onRankingScopeChange={form.setRankingScope}
            failSubjectRule={form.failSubjectRule}
            onFailSubjectRuleChange={form.setFailSubjectRule}
          />
        )}

        {/* Drawer Footer Actions */}
        <DrawerFooter>
          <div className="flex items-center justify-between gap-3 w-full">
            <div>
              {form.step > 1 ? (
                <CustomButton
                  type="button"
                  variant="sub"
                  size="md"
                  onClick={() => form.setStep((s) => Math.max(1, s - 1))}
                  icon={ChevronLeftIcon}
                >
                  Back
                </CustomButton>
              ) : (
                <CustomButton
                  type="button"
                  variant="sub"
                  size="md"
                  onClick={onCancel}
                >
                  Cancel
                </CustomButton>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {form.step < 3 ? (
                <CustomButton
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => form.setStep((s) => Math.min(3, s + 1))}
                  iconRight={ChevronRightIcon}
                >
                  Next
                </CustomButton>
              ) : (
                <CustomButton
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={form.saving}
                  loadingText="Saving..."
                  icon={CheckIcon}
                >
                  {exam ? 'Update Examination' : 'Create Examination'}
                </CustomButton>
              )}
            </div>
          </div>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}

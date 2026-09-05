import React from 'react';
import { DrawerContainer, DrawerBanner, DrawerFooter } from '../../../../components/layout';
import { AcademicCapIcon } from '../../../../components/ui/Icons';
import useSubjectRoutineForm from './hooks/useSubjectRoutineForm';

import SubjectAcademicScopeSection from './components/SubjectAcademicScopeSection';
import SubjectCurriculumSection from './components/SubjectCurriculumSection';
import SubjectScheduleTimingSection from './components/SubjectScheduleTimingSection';
import SubjectEvaluationSection from './components/SubjectEvaluationSection';

/**
 * SubjectRoutineDrawerForm
 * Enterprise Right Sidebar Drawer Form for Creating and Editing Exam Subject Routines.
 * Modularized Architecture:
 * - State and validation encapsulated in `useSubjectRoutineForm`
 * - Academic Scope & Invigilation in `SubjectAcademicScopeSection`
 * - Curriculum & Subject Title in `SubjectCurriculumSection`
 * - Schedule & Timing in `SubjectScheduleTimingSection`
 * - Evaluation, Breakdown & Previous Exams Merger in `SubjectEvaluationSection`
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Zero double-padding (padding="none")
 * - Streamlined Section Separation (No boxed cards)
 */
export default function SubjectRoutineDrawerForm({
  mode = 'add',
  initialData = null,
  activeExam = null,
  allAvailableClasses = [],
  availableCurriculumBooks = [],
  examShifts = [],
  designatedExamDays = [],
  onSave,
  onCancel,
}) {
  const {
    isEditMode,
    isBreakdownEnabledOnExam,
    isPreviousExamsEnabledOnExam,
    defaultPreviousExamsList,
    breakdownEnabled,
    formData,
    setFormData,
    classMatchingBooks,
    bookOptions,
    departmentSchedule,
    dateOptions,
    shiftOptions,
    componentsTotalMarks,
    isMarksSumBalanced,
    handleDepartmentChange,
    handleClassChange,
    handleSectionChange,
    handleBookChange,
    handleShiftChange,
    handleToggleBreakdown,
    handleAddComponent,
    handleRemoveComponent,
    handleUpdateComponent,
    handleAutoBalance,
    handleTogglePreviousExams,
    handleUpdatePreviousExamWeight,
    handleSubmit,
  } = useSubjectRoutineForm({
    mode,
    initialData,
    activeExam,
    allAvailableClasses,
    availableCurriculumBooks,
    examShifts,
    designatedExamDays,
    onSave,
  });

  return (
    <DrawerContainer padding="none" spacing="none">
      <form onSubmit={handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* Top Context Banner */}
        <DrawerBanner
          icon={AcademicCapIcon}
          title={isEditMode ? `Edit Subject: ${formData.subjectName || 'Subject Routine'}` : 'Add New Subject Routine'}
          subtitle={activeExam ? `Exam Session: ${activeExam.name} (${activeExam.academicYearName || 'Term'})` : 'Institutional Examination Routine'}
          badge={isEditMode ? 'Edit Mode' : 'New Routine'}
        />

        {/* ─── SECTION 1: Academic Scope & Location (Dept, Class, Section, Hall, Invigilator) ─── */}
        <SubjectAcademicScopeSection
          formData={formData}
          setFormData={setFormData}
          allAvailableClasses={allAvailableClasses}
          handleDepartmentChange={handleDepartmentChange}
          handleClassChange={handleClassChange}
          handleSectionChange={handleSectionChange}
        />

        {/* ─── SECTION 2: Subject & Curriculum Book ─────────────────────────── */}
        <SubjectCurriculumSection
          formData={formData}
          setFormData={setFormData}
          bookOptions={bookOptions}
          classMatchingBooks={classMatchingBooks}
          handleBookChange={handleBookChange}
        />

        {/* ─── SECTION 3: Schedule & Shift Timing ───────────────────────────── */}
        <SubjectScheduleTimingSection
          formData={formData}
          setFormData={setFormData}
          departmentSchedule={departmentSchedule}
          dateOptions={dateOptions}
          shiftOptions={shiftOptions}
          handleShiftChange={handleShiftChange}
        />

        {/* ─── SECTION 4: Marks Breakdown & Previous Exams Marks Merger ─────── */}
        <SubjectEvaluationSection
          formData={formData}
          setFormData={setFormData}
          isBreakdownEnabledOnExam={isBreakdownEnabledOnExam}
          isPreviousExamsEnabledOnExam={isPreviousExamsEnabledOnExam}
          breakdownEnabled={breakdownEnabled}
          componentsTotalMarks={componentsTotalMarks}
          isMarksSumBalanced={isMarksSumBalanced}
          defaultPreviousExamsList={defaultPreviousExamsList}
          handleToggleBreakdown={handleToggleBreakdown}
          handleAddComponent={handleAddComponent}
          handleRemoveComponent={handleRemoveComponent}
          handleUpdateComponent={handleUpdateComponent}
          handleAutoBalance={handleAutoBalance}
          handleTogglePreviousExams={handleTogglePreviousExams}
          handleUpdatePreviousExamWeight={handleUpdatePreviousExamWeight}
        />

        {/* ─── Drawer Action Footer ─────────────────────────────────────────── */}
        <DrawerFooter
          onCancel={onCancel}
          cancelLabel="Cancel"
          onSubmit={true}
          onSave={handleSubmit}
          saveLabel={isEditMode ? 'Update Subject Routine' : 'Create Subject Routine'}
          isSaveDisabled={isBreakdownEnabledOnExam && breakdownEnabled && !isMarksSumBalanced}
        />
      </form>
    </DrawerContainer>
  );
}

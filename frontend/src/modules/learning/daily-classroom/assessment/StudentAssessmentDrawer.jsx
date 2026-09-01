import React, { useState, useEffect } from 'react';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import ClassroomContextCard from '../ClassroomContextCard';
import {
  CalendarIcon,
  ChartBarIcon,
  TargetIcon,
  CheckIcon,
  StudentIcon,
} from '../../../../components/ui/Icons';
import { curriculumStore } from '../../../../utils/localStore';
import { findMatchingPeriodSlot } from '../dailyClassroomUtils';
import { useAcademicData } from '../../useAcademicData';
import { useTenant } from '../../../../context/TenantContext';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import useStudentAssessmentForm from './hooks/useStudentAssessmentForm';
import useStudentAssessmentOptions from './hooks/useStudentAssessmentOptions';

/**
 * StudentAssessmentDrawer
 * Streamlined Right Sidebar Drawer for creating and editing daily student assessments.
 * Completely separated into custom hooks for enterprise maintainability.
 */
export default function StudentAssessmentDrawer({
  studentId = '',
  date = '',
  evaluation = null,
  assignedLesson = null,
  defaultDepartmentId = '',
  defaultClassId = '',
  defaultSectionId = '',
  defaultPeriodId = '',
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || 'default';

  const {
    students = [],
    classes = [],
    sections = [],
    periodSlots = [],
    departments = [],
    teachers = [],
    staff = [],
  } = useAcademicData() || {};

  const [curriculumBooks, setCurriculumBooks] = useState([]);
  useEffect(() => {
    try {
      const items = curriculumStore.getCurriculumItems(tenantId);
      setCurriculumBooks(items || []);
    } catch {}
  }, [tenantId]);

  // ── Form State & Business Logic ─────────────────────────────────────────────
  const form = useStudentAssessmentForm({
    studentId,
    date,
    evaluation,
    assignedLesson,
    defaultDepartmentId,
    defaultClassId,
    defaultSectionId,
    defaultPeriodId,
    students,
    classes,
    sections,
    departments,
    periodSlots,
    teachers,
    staff,
    curriculumBooks,
    tenantId,
    onSaveSuccess,
    onCancel,
  });

  // ── Options (reactive to current form state) ────────────────────────────────
  const { studentOptions, periodOptions, bookOptions } = useStudentAssessmentOptions({
    students,
    periodSlots,
    availableBooks: form.availableBooks,
    curriculumBooks,
    teachers,
    staff,
    periodSlotId: form.periodSlotId,
    curriculumBookId: form.curriculumBookId,
    curriculumBookName: form.curriculumBookName,
  });

  return (
    <DrawerContainer padding="none">
      <form onSubmit={form.handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* 1. Context Summary Card (When Student, Date, Book, Class are pre-selected) */}
        {form.hasFixedContext && (
          <ClassroomContextCard
            title={evaluation ? 'Assessment Evaluation Record' : 'Delivery Context & Schedule'}
            badgeLabel={evaluation ? 'Evaluated' : (form.activeStudent ? 'Pre-selected' : 'Pre-selected')}
            student={form.activeStudent}
            date={form.evaluationDate}
            departmentName={form.studentDeptObj?.name || form.activeStudent?.department_name || form.activeStudent?.department || ''}
            className={form.studentClassObj?.name || form.studentClassObj?.class_name || form.activeStudent?.student_class_name || ''}
            sectionName={form.displaySectionName}
            periodName={form.displayPeriodName}
            periodTime={form.resolvedPeriodTime}
            bookName={form.curriculumBookName || form.selectedBook?.name || ''}
            subjectName={form.subjectName || form.selectedBook?.subject || ''}
            teacherName={form.resolvedTeacherName}
            lessonTitle={form.lessonCovered}
            startUnit={form.startUnit}
            endUnit={form.endUnit}
            bookProgressStats={form.bookProgressStats}
            isEditable={true}
            isEditMode={form.isEditingContext}
            onToggleEdit={() => form.setIsEditingContext((prev) => !prev)}
          />
        )}

        {/* 2. Target Context Selectors (Always shown if no fixed context, or when isEditingContext is active) */}
        {(!form.hasFixedContext || form.isEditingContext) && (
          <DrawerSection 
            title="Assessment Context" 
            icon={CalendarIcon}>
              <div className="space-y-4">
                {/* Row 1: Student Picker */}
                <CustomSelect
                  label="Select Student"
                  options={studentOptions}
                  value={form.selectedStudentId}
                  onChange={form.setSelectedStudentId}
                  required
                  searchable={true}
                  placeholder="Search & select student..."
                />

              {/* Row 2: Evaluation Date & Class Routine Period */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <ReusableCalendar
                  label="Evaluation Date"
                  selectedDate={form.evaluationDate}
                  onSelectDate={(val) => form.setEvaluationDate(val)}
                  placeholder="Select Date"
                />

                <CustomSelect
                  label="Routine Period"
                  options={periodOptions}
                  value={form.periodSlotId}
                  onChange={(val) => {
                    form.setPeriodSlotId(val);
                    const matchedSlot = findMatchingPeriodSlot(val, periodSlots);
                    const targetOrder = matchedSlot?.period_order ?? matchedSlot?.order ?? (Number(val) || null);
                    if (targetOrder !== null && !isNaN(targetOrder)) {
                      const autoBook = form.availableBooks.find((b) => {
                        if (b.periodSlotId && (String(b.periodSlotId) === String(val) || (matchedSlot && String(b.periodSlotId) === String(matchedSlot.id)))) {
                          return true;
                        }
                        const bOrder = b.period_order !== undefined ? Number(b.period_order) : (b.order !== undefined ? Number(b.order) : null);
                        return bOrder !== null && bOrder === targetOrder;
                      });
                      if (autoBook) {
                        form.setCurriculumBookId(String(autoBook.id));
                        form.setCurriculumBookName(autoBook.name || '');
                        if (autoBook.subject) form.setSubjectName(autoBook.subject);
                        if (autoBook.startPage) form.setStartUnit(String(autoBook.startPage));
                        if (autoBook.endPage) form.setEndUnit(String(autoBook.endPage));
                      }
                    }
                  }}
                />
              </div>

              {/* Row 3: Curriculum Book & Lesson Title */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Book"
                  options={bookOptions}
                  value={form.curriculumBookId}
                  onChange={(val) => {
                    form.setCurriculumBookId(val);
                    if (!val) {
                      form.setCurriculumBookName('');
                      form.setSubjectName('');
                      return;
                    }
                    const b = curriculumBooks.find((item) => String(item.id) === String(val)) ||
                              form.availableBooks.find((item) => String(item.id) === String(val));
                    if (b) {
                      form.setCurriculumBookName(b.name || '');
                      if (b.subject) form.setSubjectName(b.subject);
                      if (b.startPage) form.setStartUnit(String(b.startPage));
                      if (b.endPage) form.setEndUnit(String(b.endPage));
                    }
                  }}
                />

                <CustomInput
                  label="Lesson Covered"
                  placeholder="e.g. Chapter 1: Exercise 2 or Surah Al-Kahf Ayah 1-20"
                  value={form.lessonCovered}
                  onChange={form.setLessonCovered}
                />
              </div>

              {/* Row 4: Start Page & End Page (Always 2 columns even on small screens) */}
              <div className="grid grid-cols-2 gap-3">
                <CustomInput
                  label="Start Page"
                  type="number"
                  min={form.bookMinPage}
                  max={form.bookMaxPage || undefined}
                  allowDecimals={false}
                  placeholder={form.selectedBook ? `e.g. ${form.bookMinPage}` : 'e.g. 1'}
                  value={form.startUnit}
                  onChange={form.handleStartPageChange}
                />

                <CustomInput
                  label="End Page"
                  type="number"
                  min={form.startUnit ? Math.max(form.bookMinPage, parseInt(form.startUnit, 10) || form.bookMinPage) : form.bookMinPage}
                  max={form.bookMaxPage || undefined}
                  allowDecimals={false}
                  placeholder={form.selectedBook ? `e.g. ${form.bookMaxPage}` : 'e.g. 20'}
                  value={form.endUnit}
                  onChange={form.handleEndPageChange}
                  helperText={form.selectedBook ? `Total: ${form.selectedBook.totalPages || form.bookMaxPage} pages` : ''}
                />
              </div>
            </div>
          </DrawerSection>
        )}

        {/* 3. Standalone Student Selection (When context is pre-selected but student not yet picked) */}
        {form.hasFixedContext && !form.activeStudent && !form.isEditingContext && (
          <DrawerSection title="Student Selection" icon={StudentIcon}>
            <CustomSelect
              label="Select Student to Evaluate"
              options={studentOptions}
              value={form.selectedStudentId}
              onChange={form.setSelectedStudentId}
              required
              searchable={true}
              placeholder="Search & select student..."
            />
          </DrawerSection>
        )}

        {/* 4. Section: Evaluation Metrics & Scores */}
        <DrawerSection title="Evaluation Metrics & Scores" icon={ChartBarIcon}>
          <div className="space-y-4">
            {/* Complementary Row 1: Mistakes & Stucks (Always 2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Mistakes"
                type="number"
                min={0}
                allowDecimals={false}
                value={form.totalMistakes}
                onChange={(val) => form.setTotalMistakes(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0))}
                placeholder="0"
              />

              <CustomInput
                label="Stucks"
                type="number"
                min={0}
                allowDecimals={false}
                value={form.totalStucks}
                onChange={(val) => form.setTotalStucks(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0))}
                placeholder="0"
              />
            </div>

            {/* Complementary Row 2: Lesson Score & Homework Score (Always 2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Lesson Score"
                type="number"
                min={0}
                max={10}
                step={0.25}
                suffix="/ 10"
                value={form.recitationScore}
                onChange={(val) => form.setRecitationScore(val === '' ? '' : Math.min(10, Math.max(0, parseFloat(val) || 0)))}
                placeholder="10.0"
              />

              <CustomInput
                label="Homework Score"
                type="number"
                min={0}
                max={10}
                step={0.25}
                suffix="/ 10"
                value={form.homeworkScore}
                onChange={(val) => form.setHomeworkScore(val === '' ? '' : Math.min(10, Math.max(0, parseFloat(val) || 0)))}
                placeholder="10.0"
              />
            </div>
          </div>
        </DrawerSection>

        {/* 5. Section: Feedback & Next Target */}
        <DrawerSection title="Feedback & Next Target" icon={TargetIcon}>
          <div className="space-y-4">
            <CustomInput
              type="textarea"
              rows={3}
              label="Teacher Remarks"
              placeholder="Performance remarks, focus areas..."
              value={form.teacherRemarks}
              onChange={form.setTeacherRemarks}
            />

            <CustomInput
              label="Next Target for Tomorrow"
              placeholder="e.g. Next Chapter or Next 2 Pages"
              value={form.nextTarget}
              onChange={form.setNextTarget}
            />
          </div>
        </DrawerSection>

        {/* Drawer Footer with Save & Cancel */}
        <DrawerFooter>
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
            loading={form.saving}
            disabled={!form.selectedStudentId}
            icon={CheckIcon}
          >
            {evaluation?.id ? 'Save Changes' : 'Save Assessment'}
          </CustomButton>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}

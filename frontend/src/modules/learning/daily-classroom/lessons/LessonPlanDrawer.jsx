import React, { useState, useEffect } from "react";
import CustomInput from "../../../../components/ui/CustomInput";
import CustomSelect from "../../../../components/ui/CustomSelect";
import CustomButton from "../../../../components/ui/CustomButton";
import ReusableCalendar from "../../../../components/common/ReusableCalendar";
import ClassroomContextCard from "../ClassroomContextCard";
import {
  CheckIcon,
  BookOpenIcon,
  CalendarIcon,
  ChecklistIcon,
  CopyIcon,
} from "../../../../components/ui/Icons";
import { useAcademicData } from "../../useAcademicData";
import { useTenant } from "../../../../context/TenantContext";
import { curriculumStore } from "../../../../utils/localStore";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../../../components/layout";
import CarryForwardLessonPanel from "./CarryForwardLessonPanel";
import useLessonPlanForm from "./hooks/useLessonPlanForm";
import useLessonOptions from "./hooks/useLessonOptions";

const SCOPE_OPTIONS = [
  { value: "CLASS_WIDE", label: "Class Wide (All Enrolled Students)" },
  { value: "SPECIFIC_STUDENTS", label: "Specific Students (Individual Assignment)" },
];

export default function LessonPlanDrawer({
  date = "",
  defaultDate = "",
  defaultDepartmentId = "",
  defaultClassId = "",
  defaultSectionId = "",
  defaultPeriodId = "",
  lesson = null,
  onSaveSuccess,
  onCancel,
}) {
  const { activeTenantId } = useTenant();
  const {
    departments = [],
    classes = [],
    sections = [],
    students = [],
    periodSlots = [],
    teachers = [],
    staff = [],
  } = useAcademicData() || {};
  const tenantId = activeTenantId || "default";

  // Curriculum books for tenant (loaded synchronously from local store)
  const [curriculumBooks, setCurriculumBooks] = useState([]);
  useEffect(() => {
    try {
      setCurriculumBooks(curriculumStore.getItems(tenantId) || []);
    } catch {}
  }, [tenantId]);

  // ── Form State & Logic ───────────────────────────────────────────────────────
  const form = useLessonPlanForm({
    lesson,
    date,
    defaultDate,
    defaultDepartmentId,
    defaultClassId,
    defaultSectionId,
    defaultPeriodId,
    classes,
    sections,
    periodSlots,
    teachers,
    staff,
    curriculumBooks,
    tenantId,
    onSaveSuccess,
  });

  // ── Dropdown Options (reactive to current form state) ────────────────────────
  const {
    filteredStudents,
    departmentOptions,
    classOptions,
    sectionOptions,
    studentSelectOptions,
    periodOptions,
    bookOptions,
    teacherOptions,
  } = useLessonOptions({
    departments,
    classes,
    sections,
    students,
    periodSlots,
    teachers,
    staff,
    curriculumBooks,
    availableBooks: form.availableBooks,
    departmentId: form.departmentId,
    classId: form.classId,
    sectionId: form.sectionId,
    periodSlotId: form.periodSlotId,
    curriculumBookId: form.curriculumBookId,
    teacherName: form.teacherName,
  });

  return (
    <DrawerContainer padding="none">
      <form onSubmit={form.handleSubmit} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* In-Drawer Carry Forward Panel */}
        {!lesson && form.isCarryForwardOpen && (
          <CarryForwardLessonPanel
            isOpen={form.isCarryForwardOpen}
            onClose={() => form.setIsCarryForwardOpen(false)}
            currentDate={form.lessonDate}
            classId={form.classId || defaultClassId}
            classes={classes}
            tenantId={tenantId}
            onApplyLesson={form.handleApplySourceLessonToForm}
          />
        )}

        {/* 1. Context Summary Card (pre-selected context) */}
        {form.hasFixedContext && (
          <ClassroomContextCard
            title={lesson && !lesson?.isDuplicate ? "Lesson Assignment Context" : "Delivery Context & Schedule"}
            badgeLabel={lesson?.isDuplicate ? "Duplicating Lesson" : (lesson ? "Editing Lesson" : "Pre-selected")}
            date={form.lessonDate}
            periodName={form.displayPeriodName}
            periodTime={form.resolvedPeriodTime}
            departmentName={form.matchedClass?.department_name || lesson?.department_name || ""}
            className={
              form.matchedClass
                ? form.matchedClass.name || form.matchedClass.class_name
                : lesson?.class_name || ""
            }
            sectionName={form.displaySectionLabel}
            bookName={form.curriculumBookName || form.selectedBook?.name || lesson?.curriculum_book_name || ""}
            subjectName={form.subjectName || form.selectedBook?.subject || lesson?.subject_name || ""}
            teacherName={form.teacherName || lesson?.teacher_name || ""}
            bookProgressStats={form.bookProgressStats}
            isEditable={true}
            isEditMode={form.isEditingContext}
            onToggleEdit={() => form.setIsEditingContext((prev) => !prev)}
            onCarryForward={!lesson ? () => form.setIsCarryForwardOpen((prev) => !prev) : undefined}
          />
        )}

        {/* 2. Target Context Selectors (shown if no fixed context or editing) */}
        {(!form.hasFixedContext || form.isEditingContext) && (
          <DrawerSection
            title="Academic Target & Delivery Schedule"
            icon={CalendarIcon}
          >
            <div className="space-y-4">
              {/* Row 1: Delivery Date & Period Slot */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <ReusableCalendar
                  label="Lesson Delivery Date"
                  selectedDate={form.lessonDate}
                  onSelectDate={form.setLessonDate}
                  placeholder="Select Date"
                />
                <CustomSelect
                  label="Class Routine Period"
                  options={periodOptions}
                  value={form.periodSlotId}
                  onChange={form.handlePeriodChange}
                />
              </div>

              {/* Row 2: Academic Department & Target Class */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Academic Department"
                  options={departmentOptions}
                  value={form.departmentId}
                  onChange={(val) => {
                    form.setDepartmentId(val);
                    form.setClassId("");
                    form.setSectionId("");
                    form.setCurriculumBookId("");
                    form.setTargetStudentIds([]);
                  }}
                />
                <CustomSelect
                  label="Target Class Division"
                  options={classOptions}
                  value={form.classId}
                  onChange={(val) => {
                    form.setClassId(val);
                    const matched = classes.find((c) => String(c.id) === String(val));
                    if (matched) {
                      const cDept = matched.department !== undefined ? matched.department : matched.department_id;
                      const cDeptId = typeof cDept === "object" ? String(cDept?.id || "") : String(cDept || "");
                      if (cDeptId && !form.departmentId) form.setDepartmentId(cDeptId);
                    }
                    form.setSectionId("");
                    form.setCurriculumBookId("");
                    form.setTargetStudentIds([]);
                  }}
                  required
                />
              </div>

              {/* Row 3: Target Section & Curriculum Book */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Target Section"
                  options={sectionOptions}
                  value={form.sectionId}
                  onChange={form.setSectionId}
                />
                <CustomSelect
                  label="Curriculum Book"
                  options={bookOptions}
                  value={form.curriculumBookId}
                  onChange={form.handleBookChange}
                />
              </div>

              {/* Row 4: Assigned Teacher */}
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Assigned Teacher / Instructor"
                  options={teacherOptions}
                  value={form.teacherName}
                  onChange={form.setTeacherName}
                  searchable={false}
                  placeholder="Select assigned teacher..."
                />
              </div>
            </div>
          </DrawerSection>
        )}

        {/* 3. Lesson Content & Assignments */}
        <DrawerSection title="Daily Sabaq Details" icon={BookOpenIcon}>
          <div className="space-y-4">
            {/* Assignment Scope */}
            <div className="space-y-2">
              <CustomSelect
                label="Assignment Scope"
                options={SCOPE_OPTIONS}
                value={form.assignedScope}
                onChange={(val) => {
                  form.setAssignedScope(val);
                  if (val === "CLASS_WIDE") form.setTargetStudentIds([]);
                }}
              />

              {/* Specific Students Multi-Select */}
              {form.assignedScope === "SPECIFIC_STUDENTS" && (
                <div className="space-y-1.5 animate-fade-in">
                  <CustomSelect
                    label="Select Students"
                    options={studentSelectOptions}
                    value={form.targetStudentIds}
                    onChange={(val) => {
                      if (Array.isArray(val)) form.setTargetStudentIds(val.map(String));
                      else if (val) form.setTargetStudentIds([String(val)]);
                      else form.setTargetStudentIds([]);
                    }}
                    multiple={true}
                    searchable={true}
                    placeholder="Search and select students..."
                    required
                  />
                  {filteredStudents.length === 0 && (
                    <p className="text-[11px] theme-text-secondary italic">
                      No students enrolled in the selected class division.
                    </p>
                  )}
                </div>
              )}
            </div>

            <CustomInput
              label="Lesson Title"
              placeholder="e.g. Bab al-Makharij wa Sifat, Surah Al-Kahf (Ayah 1-20)..."
              value={form.lessonTitle}
              onChange={(val) => form.setLessonTitle(typeof val === "string" ? val : val?.target?.value || "")}
              required
            />

            {/* Page Range Row (Always 2 columns even on small screens) */}
            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Start Page"
                type="number"
                min={form.bookMinPage}
                max={form.bookMaxPage || undefined}
                allowDecimals={false}
                placeholder={form.selectedBook ? `e.g. ${form.bookMinPage}` : "e.g. 1"}
                value={form.startUnit}
                onChange={form.handleStartPageChange}
              />
              <CustomInput
                label="End Page"
                type="number"
                min={form.startUnit ? Math.max(form.bookMinPage, parseInt(form.startUnit, 10) || form.bookMinPage) : form.bookMinPage}
                max={form.bookMaxPage || undefined}
                allowDecimals={false}
                placeholder={form.selectedBook ? `e.g. ${form.bookMaxPage}` : "e.g. 20"}
                value={form.endUnit}
                onChange={form.handleEndPageChange}
                helperText={form.selectedBook ? `Total: ${form.selectedBook.totalPages || form.bookMaxPage} pages` : ""}
              />
            </div>
          </div>
        </DrawerSection>

        {/* 4. Homework & Instructions */}
        <DrawerSection title="Homework & Instructions" icon={ChecklistIcon}>
          <div className="space-y-4">
            <CustomInput
              type="textarea"
              rows={2}
              label="Homework Task"
              placeholder="e.g. Memorize lines 15-25 of Mandhumat al-Jazariyyah, Solve exercise 4..."
              value={form.homeworkTask}
              onChange={(val) => form.setHomeworkTask(typeof val === "string" ? val : val?.target?.value || "")}
            />
            <CustomInput
              type="textarea"
              rows={3}
              label="Instructions"
              placeholder="Detailed instructions for classroom delivery, articulation checks, notes..."
              value={form.lessonInstructions}
              onChange={(val) => form.setLessonInstructions(typeof val === "string" ? val : val?.target?.value || "")}
            />
          </div>
        </DrawerSection>

        {/* Drawer Footer */}
        <DrawerFooter>
          <CustomButton type="button" variant="secondary" size="md" onClick={onCancel}>
            Cancel
          </CustomButton>
          <CustomButton type="submit" variant="primary" size="md" loading={form.saving} icon={CheckIcon}>
            {lesson && !lesson?.isDuplicate ? "Update Lesson" : "Assign Sabaq"}
          </CustomButton>
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}

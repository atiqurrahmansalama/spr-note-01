import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../../components/ui/PageHeader";
import TabSwitcher from "../../../components/ui/TabSwitcher";
import CustomButton from "../../../components/ui/CustomButton";
import { PageContainer } from "../../../components/layout";
import {
  BookOpenIcon,
  ChecklistIcon,
  PlusIcon,
} from "../../../components/ui/Icons";
import { useAcademicData } from "../useAcademicData";
import { useTenant } from "../../../context/TenantContext";
import { useRightSidebar, useDrawerRegistration } from "../../../context/RightSidebarContext";
import { doesLessonMatchClass } from "./dailyClassroomUtils";
import { LessonDeliveryManagementView, LessonPlanDrawer } from "./lessons";
import {
  StudentAssessmentManagementView,
  StudentAssessmentDrawer,
  useDailyClassroomAssessment,
} from "./assessment";
import useDailyClassroomData from "./hooks/useDailyClassroomData";
import useDailyClassroomFilters from "./hooks/useDailyClassroomFilters";

const TABS = [
  { id: "LESSON", label: "Daily Lesson Delivery", icon: BookOpenIcon },
  { id: "ASSESSMENT", label: "Daily Student Assessment", icon: ChecklistIcon },
];

export default function DailyClassroomHubView({
  hideHeader = false,
  isEmbedded = false,
}) {
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const tenantId = activeTenantId || "default";

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "LESSON");
  const { departments, classes, sections, students, periodSlots } = useAcademicData();

  // ── Filter State ──────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(
    () => searchParams.get("date") || new Date().toISOString().split("T")[0]
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("ALL");
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [selectedSectionId, setSelectedSectionId] = useState("ALL");
  const [activePeriodId, setActivePeriodId] = useState("ALL");
  const [lessonSearch, setLessonSearch] = useState("");
  const [assessmentSearch, setAssessmentSearch] = useState("");

  // ── Custom Hooks ─────────────────────────────────────────────────────────────

  // 1. Data loading (local store + API merge)
  const { lessons, evaluations, curriculumBooks, loadData } = useDailyClassroomData(tenantId, selectedDate);

  // 2. Filter computations (class/section/period chains, enrolled students)
  const {
    hasDepartments,
    departmentSelectOptions,
    classSelectOptions,
    selectedClassObj,
    hasSectionsForClass,
    sectionSelectOptions,
    allPeriodFilterOptions,
    baseFilteredLessons,
    filteredLessons,
    enrolledStudents,
    getSlotLessonsCount,
    getBookNamesForPeriod,
    getPeriodTimeForSlot,
  } = useDailyClassroomFilters({
    lessons,
    departments,
    classes,
    sections,
    students,
    periodSlots,
    curriculumBooks,
    selectedDate,
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    activePeriodId,
    lessonSearch,
    setSelectedClassId,
    setSelectedSectionId,
    setActivePeriodId,
  });

  const effectiveClassId = selectedClassId;

  // 3. Assessment rows, metrics, slot count
  const { assessmentRows, assessmentMetrics, getSlotAssessmentCount } = useDailyClassroomAssessment({
    enrolledStudents,
    evaluations,
    lessons,
    classes,
    selectedDate,
    activePeriodId,
    filteredLessons,
    baseFilteredLessons,
    assessmentSearch,
  });

  // ── Lesson Metrics ────────────────────────────────────────────────────────────

  const lessonMetrics = useMemo(() => {
    const activePeriods = new Set(filteredLessons.map((l) => l.period_slot || l.period_name).filter(Boolean)).size;
    return [
      { label: "Assigned Lessons", value: filteredLessons.length, subValue: "Delivered for selected date & period" },
      { label: "Active Periods", value: activePeriods || filteredLessons.length, subValue: "Routine slots utilized" },
      { label: "Enrolled Classes", value: classes.length, subValue: "Active divisions" },
      { label: "Instructions Dispatched", value: filteredLessons.filter((l) => l.lesson_instructions).length, subValue: "Guidelines attached" },
    ];
  }, [filteredLessons, classes]);

  // ── Tab ───────────────────────────────────────────────────────────────────────

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tabId);
        return next;
      },
      { replace: true }
    );
  };

  // ── Drawer Registrations ──────────────────────────────────────────────────────

  useDrawerRegistration(
    "lesson_plan",
    (params) => {
      const mode = params.get("mode") || "add";
      const lessonId = mode === "edit" || mode === "duplicate" ? params.get("id") : null;
      const foundLesson = (mode === "edit" || mode === "duplicate") && lessonId
        ? lessons.find((l) => String(l.id) === String(lessonId))
        : null;

      let effectiveLesson = foundLesson;
      if (mode === "duplicate" && foundLesson) {
        let nextStart = foundLesson.start_unit || "";
        let nextEnd = foundLesson.end_unit || "";
        const sNum = parseInt(foundLesson.start_unit, 10);
        const eNum = parseInt(foundLesson.end_unit, 10);
        if (!isNaN(sNum) && !isNaN(eNum) && eNum >= sNum) {
          const span = eNum - sNum + 1;
          nextStart = String(eNum + 1);
          nextEnd = String(eNum + span);
        }
        effectiveLesson = {
          ...foundLesson,
          id: null,
          isDuplicate: true,
          lesson_date: selectedDate,
          start_unit: nextStart,
          end_unit: nextEnd,
        };
      }

      return {
        title:
          mode === "edit"
            ? "Edit Lesson Plan & Assignment"
            : mode === "duplicate"
            ? "Duplicate Daily Sabaq & Lesson"
            : "Assign Daily Sabaq & Lesson",
        subtitle:
          mode === "edit"
            ? `Update details for ${foundLesson?.lesson_title || "Lesson"}`
            : mode === "duplicate"
            ? `Duplicating from ${foundLesson?.curriculum_book_name || "Lesson"}`
            : "Define homework, instruction milestones, and target page span",
        category: "Academic Learning",
        size: "lg",
        width: "lg",
        content: (
          <LessonPlanDrawer
            key={`lesson-plan-drawer-${mode}-${lessonId || "new"}-${selectedDepartmentId}-${effectiveClassId}-${selectedSectionId}-${activePeriodId}-${selectedDate}`}
            lesson={effectiveLesson}
            defaultDepartmentId={selectedDepartmentId !== "ALL" ? selectedDepartmentId : ""}
            defaultClassId={effectiveClassId !== "ALL" ? effectiveClassId : ""}
            defaultSectionId={selectedSectionId !== "ALL" ? selectedSectionId : ""}
            defaultPeriodId={activePeriodId !== "ALL" ? activePeriodId : ""}
            defaultDate={selectedDate}
            onSaveSuccess={() => { loadData(); closeDrawer(); }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [lessons, selectedDepartmentId, effectiveClassId, selectedSectionId, activePeriodId, selectedDate, loadData, closeDrawer]
  );

  useDrawerRegistration(
    "student_assessment",
    (params) => {
      const studentId = params.get("studentId") || "";
      const date = params.get("date") || selectedDate;
      const paramBookId = params.get("bookId") || "";
      const paramBookName = params.get("bookName") || "";
      const paramSubjectName = params.get("subjectName") || "";
      const paramLessonTitle = params.get("lessonTitle") || "";
      const paramStartUnit = params.get("startUnit") || "";
      const paramEndUnit = params.get("endUnit") || "";

      const foundStudent = students.find((s) => String(s.id) === String(studentId));
      const foundEval = evaluations.find((e) => String(e.student) === String(studentId) && e.evaluation_date === date);

      const stCls = foundStudent?.student_class !== undefined ? foundStudent.student_class : foundStudent?.class_id || foundStudent?.class;
      const stClsId = typeof stCls === "object" ? String(stCls?.id || "") : String(stCls || "");
      const relevantLesson =
        filteredLessons.find((l) => doesLessonMatchClass(l, stClsId, classes)) ||
        baseFilteredLessons.find((l) => doesLessonMatchClass(l, stClsId, classes));

      const effectiveAssignedLesson =
        paramBookName || paramLessonTitle
          ? {
              curriculum_book_id: paramBookId || relevantLesson?.curriculum_book_id || "",
              curriculum_book_name: paramBookName || relevantLesson?.curriculum_book_name || "",
              subject_name: paramSubjectName || relevantLesson?.subject_name || "",
              lesson_title: paramLessonTitle || relevantLesson?.lesson_title || "",
              start_unit: paramStartUnit || (relevantLesson?.start_unit ? String(relevantLesson.start_unit) : ""),
              end_unit: paramEndUnit || (relevantLesson?.end_unit ? String(relevantLesson.end_unit) : ""),
            }
          : relevantLesson;

      return {
        title: foundEval ? "Edit Student Assessment" : "Evaluate Student Performance",
        subtitle: foundStudent
          ? `${foundStudent.name_en || foundStudent.name} (${foundStudent.uniq_id || foundStudent.roll_number || "N/A"})`
          : "Evaluate performance, mistakes, stucks, and lesson scores",
        category: "Academic Learning",
        size: "lg",
        width: "lg",
        content: (
          <StudentAssessmentDrawer
            key={`assessment-drawer-${studentId}-${date}-${effectiveAssignedLesson?.curriculum_book_name || "none"}-${effectiveAssignedLesson?.lesson_title || "none"}`}
            studentId={studentId}
            date={date}
            evaluation={foundEval}
            assignedLesson={effectiveAssignedLesson}
            defaultDepartmentId={selectedDepartmentId !== "ALL" ? selectedDepartmentId : ""}
            defaultClassId={effectiveClassId !== "ALL" ? effectiveClassId : ""}
            defaultSectionId={selectedSectionId !== "ALL" ? selectedSectionId : ""}
            defaultPeriodId={activePeriodId !== "ALL" ? activePeriodId : ""}
            onSaveSuccess={() => { loadData(); closeDrawer(); }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [students, evaluations, filteredLessons, baseFilteredLessons, classes, departments, selectedDate, selectedDepartmentId, effectiveClassId, selectedSectionId, activePeriodId, loadData, closeDrawer]
  );

  // ── Action Handlers ───────────────────────────────────────────────────────────

  const handleOpenAddLesson = () => openDrawer("lesson_plan", { mode: "add" });

  const handleEditLesson = (lesson) => openDrawer("lesson_plan", { mode: "edit", id: lesson.id });

  const handleDuplicateLesson = (lesson) => openDrawer("lesson_plan", { mode: "duplicate", id: lesson.id });

  const handleOpenAssessmentDrawer = (studentId, rowData = null) => {
    const rawStudentId = typeof studentId === "object" ? studentId?.student || studentId?.id : studentId;
    const targetRow =
      rowData || assessmentRows.find((r) => String(r.student) === String(rawStudentId) || String(r.id) === String(rawStudentId));
    openDrawer("student_assessment", {
      studentId: rawStudentId,
      date: selectedDate,
      bookId: targetRow?.curriculum_book_id || "",
      bookName: targetRow?.curriculum_book_name || "",
      subjectName: targetRow?.subject_name || "",
      lessonTitle: targetRow?.lesson_title || targetRow?.lesson_covered || "",
      startUnit: targetRow?.start_unit || "",
      endUnit: targetRow?.end_unit || "",
    });
  };

  // ── Filter Change Handlers ────────────────────────────────────────────────────

  const handleDepartmentChange = (val) => {
    setSelectedDepartmentId(val);
    setSelectedClassId("ALL");
    setSelectedSectionId("ALL");
    setActivePeriodId("ALL");
  };

  const handleClassChange = (val) => {
    setSelectedClassId(val);
    setSelectedSectionId("ALL");
    setActivePeriodId("ALL");
  };

  const handleSectionChange = (val) => {
    setSelectedSectionId(val);
    setActivePeriodId("ALL");
  };

  const handleDateChange = (val) => {
    setSelectedDate(val);
    setActivePeriodId("ALL");
  };

  // ── Consolidated Filter Props for Sub-Views ──────────────────────────────────
  const sharedFilterProps = useMemo(() => ({
    selectedDate,
    onDateChange: handleDateChange,
    hasDepartments,
    selectedDepartmentId,
    onDepartmentChange: handleDepartmentChange,
    departmentSelectOptions,
    selectedClassId,
    onClassChange: handleClassChange,
    classSelectOptions,
    hasSectionsForClass,
    selectedSectionId,
    onSectionChange: handleSectionChange,
    sectionSelectOptions,
    allPeriodFilterOptions,
    activePeriodId,
    onPeriodChange: setActivePeriodId,
    getPeriodSubtitle: getPeriodTimeForSlot,
  }), [
    selectedDate,
    hasDepartments,
    selectedDepartmentId,
    departmentSelectOptions,
    selectedClassId,
    classSelectOptions,
    hasSectionsForClass,
    selectedSectionId,
    sectionSelectOptions,
    allPeriodFilterOptions,
    activePeriodId,
    getPeriodTimeForSlot,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageContainer isEmbedded={isEmbedded} className="space-y-4">
      {/* 1. Page Header */}
      {!hideHeader && (
        <PageHeader
          title="Daily Classroom & Sabaq Delivery"
          subtitle="Plan and monitor daily lesson assignments, homework dispatch, evaluation rubrics, and individual student diary assessments."
          icon={BookOpenIcon}
          actions={
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={activeTab === "LESSON" ? handleOpenAddLesson : () => handleOpenAssessmentDrawer("")}
            >
              {activeTab === "LESSON" ? "Add Daily Sabaq" : "Evaluate Student"}
            </CustomButton>
          }
        />
      )}

      {/* 2. Tab Switcher */}
      <TabSwitcher tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* 3. Tab 1: Daily Lesson Delivery */}
      {activeTab === "LESSON" && (
        <LessonDeliveryManagementView
          filterProps={sharedFilterProps}
          filteredLessons={filteredLessons}
          lessonMetrics={lessonMetrics}
          lessonSearch={lessonSearch}
          onSearchChange={setLessonSearch}
          getSlotLessonsCount={getSlotLessonsCount}
          getBookNamesForPeriod={getBookNamesForPeriod}
          selectedClassObj={selectedClassObj}
          classes={classes}
          tenantId={tenantId}
          loadData={loadData}
          onOpenAddLesson={handleOpenAddLesson}
          onEditLesson={handleEditLesson}
          onDuplicateLesson={handleDuplicateLesson}
        />
      )}

      {/* 4. Tab 2: Daily Student Assessment */}
      {activeTab === "ASSESSMENT" && (
        <StudentAssessmentManagementView
          filterProps={sharedFilterProps}
          assessmentRows={assessmentRows}
          assessmentMetrics={assessmentMetrics}
          assessmentSearch={assessmentSearch}
          onSearchChange={setAssessmentSearch}
          getSlotAssessmentCount={getSlotAssessmentCount}
          onOpenAssessmentDrawer={handleOpenAssessmentDrawer}
          tenantId={tenantId}
          loadData={loadData}
        />
      )}
    </PageContainer>
  );
}

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { CollapsiblePageHeader } from "../../../components/ui";
import CustomButton from "../../../components/ui/CustomButton";
import { PageContainer } from "../../../components/layout";
import {
  BookOpenIcon,
  ChecklistIcon,
  PlusIcon,
  TrendingUpIcon,
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
import { getClassroomTodayDate } from "../../../constants/calendarConstants";
import HifzReportBuilderModule from "./daily-progress/DailyProgressView";
import StudentReportsView from "../../reports-history/components/StudentReportsView";

const LESSON_MANAGEMENT_TABS = [
  { id: "LESSON", label: "Daily Lessons", icon: BookOpenIcon, path: "/studies/daily-lessons" },
  { id: "LESSON_ASSESSMENT", label: "Lesson Assessments", icon: ChecklistIcon, path: "/studies/lesson-assessments" },
];

const PROGRESS_MANAGEMENT_TABS = [
  { id: "PROGRESS", label: "Daily Progress", icon: TrendingUpIcon, path: "/studies/daily-progress" },
  { id: "PROGRESS_ASSESSMENT", label: "Progress Reports", icon: TrendingUpIcon, path: "/studies/progress-reports" },
];

const normalizeTabId = (tab, isProgress) => {
  if (!tab) return isProgress ? "PROGRESS" : "LESSON";
  const upper = String(tab).toUpperCase();
  if (upper === "ASSESSMENT" || upper === "LESSON_ASSESSMENTS" || upper === "RECITATIONS") {
    return "LESSON_ASSESSMENT";
  }
  if (
    upper === "PROGRESS_ASSESSMENT" ||
    upper === "PROGRESS_ASSESSMENTS" ||
    upper === "PROGRESS_REPORTS" ||
    upper === "STUDENT_REPORTS" ||
    upper === "REPORTS"
  ) {
    return "PROGRESS_ASSESSMENT";
  }
  if (isProgress && (upper === "LESSON" || upper === "LESSON_ASSESSMENT")) {
    return "PROGRESS";
  }
  if (!isProgress && (upper === "PROGRESS" || upper === "PROGRESS_ASSESSMENT")) {
    return "LESSON";
  }
  return upper;
};

export default function DailyClassroomHubView({
  hideHeader = false,
  isEmbedded = false,
  hubType = "AUTO",
  defaultTab = null,
}) {
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const tenantId = activeTenantId || "default";

  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.toLowerCase();

  const isProgressHub = useMemo(() => {
    if (hubType === "PROGRESS_MANAGEMENT") return true;
    if (hubType === "LESSON_MANAGEMENT") return false;
    return (
      path.includes("/progress-management") ||
      path.includes("/daily-progress") ||
      path.includes("/progress-reports") ||
      path.includes("/progress-assessments") ||
      defaultTab === "PROGRESS" ||
      defaultTab === "PROGRESS_ASSESSMENT"
    );
  }, [hubType, path, defaultTab]);

  const activeTabs = isProgressHub ? PROGRESS_MANAGEMENT_TABS : LESSON_MANAGEMENT_TABS;
  const hubTitle = isProgressHub ? "Progress Management" : "Lesson Management";
  const HubIcon = isProgressHub ? TrendingUpIcon : BookOpenIcon;

  const [searchParams, setSearchParams] = useSearchParams();

  const resolveActiveTab = useCallback(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) {
      return normalizeTabId(urlTab, isProgressHub);
    }
    if (path.includes("/progress-reports") || path.includes("/progress-assessments")) {
      return "PROGRESS_ASSESSMENT";
    }
    if (path.includes("/daily-progress")) {
      return "PROGRESS";
    }
    if (path.includes("/lesson-assessments") || path.includes("/recitations")) {
      return "LESSON_ASSESSMENT";
    }
    if (path.includes("/daily-lessons")) {
      return "LESSON";
    }
    if (defaultTab) {
      return normalizeTabId(defaultTab, isProgressHub);
    }
    return isProgressHub ? "PROGRESS" : "LESSON";
  }, [searchParams, path, defaultTab, isProgressHub]);

  const [activeTab, setActiveTab] = useState(resolveActiveTab);

  useEffect(() => {
    setActiveTab(resolveActiveTab());
  }, [resolveActiveTab]);

  const { departments, classes, sections, students, periodSlots } = useAcademicData();

  // ── Filter State (No "ALL" Option Defaults) ──────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(
    () => searchParams.get("date") || getClassroomTodayDate()
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [activePeriodId, setActivePeriodId] = useState("1");

  // Keep selectedDate dynamically matched to the classroom timezone when settings update
  useEffect(() => {
    const handleTimezoneSettingsUpdate = () => {
      if (!searchParams.get("date")) {
        setSelectedDate(getClassroomTodayDate());
      }
    };

    window.addEventListener("spr_classroom_settings_updated", handleTimezoneSettingsUpdate);
    window.addEventListener("spr_calendar_settings_updated", handleTimezoneSettingsUpdate);
    window.addEventListener("spr_date_time_updated", handleTimezoneSettingsUpdate);
    return () => {
      window.removeEventListener("spr_classroom_settings_updated", handleTimezoneSettingsUpdate);
      window.removeEventListener("spr_calendar_settings_updated", handleTimezoneSettingsUpdate);
      window.removeEventListener("spr_date_time_updated", handleTimezoneSettingsUpdate);
    };
  }, [searchParams]);

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
    setSelectedDepartmentId,
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
  });

  // ── Lesson Metrics ────────────────────────────────────────────────────────────

  const lessonMetrics = useMemo(() => {
    const assignedCount = filteredLessons.filter((l) => l.is_assigned).length;
    const pendingCount = filteredLessons.filter((l) => !l.is_assigned).length;
    const activePeriods = new Set(
      filteredLessons
        .filter((l) => l.is_assigned)
        .map((l) => l.period_slot || l.period_name)
        .filter(Boolean)
    ).size;

    return [
      {
        label: "Assigned Lessons",
        value: assignedCount,
        subValue: `Delivered for ${selectedDate || "selected date"}`,
      },
      {
        label: "Pending Routine Slots",
        value: pendingCount,
        subValue: `${filteredLessons.length} total scheduled slots`,
      },
      {
        label: "Enrolled Classes",
        value: classes.length,
        subValue: "Active divisions",
      },
      {
        label: "Instructions Dispatched",
        value: filteredLessons.filter((l) => l.is_assigned && l.lesson_instructions).length,
        subValue: "Guidelines attached",
      },
    ];
  }, [filteredLessons, classes, selectedDate]);

  // ── Tab ───────────────────────────────────────────────────────────────────────

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    let targetPath = "";
    if (isProgressHub) {
      targetPath = tabId === "PROGRESS_ASSESSMENT" ? "/studies/progress-reports" : "/studies/daily-progress";
    } else {
      targetPath = tabId === "LESSON_ASSESSMENT" ? "/studies/lesson-assessments" : "/studies/daily-lessons";
    }

    const dateParam = searchParams.get("date");
    const query = dateParam ? `?date=${encodeURIComponent(dateParam)}` : "";
    navigate(`${targetPath}${query}`, { replace: true });
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
      } else if (mode === "add") {
        const pBookId = params.get("bookId") || "";
        const pBookName = params.get("bookName") || "";
        const pSubjectName = params.get("subjectName") || "";
        const pPeriodSlot = params.get("periodSlot") || params.get("periodId") || "";
        const pPeriodName = params.get("periodName") || "";
        const pClassId = params.get("classId") || "";
        const pSectionId = params.get("sectionId") || "";
        const pTeacherName = params.get("teacherName") || "";
        const pTeacherId = params.get("teacherId") || "";

        if (pBookId || pBookName || pPeriodSlot || pClassId || pTeacherName) {
          effectiveLesson = {
            curriculum_book_id: pBookId,
            curriculum_book_name: pBookName,
            subject_name: pSubjectName,
            period_slot: pPeriodSlot,
            period_slot_id: pPeriodSlot,
            period_name: pPeriodName,
            academic_class: pClassId,
            academic_class_id: pClassId,
            section: pSectionId,
            section_id: pSectionId,
            teacher: pTeacherId,
            teacher_id: pTeacherId,
            teacher_name: pTeacherName,
            lesson_date: selectedDate,
          };
        }
      }

      const targetClassId =
        effectiveLesson?.academic_class_id ||
        effectiveLesson?.academic_class ||
        effectiveClassId || "";
      const targetSectionId =
        effectiveLesson?.section_id ||
        effectiveLesson?.section ||
        selectedSectionId || "";
      const targetPeriodId =
        effectiveLesson?.period_slot ||
        effectiveLesson?.period_slot_id ||
        activePeriodId || "1";
      const targetDeptId = selectedDepartmentId || "";

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
        size: "md",
        width: "md",
        content: (
          <LessonPlanDrawer
            key={`lesson-plan-drawer-${mode}-${lessonId || "new"}-${targetDeptId}-${targetClassId}-${targetSectionId}-${targetPeriodId}-${selectedDate}-${effectiveLesson?.curriculum_book_id || "none"}`}
            lesson={effectiveLesson}
            defaultDepartmentId={targetDeptId}
            defaultClassId={targetClassId}
            defaultSectionId={targetSectionId}
            defaultPeriodId={targetPeriodId}
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
        size: "md",
        width: "md",
        content: (
          <StudentAssessmentDrawer
            key={`assessment-drawer-${studentId}-${date}-${effectiveAssignedLesson?.curriculum_book_name || "none"}-${effectiveAssignedLesson?.lesson_title || "none"}`}
            studentId={studentId}
            date={date}
            evaluation={foundEval}
            assignedLesson={effectiveAssignedLesson}
            defaultDepartmentId={selectedDepartmentId || ""}
            defaultClassId={effectiveClassId || ""}
            defaultSectionId={selectedSectionId || ""}
            defaultPeriodId={activePeriodId || "1"}
            onSaveSuccess={() => { loadData(); closeDrawer(); }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [students, evaluations, filteredLessons, baseFilteredLessons, classes, departments, selectedDate, selectedDepartmentId, effectiveClassId, selectedSectionId, activePeriodId, loadData, closeDrawer]
  );

  // ── Action Handlers ───────────────────────────────────────────────────────────

  const handleOpenAddLesson = (rowDefaults = null) => {
    if (rowDefaults && typeof rowDefaults === "object" && !rowDefaults.nativeEvent) {
      openDrawer("lesson_plan", {
        mode: "add",
        bookId: rowDefaults.curriculum_book_id || "",
        bookName: rowDefaults.curriculum_book_name || "",
        subjectName: rowDefaults.subject_name || "",
        periodSlot: rowDefaults.period_slot || rowDefaults.period_slot_id || "",
        periodName: rowDefaults.period_name || "",
        classId: rowDefaults.academic_class_id || rowDefaults.academic_class || rowDefaults.class_id || effectiveClassId || "",
        sectionId: rowDefaults.section_id || rowDefaults.section || selectedSectionId || "",
        teacherId: rowDefaults.teacher_id || rowDefaults.teacher || "",
        teacherName: rowDefaults.teacher_name || "",
      });
    } else {
      openDrawer("lesson_plan", { mode: "add" });
    }
  };

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

  // ── Filter Change Handlers (Cascading Resets) ────────────────────────────────

  const handleDepartmentChange = (val) => {
    setSelectedDepartmentId(val);
    setSelectedClassId("");
    setSelectedSectionId("");
  };

  const handleClassChange = (val) => {
    setSelectedClassId(val);
    setSelectedSectionId("");
  };

  const handleSectionChange = (val) => {
    setSelectedSectionId(val);
  };

  const handleBatchHierarchyChange = ({ departmentId, classId, sectionId }) => {
    if (departmentId !== undefined) setSelectedDepartmentId(departmentId);
    if (classId !== undefined) setSelectedClassId(classId);
    if (sectionId !== undefined) setSelectedSectionId(sectionId);
  };

  const handleDateChange = (val) => {
    setSelectedDate(val);
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
    onBatchHierarchyChange: handleBatchHierarchyChange,
    setAcademicFilters: handleBatchHierarchyChange,
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
      {/* 1. Collapsible Header & Tab Switcher */}
      <CollapsiblePageHeader
        hideHeader={hideHeader}
        title={hubTitle}
        icon={HubIcon}
        storageKey={isProgressHub ? "progress_management_header" : "lesson_management_header"}
        tabs={activeTabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        actionsPlacement="tabs"
        actions={
          !isProgressHub && activeTab === "LESSON" ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenAddLesson}
            >
              Add Lesson
            </CustomButton>
          ) : !isProgressHub && (activeTab === "LESSON_ASSESSMENT" || activeTab === "ASSESSMENT") ? (
            <CustomButton
              type="button"
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={() => handleOpenAssessmentDrawer("")}
            >
              Evaluate Student
            </CustomButton>
          ) : null
        }
      />

      {/* Lesson Management — Tab 1: Daily Lessons */}
      {!isProgressHub && activeTab === "LESSON" && (
        <LessonDeliveryManagementView
          filterProps={sharedFilterProps}
          filteredLessons={filteredLessons}
          lessonMetrics={lessonMetrics}
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

      {/* Lesson Management — Tab 2: Lesson Assessments */}
      {!isProgressHub && (activeTab === "LESSON_ASSESSMENT" || activeTab === "ASSESSMENT") && (
        <StudentAssessmentManagementView
          filterProps={sharedFilterProps}
          assessmentRows={assessmentRows}
          assessmentMetrics={assessmentMetrics}
          getSlotAssessmentCount={getSlotAssessmentCount}
          onOpenAssessmentDrawer={handleOpenAssessmentDrawer}
          tenantId={tenantId}
          loadData={loadData}
        />
      )}

      {/* Progress Management — Tab 1: Daily Progress */}
      {isProgressHub && activeTab === "PROGRESS" && (
        <div className="w-full pt-1">
          <HifzReportBuilderModule filterProps={sharedFilterProps} isEmbedded={true} />
        </div>
      )}

      {/* Progress Management — Tab 2: Progress Assessments (Student Reports) */}
      {isProgressHub && (activeTab === "PROGRESS_ASSESSMENT" || activeTab === "PROGRESS_ASSESSMENTS") && (
        <div className="w-full pt-1">
          <StudentReportsView isEmbedded={true} />
        </div>
      )}
    </PageContainer>
  );
}

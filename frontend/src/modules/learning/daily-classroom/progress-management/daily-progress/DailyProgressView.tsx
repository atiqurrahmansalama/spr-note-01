import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import {
  DAILY_PROGRESS_SCOPE_ID,
  buildDailyProgressReportData,
} from "./dailyProgressDocLabKeys";

// Preloadable DocLab Quick Report Modal for 0ms perceived latency on Make Report
const loadDocLabModal = () => import("@/components/print/DocLabQuickReportModal");
const DocLabQuickReportModal = lazy(loadDocLabModal);
import { PageContainer } from "@/components/layout";
import { useToast } from "@/context/ToastContext";
import { useFont } from "@/context/useFont";
import { useUndoRedo } from "@/context/useUndoRedo";
import { useFeatureControl } from "@/context/FeatureControlContext";
import DailyClassroomFilterControls from "../../components/DailyClassroomFilterControls";
import SegmentedSwitch from "@/components/ui/SegmentedSwitch";
import { getClassroomTodayDate } from "@/constants/calendarConstants";
import { classroomSettings } from "@/stores";

import type {
  DailyProgressViewProps,
  SectionVisibilityConfig,
} from "./types";
import {
  useReportForm,
  useDailyProgressHierarchy,
  useProgressDragReorder,
} from "./hooks";
import {
  DailyProgressSkeleton,
  EditModeBanner,
  DraftRecoveryBanner,
  StudentInputSection,
  SessionInputSection,
  LessonInputSection,
  BookSubjectInputSection,
  JuzPageSection,
  DetailSection,
  CommentSection,
} from "./components";
import { BookOpenIcon, LayersIcon } from "@/components/ui/Icons";

// Re-export domain items and submodules for backward compatibility
export * from "./types";
export * from "./quranRules";
export * from "./hooks";
export * from "./components";

export default function DailyProgressView({
  timeZone,
  dateFormat,
  filterProps = null,
  isEmbedded = false,
  maxWidth = "7xl",
  className = "",
}: DailyProgressViewProps) {
  const { showToast } = useToast();
  const { activeFont, activeFontSize } = useFont();
  const { isFeatureEnabled, loading: featureLoading } = useFeatureControl();

  const isQuranAllowed = isFeatureEnabled("progress_mode_quran");
  const isBookAllowed = isFeatureEnabled("progress_mode_book");

  const sectionConfig: SectionVisibilityConfig = useMemo(
    () => ({
      headerDate: { enabled: isFeatureEnabled("headerDate") },
      studentSelect: { enabled: isFeatureEnabled("studentSelect") },
      sessionSelect: { enabled: isFeatureEnabled("sessionSelect") },
      juzPageInput: { enabled: isFeatureEnabled("juzPageInput") },
      mistakeTracker: { enabled: isFeatureEnabled("mistakeTracker") },
      stuckTracker: { enabled: isFeatureEnabled("stuckTracker") },
      commentSection: { enabled: isFeatureEnabled("commentSection") },
      actionButtons: { enabled: isFeatureEnabled("actionButtons") },
      pdfExport: { enabled: isFeatureEnabled("pdfExport") },
    }),
    [isFeatureEnabled]
  );

  const {
    selectedDate,
    setSelectedDate,
    studentName,
    setStudentName,
    selectedStudentId,
    setSelectedStudentId,
    groupName,
    setGroupName,
    selectedSession,
    setSelectedSession,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedTeacherName,
    setSelectedTeacherName,
    defaultTeacherId,
    defaultTeacherName,
    progressMode,
    setProgressMode,
    bookTitle,
    setBookTitle,
    lessonTitle,
    setLessonTitle,
    juzPageData,
    setJuzPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
    bookPageData,
    setBookPageData,
    bookMistakeData,
    setBookMistakeData,
    bookStuckData,
    setBookStuckData,
    totalMistakes,
    totalStuck,
    comment,
    setComment,
    savedComments,
    studentDatabase,
    sessionList,
    isLoading,
    isSaving,
    draftInfo,
    recoverDraft,
    discardDraft,
    dismissDraft,
    editingReport,
    cancelEditMode,
    handleSaveRecord,
    validateReportForm,
    handleJuzPageRefresh,
    handleBookPageReset,
    handleBookMistakeReset,
    handleBookStuckReset,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  } = useReportForm();

  const {
    departments,
    classes,
    sections,
    selectedDepartmentId,
    departmentSelectOptions,
    hasDepartments,
    selectedClassId,
    classSelectOptions,
    selectedSectionId,
    sectionSelectOptions,
    hasSectionsForClass,
    resolvedAcademicContext,
    allStudentDatabase,
    handleDepartmentChange,
    handleClassChange,
    handleSectionChange,
    handleStudentSelect,
  } = useDailyProgressHierarchy({
    filterProps,
    studentDatabase,
    studentName,
    setStudentName,
    selectedStudentId,
    setSelectedStudentId,
    setGroupName,
  });

  const studentInputRef = useRef<HTMLInputElement>(null);

  const handleSaveRecordWithContext = useCallback(async (options?: { keepFormOpen?: boolean }) => {
    const result = await handleSaveRecord({
      departmentId: selectedDepartmentId,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      allStudents: allStudentDatabase,
      departments,
      classes,
      sections,
    }, options);

    if (!options?.keepFormOpen) {
      // Auto-focus the student input box after saving so teacher can seamlessly enter next student
      setTimeout(() => {
        if (studentInputRef.current) {
          studentInputRef.current.focus();
          studentInputRef.current.select?.();
        } else {
          const el = document.getElementById("daily-progress-student-input") as HTMLInputElement;
          el?.focus();
          el?.select?.();
        }
      }, 60);
    }

    return result;
  }, [
    handleSaveRecord,
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    allStudentDatabase,
    departments,
    classes,
    sections,
  ]);

  useEffect(() => {
    if (!editingReport && filterProps?.selectedDate && filterProps.selectedDate !== selectedDate) {
      setSelectedDate(filterProps.selectedDate);
    }
  }, [filterProps?.selectedDate, selectedDate, setSelectedDate, editingReport]);

  const [configuredDateFormat, setConfiguredDateFormat] = useState<string>(
    () => classroomSettings?.getDateFormat?.() || "DD/MM/YYYY"
  );

  useEffect(() => {
    const handleFormatChange = () => {
      setConfiguredDateFormat(classroomSettings?.getDateFormat?.() || "DD/MM/YYYY");
    };
    window.addEventListener("spr_copy_settings_updated", handleFormatChange);
    window.addEventListener("spr_classroom_date_format_changed", handleFormatChange);
    window.addEventListener("storage", handleFormatChange);
    return () => {
      window.removeEventListener("spr_copy_settings_updated", handleFormatChange);
      window.removeEventListener("spr_classroom_date_format_changed", handleFormatChange);
      window.removeEventListener("storage", handleFormatChange);
    };
  }, []);

  const dailyProgressReportData = useMemo(() => {
    return buildDailyProgressReportData(
      {
        studentName,
        groupName: resolvedAcademicContext.sectionName,
        departmentName: resolvedAcademicContext.departmentName,
        className: resolvedAcademicContext.className,
        sectionName: resolvedAcademicContext.sectionName,
        selectedSession,
        bookTitle,
        lessonTitle,
        progressMode,
        selectedDate,
        juzPageData,
        mistakeData,
        stuckData,
        totalMistakes,
        totalStuck,
        comment,
      },
      resolvedAcademicContext
    );
  }, [
    studentName,
    resolvedAcademicContext,
    selectedSession,
    bookTitle,
    lessonTitle,
    progressMode,
    selectedDate,
    juzPageData,
    mistakeData,
    stuckData,
    totalMistakes,
    totalStuck,
    comment,
    configuredDateFormat,
  ]);

  // Normalize progress mode if restricted by feature flags
  useEffect(() => {
    if (isQuranAllowed && !isBookAllowed && progressMode !== "QURAN") {
      setProgressMode("QURAN");
    } else if (!isQuranAllowed && isBookAllowed && progressMode !== "BOOK") {
      setProgressMode("BOOK");
    }
  }, [isQuranAllowed, isBookAllowed, progressMode, setProgressMode]);

  const { registerScopeHandler } = useUndoRedo();
  const location = useLocation();
  const isEditMode = Boolean(editingReport);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    return registerScopeHandler(
      [
        "/studies/daily-classroom",
        "/studies",
        "/studies/daily-progress",
        "/daily-progress",
        location.pathname,
      ],
      {
        undo: handleUndo,
        redo: handleRedo,
        canUndo: canUndoDraft,
        canRedo: canRedoDraft,
        undoTitle: "Restore previous draft state",
        redoTitle: "Restore next draft state",
      }
    );
  }, [registerScopeHandler, handleUndo, handleRedo, canUndoDraft, canRedoDraft, location.pathname]);

  const initialFocusDoneRef = useRef(false);

  useEffect(() => {
    if (!initialFocusDoneRef.current) {
      initialFocusDoneRef.current = true;
      setTimeout(() => {
        const studentInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="student"], input[placeholder*="Search"]'
        );
        if (studentInput) studentInput.focus();
      }, 150);
    }
  }, []);

  useEffect(() => {
    // Preload DocLabQuickReportModal and cloud templates on idle so Make Report opens with 0ms perceived latency
    const timer = setTimeout(() => {
      loadDocLabModal().catch(() => {});
      import("@/components/print/docxTemplateEngine")
        .then((mod) => {
          mod.fetchCloudDocxTemplates().catch(() => {});
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleMakeReportClick = async () => {
    const isValid = validateReportForm({
      departmentId: selectedDepartmentId,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      allStudents: allStudentDatabase,
      departments,
      classes,
      sections,
    });
    if (!isValid) return;

    // Make Report is strictly for generating and viewing formatted text in the modal.
    // Saving to record is exclusively handled by "Add to Record".
    setIsReportModalOpen(true);
  };

  const createBlankRow = () => ({
    id: crypto.randomUUID(),
    juz: "",
    page: "",
    ayahs: [{ id: crypto.randomUUID(), value: "" }],
  });

  const mistakeRefreshCount = useRef(0);
  const handleMistakeRefresh = () => {
    mistakeRefreshCount.current += 1;
    if (mistakeRefreshCount.current === 1) {
      setMistakeData([createBlankRow()]);
      showToast("Mistakes section reset", "info");
    } else if (mistakeRefreshCount.current >= 2) {
      setMistakeData([createBlankRow()]);
      setStuckData([createBlankRow()]);
      showToast("Mistakes & Stuck sections reset", "info");
      mistakeRefreshCount.current = 0;
    }
  };

  const handleStuckRefresh = () => {
    setStuckData([createBlankRow()]);
    showToast("Stuck section reset", "info");
  };

  const focusFirstMistakePage = useCallback(() => {
    setTimeout(() => {
      const mistakePageInput =
        document.querySelector<HTMLInputElement>('[data-section="mistake"] input[id*="page"]') ||
        document.querySelector<HTMLInputElement>('input[id^="book-page-mistake"]') ||
        document.querySelector<HTMLInputElement>('input[id^="page-mistake-"]') ||
        document.querySelector<HTMLInputElement>('input[id^="page-"]');
      if (mistakePageInput) {
        mistakePageInput.focus();
        if (typeof mistakePageInput.select === "function") {
          mistakePageInput.select();
        }
      }
    }, 40);
  }, []);

  const focusFirstStuckPage = useCallback(() => {
    setTimeout(() => {
      const stuckPageInput =
        document.querySelector<HTMLInputElement>('[data-section="stuck"] input[id*="page"]') ||
        document.querySelector<HTMLInputElement>('input[id^="book-page-stuck"]') ||
        document.querySelector<HTMLInputElement>('input[id^="page-stuck-"]');
      if (stuckPageInput) {
        stuckPageInput.focus();
        if (typeof stuckPageInput.select === "function") {
          stuckPageInput.select();
        }
      }
    }, 40);
  }, []);

  const focusComments = useCallback(() => {
    setTimeout(() => {
      const commentEl =
        document.getElementById("comment-textarea") ||
        document.querySelector<HTMLTextAreaElement>('textarea[id*="comment"]');
      if (commentEl) {
        commentEl.focus();
        if (typeof (commentEl as HTMLTextAreaElement).select === "function") {
          (commentEl as HTMLTextAreaElement).select();
        }
      }
    }, 40);
  }, []);

  const {
    draggedItem,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleReorderRows,
  } = useProgressDragReorder({
    juzPageData,
    setJuzPageData,
    bookPageData,
    setBookPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
    bookMistakeData,
    setBookMistakeData,
    bookStuckData,
    setBookStuckData,
    createBlankRow,
  });

  const availableJuzs = useMemo(
    () =>
      Array.from(
        new Set(
          juzPageData
            .map((d) => d.juz)
            .filter((j) => j !== "" && j !== undefined && j !== null)
        )
      ),
    [juzPageData]
  );

  if (isLoading && (!studentDatabase || studentDatabase.length === 0)) {
    return (
      <DailyProgressSkeleton
        isEmbedded={isEmbedded || Boolean(filterProps)}
        maxWidth={maxWidth}
        className={className}
      />
    );
  }

  return (
    <PageContainer
      isEmbedded={isEmbedded || Boolean(filterProps)}
      maxWidth={maxWidth}
      style={{ fontFamily: activeFont?.css, fontSize: activeFontSize?.px }}
      className={`space-y-6 pb-12 transition-all animate-fade-in ${className}`}
    >
      {/* Edit Mode Banner */}
      <EditModeBanner editingReport={editingReport} onCancel={cancelEditMode} />

      {/* Draft Recovery Notification Banner */}
      <DraftRecoveryBanner
        draftInfo={draftInfo}
        onRecover={recoverDraft}
        onDiscard={discardDraft}
        onDismiss={dismissDraft}
      />

      {/* Classroom Filter Controls Box (Line 1: Date | Student | Session; Line 2: Dept | Class | Sec | Teacher) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        collapsible={true}
        filterProps={filterProps ? {
          ...filterProps,
          departmentSelectOptions,
          classSelectOptions,
          sectionSelectOptions,
        } : undefined}
        showDate={sectionConfig.headerDate?.enabled !== false}
        dateLabel="Date"
        selectedDate={selectedDate || getClassroomTodayDate()}
        onDateChange={(dateStr: string) => {
          setSelectedDate(dateStr);
          if (filterProps?.onDateChange) filterProps.onDateChange(dateStr);
        }}
        dateFormat={dateFormat || "DD/MM/YYYY"}
        hasDepartments={hasDepartments}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={handleDepartmentChange}
        departmentSelectOptions={departmentSelectOptions}
        selectedClassId={selectedClassId}
        onClassChange={handleClassChange}
        classSelectOptions={classSelectOptions}
        hasSectionsForClass={hasSectionsForClass}
        selectedSectionId={selectedSectionId}
        onSectionChange={handleSectionChange}
        sectionSelectOptions={sectionSelectOptions}
        hasTeachers={true}
        allowAllTeachers={false}
        selectedTeacherId={selectedTeacherId || defaultTeacherId}
        onTeacherChange={(tId: any, tObj?: any) => {
          const nextId = tId && tId !== 'ALL' ? String(tId) : defaultTeacherId;
          setSelectedTeacherId(nextId);
          if (tObj) {
            setSelectedTeacherName(tObj.name_en || tObj.name || tObj.user_name || defaultTeacherName || "");
          } else if (!tId || tId === 'ALL') {
            setSelectedTeacherName(defaultTeacherName || "");
          }
        }}
        showPeriodSwitcher={false}
        studentControl={
          sectionConfig.studentSelect?.enabled && (
            <StudentInputSection
              id="daily-progress-student-input"
              inputRef={studentInputRef}
              studentDatabase={allStudentDatabase}
              studentName={studentName}
              studentId={selectedStudentId}
              departmentId={selectedDepartmentId}
              classId={selectedClassId}
              sectionId={selectedSectionId}
              onStudentSelect={handleStudentSelect}
              actionLabel={isFeatureEnabled("progress_action_add_student") ? "+ Add Student" : null}
            />
          )
        }
        sessionControl={
          sectionConfig.sessionSelect?.enabled && (
            <SessionInputSection
              sessionList={sessionList}
              selectedSession={selectedSession}
              onSessionChange={setSelectedSession}
            />
          )
        }
      />

      {/* Fallback Mode Switcher (Visible only in standalone page without Hub tab bar when both modes allowed) */}
      {!filterProps && isQuranAllowed && isBookAllowed && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 py-0.5">
          <div className="flex items-center gap-2 text-xs theme-text-secondary font-medium">
            <span className="uppercase tracking-wider text-[11px] font-bold">Progress Mode:</span>
            <span className="theme-text-primary font-semibold">
              {progressMode === "QURAN" ? "Quran Recitation" : "Book / Subject Progress"}
            </span>
          </div>

          <SegmentedSwitch<"QURAN" | "BOOK">
            value={progressMode}
            onChange={setProgressMode}
            hideIconsOnMobile={true}
            options={[
              { value: "QURAN", label: "Quran", icon: BookOpenIcon, hideIconOnMobile: true },
              { value: "BOOK", label: "Book / Subject", icon: LayersIcon, hideIconOnMobile: true },
            ]}
            size="sm"
          />
        </div>
      )}

      {/* ── Unified Progress Card: Page / Lesson Details -> Mistakes -> Stuck (Adaptive Quran / Book Mode) ── */}
      {(sectionConfig.juzPageInput?.enabled ||
        sectionConfig.mistakeTracker?.enabled ||
        sectionConfig.stuckTracker?.enabled ||
        progressMode === "BOOK") && (
        <div className="theme-bg-surface rounded-2xl p-3.5 sm:p-5 shadow-xl border theme-border space-y-3.5 sm:space-y-4">
          {/* Top Book / Subject Name & Lesson Controls - Displayed when in Book / Subject mode */}
          {progressMode === "BOOK" && (
            <>
              <div className="@container grid grid-cols-1 @[480px]:grid-cols-2 gap-3 sm:gap-4 items-start pb-2 sm:pb-3">
                <div className="w-full">
                  <BookSubjectInputSection
                    bookTitle={bookTitle}
                    onBookChange={setBookTitle}
                    selectedClassId={selectedClassId}
                    selectedSectionId={selectedSectionId}
                  />
                </div>

                {sectionConfig.lessonSelect?.enabled !== false && (
                  <div className="w-full">
                    <LessonInputSection
                      lessonTitle={lessonTitle}
                      onLessonChange={setLessonTitle}
                      selectedClassId={selectedClassId}
                      selectedSectionId={selectedSectionId}
                    />
                  </div>
                )}
              </div>

              {sectionConfig.juzPageInput?.enabled && (
                <div className="border-t theme-border border-opacity-30 my-3.5 sm:my-4" />
              )}
            </>
          )}

          {/* Unified Page Details Section */}
          {sectionConfig.juzPageInput?.enabled && (
            <JuzPageSection
              title={progressMode === "BOOK" ? "PAGE DETAILS" : "JUZ / PAGE DETAILS"}
              showJuz={progressMode === "QURAN"}
              data={juzPageData}
              onChange={setJuzPageData}
              onReset={handleJuzPageRefresh}
              onNextSection={focusFirstMistakePage}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
            />
          )}

          {sectionConfig.juzPageInput?.enabled &&
            (sectionConfig.mistakeTracker?.enabled || sectionConfig.stuckTracker?.enabled) && (
              <div className="border-t theme-border border-opacity-30 my-3.5 sm:my-4" />
            )}

          {/* Unified Mistake Tracker Section */}
          {sectionConfig.mistakeTracker?.enabled && (
            <DetailSection
              title="MISTAKE DETAILS"
              listType="mistake"
              data={mistakeData}
              onChange={setMistakeData}
              availableJuzs={progressMode === "QURAN" ? availableJuzs : undefined}
              juzPageData={progressMode === "QURAN" ? juzPageData : undefined}
              showJuz={progressMode === "QURAN"}
              unitLabel={progressMode === "BOOK" ? "Line" : "Ayah"}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
              onReset={handleMistakeRefresh}
              onNextSection={focusFirstStuckPage}
            />
          )}

          {sectionConfig.mistakeTracker?.enabled && sectionConfig.stuckTracker?.enabled && (
            <div className="border-t theme-border border-opacity-30 my-2.5 sm:my-3" />
          )}

          {/* Unified Stuck Tracker Section */}
          {sectionConfig.stuckTracker?.enabled && (
            <DetailSection
              title="STUCK DETAILS"
              listType="stuck"
              data={stuckData}
              onChange={setStuckData}
              availableJuzs={progressMode === "QURAN" ? availableJuzs : undefined}
              juzPageData={progressMode === "QURAN" ? juzPageData : undefined}
              showJuz={progressMode === "QURAN"}
              unitLabel={progressMode === "BOOK" ? "Line" : "Ayah"}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
              onReset={handleStuckRefresh}
              onNextSection={focusComments}
            />
          )}
        </div>
      )}

      {/* Card 3: Comment Section & Action Buttons */}
      {sectionConfig.commentSection?.enabled && (
        <CommentSection
          comment={comment}
          setComment={setComment}
          savedComments={savedComments}
          onAddToRecord={handleSaveRecordWithContext}
          onMakeReport={handleMakeReportClick}
          showActions={sectionConfig.actionButtons?.enabled !== false}
          isEditMode={isEditMode}
          isSaving={isSaving}
        />
      )}

      {/* DocLab Quick Report Modal (Loaded on-demand only when triggered) */}
      {isReportModalOpen && (
        <Suspense fallback={null}>
          <DocLabQuickReportModal
            isOpen={isReportModalOpen}
            onClose={() => {
              setIsReportModalOpen(false);
            }}
            scopeId={DAILY_PROGRESS_SCOPE_ID}
            scopeName="Daily Progress"
            title="Daily Progress Report"
            returnUrl="/studies/daily-progress"
            dataRecord={dailyProgressReportData}
            autoCopy={true}
          />
        </Suspense>
      )}
    </PageContainer>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import {
  DAILY_PROGRESS_SCOPE_ID,
  buildDailyProgressReportData,
} from "./dailyProgressDocLabKeys";

// Lazy load DocLab Quick Report Modal to eliminate heavy print/editor bundle on initial mount
// Refreshed dailyProgressReportData pipeline with clean empty detail-mis & detail-stuck support
const DocLabQuickReportModal = lazy(
  () => import("@/components/print/DocLabQuickReportModal")
);
import { PageContainer } from "@/components/layout";
import { useToast } from "@/context/ToastContext";
import { useFont } from "@/context/useFont";
import { useUndoRedo } from "@/context/useUndoRedo";
import { useFeatureControl } from "@/context/FeatureControlContext";
import DailyClassroomFilterControls from "../../components/DailyClassroomFilterControls";
import { getClassroomTodayDate } from "@/constants/calendarConstants";

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

  const handleSaveRecordWithContext = useCallback(() => {
    return handleSaveRecord({
      departmentId: selectedDepartmentId,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      allStudents: allStudentDatabase,
      departments,
      classes,
      sections,
    });
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
    if (filterProps?.selectedDate && filterProps.selectedDate !== selectedDate) {
      setSelectedDate(filterProps.selectedDate);
    }
  }, [filterProps?.selectedDate, selectedDate, setSelectedDate]);

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
    comment,
  ]);

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

  const handleMakeReportClick = () => {
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
      />

      {/* Classroom Filter Controls Box (Max 3 items per line: Date/Dept/Class, Section/Student/Session) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        maxColumns={3}
        filterProps={filterProps}
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
        showPeriodSwitcher={false}
        extraFields={
          <>
            {sectionConfig.studentSelect?.enabled && (
              <div className="col-span-1">
                <StudentInputSection
                  studentDatabase={allStudentDatabase}
                  studentName={studentName}
                  studentId={selectedStudentId}
                  departmentId={selectedDepartmentId}
                  classId={selectedClassId}
                  sectionId={selectedSectionId}
                  onStudentSelect={handleStudentSelect}
                />
              </div>
            )}
            {sectionConfig.sessionSelect?.enabled && (
              <div className="col-span-1">
                <SessionInputSection
                  sessionList={sessionList}
                  selectedSession={selectedSession}
                  onSessionChange={setSelectedSession}
                />
              </div>
            )}
          </>
        }
      />

      {/* Fallback Mode Switcher (Visible only in standalone page without Hub tab bar) */}
      {!filterProps && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 py-0.5">
          <div className="flex items-center gap-2 text-xs theme-text-secondary font-medium">
            <span className="uppercase tracking-wider text-[11px] font-bold">Progress Mode:</span>
            <span className="theme-text-primary font-semibold">
              {progressMode === "QURAN" ? "Quran Recitation" : "Book / Subject Progress"}
            </span>
          </div>

          <div className="flex items-center p-1 rounded-xl theme-bg-elevated border theme-border gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setProgressMode("QURAN")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                progressMode === "QURAN"
                  ? "theme-bg-accent theme-text-accent-contrast shadow-xs"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-surface"
              }`}
            >
              <BookOpenIcon className="w-3.5 h-3.5" />
              <span>Quran</span>
            </button>
            <button
              type="button"
              onClick={() => setProgressMode("BOOK")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                progressMode === "BOOK"
                  ? "theme-bg-accent theme-text-accent-contrast shadow-xs"
                  : "theme-text-secondary hover:theme-text-primary hover:theme-bg-surface"
              }`}
            >
              <LayersIcon className="w-3.5 h-3.5" />
              <span>Book / Subject</span>
            </button>
          </div>
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
            onClose={() => setIsReportModalOpen(false)}
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

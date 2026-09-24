import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { DocLabQuickReportModal } from "@/components/print";
import {
  DAILY_PROGRESS_SCOPE_ID,
  buildDailyProgressReportData,
} from "./dailyProgressDocLabKeys";
import SkeletonLoader from "@/components/common/SkeletonLoader";
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
import { useReportForm, useDailyProgressHierarchy } from "./hooks";
import {
  EditModeBanner,
  DraftRecoveryBanner,
  StudentInputSection,
  SessionInputSection,
  JuzPageSection,
  DetailSection,
  CommentSection,
} from "./components";

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
    juzPageData,
    setJuzPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
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
    handleJuzPageRefresh,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  } = useReportForm();

  const {
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
    if (!isLoading && !featureLoading && !initialFocusDoneRef.current) {
      initialFocusDoneRef.current = true;
      setTimeout(() => {
        const studentInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="student"], input[placeholder*="Search"]'
        );
        if (studentInput) studentInput.focus();
      }, 150);
    }
  }, [isLoading, featureLoading]);

  const handleMakeReportClick = () => {
    const safeStudent = (studentName || "").trim();
    const safeSession = (selectedSession || "").trim();

    if (sectionConfig.studentSelect?.enabled && !safeStudent) {
      showToast("Please specify a student name first", "warning");
      return;
    }
    if (sectionConfig.sessionSelect?.enabled && !safeSession) {
      showToast("Please select a session first", "warning");
      return;
    }
    const hasJuzPageData = juzPageData.some(
      (d) =>
        String(d.juz || "").trim() !== "" ||
        (d.ranges || []).some(
          (r) => String(r.start || "").trim() !== "" || String(r.end || "").trim() !== ""
        )
    );
    if (sectionConfig.juzPageInput?.enabled && !hasJuzPageData) {
      showToast("Please enter Juz & Page information first", "warning");
      return;
    }

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

  const activeDragRef = useRef<{ listType: string; index: number } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ listType: string; index: number } | null>(null);

  const handleDragStart = (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => {
    const payload = { listType, index };
    activeDragRef.current = payload;
    (window as any).__spr_active_drag_item = payload;
    setDraggedItem(payload);
    if ("dataTransfer" in e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = "copyMove";
      try {
        const json = JSON.stringify(payload);
        e.dataTransfer.setData("application/json", json);
        e.dataTransfer.setData("text/plain", json);
      } catch {
        // Ignore
      }
    }
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      activeDragRef.current = null;
      (window as any).__spr_active_drag_item = null;
      setDraggedItem(null);
    }, 120);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleReorderRows = (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy: boolean = false
  ) => {
    let newMistake = [...mistakeData];
    let newStuck = [...stuckData];

    let sourceList = sourceListType === "mistake" ? newMistake : newStuck;
    let targetList = targetListType === "mistake" ? newMistake : newStuck;

    const isRowBlank = (r?: any) => {
      if (!r) return true;
      const hasPage = r.page !== undefined && r.page !== null && String(r.page).trim() !== "";
      const hasAyahs = (r.ayahs || []).some(
        (a: any) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ""
      );
      return !hasPage && !hasAyahs;
    };

    if (isCopy) {
      const sourceItem = sourceList[sourceIndex];
      if (!sourceItem) return;

      const itemCopy = {
        ...sourceItem,
        id: crypto.randomUUID(),
        ayahs: (sourceItem.ayahs || []).map((a) => ({ ...a, id: crypto.randomUUID() })),
      };

      if (targetList.length === 1 && isRowBlank(targetList[0])) {
        targetList.splice(0, 1, itemCopy);
      } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
        targetList.splice(targetIndex, 0, itemCopy);
      } else {
        targetList.push(itemCopy);
      }
    } else {
      if (sourceListType === targetListType) {
        if (
          targetIndex !== undefined &&
          targetIndex >= 0 &&
          sourceIndex >= 0 &&
          sourceIndex < targetList.length
        ) {
          const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          if (adjustedTarget !== sourceIndex) {
            const [movedItem] = targetList.splice(sourceIndex, 1);
            targetList.splice(adjustedTarget, 0, movedItem);
          }
        }
      } else {
        if (sourceIndex >= 0 && sourceIndex < sourceList.length) {
          const [movedItem] = sourceList.splice(sourceIndex, 1);
          if (targetList.length === 1 && isRowBlank(targetList[0])) {
            targetList.splice(0, 1, movedItem);
          } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
            targetList.splice(targetIndex, 0, movedItem);
          } else {
            targetList.push(movedItem);
          }
          if (sourceList.length === 0) {
            sourceList.push(createBlankRow());
          }
        }
      }
    }

    setMistakeData(newMistake);
    setStuckData(newStuck);
    activeDragRef.current = null;
    (window as any).__spr_active_drag_item = null;
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetListType: string, targetIndex?: number) => {
    e.preventDefault();

    let sourceListType =
      activeDragRef.current?.listType ||
      (window as any).__spr_active_drag_item?.listType ||
      draggedItem?.listType;
    let sourceIndex =
      activeDragRef.current?.index ??
      (window as any).__spr_active_drag_item?.index ??
      draggedItem?.index;

    if (sourceListType === undefined || sourceIndex === undefined) {
      try {
        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          sourceListType = parsed.listType;
          sourceIndex = parsed.index;
        }
      } catch {
        // Ignore
      }
    }

    if (sourceListType === undefined || sourceIndex === undefined) return;

    const isCopy = e.ctrlKey || e.altKey;
    handleReorderRows(sourceListType, sourceIndex, targetListType, targetIndex, isCopy);
  };

  const availableJuzs = Array.from(
    new Set(
      juzPageData
        .map((d) => d.juz)
        .filter((j) => j !== "" && j !== undefined && j !== null)
    )
  );

  if (isLoading || featureLoading) {
    return <SkeletonLoader type="form" />;
  }

  return (
    <PageContainer
      isEmbedded={isEmbedded || Boolean(filterProps)}
      maxWidth={maxWidth}
      style={{ fontFamily: activeFont?.css, fontSize: activeFontSize?.px }}
      className={`space-y-6 pb-12 transition-all ${className}`}
    >
      {/* Edit Mode Banner */}
      <EditModeBanner editingReport={editingReport} onCancel={cancelEditMode} />

      {/* Draft Recovery Notification Banner */}
      <DraftRecoveryBanner
        draftInfo={draftInfo}
        onRecover={recoverDraft}
        onDiscard={discardDraft}
      />

      {/* Classroom Filter Controls Box */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
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
      />

      {/* Card 1: Student & Session Information */}
      {(sectionConfig.studentSelect?.enabled || sectionConfig.sessionSelect?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-3.5 sm:p-5 shadow-xl border theme-border space-y-3.5 sm:space-y-4">
          <div
            className={`grid ${
              sectionConfig.studentSelect?.enabled && sectionConfig.sessionSelect?.enabled
                ? "grid-cols-2"
                : "grid-cols-1"
            } gap-2.5 sm:gap-4`}
          >
            {sectionConfig.studentSelect?.enabled && (
              <StudentInputSection
                studentDatabase={allStudentDatabase}
                studentName={studentName}
                studentId={selectedStudentId}
                departmentId={selectedDepartmentId}
                classId={selectedClassId}
                sectionId={selectedSectionId}
                onStudentSelect={handleStudentSelect}
              />
            )}

            {sectionConfig.sessionSelect?.enabled && (
              <SessionInputSection
                sessionList={sessionList}
                selectedSession={selectedSession}
                onSessionChange={setSelectedSession}
              />
            )}
          </div>
        </div>
      )}

      {/* Card 2: Recitation Progress (JUZ / PAGE, MISTAKES, STUCK) */}
      {(sectionConfig.juzPageInput?.enabled ||
        sectionConfig.mistakeTracker?.enabled ||
        sectionConfig.stuckTracker?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-3.5 sm:p-5 shadow-xl border theme-border space-y-3.5 sm:space-y-4">
          {sectionConfig.juzPageInput?.enabled && (
            <JuzPageSection
              data={juzPageData}
              onChange={setJuzPageData}
              onReset={handleJuzPageRefresh}
            />
          )}

          {sectionConfig.juzPageInput?.enabled &&
            (sectionConfig.mistakeTracker?.enabled || sectionConfig.stuckTracker?.enabled) && (
              <div className="border-t theme-border border-opacity-30 my-2.5 sm:my-3" />
            )}

          {sectionConfig.mistakeTracker?.enabled && (
            <DetailSection
              title="MISTAKE DETAILS"
              listType="mistake"
              data={mistakeData}
              onChange={setMistakeData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
              onReset={handleMistakeRefresh}
            />
          )}

          {sectionConfig.mistakeTracker?.enabled && sectionConfig.stuckTracker?.enabled && (
            <div className="border-t theme-border border-opacity-30 my-2.5 sm:my-3" />
          )}

          {sectionConfig.stuckTracker?.enabled && (
            <DetailSection
              title="STUCK DETAILS"
              listType="stuck"
              data={stuckData}
              onChange={setStuckData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
              onReset={handleStuckRefresh}
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
          onAddToRecord={handleSaveRecord}
          onMakeReport={handleMakeReportClick}
          showActions={sectionConfig.actionButtons?.enabled !== false}
          isEditMode={isEditMode}
          isSaving={isSaving}
        />
      )}

      {/* DocLab Quick Report Modal */}
      <DocLabQuickReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        scopeId={DAILY_PROGRESS_SCOPE_ID}
        scopeName="Daily Progress"
        title="Daily Progress Report"
        returnUrl="/studies/daily-progress"
        dataRecord={dailyProgressReportData}
      />
    </PageContainer>
  );
}

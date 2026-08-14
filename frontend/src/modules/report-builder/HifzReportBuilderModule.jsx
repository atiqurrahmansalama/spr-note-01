import { useState, useEffect, useRef, useMemo } from "react";
import HeaderDateSection from "./components/HeaderDateSection";
import StudentInputSection from "./components/StudentInputSection";
import SessionInputSection from "./components/SessionInputSection";
import JuzPageSection from "./components/JuzPageSection";
import MistakeTrackerSection from "./components/MistakeTrackerSection";
import StuckTrackerSection from "./components/StuckTrackerSection";
import CommentSection from "./components/CommentSection";
import ReportModal from "./modals/ReportModal";
import SkeletonLoader from "../../components/common/SkeletonLoader";

import { useReportForm } from "./hooks/useReportForm";
import { useToast } from "../../context/ToastContext";
import { useFont } from "../../context/useFont";
import { ClockIcon, CloseIcon, EditIcon } from "../../components/ui/Icons";
import { useFeatureControl } from "../../context/FeatureControlContext";

export default function HifzReportBuilderModule({ timeZone, dateFormat }) {
  const { showToast } = useToast();
  const { activeFont, activeFontSize } = useFont();

  // ── Pull section visibility flags from the live server-evaluated context.
  // This is the single source of truth — it respects the 4-tier hierarchy:
  // User Override > Group Override > Role Override > Global Default.
  // When an admin changes a setting it propagates to every account worldwide
  // within 10 seconds via version polling.
  const { isFeatureEnabled, loading: featureLoading } = useFeatureControl();

  // Build a sectionConfig-compatible object from the live server flags.
  // Falls back to `true` for any unknown key (safe default = show everything).
  const sectionConfig = useMemo(() => ({
    headerDate:     { enabled: isFeatureEnabled('headerDate') },
    studentSelect:  { enabled: isFeatureEnabled('studentSelect') },
    sessionSelect:  { enabled: isFeatureEnabled('sessionSelect') },
    juzPageInput:   { enabled: isFeatureEnabled('juzPageInput') },
    mistakeTracker: { enabled: isFeatureEnabled('mistakeTracker') },
    stuckTracker:   { enabled: isFeatureEnabled('stuckTracker') },
    commentSection: { enabled: isFeatureEnabled('commentSection') },
    actionButtons:  { enabled: isFeatureEnabled('actionButtons') },
    pdfExport:      { enabled: isFeatureEnabled('pdfExport') },
  }), [isFeatureEnabled]);

  const {
    selectedDate,
    setSelectedDate,
    studentName,
    setStudentName,
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
    setSavedComments,
    isPanelOpen,
    setIsPanelOpen,
    pendingName,
    setPendingName,
    studentDatabase,
    availableGroups,
    sessionList,
    isLoading,
    isSaving,
    draftInfo,
    recoverDraft,
    discardDraft,
    editingReport,
    cancelEditMode,
    handleSaveResult,
    handleSaveSession,
    handleSaveRecord,
    handleJuzPageRefresh,
    handleUndo,
    handleRedo,
  } = useReportForm();

  const isEditMode = Boolean(editingReport);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const handleUndoRedoKeys = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleUndo();
      } else if ((key === "z" && (e.shiftKey || e.altKey)) || key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleUndoRedoKeys);
    return () => window.removeEventListener("keydown", handleUndoRedoKeys);
  }, [handleUndo, handleRedo]);
  useEffect(() => {
    const handleGlobalUndo = () => handleUndo();
    const handleGlobalRedo = () => handleRedo();
    window.addEventListener("spr_undo", handleGlobalUndo);
    window.addEventListener("spr_redo", handleGlobalRedo);
    return () => {
      window.removeEventListener("spr_undo", handleGlobalUndo);
      window.removeEventListener("spr_redo", handleGlobalRedo);
    };
  }, [handleUndo, handleRedo]);
  useEffect(() => {
    if (!isLoading && !featureLoading) {
      setTimeout(() => {
        const studentInput = document.querySelector('input[placeholder*="student"], input[placeholder*="Search"]');
        if (studentInput) {
          studentInput.focus();
        }
      }, 150);
    }
  }, [isLoading, featureLoading]);

  const handleMakeReportClick = () => {
    if (sectionConfig.studentSelect?.enabled && !studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return;
    }
    if (sectionConfig.sessionSelect?.enabled && !selectedSession.trim()) {
      showToast("Please select a session first", "warning");
      return;
    }
    const hasJuzPageData = juzPageData.some(
      (d) => d.juz.trim() || d.ranges.some((r) => r.start.trim() || r.end.trim())
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

  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (e, listType, index) => {
    setDraggedItem({ listType, index });
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e, targetListType, targetIndex = null) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { listType: sourceListType, index: sourceIndex } = draggedItem;
    const isCopy = e.ctrlKey || e.altKey;

    let newMistake = [...mistakeData];
    let newStuck = [...stuckData];

    let sourceList = sourceListType === "mistake" ? newMistake : newStuck;
    let targetList = targetListType === "mistake" ? newMistake : newStuck;

    if (isCopy) {
      const sourceItem = sourceList[sourceIndex];
      if (!sourceItem) return;

      const itemCopy = {
        ...sourceItem,
        id: crypto.randomUUID(),
        ayahs: sourceItem.ayahs.map((a) => ({ ...a, id: crypto.randomUUID() })),
      };

      if (targetIndex !== null && targetIndex >= 0) {
        targetList.splice(targetIndex, 0, itemCopy);
      } else {
        targetList.push(itemCopy);
      }
    } else {
      if (sourceListType === targetListType) {
        // Reordering lines within the SAME list (self lines / up-down)
        if (
          targetIndex !== null &&
          targetIndex >= 0 &&
          sourceIndex >= 0 &&
          sourceIndex < targetList.length &&
          sourceIndex !== targetIndex
        ) {
          const [movedItem] = targetList.splice(sourceIndex, 1);
          targetList.splice(targetIndex, 0, movedItem);
        }
      } else {
        // Moving lines between DIFFERENT lists (mistake <-> stuck)
        if (sourceIndex >= 0 && sourceIndex < sourceList.length) {
          const [movedItem] = sourceList.splice(sourceIndex, 1);
          if (targetIndex !== null && targetIndex >= 0) {
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
    setDraggedItem(null);
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
    <div
      style={{ fontFamily: activeFont.css, fontSize: activeFontSize.px }}
      className="w-full max-w-xl mx-auto space-y-5 pb-12 theme-text-primary relative transition-all"
    >
      {/* 0a. Edit Mode Banner */}
      {isEditMode && (
        <div className="w-full theme-bg-sub border theme-border rounded-xl p-2.5 sm:p-3 shadow-md flex items-center justify-between gap-2.5 animate-fade-in select-none">
          <div className="flex items-center gap-2 min-w-0 text-left">
            <div className="p-1 rounded-lg theme-bg-accent-soft shrink-0 flex items-center justify-center">
              <EditIcon className="w-4 h-4 theme-accent" />
            </div>
            <div className="text-xs theme-text-primary truncate font-medium">
              Editing report for{" "}
              <span className="font-bold theme-accent">{editingReport?.student_name}</span>
              {editingReport?.formattedDate && (
                <span className="theme-text-secondary"> · {editingReport.formattedDate}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={cancelEditMode}
            className="theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1"
          >
            <CloseIcon className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* 0b. Draft Recovery Notification Banner */}
      {draftInfo && Array.isArray(draftInfo) && draftInfo.length > 0 && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in select-none text-left">
          <div className="flex items-center gap-2 border-b theme-border pb-2">
            <ClockIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Unsaved Drafts Found ({draftInfo.length})
            </h4>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {draftInfo.map((draft) => {
              const infoText = draft.studentName 
                ? `Student: ${draft.studentName}`
                : draft.comment 
                  ? `Comment: "${draft.comment.substring(0, 20)}..."`
                  : "Empty Draft";
              const timeStr = `${draft.savedAtTime || ""} (${draft.savedAtDate || ""})`;

              return (
                <div key={draft.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-xl theme-bg-sub border theme-border gap-2 hover:border-[var(--accent-main)]/30 transition-colors">
                  <div className="min-w-0 text-xs">
                    <div className="font-bold theme-text-primary truncate">
                      {infoText}
                    </div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">
                      Auto-saved at {timeStr}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => recoverDraft(draft)}
                      className="theme-bg-accent hover:opacity-90 theme-accent-text text-[10px] px-2 py-0.5 rounded-lg font-semibold transition shadow cursor-pointer active:scale-95"
                      title="Load this draft in this window"
                    >
                      Recover
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`/?recover_draft_id=${draft.id}`, "_blank");
                        discardDraft(draft);
                      }}
                      className="theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary text-[10px] px-2 py-0.5 rounded-lg font-semibold transition border theme-border cursor-pointer active:scale-95"
                      title="Open this draft in a new tab"
                    >
                      Open in New Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => discardDraft(draft)}
                      className="p-1 rounded-lg hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                      title="Discard Draft"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Header Card (Conditional via sectionConfig) */}
      {sectionConfig.headerDate?.enabled && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-5 text-center shadow-lg space-y-1 sm:space-y-2 relative z-10 border theme-border">
          <h1 className="text-lg sm:text-2xl font-bold theme-text-primary tracking-wide">
            Hifz Daily Progress Report
          </h1>
          <HeaderDateSection
            selectedDate={selectedDate}
            timeZone={timeZone}
            dateFormat={dateFormat}
            onDateChange={(customDate) => setSelectedDate(customDate)}
          />
        </div>
      )}

      {/* 2. Card 1: Student & Session Information */}
      {(sectionConfig.studentSelect?.enabled || sectionConfig.sessionSelect?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-6 shadow-xl border theme-border space-y-5">
          {sectionConfig.studentSelect?.enabled && (
            <StudentInputSection
              studentDatabase={studentDatabase}
              studentName={studentName}
              groupName={groupName}
              isPanelOpen={isPanelOpen}
              pendingName={pendingName}
              availableGroups={availableGroups}
              onStudentSelect={(sel) => {
                if (typeof sel === "object") {
                  setStudentName(sel.label);
                  if (sel.sub) setGroupName(sel.sub);
                } else {
                  setStudentName(sel);
                }
              }}
              onGroupNameChange={setGroupName}
              onOpenSavePanel={(typed) => {
                setPendingName(typed);
                setIsPanelOpen(true);
              }}
              onCloseSavePanel={() => setIsPanelOpen(false)}
              onSaveResult={handleSaveResult}
            />
          )}

          {sectionConfig.sessionSelect?.enabled && (
            <SessionInputSection
              sessionList={sessionList}
              selectedSession={selectedSession}
              onSessionChange={setSelectedSession}
              onSaveSession={handleSaveSession}
            />
          )}
        </div>
      )}

      {/* 3. Card 2: Recitation Progress (JUZ / PAGE, MISTAKES, STUCK) */}
      {(sectionConfig.juzPageInput?.enabled ||
        sectionConfig.mistakeTracker?.enabled ||
        sectionConfig.stuckTracker?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-6 shadow-xl border theme-border space-y-6">
          {sectionConfig.juzPageInput?.enabled && (
            <JuzPageSection
              data={juzPageData}
              onChange={setJuzPageData}
              onReset={handleJuzPageRefresh}
            />
          )}

          {sectionConfig.juzPageInput?.enabled &&
            (sectionConfig.mistakeTracker?.enabled || sectionConfig.stuckTracker?.enabled) && (
              <div className="border-t theme-border border-opacity-30 my-2" />
            )}

          {sectionConfig.mistakeTracker?.enabled && (
            <MistakeTrackerSection
              mistakeData={mistakeData}
              setMistakeData={setMistakeData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onResetMistakes={handleMistakeRefresh}
            />
          )}

          {sectionConfig.mistakeTracker?.enabled && sectionConfig.stuckTracker?.enabled && (
            <div className="border-t theme-border border-opacity-30 my-2" />
          )}

          {sectionConfig.stuckTracker?.enabled && (
            <StuckTrackerSection
              stuckData={stuckData}
              setStuckData={setStuckData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onResetStuck={handleStuckRefresh}
            />
          )}
        </div>
      )}

      {/* 4. Card 3: Comment Section & Action Buttons */}
      {sectionConfig.commentSection?.enabled && (
        <CommentSection
          comment={comment}
          setComment={setComment}
          savedComments={savedComments}
          setSavedComments={setSavedComments}
          onAddToRecord={handleSaveRecord}
          onMakeReport={handleMakeReportClick}
          showActions={sectionConfig.actionButtons?.enabled !== false}
          isEditMode={isEditMode}
          isSaving={isSaving}
        />
      )}

      {/* 4. Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportData={{
          studentName,
          groupName,
          selectedSession,
          selectedDate,
          juzPageData,
          mistakeData,
          stuckData,
          comment,
        }}
      />
    </div>
  );
}

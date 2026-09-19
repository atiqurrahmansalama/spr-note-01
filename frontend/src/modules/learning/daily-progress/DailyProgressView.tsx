import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StudentInputSection,
  SessionInputSection,
  CommentSection,
  JuzPageSection,
  DetailSection,
} from "./components";
import { ReportModal } from "./modals";
import SkeletonLoader from "../../../components/common/SkeletonLoader";
import { useReportForm } from "./hooks";
import { useToast } from "../../../context/ToastContext";
import { useFont } from "../../../context/useFont";
import { useUndoRedo } from "../../../context/useUndoRedo";
import { ClockIcon, CloseIcon, EditIcon } from "../../../components/ui/Icons";
import { useFeatureControl } from "../../../context/FeatureControlContext";
import CustomSelect from "../../../components/ui/CustomSelect";
import ReusableCalendar from "../../../components/common/ReusableCalendar";
import { TIMEZONE_LIST } from "../../../constants/calendarConstants";
import { useAcademicData } from "../useAcademicData";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
  doesStudentMatchSection,
} from "../daily-classroom/dailyClassroomUtils";
import { DailyProgressViewProps, SectionVisibilityConfig } from "./types";

export default function DailyProgressView({
  timeZone,
  dateFormat,
  filterProps = null,
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
    handleSaveSession,
    handleSaveRecord,
    handleJuzPageRefresh,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  } = useReportForm();

  // Academic Hierarchy (Department, Class, Section)
  const academicData = useAcademicData();
  const {
    departments = [],
    classes = [],
    sections = [],
    students: academicStudents = [],
  } = academicData || {};

  const [localDeptId, setLocalDeptId] = useState("");
  const [localClassId, setLocalClassId] = useState("");
  const [localSectionId, setLocalSectionId] = useState("");

  const selectedDepartmentId =
    filterProps?.selectedDepartmentId !== undefined ? filterProps.selectedDepartmentId : localDeptId;
  const onDepartmentChange =
    filterProps?.onDepartmentChange ||
    ((val: string) => {
      setLocalDeptId(val);
      setLocalClassId("");
      setLocalSectionId("");
    });
  const departmentSelectOptions =
    filterProps?.departmentSelectOptions ||
    (departments || []).map((d: any) => ({
      value: String(d.id),
      label: d.name || d.department_name || `Department ${d.id}`,
    }));
  const hasDepartments =
    filterProps?.hasDepartments !== undefined ? filterProps.hasDepartments : departments && departments.length > 0;

  const selectedClassId =
    filterProps?.selectedClassId !== undefined ? filterProps.selectedClassId : localClassId;
  const onClassChange =
    filterProps?.onClassChange ||
    ((val: string) => {
      setLocalClassId(val);
      setLocalSectionId("");
    });
  const classSelectOptions =
    filterProps?.classSelectOptions ||
    (classes || [])
      .filter((c: any) => !selectedDepartmentId || doesStudentMatchDepartment(c, selectedDepartmentId, departments, classes))
      .map((c: any) => ({
        value: String(c.id),
        label: c.name || c.class_name || `Class ${c.id}`,
      }));

  const selectedSectionId =
    filterProps?.selectedSectionId !== undefined ? filterProps.selectedSectionId : localSectionId;
  const rawOnSectionChange = filterProps?.onSectionChange || setLocalSectionId;
  const onSectionChange = (val: string) => {
    rawOnSectionChange(val);
    if (val) {
      const secObj = (sections || []).find((s: any) => String(s.id) === String(val));
      if (secObj) {
        setGroupName(secObj.section_name || secObj.name || "");
      }
    } else {
      setGroupName("");
    }
  };
  const sectionSelectOptions =
    filterProps?.sectionSelectOptions ||
    (sections || [])
      .filter((s: any) => !selectedClassId || doesStudentMatchClass(s, selectedClassId, classes))
      .map((s: any) => ({
        value: String(s.id),
        label: s.section_name || s.name || `Section ${s.id}`,
      }));
  const hasSectionsForClass =
    filterProps?.hasSectionsForClass !== undefined
      ? filterProps.hasSectionsForClass
      : (sections || []).filter((s: any) => !selectedClassId || doesStudentMatchClass(s, selectedClassId, classes)).length > 0;

  // Timezone calculation
  const activeTimeZone = timeZone || "Asia/Dhaka";
  const tzObj = TIMEZONE_LIST.find((t) => t.id === activeTimeZone);
  const tzAbbr = tzObj ? tzObj.offset : "(UTC+06:00)";

  // Filter student database based on Department, Class, Section
  const filteredStudentDatabase = useMemo(() => {
    const fullList = [...studentDatabase];
    const existingNames = new Set(fullList.map((s) => (s.label || s.name || "").toLowerCase().trim()));

    (academicStudents || []).forEach((st: any) => {
      const stName = (st.name_en || st.name || "").trim();
      if (stName && !existingNames.has(stName.toLowerCase())) {
        existingNames.add(stName.toLowerCase());
        const secSub =
          st.section_name ||
          st.student_section_name ||
          (st.section && typeof st.section === "object" ? st.section.section_name : null) ||
          st.sub ||
          st.student_class_name ||
          "";

        fullList.push({
          id: String(st.id),
          label: stName,
          sub: secSub,
          section_name: secSub,
          student_class: st.student_class || st.class_id,
          student_section: st.student_section || st.section_id || (typeof st.section === "object" ? st.section?.id : st.section),
          department: st.department || st.department_id,
        });
      }
    });

    if (!selectedDepartmentId && !selectedClassId && !selectedSectionId) {
      return fullList;
    }

    return fullList.filter((st) => {
      const matchedProfile = (academicStudents || []).find(
        (a: any) =>
          String(a.id) === String(st.id) ||
          (a.name_en || a.name || "").toLowerCase().trim() === (st.label || st.name || "").toLowerCase().trim()
      );
      const studentCandidate = matchedProfile || st;

      if (selectedDepartmentId) {
        if (!doesStudentMatchDepartment(studentCandidate, selectedDepartmentId, departments, classes)) {
          return false;
        }
      }
      if (selectedClassId) {
        if (!doesStudentMatchClass(studentCandidate, selectedClassId, classes)) {
          return false;
        }
      }
      if (selectedSectionId) {
        if (!doesStudentMatchSection(studentCandidate, selectedSectionId, sections)) {
          return false;
        }
      }
      return true;
    });
  }, [
    studentDatabase,
    academicStudents,
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    departments,
    classes,
    sections,
  ]);

  const handleStudentSelect = (sel: any) => {
    let chosenName = "";
    let chosenSub = "";
    let matchedStudent: any = null;

    if (typeof sel === "object" && sel !== null) {
      chosenName = typeof sel.label === "string" ? sel.label : typeof sel.name === "string" ? sel.name : "";
      chosenSub = typeof sel.sub === "string" ? sel.sub : typeof sel.group_name === "string" ? sel.group_name : "";
      matchedStudent = sel;
    } else {
      chosenName = typeof sel === "string" ? sel : "";
    }

    setStudentName(chosenName);

    const academicProfile = (academicStudents || []).find(
      (a: any) =>
        (matchedStudent && String(a.id) === String(matchedStudent.id)) ||
        (a.name_en || a.name || "").toLowerCase().trim() === chosenName.toLowerCase().trim()
    );

    const candidate = academicProfile || matchedStudent;

    if (candidate) {
      const candDeptId = candidate.department || candidate.department_id;
      if (candDeptId && !selectedDepartmentId) {
        onDepartmentChange(String(candDeptId));
      }

      const candClassId = candidate.student_class || candidate.class_id;
      if (candClassId && !selectedClassId) {
        onClassChange(String(candClassId));
      }

      const candSecId = candidate.student_section || candidate.section_id;
      if (candSecId) {
        onSectionChange(String(candSecId));
      } else if (chosenSub) {
        const matchedSec = (sections || []).find(
          (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === chosenSub.toLowerCase().trim()
        );
        if (matchedSec) {
          onSectionChange(String(matchedSec.id));
        } else {
          setGroupName(String(chosenSub));
        }
      }
    } else if (chosenSub) {
      const matchedSec = (sections || []).find(
        (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === chosenSub.toLowerCase().trim()
      );
      if (matchedSec) {
        onSectionChange(String(matchedSec.id));
      } else {
        setGroupName(String(chosenSub));
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentNameParam = params.get("selectedStudentName");
    if (studentNameParam) {
      setStudentName(studentNameParam);
      const matched = (academicStudents || []).find(
        (a: any) => (a.name_en || a.name || "").toLowerCase().trim() === studentNameParam.toLowerCase().trim()
      );
      if (matched) {
        handleStudentSelect(matched);
      }
      params.delete("selectedStudentName");
      params.delete("selectedStudentId");
      const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, "", newQuery);
    }

    const handleStudentAdmitted = (e: any) => {
      const stu = e.detail;
      if (stu) {
        handleStudentSelect(stu);
      }
    };
    window.addEventListener("spr_student_admitted", handleStudentAdmitted);
    return () => window.removeEventListener("spr_student_admitted", handleStudentAdmitted);
  }, [academicStudents]);

  const { registerScopeHandler } = useUndoRedo();
  const isEditMode = Boolean(editingReport);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    return registerScopeHandler("/report-builder", {
      undo: handleUndo,
      redo: handleRedo,
      canUndo: canUndoDraft,
      canRedo: canRedoDraft,
      undoTitle: "Restore previous draft state",
      redoTitle: "Restore next draft state",
    });
  }, [registerScopeHandler, handleUndo, handleRedo, canUndoDraft, canRedoDraft]);

  useEffect(() => {
    if (!isLoading && !featureLoading) {
      setTimeout(() => {
        const studentInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="student"], input[placeholder*="Search"]'
        );
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

  const [draggedItem, setDraggedItem] = useState<{ listType: string; index: number } | null>(null);

  const handleDragStart = (e: React.DragEvent, listType: string, index: number) => {
    setDraggedItem({ listType, index });
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent, targetListType: string, targetIndex?: number) => {
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

      if (targetIndex !== undefined && targetIndex >= 0) {
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
          sourceIndex < targetList.length &&
          sourceIndex !== targetIndex
        ) {
          const [movedItem] = targetList.splice(sourceIndex, 1);
          targetList.splice(targetIndex, 0, movedItem);
        }
      } else {
        if (sourceIndex >= 0 && sourceIndex < sourceList.length) {
          const [movedItem] = sourceList.splice(sourceIndex, 1);
          if (targetIndex !== undefined && targetIndex >= 0) {
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
              Editing report for <span className="font-bold theme-accent">{editingReport?.student_name}</span>
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
                <div
                  key={draft.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-xl theme-bg-sub border theme-border gap-2 hover:border-[var(--accent-main)]/30 transition-colors"
                >
                  <div className="min-w-0 text-xs">
                    <div className="font-bold theme-text-primary truncate">{infoText}</div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">Auto-saved at {timeStr}</div>
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

      {/* 1. Card 1: Student & Session Information with Academic Hierarchy & Date */}
      {(sectionConfig.studentSelect?.enabled ||
        sectionConfig.sessionSelect?.enabled ||
        sectionConfig.headerDate?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-6 shadow-xl border theme-border space-y-5">
          <div className="space-y-2">
            <div
              className={`grid grid-cols-1 ${
                hasDepartments && hasSectionsForClass
                  ? "@[480px]:grid-cols-2 @[800px]:grid-cols-4"
                  : hasDepartments || hasSectionsForClass
                  ? "@[480px]:grid-cols-2 @[720px]:grid-cols-3"
                  : "@[480px]:grid-cols-2"
              } gap-3`}
            >
              {/* 1. Date Picker */}
              {sectionConfig.headerDate?.enabled !== false && (
                <ReusableCalendar
                  label="Date"
                  headerAction={<span className="text-xs font-semibold theme-accent">{tzAbbr}</span>}
                  dateFormat={dateFormat || "DD/MM/YYYY"}
                  showHijri={false}
                  selectedDate={selectedDate || new Date().toISOString().split("T")[0]}
                  onSelectDate={(dateStr) => setSelectedDate(dateStr)}
                  placeholder="Select Date"
                  size="md"
                />
              )}

              {/* 2. Department */}
              {hasDepartments && (
                <CustomSelect
                  label="Department"
                  placeholder="Select Department..."
                  options={departmentSelectOptions}
                  value={selectedDepartmentId}
                  onChange={onDepartmentChange}
                  size="md"
                />
              )}

              {/* 3. Class */}
              <CustomSelect
                label="Class"
                placeholder="Select Class..."
                options={classSelectOptions}
                value={selectedClassId}
                onChange={onClassChange}
                size="md"
              />

              {/* 4. Section */}
              {hasSectionsForClass && (
                <CustomSelect
                  label="Section"
                  placeholder="Select Section..."
                  options={sectionSelectOptions}
                  value={selectedSectionId}
                  onChange={onSectionChange}
                  size="md"
                />
              )}
            </div>
          </div>

          <div className="border-t theme-border border-opacity-40" />

          <div
            className={`grid grid-cols-1 ${
              sectionConfig.studentSelect?.enabled && sectionConfig.sessionSelect?.enabled
                ? "@[640px]:grid-cols-2"
                : "grid-cols-1"
            } gap-4`}
          >
            {sectionConfig.studentSelect?.enabled && (
              <StudentInputSection
                studentDatabase={filteredStudentDatabase}
                studentName={studentName}
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
                onSaveSession={handleSaveSession}
              />
            )}
          </div>
        </div>
      )}

      {/* 2. Card 2: Recitation Progress (JUZ / PAGE, MISTAKES, STUCK) */}
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
            <DetailSection
              title="MISTAKE DETAILS"
              listType="mistake"
              data={mistakeData}
              onChange={setMistakeData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReset={handleMistakeRefresh}
            />
          )}

          {sectionConfig.mistakeTracker?.enabled && sectionConfig.stuckTracker?.enabled && (
            <div className="border-t theme-border border-opacity-30 my-2" />
          )}

          {sectionConfig.stuckTracker?.enabled && (
            <DetailSection
              title="STUCK DETAILS"
              listType="stuck"
              data={stuckData}
              onChange={setStuckData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReset={handleStuckRefresh}
            />
          )}
        </div>
      )}

      {/* 3. Card 3: Comment Section & Action Buttons */}
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

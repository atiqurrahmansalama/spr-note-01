import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  StudentInputSection,
  SessionInputSection,
  CommentSection,
  JuzPageSection,
  DetailSection,
} from "./components";
import { DocLabQuickReportModal } from "../../../../components/print";
import {
  DAILY_PROGRESS_SCOPE_ID,
  buildDailyProgressReportData,
} from "./dailyProgressDocLabKeys";
import SkeletonLoader from "../../../../components/common/SkeletonLoader";
import { PageContainer } from "../../../../components/layout";
import { useReportForm } from "./hooks";
import { useToast } from "../../../../context/ToastContext";
import { useFont } from "../../../../context/useFont";
import { useUndoRedo } from "../../../../context/useUndoRedo";
import { ClockIcon, CloseIcon, EditIcon } from "../../../../components/ui/Icons";
import IconButton from "../../../../components/ui/IconButton";
import { useFeatureControl } from "../../../../context/FeatureControlContext";
import DailyClassroomFilterControls from "../DailyClassroomFilterControls";
import { useAcademicData } from "../../useAcademicData";
import { students as studentStore } from "../../../../utils/localStore";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
  doesStudentMatchSection,
  getDepartmentId,
  getClassId,
  getSectionId,
} from "../dailyClassroomUtils";
import { sortStudentsByUsage, recordStudentUsage } from "../../../../utils/studentUsageTracker";
import { getClassroomTodayDate } from "../../../../constants/calendarConstants";
import { DailyProgressViewProps, SectionVisibilityConfig } from "./types";

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

  // Sync selectedDate with filterProps if supplied
  useEffect(() => {
    if (filterProps?.selectedDate && filterProps.selectedDate !== selectedDate) {
      setSelectedDate(filterProps.selectedDate);
    }
  }, [filterProps?.selectedDate, selectedDate, setSelectedDate]);

  const [localDeptId, setLocalDeptId] = useState("");
  const [localClassId, setLocalClassId] = useState("");
  const [localSectionId, setLocalSectionId] = useState("");

  const selectedDepartmentId =
    filterProps?.selectedDepartmentId !== undefined ? filterProps.selectedDepartmentId : localDeptId;
  const rawOnDepartmentChange =
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
  const rawOnClassChange =
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

  // ── Unified Batch Hierarchy Updater ─────────────────────────────────────────
  const updateHierarchy = (deptId: string, clsId: string, secId: string) => {
    if (filterProps?.onBatchHierarchyChange) {
      filterProps.onBatchHierarchyChange({
        departmentId: deptId,
        classId: clsId,
        sectionId: secId,
      });
    } else if (filterProps?.setAcademicFilters) {
      filterProps.setAcademicFilters({
        departmentId: deptId,
        classId: clsId,
        sectionId: secId,
      });
    } else {
      setLocalDeptId(deptId);
      setLocalClassId(clsId);
      setLocalSectionId(secId);
    }
  };

  // Complete student roster sorted by usage frequency (highest used students first)
  const allStudentDatabase = useMemo(() => {
    const fullList: any[] = [];
    const seenKeys = new Set<string>();

    const appendStudent = (st: any) => {
      const stName = (typeof st === "object" ? st.name_en || st.name || st.label : String(st || "")).trim();
      if (!stName) return;

      const secSub =
        typeof st === "object"
          ? st.section_name ||
            st.student_section_name ||
            (st.section && typeof st.section === "object" ? st.section.section_name : null) ||
            st.sub ||
            st.group_name ||
            st.student_class_name ||
            ""
          : "";

      const rawId = typeof st === "object" && st?.id != null ? String(st.id) : null;
      const key = rawId ? `id_${rawId}` : `raw_${stName.toLowerCase()}_${secSub.toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const roll = typeof st === "object" ? (st.roll_number ?? st.originalData?.roll_number) : undefined;
      const cardNo = typeof st === "object" ? (st.student_id_card_number ?? st.originalData?.student_id_card_number) : undefined;
      const uniq = typeof st === "object" ? (st.uniq_id ?? st.originalData?.uniq_id) : undefined;
      const badge = roll != null ? `Roll: ${roll}` : (cardNo || uniq || (rawId ? `ID: ${rawId}` : undefined));

      fullList.push({
        id: rawId || undefined,
        label: stName,
        name: stName,
        name_en: typeof st === "object" ? st.name_en || stName : stName,
        sub: secSub,
        section_name: secSub,
        roll_number: roll,
        student_id_card_number: cardNo,
        uniq_id: uniq,
        badge,
        student_class: typeof st === "object" ? st.student_class || st.class_id : undefined,
        student_class_name: typeof st === "object" ? st.student_class_name || st.class_name : undefined,
        student_section: typeof st === "object" ? st.student_section || st.section_id || (typeof st.section === "object" ? st.section?.id : st.section) : undefined,
        department: typeof st === "object" ? st.department || st.department_id : undefined,
        department_name: typeof st === "object" ? st.department_name : undefined,
        originalData: st,
      });
    };

    (academicStudents || []).forEach(appendStudent);
    (studentDatabase || []).forEach(appendStudent);
    (studentStore.getAll() || []).forEach(appendStudent);

    return sortStudentsByUsage(fullList);
  }, [studentDatabase, academicStudents]);

  // ── Cascading Filter Handlers ────────────────────────────────────────────────
  const handleDepartmentChange = (newDeptId: string) => {
    setLocalDeptId(newDeptId);
    setLocalClassId("");
    setLocalSectionId("");
    setGroupName("");
    rawOnDepartmentChange(newDeptId);
  };

  const handleClassChange = (newClassId: string) => {
    setLocalClassId(newClassId);
    setLocalSectionId("");
    setGroupName("");
    rawOnClassChange(newClassId);
  };

  const handleSectionChange = (newSecId: string) => {
    setLocalSectionId(newSecId);
    rawOnSectionChange(newSecId);
    if (newSecId) {
      const secObj = (sections || []).find((s: any) => String(s.id) === String(newSecId));
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

  // ── Direct Academic Hierarchy Context Resolver for DocLab Reports ───────────
  // Resolves strictly what the user picked in the top selectors (Date, Dept, Class, Section).
  // Zero forced data, zero guessing, zero regex fallbacks. If not picked, remains blank.
  const resolvedAcademicContext = useMemo(() => {
    // ── 1. Resolve Department Name (Direct from user's picked Department in filter) ──
    let deptName = "";
    if (selectedDepartmentId) {
      const opt = (departmentSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedDepartmentId) || String(o.label) === String(selectedDepartmentId)
      );
      deptName = opt?.label || "";
      if (!deptName) {
        const d = (departments || []).find((x: any) => String(x.id) === String(selectedDepartmentId));
        deptName = d?.name || d?.department_name || d?.title || d?.label || "";
      }
    }

    // ── 2. Resolve Class Name (Direct from user's picked Class in filter) ────────
    let clsName = "";
    if (selectedClassId) {
      const opt = (classSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedClassId) || String(o.label) === String(selectedClassId)
      );
      clsName = opt?.label || "";
      if (!clsName) {
        const c = (classes || []).find((x: any) => String(x.id) === String(selectedClassId));
        clsName = c?.name || c?.class_name || c?.title || c?.label || "";
      }
    }

    // ── 3. Resolve Section Name (Direct from user's picked Section in filter) ─────
    let secName = "";
    if (selectedSectionId) {
      const opt = (sectionSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedSectionId) || String(o.label) === String(selectedSectionId)
      );
      secName = opt?.label || "";
      if (!secName) {
        const s = (sections || []).find((x: any) => String(x.id) === String(selectedSectionId));
        secName = s?.section_name || s?.name || s?.title || s?.label || "";
      }
    }

    return {
      departmentName: deptName.trim(),
      className: clsName.trim(),
      sectionName: secName.trim(),
    };
  }, [
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    departmentSelectOptions,
    classSelectOptions,
    sectionSelectOptions,
    departments,
    classes,
    sections,
  ]);

  // ── Memoized DocLab Data Record for Quick Report Modal ───────────────────────
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

  // ── Student Selection with Mutual Auto-Population of Hierarchy ───────────────
  // ── Student Selection Handlers ───────────────────────────────────────────────
  const isSelectingStudentRef = useRef(false);
  const lastSelectedStudentNameRef = useRef("");

  const handleStudentSelect = (sel: any) => {
    if (!sel) {
      setStudentName("");
      setGroupName("");
      lastSelectedStudentNameRef.current = "";
      return;
    }

    let chosenName = "";
    let chosenSub = "";
    let matchedStudent: any = null;
    const isExplicitSelection = typeof sel === "object" && sel !== null;

    if (isExplicitSelection) {
      chosenName = typeof sel.label === "string" ? sel.label : typeof sel.name === "string" ? sel.name : "";
      chosenSub = typeof sel.sub === "string" ? sel.sub : typeof sel.group_name === "string" ? sel.group_name : "";
      matchedStudent = sel.originalData || sel;
    } else {
      chosenName = typeof sel === "string" ? sel : "";
    }

    setStudentName(chosenName);
    setSelectedStudentId(matchedStudent?.id ? String(matchedStudent.id) : null);

    if (!chosenName.trim()) {
      lastSelectedStudentNameRef.current = "";
      return;
    }

    lastSelectedStudentNameRef.current = chosenName.trim();
    if (isExplicitSelection) {
      isSelectingStudentRef.current = true;
    }

    const academicProfile = (allStudentDatabase || []).find(
      (a: any) =>
        (matchedStudent && matchedStudent.id && String(a.id) === String(matchedStudent.id)) ||
        ((a.name_en || a.name || a.label || "").toLowerCase().trim() === chosenName.toLowerCase().trim())
    );

    const candidate = academicProfile || matchedStudent;

    if (candidate) {
      if (!selectedStudentId && candidate.id) {
        setSelectedStudentId(String(candidate.id));
      }
      if (!chosenSub && (candidate.section_name || candidate.sub || candidate.group_name)) {
        chosenSub = candidate.section_name || candidate.sub || candidate.group_name;
      }
      // Record student usage for frequency ranking
      recordStudentUsage(candidate);

      // 1. Resolve Section ID & Section Object
      let candSecId = getSectionId(candidate) || "";
      if (!candSecId && chosenSub) {
        const matchedSec = (sections || []).find(
          (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === chosenSub.toLowerCase().trim()
        );
        if (matchedSec) candSecId = String(matchedSec.id);
      }
      const secObj = candSecId ? (sections || []).find((s: any) => String(s.id) === String(candSecId)) : null;

      // 2. Resolve Class ID & Class Object
      let candClassId = getClassId(candidate) || (secObj ? getClassId(secObj) : "");
      if (!candClassId && candidate.student_class_name) {
        const matchedCls = (classes || []).find(
          (c: any) => (c.name || c.class_name || "").toLowerCase().trim() === candidate.student_class_name.toLowerCase().trim()
        );
        if (matchedCls) candClassId = String(matchedCls.id);
      }
      const classObj = candClassId ? (classes || []).find((c: any) => String(c.id) === String(candClassId)) : null;

      // 3. Resolve Department ID & Department Object
      let candDeptId =
        getDepartmentId(candidate) ||
        (classObj ? getDepartmentId(classObj) : "") ||
        (secObj ? getDepartmentId(secObj) : "");
      if (!candDeptId && candidate.department_name) {
        const matchedDept = (departments || []).find(
          (d: any) => (d.name || d.department_name || "").toLowerCase().trim() === candidate.department_name.toLowerCase().trim()
        );
        if (matchedDept) candDeptId = String(matchedDept.id);
      }

      // 4. Update section / group display name
      const effectiveGroupName =
        secObj?.section_name || secObj?.name || candidate.section_name || candidate.sub || chosenSub || "";
      setGroupName(effectiveGroupName || "");

      // 5. Seamlessly sync the entire academic hierarchy selectors
      // Preserve user selection when student does not have explicit placement filters
      const targetDept = candDeptId || selectedDepartmentId || "";
      const targetClass = candClassId || selectedClassId || "";
      const targetSec = candSecId || selectedSectionId || "";

      updateHierarchy(targetDept, targetClass, targetSec);
    } else if (chosenSub) {
      const matchedSec = (sections || []).find(
        (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === chosenSub.toLowerCase().trim()
      );
      if (matchedSec) {
        const secClassId = getClassId(matchedSec);
        const classObj = secClassId ? (classes || []).find((c: any) => String(c.id) === String(secClassId)) : null;
        const deptId = classObj ? getDepartmentId(classObj) : "";
        setGroupName(matchedSec.section_name || matchedSec.name || chosenSub);
        updateHierarchy(deptId || selectedDepartmentId || "", secClassId || selectedClassId || "", String(matchedSec.id));
      } else {
        setGroupName(chosenSub);
      }
    }
  };

  // ── Synchronization Guard for External Hierarchy Changes ───────────────────
  const prevDeptIdRef = useRef(selectedDepartmentId);
  const prevClassIdRef = useRef(selectedClassId);
  const prevSecIdRef = useRef(selectedSectionId);

  useEffect(() => {
    prevDeptIdRef.current = selectedDepartmentId;
    prevClassIdRef.current = selectedClassId;
    prevSecIdRef.current = selectedSectionId;

    if (isSelectingStudentRef.current) {
      isSelectingStudentRef.current = false;
    }
  }, [
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentNameParam = params.get("selectedStudentName");
    const studentIdParam = params.get("selectedStudentId");
    const deptParam = params.get("dept");
    const classParam = params.get("class");
    const secParam = params.get("section");
    const groupParam = params.get("group");

    if (studentNameParam || studentIdParam) {
      const allKnown = [
        ...(academicStudents || []),
        ...(studentDatabase || []),
        ...(studentStore.getAll() || []),
      ];

      let matched = allKnown.find((a: any) => {
        const idMatch = studentIdParam && String(a.id) === String(studentIdParam);
        const nameMatch =
          studentNameParam &&
          (a.name_en || a.name || a.label || "").toLowerCase().trim() === studentNameParam.toLowerCase().trim();
        return idMatch || nameMatch;
      });

      if (!matched && studentNameParam) {
        matched = {
          id: studentIdParam || `stu_${Date.now()}`,
          name: studentNameParam,
          label: studentNameParam,
          name_en: studentNameParam,
          department: deptParam || undefined,
          student_class: classParam || undefined,
          student_section: secParam || undefined,
          sub: groupParam || undefined,
          section_name: groupParam || undefined,
          group_name: groupParam || undefined,
        };
      }

      if (matched) {
        handleStudentSelect(matched);
      } else if (studentNameParam) {
        setStudentName(studentNameParam);
      }

      params.delete("selectedStudentName");
      params.delete("selectedStudentId");
      params.delete("dept");
      params.delete("class");
      params.delete("section");
      params.delete("group");
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
  }, [academicStudents, studentDatabase]);

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
        if (studentInput) {
          studentInput.focus();
        }
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
        // Ignore if dataTransfer is restricted
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
            // Replace the empty blank placeholder row with the moved item
            targetList.splice(0, 1, movedItem);
          } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
            targetList.splice(targetIndex, 0, movedItem);
          } else {
            targetList.push(movedItem);
          }

          // Ensure source list always keeps at least one blank row if all rows were moved
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
                    <IconButton
                      icon={CloseIcon}
                      size="xs"
                      variant="ghost"
                      onClick={() => discardDraft(draft)}
                      title="Discard Draft"
                      ariaLabel="Discard Draft"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Classroom Filter Controls Box (Reused Enterprise Standard Background Box) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        showDate={sectionConfig.headerDate?.enabled !== false}
        dateLabel="Date"
        selectedDate={selectedDate || getClassroomTodayDate()}
        onDateChange={(dateStr: string) => {
          setSelectedDate(dateStr);
          if (filterProps?.onDateChange) {
            filterProps.onDateChange(dateStr);
          }
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

      {/* 2. Card: Student & Session Information */}
      {(sectionConfig.studentSelect?.enabled || sectionConfig.sessionSelect?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-6 shadow-xl border theme-border space-y-4">
          <div
            className={`grid grid-cols-1 ${
              sectionConfig.studentSelect?.enabled && sectionConfig.sessionSelect?.enabled
                ? "@[640px]:grid-cols-2"
                : "grid-cols-1"
            } gap-4`}
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
              <div className="border-t theme-border border-opacity-30 my-4 sm:my-5" />
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
            <div className="border-t theme-border border-opacity-30 my-4 sm:my-5" />
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

      {/* 4. Reusable DocLab Quick Report Modal */}
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

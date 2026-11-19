import { useState, useEffect, useMemo, useRef } from "react";
import { useAcademicData } from "@/hooks/useAcademicData";
import { useTenant } from "@/context/TenantContext";
import {
  buildSectionSelectOptions,
  doesLessonMatchDepartment,
  getClassId,
  getDepartmentId,
} from "@/modules/learning/daily-classroom/utils/dailyClassroomUtils";
import { recordStudentUsage } from "@/utils/studentUsageTracker";
import type { DailyProgressFilterProps } from "../types";
import { useEffectiveAcademicHierarchy } from "./academicHierarchyFallback";
import { resolveAllStudentDatabase } from "./studentDatabaseResolver";
import { findStudentCandidate, resolveStudentHierarchy } from "./studentHierarchyResolver";

export * from "./academicHierarchyFallback";
export * from "./studentDatabaseResolver";
export * from "./studentHierarchyResolver";

const PROGRESS_FILTERS_KEY = "spr_daily_progress_filters_v1";

interface UseDailyProgressHierarchyParams {
  filterProps?: DailyProgressFilterProps | null;
  studentDatabase: any[];
  studentName: string;
  setStudentName: (val: string) => void;
  selectedStudentId: string | number | null;
  setSelectedStudentId: (val: string | number | null) => void;
  setGroupName: (val: string) => void;
}

/**
 * Enterprise Academic Hierarchy Orchestrator for Daily Progress.
 * Manages cascading Department, Class, and Section state with multi-tier offline caches,
 * clean URL query-parameter synchronization, and zero dead-code overhead.
 */
export function useDailyProgressHierarchy({
  filterProps,
  studentDatabase,
  studentName,
  setStudentName,
  selectedStudentId,
  setSelectedStudentId,
  setGroupName,
}: UseDailyProgressHierarchyParams) {
  const { activeTenantId } = useTenant();
  const academicData = useAcademicData();
  const {
    departments = [],
    classes = [],
    sections = [],
    students: academicStudents = [],
  } = academicData || {};

  // ── Multi-Tier Fallback: Cached and Harvested Classes & Sections ───────────
  const { effectiveClasses, effectiveSections } = useEffectiveAcademicHierarchy({
    classes,
    sections,
    academicStudents,
    studentDatabase,
    activeTenantId,
  });

  // ── Persistent Local Filter State & URL Hydration ──────────────────────────
  const [localDeptId, setLocalDeptId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("dept") || params.get("department");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(PROGRESS_FILTERS_KEY);
      return saved ? JSON.parse(saved).departmentId || "" : "";
    } catch {
      return "";
    }
  });

  const [localClassId, setLocalClassId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("class") || params.get("cls");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(PROGRESS_FILTERS_KEY);
      return saved ? JSON.parse(saved).classId || "" : "";
    } catch {
      return "";
    }
  });

  const [localSectionId, setLocalSectionId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("section") || params.get("sec");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(PROGRESS_FILTERS_KEY);
      return saved ? JSON.parse(saved).sectionId || "" : "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_FILTERS_KEY,
        JSON.stringify({
          departmentId: localDeptId || "",
          classId: localClassId || "",
          sectionId: localSectionId || "",
        })
      );
    } catch {
      // Ignore write errors
    }
  }, [localDeptId, localClassId, localSectionId]);

  // ── Cascading Props vs Local State Resolution ──────────────────────────────
  const normalizeScopeVal = (v: any) => {
    const s = String(v ?? "").trim();
    return s && s.toUpperCase() !== "ALL" ? s : "";
  };

  const selectedDepartmentId = normalizeScopeVal(
    filterProps?.selectedDepartmentId !== undefined ? filterProps.selectedDepartmentId : localDeptId
  );
  const rawOnDepartmentChange =
    filterProps?.onDepartmentChange ||
    ((val: string) => {
      setLocalDeptId(val);
      setLocalClassId("");
      setLocalSectionId("");
    });

  const departmentSelectOptions = useMemo(() => {
    const activeDepts = (departments || []).filter((d: any) => d && !d.is_deleted && d.is_active !== false);
    const raw =
      activeDepts.length > 0
        ? activeDepts.map((d: any) => ({
            value: String(d.id),
            label: d.name || d.department_name || `Department ${d.id}`,
          }))
        : (filterProps?.departmentSelectOptions || []);
    return raw.filter((opt: any) => opt?.value && String(opt.value).toUpperCase() !== "ALL" && !opt.label?.toLowerCase().startsWith("all "));
  }, [departments, filterProps?.departmentSelectOptions]);

  const hasDepartments = departmentSelectOptions.length > 0;

  const selectedClassId = normalizeScopeVal(
    filterProps?.selectedClassId !== undefined ? filterProps.selectedClassId : localClassId
  );
  const rawOnClassChange =
    filterProps?.onClassChange ||
    ((val: string) => {
      setLocalClassId(val);
      setLocalSectionId("");
    });

  const classSelectOptions = useMemo(() => {
    const activeClasses = (effectiveClasses || []).filter((c: any) => c && !c.is_deleted && c.is_active !== false);
    let candidateClasses = activeClasses;
    if (selectedDepartmentId) {
      const matched = activeClasses.filter((c: any) =>
        doesLessonMatchDepartment(c, selectedDepartmentId, departments, activeClasses)
      );
      if (matched.length > 0) {
        candidateClasses = matched;
      }
    }

    let candidateOptions: Array<{ value: string; label: string }> = candidateClasses.map((c: any) => ({
      value: String(c.id),
      label: c.name || c.class_name || `Class ${c.id}`,
    }));

    // Only use parent filterProps options as fallback if local academic classes haven't loaded yet
    if (candidateOptions.length === 0 && filterProps?.classSelectOptions && filterProps.classSelectOptions.length > 0) {
      candidateOptions = filterProps.classSelectOptions
        .filter((opt: any) => opt && opt.value !== "" && String(opt.value).toUpperCase() !== "ALL" && !opt.label?.toLowerCase().startsWith("all "))
        .map((opt: any) => ({
          value: String(opt.value ?? opt.id),
          label: opt.label || opt.name || `Class ${opt.value}`,
        }));
    }

    const cleanList: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    candidateOptions.forEach((opt) => {
      if (!opt) return;
      const valStr = String(opt.value ?? "").trim();
      const lblStr = String(opt.label ?? "").trim();
      if (!valStr || seen.has(valStr)) return;
      seen.add(valStr);
      cleanList.push({ value: valStr, label: lblStr });
    });

    // Ensure selectedClassId is always present so CustomSelect never displays blank
    if (selectedClassId && selectedClassId !== "ALL" && selectedClassId !== "" && !seen.has(String(selectedClassId))) {
      const foundInEffective = effectiveClasses.find((c: any) => String(c.id) === String(selectedClassId));
      cleanList.unshift({
        value: String(selectedClassId),
        label: foundInEffective?.name || foundInEffective?.class_name || `Class ${selectedClassId}`,
      });
    }

    return cleanList;
  }, [
    filterProps?.classSelectOptions,
    effectiveClasses,
    selectedDepartmentId,
    departments,
    selectedClassId,
  ]);

  const rawSelectedSectionId =
    filterProps?.selectedSectionId !== undefined ? filterProps.selectedSectionId : localSectionId;
  const selectedSectionId =
    rawSelectedSectionId && String(rawSelectedSectionId).trim().toUpperCase() !== "ALL"
      ? String(rawSelectedSectionId).trim()
      : "";
  const rawOnSectionChange = filterProps?.onSectionChange || setLocalSectionId;

  // Sync academic hierarchy when an existing report is loaded for editing
  useEffect(() => {
    const syncFromReport = (rep: any) => {
      if (!rep || typeof rep !== "object") return;
      const deptId = rep.departmentId || rep.department_id || rep.department;
      const clsId = rep.classId || rep.class_id || rep.academic_class_id || rep.academic_class;
      const secId = rep.sectionId || rep.section_id || rep.section;
      if (deptId) {
        setLocalDeptId(String(deptId));
        if (rawOnDepartmentChange) rawOnDepartmentChange(String(deptId));
      }
      if (clsId) {
        setLocalClassId(String(clsId));
        if (rawOnClassChange) rawOnClassChange(String(clsId));
      }
      if (secId) {
        setLocalSectionId(String(secId));
        if (rawOnSectionChange) rawOnSectionChange(String(secId));
      }
    };

    const handleEditSync = (e: any) => {
      syncFromReport(e?.detail);
    };

    try {
      const pendingRaw = localStorage.getItem("spr_editing_report");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        syncFromReport(pending);
      }
    } catch {}

    window.addEventListener("spr_edit_report", handleEditSync);
    window.addEventListener("spr_sync_hierarchy_filters", handleEditSync);
    return () => {
      window.removeEventListener("spr_edit_report", handleEditSync);
      window.removeEventListener("spr_sync_hierarchy_filters", handleEditSync);
    };
  }, [rawOnDepartmentChange, rawOnClassChange, rawOnSectionChange]);

  const sectionSelectOptions = useMemo(() => {
    return buildSectionSelectOptions({
      sections: effectiveSections,
      classes: effectiveClasses,
      departments,
      selectedClassId: selectedClassId || "",
      selectedDepartmentId: selectedDepartmentId || "",
      selectedSectionId: selectedSectionId || "",
      includeAllOption: false,
    });
  }, [
    effectiveSections,
    selectedClassId,
    selectedDepartmentId,
    selectedSectionId,
    effectiveClasses,
    departments,
  ]);

  const hasSectionsForClass = true;

  const updateHierarchy = (deptId: string, clsId: string, secId: string) => {
    const finalDept = deptId || "";
    const finalCls = clsId || "";
    const finalSec = secId || "";

    setLocalDeptId(finalDept);
    setLocalClassId(finalCls);
    setLocalSectionId(finalSec);

    if (filterProps?.onBatchHierarchyChange) {
      filterProps.onBatchHierarchyChange({ departmentId: finalDept, classId: finalCls, sectionId: finalSec });
    } else if (filterProps?.setAcademicFilters) {
      filterProps.setAcademicFilters({ departmentId: finalDept, classId: finalCls, sectionId: finalSec });
    } else {
      if (filterProps?.onDepartmentChange) {
        filterProps.onDepartmentChange(finalDept);
      }
      if (filterProps?.onClassChange) {
        filterProps.onClassChange(finalCls);
      }
      if (filterProps?.onSectionChange) {
        filterProps.onSectionChange(finalSec);
      }
    }
  };

  // ── Authoritative Unified Student Database ─────────────────────────────────
  const allStudentDatabase = useMemo(() => {
    return resolveAllStudentDatabase(academicStudents, studentDatabase);
  }, [academicStudents, studentDatabase]);

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
      const secObj = (effectiveSections || []).find((s: any) => String(s.id) === String(newSecId));
      if (secObj) setGroupName(secObj.section_name || secObj.name || "");
    } else {
      setGroupName("");
    }
  };

  // ── Resolved Academic Labels Context for Report Generation ─────────────────
  const resolvedAcademicContext = useMemo(() => {
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

    let clsName = "";
    if (selectedClassId) {
      const opt = (classSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedClassId) || String(o.label) === String(selectedClassId)
      );
      clsName = opt?.label || "";
      if (!clsName) {
        const c = (effectiveClasses || []).find((x: any) => String(x.id) === String(selectedClassId));
        clsName = c?.name || c?.class_name || c?.title || c?.label || "";
      }
    }

    let secName = "";
    if (selectedSectionId) {
      const opt = (sectionSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedSectionId) || String(o.label) === String(selectedSectionId)
      );
      secName = opt?.label || "";
      if (!secName) {
        const s = (effectiveSections || []).find((x: any) => String(x.id) === String(selectedSectionId));
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
    effectiveClasses,
    effectiveSections,
  ]);

  // ── Smart Student Selection & Hierarchy Auto-Wiring ────────────────────────
  const lastSelectedStudentNameRef = useRef("");

  const handleStudentSelect = (sel: any) => {
    if (!sel) {
      setStudentName("");
      setSelectedStudentId(null);
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
    const studentExplicitId =
      matchedStudent?.id != null
        ? String(matchedStudent.id)
        : matchedStudent?.student_id != null
        ? String(matchedStudent.student_id)
        : null;
    setSelectedStudentId(studentExplicitId);

    if (!chosenName.trim()) {
      lastSelectedStudentNameRef.current = "";
      return;
    }

    lastSelectedStudentNameRef.current = chosenName.trim();

    // Locate candidate strictly within the normalized single source of truth
    const candidate =
      matchedStudent ||
      findStudentCandidate(chosenName, studentExplicitId, allStudentDatabase, {
        selectedDepartmentId,
        selectedClassId,
        selectedSectionId,
      });

    if (candidate) {
      const hierarchy = resolveStudentHierarchy(
        candidate,
        effectiveClasses,
        effectiveSections,
        departments,
        { selectedDepartmentId, selectedClassId, selectedSectionId },
        chosenSub
      );

      if (!isExplicitSelection && (/^\d+$/.test(chosenName.trim()) || chosenName.trim().toUpperCase().startsWith("STU-"))) {
        setStudentName(hierarchy.realName);
      }
      if (hierarchy.resolvedStudentId) {
        setSelectedStudentId(hierarchy.resolvedStudentId);
      }
      setGroupName(hierarchy.groupName);
      recordStudentUsage(candidate);
      updateHierarchy(hierarchy.departmentId, hierarchy.classId, hierarchy.sectionId);
    } else if (chosenSub) {
      const matchedSec = (effectiveSections || []).find(
        (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === chosenSub.toLowerCase().trim()
      );
      if (matchedSec) {
        const secClassId = getClassId(matchedSec);
        const classObj = secClassId ? (effectiveClasses || []).find((c: any) => String(c.id) === String(secClassId)) : null;
        const deptId = classObj ? getDepartmentId(classObj) : "";
        setGroupName(matchedSec.section_name || matchedSec.name || chosenSub);
        updateHierarchy(deptId || selectedDepartmentId || "", secClassId || selectedClassId || "", String(matchedSec.id));
      } else {
        setGroupName(chosenSub);
      }
    }
  };

  // Synchronize academic hierarchy when studentName/selectedStudentId is set programmatically (Undo, Redo, Draft, Edit)
  useEffect(() => {
    if (!studentName || !studentName.trim()) {
      lastSelectedStudentNameRef.current = "";
      return;
    }
    const trimmed = studentName.trim().toLowerCase();
    if (trimmed === lastSelectedStudentNameRef.current.toLowerCase()) return;

    // First priority: find student by EXACT name to prevent mismatching ID from a previous record
    let match = (allStudentDatabase || []).find((s: any) => {
      const sName = (s.name_en || s.name || s.label || s.bangla_name || "").trim().toLowerCase();
      return sName === trimmed;
    });

    // Second priority: if not found by name, try matching by ID only if name is generic/empty or matches roll/id
    if (!match && selectedStudentId) {
      match = (allStudentDatabase || []).find((s: any) => String(s.id) === String(selectedStudentId));
    }

    if (match) {
      lastSelectedStudentNameRef.current = (match.name_en || match.name || match.label || studentName).trim();
      handleStudentSelect(match);
    }
  }, [studentName, selectedStudentId, allStudentDatabase]);

  return {
    departments,
    classes: effectiveClasses,
    effectiveClasses,
    sections: effectiveSections,
    effectiveSections,
    academicStudents,
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
    updateHierarchy,
  };
}

import { useState, useEffect, useMemo, useRef } from "react";
import { useAcademicData } from "@/hooks/useAcademicData";
import { useTenant } from "@/context/TenantContext";
import {
  doesStudentMatchDepartment,
  doesLessonMatchDepartment,
  doesStudentMatchClass,
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
  const selectedDepartmentId =
    filterProps?.selectedDepartmentId !== undefined ? filterProps.selectedDepartmentId : localDeptId;
  const rawOnDepartmentChange =
    filterProps?.onDepartmentChange ||
    ((val: string) => {
      setLocalDeptId(val);
      setLocalClassId("");
      setLocalSectionId("");
    });

  const departmentSelectOptions = useMemo(() => {
    const raw =
      filterProps?.departmentSelectOptions ||
      (departments || []).map((d: any) => ({
        value: String(d.id),
        label: d.name || d.department_name || `Department ${d.id}`,
      }));
    return raw.filter((opt: any) => opt.value !== "" && opt.value !== "ALL" && !opt.label?.toLowerCase().startsWith("all "));
  }, [filterProps?.departmentSelectOptions, departments]);

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

  const classSelectOptions = useMemo(() => {
    let candidateClasses = effectiveClasses;
    if (selectedDepartmentId) {
      const matched = effectiveClasses.filter((c: any) =>
        doesLessonMatchDepartment(c, selectedDepartmentId, departments, effectiveClasses)
      );
      if (matched.length > 0) {
        candidateClasses = matched;
      }
    }

    let candidateOptions: Array<{ value: string; label: string }> = candidateClasses.map((c: any) => ({
      value: String(c.id),
      label: c.name || c.class_name || `Class ${c.id}`,
    }));

    if (filterProps?.classSelectOptions && filterProps.classSelectOptions.length > 0) {
      const cleaned = filterProps.classSelectOptions
        .filter((opt: any) => opt && opt.value !== "" && opt.value !== "ALL" && !opt.label?.toLowerCase().startsWith("all "))
        .map((opt: any) => ({
          value: String(opt.value ?? opt.id),
          label: opt.label || opt.name || `Class ${opt.value}`,
        }));
      if (cleaned.length > 0) {
        candidateOptions = cleaned;
      }
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

  const selectedSectionId =
    filterProps?.selectedSectionId !== undefined ? filterProps.selectedSectionId : localSectionId;
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
    let candidateOptions: Array<{ value: string; label: string }> = [];

    if (filterProps?.sectionSelectOptions && filterProps.sectionSelectOptions.length > 0) {
      candidateOptions = filterProps.sectionSelectOptions.map((o: any) => ({
        value: String(o.value ?? o.id ?? ""),
        label: String(o.label ?? o.name ?? o.section_name ?? `Section ${o.value}`),
      }));
    } else {
      let filtered = effectiveSections;
      if (selectedClassId) {
        const classMatched = effectiveSections.filter((s: any) => doesStudentMatchClass(s, selectedClassId, effectiveClasses));
        if (classMatched.length > 0) {
          filtered = classMatched;
        } else if (selectedDepartmentId) {
          const deptMatched = effectiveSections.filter((s: any) => doesStudentMatchDepartment(s, selectedDepartmentId, departments, effectiveClasses));
          if (deptMatched.length > 0) {
            filtered = deptMatched;
          }
        }
      } else if (selectedDepartmentId) {
        const deptMatched = effectiveSections.filter((s: any) => doesStudentMatchDepartment(s, selectedDepartmentId, departments, effectiveClasses));
        if (deptMatched.length > 0) {
          filtered = deptMatched;
        }
      }

      candidateOptions = filtered.map((s: any) => ({
        value: String(s.id),
        label: s.section_name || s.name || `Section ${s.id}`,
      }));
    }

    const cleanList: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    candidateOptions.forEach((opt: any) => {
      if (!opt) return;
      const valStr = String(opt.value ?? "").trim();
      const lblStr = String(opt.label ?? "").trim();
      const lower = lblStr.toLowerCase();
      if (lower === "general group" || lower === "general") return;
      if (valStr === "" || lower === "all sections" || lower.startsWith("all ")) return;

      const key = `${valStr}___${lower}`;
      if (!seen.has(key)) {
        seen.add(key);
        cleanList.push({ value: valStr, label: lblStr });
      }
    });

    return [{ value: "", label: "All Sections" }, ...cleanList];
  }, [
    filterProps?.sectionSelectOptions,
    effectiveSections,
    selectedClassId,
    selectedDepartmentId,
    effectiveClasses,
    departments,
  ]);

  const hasSectionsForClass = true;

  // Clear section if it was accidentally set to General Group
  useEffect(() => {
    if (localSectionId) {
      const sec = (effectiveSections || []).find((s: any) => String(s.id) === String(localSectionId));
      const secName = (sec?.section_name || sec?.name || "").toLowerCase().trim();
      if (secName === "general group" || secName === "general") {
        setLocalSectionId("");
      }
    }
  }, [localSectionId, effectiveSections]);

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

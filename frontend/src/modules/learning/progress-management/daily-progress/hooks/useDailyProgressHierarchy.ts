import { useState, useEffect, useMemo, useRef } from "react";
import { useAcademicData } from "@/hooks/useAcademicData";
import { students as studentStore } from "@/utils/localStore";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
  getDepartmentId,
  getClassId,
  getSectionId,
} from "@/modules/learning/utils/dailyClassroomUtils";
import { sortStudentsByUsage, recordStudentUsage } from "@/utils/studentUsageTracker";
import type { DailyProgressFilterProps, StudentProfileOption } from "../types";

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

export function useDailyProgressHierarchy({
  filterProps,
  studentDatabase,
  studentName,
  setStudentName,
  selectedStudentId,
  setSelectedStudentId,
  setGroupName,
}: UseDailyProgressHierarchyParams) {
  const academicData = useAcademicData();
  const {
    departments = [],
    classes = [],
    sections = [],
    students: academicStudents = [],
  } = academicData || {};

  const [localDeptId, setLocalDeptId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("dept");
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
      const fromUrl = params.get("class");
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
      const fromUrl = params.get("section");
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
      // Ignore
    }
  }, [localDeptId, localClassId, localSectionId]);

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

      const roll = typeof st === "object" ? (st.roll_number ?? st.originalData?.roll_number) : undefined;
      const cardNo = typeof st === "object" ? (st.student_id_card_number ?? st.originalData?.student_id_card_number) : undefined;
      const uniq = typeof st === "object" ? (st.uniq_id ?? st.originalData?.uniq_id) : undefined;
      const rawId = typeof st === "object" && (st?.id != null ? String(st.id) : (st?.student_id != null ? String(st.student_id) : null));
      const key = rawId
        ? `id_${rawId}`
        : uniq
        ? `uniq_${uniq}`
        : cardNo
        ? `card_${cardNo}`
        : roll != null
        ? `roll_${stName.toLowerCase()}_${secSub.toLowerCase()}_${roll}`
        : `raw_${stName.toLowerCase()}_${secSub.toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const badge =
        typeof st === "object" && st.badge
          ? st.badge
          : roll != null
          ? `Roll: ${roll}`
          : cardNo
          ? `ID: ${cardNo}`
          : uniq
          ? `ID: ${uniq}`
          : rawId != null
          ? `ID: ${rawId}`
          : undefined;

      const stClsId = typeof st === "object" ? getClassId(st) || (st.student_class || st.class_id) : undefined;
      const stSecId = typeof st === "object" ? getSectionId(st) || (st.student_section || st.section_id) : undefined;
      const stDeptId = typeof st === "object" ? getDepartmentId(st) || (st.department || st.department_id) : undefined;

      fullList.push({
        id: rawId || undefined,
        label: stName,
        name: stName,
        name_en: typeof st === "object" ? st.name_en || stName : stName,
        sub: secSub,
        section_name: (typeof st === "object" ? st.section_name || st.student_section_name : null) || secSub || undefined,
        roll_number: roll,
        student_id_card_number: cardNo,
        uniq_id: uniq,
        badge,
        student_class: stClsId,
        student_class_name: typeof st === "object" ? st.student_class_name || st.class_name : undefined,
        student_section: stSecId,
        department: stDeptId,
        department_name: typeof st === "object" ? st.department_name : undefined,
        originalData: st,
      });
    };

    (academicStudents || []).forEach(appendStudent);
    (studentDatabase || []).forEach(appendStudent);
    (studentStore.getAll() || []).forEach(appendStudent);

    return sortStudentsByUsage(fullList);
  }, [studentDatabase, academicStudents]);

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
      if (secObj) setGroupName(secObj.section_name || secObj.name || "");
    } else {
      setGroupName("");
    }
  };

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
        const c = (classes || []).find((x: any) => String(x.id) === String(selectedClassId));
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

  const isSelectingStudentRef = useRef(false);
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
    if (isExplicitSelection) isSelectingStudentRef.current = true;

    // 1. Locate best academic profile from all student sources
    let academicProfile: any = null;
    if (studentExplicitId) {
      academicProfile =
        (allStudentDatabase || []).find((a: any) => String(a.id) === studentExplicitId) ||
        (academicStudents || []).find((a: any) => String(a.id) === studentExplicitId) ||
        (studentStore.getAll() || []).find((a: any) => String(a.id) === studentExplicitId);
    } else if (chosenName.trim()) {
      const nameMatches = (allStudentDatabase || []).filter(
        (a: any) => (a.name_en || a.name || a.label || "").toLowerCase().trim() === chosenName.toLowerCase().trim()
      );
      if (nameMatches.length === 1) {
        academicProfile = nameMatches[0];
      } else if (nameMatches.length > 1) {
        academicProfile =
          (selectedSectionId && nameMatches.find((a: any) => String(a.student_section || a.section_id) === String(selectedSectionId))) ||
          (selectedClassId && nameMatches.find((a: any) => String(a.student_class || a.class_id) === String(selectedClassId))) ||
          (selectedDepartmentId && nameMatches.find((a: any) => String(a.department || a.department_id) === String(selectedDepartmentId))) ||
          nameMatches[0];
      }
    }

    const candidate = academicProfile || matchedStudent;

    if (candidate) {
      const resolvedId = candidate.id != null ? String(candidate.id) : studentExplicitId;
      if (resolvedId) setSelectedStudentId(resolvedId);
      if (!chosenSub && (candidate.section_name || candidate.student_section_name || candidate.sub || candidate.group_name)) {
        chosenSub = candidate.section_name || candidate.student_section_name || candidate.sub || candidate.group_name;
      }
      recordStudentUsage(candidate);

      // A. Extract Section
      let candSecId =
        getSectionId(candidate) ||
        getSectionId(candidate?.originalData) ||
        getSectionId(matchedStudent) ||
        "";
      if (!candSecId && (candidate.student_section || candidate.section_id || candidate.section)) {
        const rawSec = candidate.student_section || candidate.section_id || candidate.section;
        candSecId = typeof rawSec === "object" ? String(rawSec?.id || "") : String(rawSec || "");
      }
      if (!candSecId && (candidate.section_name || candidate.student_section_name || chosenSub)) {
        const secSearch = (candidate.section_name || candidate.student_section_name || chosenSub).toLowerCase().trim();
        const matchedSec = (sections || []).find(
          (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === secSearch
        );
        if (matchedSec) candSecId = String(matchedSec.id);
      }
      const secObj = candSecId ? (sections || []).find((s: any) => String(s.id) === String(candSecId)) : null;

      // B. Extract Class
      let candClassId =
        getClassId(candidate) ||
        getClassId(candidate?.originalData) ||
        getClassId(matchedStudent) ||
        (secObj ? getClassId(secObj) : "");

      if (!candClassId && (candidate.student_class || candidate.class_id || candidate.academic_class || candidate.academic_class_id)) {
        const rawCls = candidate.student_class || candidate.class_id || candidate.academic_class || candidate.academic_class_id;
        candClassId = typeof rawCls === "object" ? String(rawCls?.id || "") : String(rawCls || "");
      }
      if (!candClassId && (candidate.student_class_name || candidate.class_name)) {
        const targetClsName = (candidate.student_class_name || candidate.class_name || "").toLowerCase().trim();
        const matchedCls = (classes || []).find(
          (c: any) => (c.name || c.class_name || "").toLowerCase().trim() === targetClsName ||
                      (c.code || "").toLowerCase().trim() === targetClsName
        );
        if (matchedCls) candClassId = String(matchedCls.id);
      }
      const classObj = candClassId ? (classes || []).find((c: any) => String(c.id) === String(candClassId)) : null;

      // C. Extract Department
      let candDeptId =
        getDepartmentId(candidate) ||
        getDepartmentId(candidate?.originalData) ||
        getDepartmentId(matchedStudent) ||
        (classObj ? getDepartmentId(classObj) : "") ||
        (secObj ? getDepartmentId(secObj) : "");

      if (!candDeptId && (candidate.department || candidate.department_id || candidate.dept_id)) {
        const rawDept = candidate.department || candidate.department_id || candidate.dept_id;
        candDeptId = typeof rawDept === "object" ? String(rawDept?.id || "") : String(rawDept || "");
      }
      if (!candDeptId && (candidate.department_name || classObj?.department_name)) {
        const targetDeptName = (candidate.department_name || classObj?.department_name || "").toLowerCase().trim();
        const matchedDept = (departments || []).find(
          (d: any) => (d.name || d.department_name || "").toLowerCase().trim() === targetDeptName ||
                      (d.code || "").toLowerCase().trim() === targetDeptName
        );
        if (matchedDept) candDeptId = String(matchedDept.id);
      }

      const effectiveGroupName =
        secObj?.section_name || secObj?.name || candidate.section_name || candidate.student_section_name || candidate.sub || chosenSub || "";
      setGroupName(effectiveGroupName || "");

      // Auto-select resolved Department, Class, and Section
      const targetDept = candDeptId || (classObj ? getDepartmentId(classObj) : "") || selectedDepartmentId || "";
      const targetClass = candClassId || (secObj ? getClassId(secObj) : "") || selectedClassId || "";
      const targetSec = candSecId || "";

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

  return {
    departments,
    classes,
    sections,
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

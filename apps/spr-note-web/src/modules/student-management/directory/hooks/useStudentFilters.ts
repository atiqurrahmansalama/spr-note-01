import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { StudentRecord } from "../types";

/**
 * Enterprise Student Directory Filtering Hook
 * -------------------------------------------------------------
 * Manages 6 primary enterprise filter scopes with seamless URL synchronization
 * and robust cascading dependency logic:
 * 1. SEARCH (Name, Roll, Card No, Unique ID, Guardian Phone)
 * 2. DEPARTMENT (Filters available Classes)
 * 3. CLASS (Cascaded by Department; filters available Sections)
 * 4. SECTION (Cascaded by Class)
 * 5. STATUS (Active, Inactive, Alumni/TC)
 * 6. ACADEMIC YEAR (Enrolled session year)
 */
export function useStudentFilters(
  students: StudentRecord[],
  departments: any[] = [],
  classes: any[] = [],
  sections: any[] = [],
  academicYears: any[] = []
) {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Param initializers
  const urlSearch = searchParams.get("search") || "";
  const urlDept = searchParams.get("department") || "ALL";
  const urlClass = searchParams.get("student_class") || searchParams.get("class") || "ALL";
  const urlSection = searchParams.get("section") || "ALL";
  const urlStatus = searchParams.get("status") || "ALL";
  const urlYear = searchParams.get("academic_year") || searchParams.get("year") || "ALL";

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>(urlSearch);
  const [departmentFilter, setDepartmentFilter] = useState<string>(urlDept);
  const [classFilter, setClassFilter] = useState<string>(urlClass);
  const [sectionFilter, setSectionFilter] = useState<string>(urlSection);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>(urlYear);

  // Synchronize state when URL search params change externally (e.g. browser back/forward)
  useEffect(() => {
    const s = searchParams.get("search") || "";
    const d = searchParams.get("department") || "ALL";
    const c = searchParams.get("student_class") || searchParams.get("class") || "ALL";
    const sec = searchParams.get("section") || "ALL";
    const st = searchParams.get("status") || "ALL";
    const y = searchParams.get("academic_year") || searchParams.get("year") || "ALL";

    setSearchQuery(s);
    setDepartmentFilter(d);
    setClassFilter(c);
    setSectionFilter(sec);
    setStatusFilter(st);
    setAcademicYearFilter(y);
  }, [searchParams]);

  // Helper to update URL search params immutably
  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === "ALL") {
          nextParams.delete(key);
          if (key === "student_class") nextParams.delete("class");
          if (key === "academic_year") nextParams.delete("year");
        } else {
          nextParams.set(key, val);
        }
      });
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Cascading Classes available for the currently selected Department
  const availableClasses = useMemo(() => {
    if (!departmentFilter || departmentFilter === "ALL") {
      return classes;
    }
    const targetDeptId = String(departmentFilter).toLowerCase();
    return classes.filter((c) => {
      const cDeptId = String(
        c.department_id ||
        (typeof c.department === "object" ? c.department?.id : c.department) ||
        ""
      ).toLowerCase();
      const cDeptName = String(
        c.department_name ||
        (typeof c.department === "object" ? c.department?.name : "") ||
        ""
      ).toLowerCase();
      return cDeptId === targetDeptId || cDeptName === targetDeptId;
    });
  }, [classes, departmentFilter]);

  // Cascading Sections available for the currently selected Class / Department
  const availableSections = useMemo(() => {
    if (classFilter && classFilter !== "ALL") {
      const targetClassId = String(classFilter).toLowerCase();
      return sections.filter((s) => {
        const sClassId = String(
          s.student_class_id ||
          (typeof s.student_class === "object" ? s.student_class?.id : s.student_class) ||
          ""
        ).toLowerCase();
        return sClassId === targetClassId;
      });
    }

    if (departmentFilter && departmentFilter !== "ALL") {
      const allowedClassIds = new Set(availableClasses.map((c) => String(c.id).toLowerCase()));
      return sections.filter((s) => {
        const sClassId = String(
          s.student_class_id ||
          (typeof s.student_class === "object" ? s.student_class?.id : s.student_class) ||
          ""
        ).toLowerCase();
        return allowedClassIds.has(sClassId);
      });
    }

    return sections;
  }, [sections, classFilter, departmentFilter, availableClasses]);

  // Fast Department map
  const departmentsMap = useMemo(() => {
    const map = new Map<string, any>();
    departments.forEach((d) => {
      if (d?.id) map.set(String(d.id), d);
      if (d?.name) map.set(String(d.name).toLowerCase(), d);
    });
    return map;
  }, [departments]);

  // Fast Class map
  const classesMap = useMemo(() => {
    const map = new Map<string, any>();
    classes.forEach((c) => {
      if (c?.id) map.set(String(c.id), c);
      if (c?.name) map.set(String(c.name).toLowerCase(), c);
    });
    return map;
  }, [classes]);

  // Fast Section map
  const sectionsMap = useMemo(() => {
    const map = new Map<string, any>();
    sections.forEach((s) => {
      if (s?.id) map.set(String(s.id), s);
      const sName = s?.section_name || s?.name;
      if (sName) map.set(String(sName).toLowerCase(), s);
    });
    return map;
  }, [sections]);

  // 1. Department Change Handler with cascading class & section auto-reset
  const handleDepartmentFilterChange = useCallback(
    (deptId: string) => {
      const target = deptId || "ALL";
      setDepartmentFilter(target);

      const updates: Record<string, string | null> = { department: target };

      // If current classFilter does not belong to the selected department, reset class and section
      if (target !== "ALL" && classFilter !== "ALL") {
        const cObj = classesMap.get(String(classFilter)) || classesMap.get(String(classFilter).toLowerCase());
        const cDept = String(
          cObj?.department_id ||
          (typeof cObj?.department === "object" ? cObj?.department?.id : cObj?.department) ||
          ""
        );
        if (cDept && cDept !== target) {
          setClassFilter("ALL");
          setSectionFilter("ALL");
          updates.student_class = "ALL";
          updates.section = "ALL";
        }
      }

      updateUrlParams(updates);
    },
    [classFilter, classesMap, updateUrlParams]
  );

  // 2. Class Change Handler with cascading section auto-reset & department auto-sync
  const handleClassFilterChange = useCallback(
    (clsId: string) => {
      const target = clsId || "ALL";
      setClassFilter(target);

      const updates: Record<string, string | null> = { student_class: target };

      if (target !== "ALL") {
        const selectedCls = classesMap.get(String(target)) || classesMap.get(String(target).toLowerCase());
        // Auto-sync department if not yet selected
        const clsDeptId = String(
          selectedCls?.department_id ||
          (typeof selectedCls?.department === "object" ? selectedCls?.department?.id : selectedCls?.department) ||
          ""
        );
        if (clsDeptId && departmentFilter === "ALL") {
          setDepartmentFilter(clsDeptId);
          updates.department = clsDeptId;
        }

        // Reset section if current section does not belong to the selected class
        if (sectionFilter !== "ALL") {
          const secObj = sectionsMap.get(String(sectionFilter)) || sectionsMap.get(String(sectionFilter).toLowerCase());
          const secClassId = String(
            secObj?.student_class_id ||
            (typeof secObj?.student_class === "object" ? secObj?.student_class?.id : secObj?.student_class) ||
            ""
          );
          if (secClassId && secClassId !== target) {
            setSectionFilter("ALL");
            updates.section = "ALL";
          }
        }
      }

      updateUrlParams(updates);
    },
    [classesMap, departmentFilter, sectionFilter, sectionsMap, updateUrlParams]
  );

  // 3. Section Change Handler with class auto-sync
  const handleSectionFilterChange = useCallback(
    (secId: string) => {
      const target = secId || "ALL";
      setSectionFilter(target);

      const updates: Record<string, string | null> = { section: target };

      if (target !== "ALL" && classFilter === "ALL") {
        const secObj = sectionsMap.get(String(target)) || sectionsMap.get(String(target).toLowerCase());
        const secClassId = String(
          secObj?.student_class_id ||
          (typeof secObj?.student_class === "object" ? secObj?.student_class?.id : secObj?.student_class) ||
          ""
        );
        if (secClassId) {
          setClassFilter(secClassId);
          updates.student_class = secClassId;
        }
      }

      updateUrlParams(updates);
    },
    [classFilter, sectionsMap, updateUrlParams]
  );

  // 4. Status Change Handler
  const handleStatusFilterChange = useCallback(
    (status: string) => {
      const target = status || "ALL";
      setStatusFilter(target);
      updateUrlParams({ status: target });
    },
    [updateUrlParams]
  );

  // 5. Academic Year Change Handler
  const handleAcademicYearFilterChange = useCallback(
    (year: string) => {
      const target = year || "ALL";
      setAcademicYearFilter(target);
      updateUrlParams({ academic_year: target });
    },
    [updateUrlParams]
  );

  // 6. Search Query Handler
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      updateUrlParams({ search: query.trim() ? query.trim() : null });
    },
    [updateUrlParams]
  );

  // Reset all 6 filters to defaults
  const resetAllFilters = useCallback(() => {
    setSearchQuery("");
    setDepartmentFilter("ALL");
    setClassFilter("ALL");
    setSectionFilter("ALL");
    setStatusFilter("ALL");
    setAcademicYearFilter("ALL");

    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    newParams.delete("department");
    newParams.delete("student_class");
    newParams.delete("class");
    newParams.delete("section");
    newParams.delete("status");
    newParams.delete("academic_year");
    newParams.delete("year");
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Primary filtering computation
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return students.filter((s) => {
      // 1. Search Query filter
      if (q) {
        const name = (s.name_en || s.name || "").toLowerCase();
        const bName = (s.bangla_name || "").toLowerCase();
        const roll = String(s.roll_number || s.roll || "").toLowerCase();
        const cardNo = (s.student_id_card_number || "").toLowerCase();
        const uniqId = (s.uniq_id || s.unique_id || "").toLowerCase();
        const stuId = String(s.id || "").toLowerCase();
        const gPhone = (s.details?.guardian_phone || s.guardian_phone || "").toLowerCase();
        const fName = (s.details?.father_name || s.father_name || "").toLowerCase();
        const gName = (s.details?.guardian_name || s.guardian_name || "").toLowerCase();

        const matchesSearch =
          name.includes(q) ||
          bName.includes(q) ||
          roll === q ||
          roll.includes(q) ||
          cardNo.includes(q) ||
          uniqId.includes(q) ||
          stuId === q ||
          gPhone.includes(q) ||
          fName.includes(q) ||
          gName.includes(q);

        if (!matchesSearch) return false;
      }

      // 2. Department filter
      if (departmentFilter !== "ALL") {
        const targetDept = String(departmentFilter).toLowerCase();
        const sDeptId = String(s.department_id || s.department || "").toLowerCase();
        const sDeptName = (s.department_name || "").toLowerCase();

        // Check student directly or via class lookup
        let matchesDept = sDeptId === targetDept || sDeptName === targetDept;
        if (!matchesDept) {
          const sClassId = String(s.student_class_id || (typeof s.student_class === "object" ? s.student_class?.id : s.student_class) || "");
          const classObj = classesMap.get(sClassId) || classesMap.get(sClassId.toLowerCase());
          const cDeptId = String(
            classObj?.department_id ||
            (typeof classObj?.department === "object" ? classObj?.department?.id : classObj?.department) ||
            ""
          ).toLowerCase();
          const cDeptName = String(
            classObj?.department_name ||
            (typeof classObj?.department === "object" ? classObj?.department?.name : "") ||
            ""
          ).toLowerCase();
          matchesDept = cDeptId === targetDept || cDeptName === targetDept;
        }

        if (!matchesDept) return false;
      }

      // 3. Class filter
      if (classFilter !== "ALL") {
        const targetClass = String(classFilter).toLowerCase();
        const sClassId = String(s.student_class_id || (typeof s.student_class === "object" ? s.student_class?.id : s.student_class) || "").toLowerCase();
        const sClassName = (s.student_class_name || s.class_name || "").toLowerCase();
        const matchesClass = sClassId === targetClass || sClassName === targetClass;
        if (!matchesClass) return false;
      }

      // 4. Section filter
      if (sectionFilter !== "ALL") {
        const targetSection = String(sectionFilter).toLowerCase();
        const sSecId = String(s.section_id || s.student_section || (typeof s.section === "object" ? s.section?.id : s.section) || "").toLowerCase();
        const sSecName = (s.section_name || s.student_section_name || "").toLowerCase();
        const matchesSec = sSecId === targetSection || sSecName === targetSection;
        if (!matchesSec) return false;
      }

      // 5. Enrollment Status filter
      if (statusFilter !== "ALL") {
        const sStatus = (s.status || "Active").toUpperCase();
        if (statusFilter === "ACTIVE" && sStatus !== "ACTIVE") return false;
        if (statusFilter === "INACTIVE" && sStatus !== "INACTIVE") return false;
        if (statusFilter === "ALUMNI" && sStatus !== "ALUMNI" && sStatus !== "TC") return false;
      }

      // 6. Academic Year filter
      if (academicYearFilter !== "ALL") {
        const targetYear = String(academicYearFilter).toLowerCase();
        const sYear = String(s.academic_year || s.session_year || "").toLowerCase();
        const admDateYear = s.admission_date ? String(s.admission_date).split("-")[0] : "";
        const createdYear = s.created_at ? String(s.created_at).split("-")[0] : "";

        const matchesYear =
          sYear === targetYear ||
          (admDateYear && admDateYear === targetYear) ||
          (createdYear && createdYear === targetYear) ||
          sYear.includes(targetYear) ||
          targetYear.includes(sYear);

        if (!matchesYear) return false;
      }

      return true;
    });
  }, [students, searchQuery, departmentFilter, classFilter, sectionFilter, statusFilter, academicYearFilter, classesMap]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    departmentFilter !== "ALL" ||
    classFilter !== "ALL" ||
    sectionFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    academicYearFilter !== "ALL"
  );

  const activeFilterCount = [
    Boolean(searchQuery.trim()),
    departmentFilter !== "ALL",
    classFilter !== "ALL",
    sectionFilter !== "ALL",
    statusFilter !== "ALL",
    academicYearFilter !== "ALL",
  ].filter(Boolean).length;

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    departmentFilter,
    classFilter,
    sectionFilter,
    statusFilter,
    academicYearFilter,
    handleDepartmentFilterChange,
    handleClassFilterChange,
    handleSectionFilterChange,
    handleStatusFilterChange,
    handleAcademicYearFilterChange,
    resetAllFilters,
    filteredStudents,
    availableClasses,
    availableSections,
    hasActiveFilters,
    activeFilterCount,
  };
}

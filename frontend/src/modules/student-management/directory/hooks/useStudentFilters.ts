import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { StudentRecord } from "../types";

export function useStudentFilters(students: StudentRecord[], classes: any[], groups: any[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlGroup = searchParams.get("student_group") || searchParams.get("group") || "ALL";
  const urlClass = searchParams.get("student_class") || searchParams.get("class") || "ALL";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>(urlGroup);
  const [classFilter, setClassFilter] = useState<string>(urlClass);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Sync state when URL searchParams change
  useEffect(() => {
    const g = searchParams.get("student_group") || searchParams.get("group") || "ALL";
    const c = searchParams.get("student_class") || searchParams.get("class") || "ALL";
    setGroupFilter(g);
    setClassFilter(c);
  }, [searchParams]);

  const handleGroupFilterChange = useCallback((val: string) => {
    setGroupFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val && val !== "ALL") {
      newParams.set("student_group", val);
    } else {
      newParams.delete("student_group");
      newParams.delete("group");
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleClassFilterChange = useCallback((val: string) => {
    setClassFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val && val !== "ALL") {
      newParams.set("student_class", val);
    } else {
      newParams.delete("student_class");
      newParams.delete("class");
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery("");
    handleClassFilterChange("ALL");
    handleGroupFilterChange("ALL");
    setStatusFilter("ALL");
  }, [handleClassFilterChange, handleGroupFilterChange]);

  const resetOnTenantChange = useCallback(() => {
    setGroupFilter("ALL");
    setClassFilter("ALL");
    setSearchQuery("");
    setStatusFilter("ALL");
  }, []);

  const activeGroupObj = useMemo(() => {
    return groups.find(
      (g) =>
        String(g.id) === String(groupFilter) ||
        g.name?.toLowerCase() === String(groupFilter).toLowerCase()
    );
  }, [groups, groupFilter]);

  const activeClassObj = useMemo(() => {
    return classes.find(
      (c) =>
        String(c.id) === String(classFilter) ||
        c.name?.toLowerCase() === String(classFilter).toLowerCase()
    );
  }, [classes, classFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = (s.name_en || s.name || "").toLowerCase();
      const bName = (s.bangla_name || "").toLowerCase();
      const roll = String(s.roll_number || s.roll || "");
      const gPhone = (s.details?.guardian_phone || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        bName.includes(query) ||
        roll.includes(query) ||
        gPhone.includes(query);

      let matchesGroup = true;
      if (groupFilter !== "ALL") {
        const targetGroupStr = String(groupFilter).toLowerCase();
        const sGroupId = s.student_group ? String(s.student_group).toLowerCase() : "";
        const sGroupName = (s.student_group_name || s.group_name || s.group || "").toLowerCase();
        matchesGroup =
          sGroupId === targetGroupStr ||
          sGroupName === targetGroupStr ||
          (activeGroupObj && sGroupName === activeGroupObj.name.toLowerCase());
      }

      let matchesClass = true;
      if (classFilter !== "ALL") {
        const targetClassStr = String(classFilter).toLowerCase();
        const sClassId = s.student_class ? String(s.student_class).toLowerCase() : "";
        const sClassName = (s.student_class_name || "").toLowerCase();
        matchesClass =
          sClassId === targetClassStr ||
          sClassName === targetClassStr ||
          (activeClassObj && sClassName === activeClassObj.name.toLowerCase());
      }

      const studentStatus = s.status || "Active";
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && studentStatus.toUpperCase() === "ACTIVE") ||
        (statusFilter === "INACTIVE" && studentStatus.toUpperCase() === "INACTIVE") ||
        (statusFilter === "ALUMNI" &&
          (studentStatus.toUpperCase() === "ALUMNI" || studentStatus.toUpperCase() === "TC"));

      return matchesSearch && matchesGroup && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, groupFilter, classFilter, statusFilter, activeGroupObj, activeClassObj]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    classFilter !== "ALL" ||
    groupFilter !== "ALL" ||
    statusFilter !== "ALL"
  );

  const activeFilterCount = [
    Boolean(searchQuery.trim()),
    classFilter !== "ALL",
    groupFilter !== "ALL",
    statusFilter !== "ALL",
  ].filter(Boolean).length;

  return {
    searchQuery,
    setSearchQuery,
    groupFilter,
    classFilter,
    statusFilter,
    setStatusFilter,
    handleGroupFilterChange,
    handleClassFilterChange,
    resetAllFilters,
    resetOnTenantChange,
    filteredStudents,
    hasActiveFilters,
    activeFilterCount,
  };
}

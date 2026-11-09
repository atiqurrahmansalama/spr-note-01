import { useState, useMemo, useCallback, useEffect } from "react";
import { ReportItem, StudentGroupedItem } from "../types";
import { isReportUnsynced } from "@/utils/syncEngine";
import { calendarSettings } from "@/utils/localStore";
import { getTodayInTimezone, getClassroomEffectiveTimezone } from "@/constants/calendarConstants";

export interface UseProgressReportsFiltersOptions {
  reportsList: ReportItem[];
  filterProps?: any;
  academicData?: any;
  canViewAllTeachers?: boolean;
  currentUser?: any;
  showToast?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export function useProgressReportsFilters({
  reportsList,
  filterProps = null,
  academicData = {},
  canViewAllTeachers = true,
  currentUser = null,
  showToast,
}: UseProgressReportsFiltersOptions) {
  // Local academic fallback state when filterProps is not supplied
  const [internalDeptId, setInternalDeptId] = useState("");
  const [internalClassId, setInternalClassId] = useState("");
  const [internalSectionId, setInternalSectionId] = useState("");

  const effectiveFilterProps = useMemo(() => {
    if (filterProps) return filterProps;
    return {
      hasDepartments: (academicData.departments || []).length > 0,
      selectedDepartmentId: internalDeptId,
      onDepartmentChange: (val: any) => {
        const v = typeof val === "object" ? val?.value || val?.id || "" : val;
        setInternalDeptId(v || "");
      },
      departmentSelectOptions: [
        { value: "", label: "All Departments" },
        ...(academicData.departments || []).map((d: any) => ({ value: String(d.id), label: d.name })),
      ],
      selectedClassId: internalClassId,
      onClassChange: (val: any) => {
        const v = typeof val === "object" ? val?.value || val?.id || "" : val;
        setInternalClassId(v || "");
      },
      classSelectOptions: [
        { value: "", label: "All Classes" },
        ...(academicData.classes || []).map((c: any) => ({ value: String(c.id), label: c.name })),
      ],
      hasSectionsForClass: true,
      selectedSectionId: internalSectionId,
      onSectionChange: (val: any) => {
        const v = typeof val === "object" ? val?.value || val?.id || "" : val;
        setInternalSectionId(v || "");
      },
      sectionSelectOptions: [
        { value: "", label: "All Sections" },
        ...(academicData.sections || []).map((s: any) => ({
          value: String(s.id),
          label: s.section_name || s.name || `Section ${s.id}`,
        })),
      ],
    };
  }, [filterProps, academicData, internalDeptId, internalClassId, internalSectionId]);

  // Local filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("ALL");
  const currentTeacherId = currentUser?.id ? String(currentUser.id) : "";
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState(() => {
    if (!canViewAllTeachers && currentTeacherId) {
      return currentTeacherId;
    }
    return "ALL";
  });

  // Keep teacher locked if canViewAllTeachers is disabled
  useEffect(() => {
    if (!canViewAllTeachers && currentTeacherId && selectedTeacherFilter !== currentTeacherId) {
      setSelectedTeacherFilter(currentTeacherId);
    }
  }, [canViewAllTeachers, currentTeacherId, selectedTeacherFilter]);

  // Date Range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [filterUnsyncedOnly, setFilterUnsyncedOnly] = useState<boolean>(false);

  // Table rows expand/collapse all state
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  const handleToggleExpandAll = useCallback(() => setIsAllExpanded((prev) => !prev), []);

  // Date Boundaries Calculation (Timezone-Aware standard)
  const { minEarliestDate, todayMaxDate } = useMemo(() => {
    const today = getTodayInTimezone(getClassroomEffectiveTimezone());
    if (reportsList.length === 0) {
      return { minEarliestDate: today, todayMaxDate: today };
    }
    const validDates = reportsList
      .map((r) => r.isoDateOnly)
      .filter((d): d is string => Boolean(d))
      .sort();

    const earliest = validDates.length > 0 ? validDates[0] : today;
    const latest = validDates.length > 0 && validDates[validDates.length - 1] > today ? validDates[validDates.length - 1] : today;
    return { minEarliestDate: earliest, todayMaxDate: latest };
  }, [reportsList]);

  // Extract unique groups & sessions for dropdown filters
  const groupOptions = useMemo(() => {
    const list = Array.from(new Set(reportsList.map((r) => r.student_group).filter((g): g is string => Boolean(g)))).sort();
    return [{ label: "All Groups", value: "ALL" }, ...list.map((g) => ({ label: g, value: g }))];
  }, [reportsList]);

  const sessionOptions = useMemo(() => {
    const list = Array.from(new Set(reportsList.map((r) => r.session_name).filter((s): s is string => Boolean(s)))).sort();
    return [{ label: "All Sessions", value: "ALL" }, ...list.map((s) => ({ label: s, value: s }))];
  }, [reportsList]);

  // Extract filter properties from academic filterProps
  const selectedDeptFilter = effectiveFilterProps?.selectedDepartmentId || "";
  const selectedClsFilter = effectiveFilterProps?.selectedClassId || "";
  const selectedSecFilter = effectiveFilterProps?.selectedSectionId || "";

  // Filtered reports calculation
  const filteredReports = useMemo(() => {
    return reportsList.filter((rep) => {
      const q = searchQuery.toLowerCase().trim();
      const studentName = (rep.student_name || "").toLowerCase();
      const groupName = (rep.student_group || "").toLowerCase();
      const sessionName = (rep.session_name || "").toLowerCase();
      const commentStr = (rep.comment || "").toLowerCase();
      const rollStr = String(rep.rollNumber || "").toLowerCase();
      const uniqStr = String(rep.uniqId || "").toLowerCase();

      const passesSearch =
        !q ||
        studentName.includes(q) ||
        groupName.includes(q) ||
        sessionName.includes(q) ||
        commentStr.includes(q) ||
        rollStr.includes(q) ||
        uniqStr.includes(q);

      const passesGroup = selectedGroupFilter === "ALL" || groupName === selectedGroupFilter.toLowerCase();
      const passesSession = selectedSessionFilter === "ALL" || sessionName === selectedSessionFilter.toLowerCase();

      let passesStudent = true;
      if (selectedStudentId) {
        const repStudentId = String(rep.studentId || rep.student_id || rep.student?.id || "");
        passesStudent =
          repStudentId === String(selectedStudentId) ||
          studentName === searchQuery.toLowerCase().trim();
      }

      let passesDateRange = true;
      if (startDate && rep.isoDateOnly) {
        passesDateRange = passesDateRange && rep.isoDateOnly >= startDate;
      }
      if (endDate && rep.isoDateOnly) {
        passesDateRange = passesDateRange && rep.isoDateOnly <= endDate;
      }

      // Academic Department / Class / Section Filters
      if (selectedDeptFilter && rep.departmentId && String(rep.departmentId) !== String(selectedDeptFilter)) {
        return false;
      }
      if (selectedClsFilter && rep.classId && String(rep.classId) !== String(selectedClsFilter)) {
        return false;
      }
      if (selectedSecFilter && rep.sectionId && String(rep.sectionId) !== String(selectedSecFilter)) {
        return false;
      }

      // Teacher Filter & Multi-Teacher Access Control
      let targetTeacherFilter = selectedTeacherFilter;
      if (!canViewAllTeachers && currentUser) {
        targetTeacherFilter = String(currentUser.id || currentUser.user_id || "");
      }

      if (targetTeacherFilter && targetTeacherFilter !== "ALL") {
        const target = String(targetTeacherFilter).trim();
        const targetLower = target.toLowerCase();

        // 1. Resolve matching staff / teacher object(s) from academicData
        const staffList = (academicData?.staff || academicData?.teachers || []) as any[];
        const matchedStaffMembers = staffList.filter((s: any) => {
          if (!s) return false;
          if (String(s.user) === target || String(s.user_id) === target) return true;
          if (String(s.id) === target) return true;
          if (s.employee_id && String(s.employee_id) === target) return true;
          const sName = (s.name || s.name_en || s.user_name || s.full_name || "").toLowerCase().trim();
          return sName && (sName === targetLower || sName.includes(targetLower) || targetLower.includes(sName));
        });

        // Build comprehensive valid target IDs set
        const validTargetIds = new Set<string>();
        validTargetIds.add(target);
        matchedStaffMembers.forEach((s) => {
          if (s.id !== undefined && s.id !== null) validTargetIds.add(String(s.id));
          if (s.user !== undefined && s.user !== null) validTargetIds.add(String(s.user));
          if (s.user_id !== undefined && s.user_id !== null) validTargetIds.add(String(s.user_id));
          if (s.employee_id) validTargetIds.add(String(s.employee_id));
        });

        // Also if currentUser is the target
        if (currentUser && (String(currentUser.id) === target || String(currentUser.user_id) === target)) {
          validTargetIds.add(String(currentUser.id));
          if (currentUser.staff_id) validTargetIds.add(String(currentUser.staff_id));
          if (currentUser.user_id) validTargetIds.add(String(currentUser.user_id));
        }

        // Build comprehensive valid target lowercase names set
        const validTargetNames = new Set<string>();
        if (isNaN(Number(target)) && target.length >= 2) {
          validTargetNames.add(targetLower);
        }
        matchedStaffMembers.forEach((s) => {
          const names = [s.name, s.name_en, s.user_name, s.full_name, s.bangla_name];
          names.forEach((n) => {
            if (n && typeof n === "string" && n.trim().length >= 2) {
              validTargetNames.add(n.trim().toLowerCase());
            }
          });
        });
        if (currentUser && (String(currentUser.id) === target || String(currentUser.user_id) === target)) {
          const uNames = [currentUser.name, currentUser.full_name, currentUser.user_name];
          uNames.forEach((n) => {
            if (n && typeof n === "string" && n.trim().length >= 2) {
              validTargetNames.add(n.trim().toLowerCase());
            }
          });
        }

        // 2. Extract all identifiers and names from report
        const repIds = [
          rep.teacher_id,
          rep.teacher_user_id,
          rep.teacher_staff_id,
          rep.created_by_id,
          typeof rep.teacher === "number" ? String(rep.teacher) : (typeof rep.teacher === "string" && /^\d+$/.test(rep.teacher.trim()) ? rep.teacher.trim() : null),
          typeof rep.teacher === "object" ? String(rep.teacher?.id || rep.teacher?.user || "") : null,
          typeof rep.created_by === "object" ? String(rep.created_by?.id || "") : (rep.created_by ? String(rep.created_by) : null),
        ].filter(Boolean).map(String);

        const repNames = [
          rep.teacher_name,
          typeof rep.teacher === "string" && isNaN(Number(rep.teacher)) ? rep.teacher : null,
          typeof rep.teacher === "object" ? (rep.teacher?.name || rep.teacher?.name_en || rep.teacher?.user_name || rep.teacher?.full_name) : null,
          typeof rep.created_by === "object" ? (rep.created_by?.name || rep.created_by?.full_name || rep.created_by?.username) : null,
        ].filter(Boolean).map((n) => String(n).trim().toLowerCase());

        // 3. Check ID match
        const hasIdMatch = repIds.some((id) => validTargetIds.has(id));

        // 4. Check Name match
        const hasNameMatch = repNames.some((rName) => {
          if (!rName || rName === "—" || rName === "staff teacher") return false;
          return Array.from(validTargetNames).some((tName) => {
            if (!tName || tName === "—" || tName === "staff teacher") return false;
            return rName === tName || (rName.length >= 3 && tName.length >= 3 && (rName.includes(tName) || tName.includes(rName)));
          });
        });

        if (!hasIdMatch && !hasNameMatch) {
          return false;
        }
      }

      const passesUnsynced = !filterUnsyncedOnly || isReportUnsynced(rep);
      return passesSearch && passesStudent && passesGroup && passesSession && passesDateRange && passesUnsynced;
    });
  }, [
    reportsList,
    searchQuery,
    selectedStudentId,
    selectedGroupFilter,
    selectedSessionFilter,
    selectedTeacherFilter,
    startDate,
    endDate,
    selectedDeptFilter,
    selectedClsFilter,
    selectedSecFilter,
    canViewAllTeachers,
    currentUser,
    filterUnsyncedOnly,
    academicData,
  ]);

  // Grouped by Student calculation for STUDENT_VIEW
  const studentGroupedData: StudentGroupedItem[] = useMemo(() => {
    const map = new Map<string, StudentGroupedItem>();
    filteredReports.forEach((rep) => {
      const name = rep.student_name || "Unnamed Student";
      if (!map.has(name)) {
        map.set(name, {
          student_name: name,
          student_group: rep.student_group,
          reports: [],
        });
      }
      map.get(name)!.reports.push(rep);
    });

    map.forEach((value) => {
      value.reports.sort((a, b) => (b.isoDateOnly || "").localeCompare(a.isoDateOnly || ""));
    });

    return Array.from(map.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [filteredReports]);

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size >= filteredReports.length && filteredReports.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(filteredReports.map((r) => r.id ?? r.report_unique_id ?? "").filter(Boolean))
      );
    }
  }, [selectedIds.size, filteredReports]);

  const toggleSelectReport = useCallback((id: number | string, explicitChecked?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const strId = String(id);
      const numId = !isNaN(Number(id)) ? Number(id) : null;

      const rep = reportsList.find(
        (r) =>
          r.id === id ||
          String(r.id) === strId ||
          (numId !== null && r.id === numId) ||
          r.report_unique_id === id ||
          String(r.report_unique_id) === strId
      );

      const canonicalKey = String(rep ? (rep.id ?? rep.report_unique_id ?? id) : id);

      const isPresent =
        next.has(canonicalKey) ||
        next.has(id) ||
        next.has(strId) ||
        (numId !== null && next.has(numId)) ||
        (rep?.id !== undefined && (next.has(rep.id) || next.has(String(rep.id)))) ||
        (rep?.report_unique_id && (next.has(rep.report_unique_id) || next.has(String(rep.report_unique_id))));

      const shouldUnselect = explicitChecked !== undefined ? !explicitChecked : isPresent;

      // Clean up all alternative representations first
      next.delete(canonicalKey);
      next.delete(id);
      next.delete(strId);
      if (numId !== null) next.delete(numId);
      if (rep) {
        if (rep.id !== undefined && rep.id !== null) {
          next.delete(rep.id);
          next.delete(String(rep.id));
          if (!isNaN(Number(rep.id))) next.delete(Number(rep.id));
        }
        if (rep.report_unique_id) {
          next.delete(rep.report_unique_id);
          next.delete(String(rep.report_unique_id));
        }
      }

      if (!shouldUnselect) {
        next.add(canonicalKey);
      }

      return next;
    });
  }, [reportsList]);

  const handleBatchSelect = useCallback((idsSet: Set<number | string>) => {
    setSelectedIds(idsSet);
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleResetAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedStudentId(null);
    setSelectedGroupFilter("ALL");
    setSelectedSessionFilter("ALL");
    setSelectedTeacherFilter(!canViewAllTeachers && currentTeacherId ? currentTeacherId : "ALL");
    setStartDate("");
    setEndDate("");
    setInternalDeptId("");
    setInternalClassId("");
    setInternalSectionId("");
    setFilterUnsyncedOnly(false);
    if (filterProps?.onClassChange) filterProps.onClassChange("");
    if (filterProps?.onSectionChange) filterProps.onSectionChange("");
    if (filterProps?.onDepartmentChange) filterProps.onDepartmentChange("");
    if (showToast) {
      showToast("All filters reset successfully", "info");
    }
  }, [filterProps, showToast, canViewAllTeachers, currentTeacherId]);

  return {
    effectiveFilterProps,
    searchQuery,
    setSearchQuery,
    selectedStudentId,
    setSelectedStudentId,
    selectedGroupFilter,
    setSelectedGroupFilter,
    selectedSessionFilter,
    setSelectedSessionFilter,
    selectedTeacherFilter,
    setSelectedTeacherFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedIds,
    setSelectedIds,
    isAllExpanded,
    handleToggleExpandAll,
    minEarliestDate,
    todayMaxDate,
    groupOptions,
    sessionOptions,
    selectedDeptFilter,
    selectedClsFilter,
    selectedSecFilter,
    filterUnsyncedOnly,
    setFilterUnsyncedOnly,
    filteredReports,
    studentGroupedData,
    toggleSelectAll,
    toggleSelectReport,
    handleBatchSelect,
    handleDeselectAll,
    handleResetAllFilters,
  };
}

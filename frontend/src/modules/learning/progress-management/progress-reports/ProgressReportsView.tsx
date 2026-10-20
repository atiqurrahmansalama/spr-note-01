import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { fetchWithAuth } from "@/utils/authService";
import { isOnline } from "@/utils/localStore";
import { formatDate } from "@/utils/reportGenerator";
import {
  CloudIcon,
  UsersIcon,
  CheckIcon,
  SearchIcon,
  PrinterIcon,
  CloseIcon,
  RefreshIcon,
  ChecklistIcon,
} from "@/components/ui/Icons";
import CustomSelect from "@/components/ui/CustomSelect";
import IconButton from "@/components/ui/IconButton";
import { DateRangePicker } from "@/components/selectors";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import DailyClassroomFilterControls from "../../components/DailyClassroomFilterControls";
import { useAcademicData } from "@/hooks/useAcademicData";
import {
  RecordReportsTable,
  StudentGroupedTable,
  ReportContextMenu,
} from "./components";
import {
  ProgressReportsViewProps,
  ReportItem,
  StudentGroupedItem,
  ContextMenuState,
} from "./types";

export default function ProgressReportsView({
  hideHeader = false,
  isEmbedded = false,
  className = "",
  filterProps = null,
}: ProgressReportsViewProps) {
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // Primary data state
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [offline, setOffline] = useState(!isOnline());
  const [loading, setLoading] = useState(false);

  // View modes: "RECORD_REPORTS" | "STUDENT_VIEW"
  const [viewMode, setViewMode] = useState<"RECORD_REPORTS" | "STUDENT_VIEW">("RECORD_REPORTS");

  // Local academic fallback state when filterProps is not supplied
  const academicData: any = useAcademicData() || {};
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
      hasSectionsForClass: (academicData.sections || []).length > 0,
      selectedSectionId: internalSectionId,
      onSectionChange: (val: any) => {
        const v = typeof val === "object" ? val?.value || val?.id || "" : val;
        setInternalSectionId(v || "");
      },
      sectionSelectOptions: [
        { value: "", label: "All Sections" },
        ...(academicData.sections || []).map((s: any) => ({ value: String(s.id), label: s.name })),
      ],
    };
  }, [filterProps, academicData, internalDeptId, internalClassId, internalSectionId]);

  // Local filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("ALL");

  // Date Range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Helper: Normalize a single report object into strict typed contract
  const normalizeReport = useCallback((rep: any): ReportItem => {
    // 1. Report Date (Recitation Date)
    const rawReportDate = rep.report_date || rep.date || rep.selectedDate || "";
    let formattedReportDate = "—";
    let isoDateOnly = "";

    if (rawReportDate) {
      if (typeof rawReportDate === "string") {
        const cleanStr = rawReportDate.replace(" ", "T");
        isoDateOnly = cleanStr.split("T")[0];
      }
      try {
        const dateToParse = typeof rawReportDate === "string" && rawReportDate.includes(" ")
          ? rawReportDate.replace(" ", "T")
          : rawReportDate;
        const d = new Date(dateToParse);
        if (!isNaN(d.getTime())) {
          formattedReportDate = formatDate(d);
          if (!isoDateOnly) {
            isoDateOnly = d.toISOString().split("T")[0];
          }
        } else {
          formattedReportDate = formatDate(rawReportDate);
        }
      } catch {
        formattedReportDate = String(rawReportDate);
      }
    }

    // 2. Generated Date / Created At
    const rawGenerateDate =
      rep.generate_date ||
      rep.created_at ||
      rep.client_created_at ||
      rep.client_updated_at ||
      rep.date_time ||
      rawReportDate;
    let formattedGenerateDate = "—";
    let formattedGenerateTime =
      (typeof rep.formattedTime === "string" && rep.formattedTime.trim() ? rep.formattedTime.trim() : "") ||
      (typeof rep.time === "string" && rep.time.trim() ? rep.time.trim() : "");

    if (rawGenerateDate) {
      try {
        let gd = new Date(rawGenerateDate);
        if (isNaN(gd.getTime()) && typeof rawGenerateDate === "string") {
          gd = new Date(rawGenerateDate.replace(" ", "T"));
        }
        if (!isNaN(gd.getTime())) {
          formattedGenerateDate = formatDate(gd);
          if (!formattedGenerateTime) {
            formattedGenerateTime = gd.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }
        } else {
          formattedGenerateDate = String(rawGenerateDate).split(" ")[0];
        }
      } catch {
        formattedGenerateDate = String(rawGenerateDate);
      }
    }

    // Robust time extraction fallback from string if time is still empty
    if (!formattedGenerateTime) {
      const sourceStr = String(rawGenerateDate || rawReportDate || rep.date || "");
      const timeMatch = sourceStr.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
      if (timeMatch) {
        formattedGenerateTime = timeMatch[1];
      }
    }

    // 3. Calculated Pages from portions or juz_and_pages
    let calculatedPages = 0;
    if (Array.isArray(rep.juz_and_pages) && rep.juz_and_pages.length > 0) {
      rep.juz_and_pages.forEach((jp: any) => {
        if (Array.isArray(jp.ranges)) {
          jp.ranges.forEach((r: any) => {
            const start = parseInt(r.start || r.page_start || 0, 10);
            const end = parseInt(r.end || r.page_end || 0, 10);
            if (end >= start && start > 0) {
              calculatedPages += end - start + 1;
            } else if (start > 0) {
              calculatedPages += 1;
            }
          });
        }
      });
    } else if (Array.isArray(rep.portions) && rep.portions.length > 0) {
      rep.portions.forEach((p: any) => {
        const start = parseInt(p.start_page || 0, 10);
        const end = parseInt(p.end_page || p.start_page || 0, 10);
        if (end >= start && start > 0) {
          calculatedPages += end - start + 1;
        } else if (start > 0) {
          calculatedPages += 1;
        }
      });
    }

    const totalPagesValue =
      rep.total_page !== undefined && rep.total_page !== null && Number(rep.total_page) > 0
        ? Number(rep.total_page)
        : (calculatedPages || rep.total_pages || rep.pages || 0);

    const hasEditedFlag = Boolean(
      rep.is_edited ||
      rep.edited_at ||
      (rep.updated_at && rep.created_at && Math.abs(new Date(rep.updated_at).getTime() - new Date(rep.created_at).getTime()) > 5000)
    );
    const editedAtTime = rep.edited_at || (hasEditedFlag ? rep.updated_at : null) || rep.client_updated_at || null;

    // Mistakes count (strictly 0 if no real mistakes)
    let mistakesCount = 0;
    if (rep.total_mistake !== undefined && rep.total_mistake !== null) {
      mistakesCount = Number(rep.total_mistake) || 0;
    } else if (Array.isArray(rep.mistake_details) && rep.mistake_details.length > 0) {
      mistakesCount = rep.mistake_details.filter((m: any) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())).length;
    } else if (Array.isArray(rep.error_details)) {
      mistakesCount = rep.error_details.filter((e: any) => e.type === "Mistake").length;
    } else if (Array.isArray(rep.mistakes)) {
      let count = 0;
      rep.mistakes.forEach((m: any) => {
        if (m.ayahs && Array.isArray(m.ayahs)) {
          m.ayahs.forEach((a: any) => {
            const val = typeof a === "object" ? (a.value || a.ayah) : a;
            if (val && String(val).trim()) count += 1;
          });
        } else if (m.page && String(m.page).trim()) {
          count += 1;
        }
      });
      mistakesCount = count;
    }

    // Stucks count (strictly 0 if no real stucks)
    let stucksCount = 0;
    if (rep.total_stuck !== undefined && rep.total_stuck !== null) {
      stucksCount = Number(rep.total_stuck) || 0;
    } else if (Array.isArray(rep.stuck_details) && rep.stuck_details.length > 0) {
      stucksCount = rep.stuck_details.filter((s: any) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())).length;
    } else if (Array.isArray(rep.error_details)) {
      stucksCount = rep.error_details.filter((e: any) => e.type === "Stuck").length;
    } else if (Array.isArray(rep.stucks)) {
      let count = 0;
      rep.stucks.forEach((s: any) => {
        if (s.ayahs && Array.isArray(s.ayahs)) {
          s.ayahs.forEach((a: any) => {
            const val = typeof a === "object" ? (a.value || a.ayah) : a;
            if (val && String(val).trim()) count += 1;
          });
        } else if (s.page && String(s.page).trim()) {
          count += 1;
        }
      });
      stucksCount = count;
    }

    // 4. Academic Metadata & Hierarchy extraction
    const rawStudentId =
      typeof rep.student === "object"
        ? rep.student?.id || rep.student?.uniq_id
        : rep.student || rep.student_id || rep.studentId;
    const rawStudentName = (
      rep.student_name ||
      rep.studentName ||
      rep.student_details?.name_en ||
      rep.student_details?.name ||
      (typeof rep.student === "object" ? rep.student?.name || rep.student?.name_en : null) ||
      (typeof rep.student === "string" && isNaN(Number(rep.student)) ? rep.student : null) ||
      ""
    ).trim();

    // Match student from academicData.students
    const matchedStudent = (academicData.students || []).find((s: any) => {
      if (rawStudentId && !isNaN(Number(rawStudentId)) && Number(s.id) === Number(rawStudentId)) {
        return true;
      }
      if (
        rawStudentId &&
        (String(s.id) === String(rawStudentId) ||
          String(s.uniq_id) === String(rawStudentId) ||
          String(s.unique_id) === String(rawStudentId))
      ) {
        return true;
      }
      if (rawStudentName) {
        const sNameEn = (s.name_en || "").trim().toLowerCase();
        const sName = (s.name || "").trim().toLowerCase();
        const sBn = (s.bangla_name || "").trim().toLowerCase();
        const sLabel = (s.label || "").trim().toLowerCase();
        const target = rawStudentName.toLowerCase();
        return sNameEn === target || sName === target || sBn === target || sLabel === target;
      }
      return false;
    });

    const studentDetails =
      rep.student_details || matchedStudent || (typeof rep.student === "object" ? rep.student : null);

    const resolvedStudentName =
      rawStudentName ||
      studentDetails?.name_en ||
      studentDetails?.name ||
      matchedStudent?.name_en ||
      matchedStudent?.name ||
      "Unnamed Student";

    const studentRollNumber = String(
      studentDetails?.roll_number ??
      studentDetails?.roll ??
      rep.rollNumber ??
      rep.roll_number ??
      rep.roll ??
      matchedStudent?.roll_number ??
      matchedStudent?.roll ??
      ""
    ).trim();

    const studentUniqId = String(
      studentDetails?.uniq_id ||
      studentDetails?.unique_id ||
      studentDetails?.student_id_card_number ||
      rep.uniqId ||
      rep.unique_id ||
      rep.student_uniq_id ||
      matchedStudent?.uniq_id ||
      matchedStudent?.unique_id ||
      matchedStudent?.student_id_card_number ||
      (rep.studentId && !String(rep.studentId).startsWith("stu_") ? String(rep.studentId) : "") ||
      ""
    ).trim();

    let studentClassId = String(
      studentDetails?.student_class?.id ||
      studentDetails?.student_class ||
      studentDetails?.class_id ||
      rep.student_class_id ||
      rep.class_id ||
      rep.classId ||
      matchedStudent?.student_class?.id ||
      matchedStudent?.student_class ||
      matchedStudent?.class_id ||
      ""
    );
    let studentClassName = String(
      studentDetails?.student_class_name ||
      studentDetails?.class_name ||
      rep.student_class_name ||
      rep.className ||
      matchedStudent?.student_class_name ||
      matchedStudent?.class_name ||
      ""
    );

    const foundClass = (academicData.classes || []).find(
      (c: any) =>
        (studentClassId && String(c.id) === String(studentClassId)) ||
        (studentClassName && c.name && c.name.toLowerCase() === studentClassName.toLowerCase())
    );
    if (foundClass) {
      if (!studentClassName && foundClass.name) studentClassName = foundClass.name;
      if (!studentClassId && foundClass.id) studentClassId = String(foundClass.id);
    }

    let studentSectionId = String(
      studentDetails?.section?.id ||
      studentDetails?.section ||
      studentDetails?.student_section_id ||
      studentDetails?.section_id ||
      rep.student_section_id ||
      rep.section_id ||
      rep.sectionId ||
      matchedStudent?.section?.id ||
      matchedStudent?.section ||
      matchedStudent?.student_section ||
      ""
    );
    let studentSectionName = String(
      studentDetails?.student_section_name ||
      studentDetails?.section_name ||
      rep.student_section_name ||
      rep.sectionName ||
      matchedStudent?.student_section_name ||
      matchedStudent?.section_name ||
      ""
    );

    const foundSection = (academicData.sections || []).find(
      (s: any) =>
        (studentSectionId && String(s.id) === String(studentSectionId)) ||
        (studentSectionName &&
          (s.section_name || s.name) &&
          (s.section_name || s.name).toLowerCase() === studentSectionName.toLowerCase())
    );
    if (foundSection) {
      if (!studentSectionName) studentSectionName = foundSection.section_name || foundSection.name || "";
      if (!studentSectionId && foundSection.id) studentSectionId = String(foundSection.id);
    }

    let studentDepartmentId = String(
      studentDetails?.department?.id ||
      studentDetails?.department ||
      studentDetails?.department_id ||
      rep.department_id ||
      rep.departmentId ||
      matchedStudent?.department?.id ||
      matchedStudent?.department ||
      foundClass?.department?.id ||
      foundClass?.department_id ||
      (typeof foundClass?.department === "string" || typeof foundClass?.department === "number"
        ? foundClass.department
        : "") ||
      ""
    );

    let studentDepartmentCode = String(
      studentDetails?.department?.code ||
      studentDetails?.department_code ||
      studentDetails?.dept_code ||
      rep.department_code ||
      rep.departmentCode ||
      rep.dept_code ||
      matchedStudent?.department?.code ||
      matchedStudent?.department_code ||
      foundClass?.department?.code ||
      foundClass?.department_code ||
      ""
    );

    let studentDepartmentName = String(
      studentDetails?.department_name ||
      studentDetails?.department?.name ||
      rep.department_name ||
      rep.departmentName ||
      matchedStudent?.department_name ||
      matchedStudent?.department?.name ||
      foundClass?.department?.name ||
      foundClass?.department_name ||
      ""
    );

    // Resolve short Dept code from academic hierarchy or name abbreviation
    let resolvedDeptCode = studentDepartmentCode;
    const foundDept = (academicData.departments || []).find(
      (d: any) =>
        (studentDepartmentId && String(d.id) === String(studentDepartmentId)) ||
        (studentDepartmentName &&
          d.name &&
          d.name.toLowerCase() === studentDepartmentName.toLowerCase()) ||
        (studentDepartmentCode && d.code && d.code.toLowerCase() === studentDepartmentCode.toLowerCase())
    );
    if (foundDept) {
      if (!resolvedDeptCode && foundDept.code) resolvedDeptCode = foundDept.code;
      if (!studentDepartmentName && foundDept.name) studentDepartmentName = foundDept.name;
      if (!studentDepartmentId && foundDept.id) studentDepartmentId = String(foundDept.id);
    }

    if (!resolvedDeptCode && studentDepartmentName) {
      const words = studentDepartmentName.trim().split(/\s+/);
      if (words.length === 1) {
        resolvedDeptCode = words[0].slice(0, 4).toUpperCase();
      } else {
        resolvedDeptCode = words.map((w: string) => w.charAt(0)).join("").toUpperCase();
      }
    }

    const groupName =
      rep.student_group ||
      rep.subject_course ||
      studentDetails?.group_name ||
      (typeof rep.student === "object" ? rep.student?.group_name || rep.student?.group : null) ||
      studentSectionName ||
      studentClassName ||
      "General Group";

    return {
      ...rep,
      student_name: resolvedStudentName,
      student_group: groupName,
      session_name: rep.session_name || rep.session || "General Session",
      comment: rep.comment || "",
      formattedDate: formattedReportDate,
      formattedTime: formattedGenerateTime,
      formattedReportDate,
      formattedGenerateDate,
      formattedGenerateTime,
      isoDateOnly,
      is_edited: hasEditedFlag,
      edited_at: editedAtTime,
      totalPages: totalPagesValue,
      mistakesCount,
      stucksCount,
      classId: studentClassId,
      className: studentClassName,
      sectionId: studentSectionId,
      sectionName: studentSectionName,
      departmentId: studentDepartmentId,
      departmentName: studentDepartmentName,
      departmentCode: resolvedDeptCode,
      rollNumber: studentRollNumber,
      uniqId: studentUniqId,
    };
  }, [
    academicData.students,
    academicData.classes,
    academicData.sections,
    academicData.departments,
  ]);

  // Re-normalize reports whenever academic hierarchy loads or updates
  useEffect(() => {
    setReportsList((prev) => prev.map(normalizeReport));
  }, [normalizeReport]);

  // Load Reports from LocalStorage & API with multi-endpoint fallback
  const loadReports = useCallback(async (isSilent = false) => {
    let localReps: any[] = [];
    try {
      localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
      if (localReps.length > 0) {
        setReportsList(localReps.map(normalizeReport));
      }
    } catch {
      setReportsList([]);
    }

    if (!isSilent && localReps.length === 0) {
      setLoading(true);
    }

    if (!isOnline()) {
      setLoading(false);
      return;
    }

    try {
      // Resilient endpoint resolution: try v1, standard, or legacy endpoints with page_size=500
      const endpoints = [
        "/api/v1/reports/?page_size=500",
        "/api/reports/?page_size=500",
        "/reports/?page_size=500",
      ];
      let res: Response | null = null;
      for (const ep of endpoints) {
        try {
          const attempt = await fetchWithAuth(ep);
          if (attempt && attempt.ok) {
            res = attempt;
            break;
          }
        } catch {
          // Continue to next endpoint
        }
      }

      if (res && res.ok) {
        const raw = await res.json();
        const rawData = Array.isArray(raw) ? raw : (raw.results || raw.data || []);
        const apiReports = rawData.map(normalizeReport);

        const localMap = new Map<string, any>();
        localReps.forEach((r) => {
          const key = String(r.id || r.report_unique_id || "");
          if (key) localMap.set(key, r);
        });

        const merged = apiReports.map((apiRep: ReportItem) => {
          const key = String(apiRep.id || apiRep.report_unique_id || "");
          const localMatch = localMap.get(key);
          if (localMatch) {
            return {
              ...apiRep,
              is_edited: apiRep.is_edited || localMatch.is_edited,
              edited_at: apiRep.edited_at || localMatch.edited_at || apiRep.updated_at,
            };
          }
          return apiRep;
        });

        const apiKeys = new Set(apiReports.map((r: ReportItem) => String(r.id || r.report_unique_id || "")).filter(Boolean));
        const localOnly = localReps
          .filter((r) => {
            const hasDbId = r.id && !isNaN(Number(r.id)) && !String(r.id).includes("-");
            const existsOnServer = apiKeys.has(String(r.id || r.report_unique_id || ""));

            const matchesApiReport = apiReports.some((apiR: ReportItem) => {
              const sameStudent =
                (apiR.student_name || "").toLowerCase().trim() ===
                (r.student_name || "").toLowerCase().trim();
              const apiDate = (apiR.isoDateOnly || apiR.report_date || "").split("T")[0];
              const localDate = (r.isoDateOnly || r.report_date || r.selectedDate || "").split("T")[0];
              const sameDate = apiDate && localDate && apiDate === localDate;
              const sameSession =
                (apiR.session_name || "").toLowerCase().trim() ===
                (r.session_name || r.selectedSession || r.session || "").toLowerCase().trim();
              return sameStudent && sameDate && sameSession;
            });

            return !existsOnServer && !hasDbId && !matchesApiReport;
          })
          .map(normalizeReport);

        const finalMerged = [...merged, ...localOnly];
        setReportsList(finalMerged);
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(finalMerged));
      }
    } catch (err: any) {
      console.warn("[ProgressReportsView] Reports API fetch failed:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [normalizeReport]);

  // Monitor online status & auto-refresh
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      loadReports();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadReports]);

  useEffect(() => {
    const handleReportSaved = () => {
      loadReports(true);
    };
    const handleTenantChanged = () => {
      loadReports(true);
    };
    window.addEventListener("spr_report_saved", handleReportSaved);
    window.addEventListener("spr_report_deleted", handleReportSaved);
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => {
      window.removeEventListener("spr_report_saved", handleReportSaved);
      window.removeEventListener("spr_report_deleted", handleReportSaved);
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
    };
  }, [loadReports]);

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  // Date Boundaries Calculation
  const { minEarliestDate, todayMaxDate } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    if (reportsList.length === 0) {
      return { minEarliestDate: today, todayMaxDate: today };
    }
    const validDates = reportsList
      .map((r) => r.isoDateOnly)
      .filter((d): d is string => Boolean(d))
      .sort();

    const earliest = validDates.length > 0 ? validDates[0] : today;
    return { minEarliestDate: earliest, todayMaxDate: today };
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

      return passesSearch && passesGroup && passesSession && passesDateRange;
    });
  }, [reportsList, searchQuery, selectedGroupFilter, selectedSessionFilter, startDate, endDate, selectedDeptFilter, selectedClsFilter, selectedSecFilter]);

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
  const toggleSelectAll = () => {
    if (selectedIds.size >= filteredReports.length && filteredReports.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(filteredReports.map((r) => r.id ?? r.report_unique_id ?? "").filter(Boolean))
      );
    }
  };

  const toggleSelectReport = (id: number | string, explicitChecked?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const strId = String(id);
      const numId = !isNaN(Number(id)) ? Number(id) : null;
      const isPresent = next.has(id) || next.has(strId) || (numId !== null && next.has(numId));

      const shouldUnselect = explicitChecked !== undefined ? !explicitChecked : isPresent;

      if (shouldUnselect) {
        next.delete(id);
        next.delete(strId);
        if (numId !== null) next.delete(numId);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchSelect = (idsSet: Set<number | string>) => {
    setSelectedIds(idsSet);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSelectedGroupFilter("ALL");
    setSelectedSessionFilter("ALL");
    setStartDate("");
    setEndDate("");
    setInternalDeptId("");
    setInternalClassId("");
    setInternalSectionId("");
    if (filterProps?.onClassChange) filterProps.onClassChange("");
    if (filterProps?.onSectionChange) filterProps.onSectionChange("");
    if (filterProps?.onDepartmentChange) filterProps.onDepartmentChange("");
    showToast("All filters reset successfully", "info");
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setSelectedGroupFilter("ALL");
    setSelectedSessionFilter("ALL");
    setStartDate("");
    setEndDate("");
    setInternalDeptId("");
    setInternalClassId("");
    setInternalSectionId("");
    if (filterProps?.onClassChange) filterProps.onClassChange("");
    if (filterProps?.onSectionChange) filterProps.onSectionChange("");
    if (filterProps?.onDepartmentChange) filterProps.onDepartmentChange("");
    loadReports(false);
    showToast("Reports refreshed and filters reset", "info");
  };

  const getActiveExportReports = (targetReports: any = null): ReportItem[] => {
    if (Array.isArray(targetReports)) return targetReports;
    if (targetReports && typeof targetReports === "object" && !Array.isArray(targetReports)) {
      return [targetReports];
    }
    if (selectedIds.size > 0) {
      return filteredReports.filter((r) => {
        const id = r.id ?? r.report_unique_id;
        if (!id) return false;
        return (
          selectedIds.has(id) ||
          selectedIds.has(String(id)) ||
          (!isNaN(Number(id)) && selectedIds.has(Number(id)))
        );
      });
    }
    return filteredReports;
  };

  // Right click Context Menu triggers
  const handleContextMenu = (e: React.MouseEvent, report: ReportItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      report,
      targetList: [report],
    });
  };

  const handleStudentContextMenu = (e: React.MouseEvent, studentObj: StudentGroupedItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      report: studentObj.reports[0] || { student_name: studentObj.student_name, session_name: "All Student Reports" },
      targetList: studentObj.reports,
    });
  };

  // Action: Copy Text Report Summary
  const handleCopyTextReport = (target: any) => {
    const reportsToCopy = getActiveExportReports(target);
    if (reportsToCopy.length === 0) return;

    const formattedTexts = reportsToCopy.map(
      (rep) =>
        `Student: ${rep.student_name} (${rep.student_group})\nDate: ${rep.formattedDate} ${rep.formattedTime}\nSession: ${rep.session_name}\nPages: ${rep.totalPages}p | Mistakes: ${rep.mistakesCount} | Stucks: ${rep.stucksCount}\nComment: ${rep.comment || "N/A"}`
    );

    navigator.clipboard.writeText(formattedTexts.join("\n\n---\n\n"));
    showToast(`Copied summary for ${reportsToCopy.length} report(s)!`, "info");
  };

  // Export to CSV
  const handleExportCSV = (target: any = null) => {
    const targetReports = getActiveExportReports(target);
    if (targetReports.length === 0) return;

    const headers = [
      "Report ID",
      "Date",
      "Time",
      "Student Name",
      "Group",
      "Session",
      "Pages",
      "Mistakes",
      "Stucks",
      "Comment",
    ];
    const rows = targetReports.map((r) => [
      `"${r.report_unique_id || r.id || ""}"`,
      `"${r.formattedDate || ""}"`,
      `"${r.formattedTime || ""}"`,
      `"${(r.student_name || "").replace(/"/g, '""')}"`,
      `"${(r.student_group || "").replace(/"/g, '""')}"`,
      `"${(r.session_name || "").replace(/"/g, '""')}"`,
      r.totalPages || 0,
      r.mistakesCount || 0,
      r.stucksCount || 0,
      `"${(r.comment || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `student_reports_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${targetReports.length} report(s) to CSV!`, "success");
  };

  // Export to JSON
  const handleExportJSON = (target: any = null) => {
    const targetReports = getActiveExportReports(target);
    if (targetReports.length === 0) return;

    const blob = new Blob([JSON.stringify(targetReports, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `student_reports_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${targetReports.length} report(s) to JSON!`, "success");
  };

  // Print / Save PDF
  const handlePrintPDF = (target: any = null) => {
    const targetReports = getActiveExportReports(target);
    if (targetReports.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Popup blocked! Please allow popups to print.", "error");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Progress Reports</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            p.sub { font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .badge-page { background: #e0f2fe; color: #0369a1; }
            .badge-mistake { background: #fee2e2; color: #b91c1c; }
            .badge-stuck { background: #fef3c7; color: #b45309; }
          </style>
        </head>
        <body>
          <h1>Student Daily Progress Reports</h1>
          <p class="sub">Generated on ${new Date().toLocaleString()} | Total Records: ${targetReports.length}</p>
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Student Name</th>
                <th>Group</th>
                <th>Session</th>
                <th>Pages</th>
                <th>Mistakes</th>
                <th>Stucks</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              ${targetReports
                .map(
                  (r) => `
                <tr>
                  <td>${r.formattedDate || ""} ${r.formattedTime || ""}</td>
                  <td><strong>${r.student_name || ""}</strong></td>
                  <td>${r.student_group || ""}</td>
                  <td>${r.session_name || ""}</td>
                  <td><span class="badge badge-page">${r.totalPages || 0}p</span></td>
                  <td><span class="badge badge-mistake">M ${r.mistakesCount || 0}</span></td>
                  <td><span class="badge badge-stuck">S ${r.stucksCount || 0}</span></td>
                  <td>${r.comment || "—"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Edit single report
  const handleEditReport = (rep: ReportItem) => {
    localStorage.setItem("spr_editing_report", JSON.stringify(rep));
    window.dispatchEvent(new CustomEvent("spr_edit_report", { detail: rep }));
    window.dispatchEvent(new CustomEvent("spr_navigate_dashboard"));
    showToast(`Loaded report for "${rep.student_name}" for editing!`, "info");
  };

  // Delete single report
  const handleDeleteReport = async (rep: ReportItem) => {
    const reportIdStr = rep.report_unique_id || `REP-#${rep.id}`;
    if (!window.confirm(`Are you sure you want to delete report "${reportIdStr}" for ${rep.student_name}?`)) {
      return;
    }

    const updatedList = reportsList.filter((r) => {
      if (rep.id && r.id) return r.id !== rep.id;
      if (rep.report_unique_id && r.report_unique_id) return r.report_unique_id !== rep.report_unique_id;
      return true;
    });

    setReportsList(updatedList);
    localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent("spr_report_saved"));
    window.dispatchEvent(new CustomEvent("spr_project_changed"));
    showToast(`Report ${reportIdStr} deleted!`, "success");

    if (isOnline() && rep.id) {
      try {
        await fetchWithAuth(`/reports/${rep.id}/`, { method: "DELETE" });
        window.dispatchEvent(new CustomEvent("spr_report_saved"));
      } catch (err: any) {
        console.warn("[ProgressReportsView] Delete API failed:", err?.message);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${isEmbedded ? "" : "max-w-6xl mx-auto"} space-y-4 theme-text-primary animate-fade-in flex flex-col items-center justify-start ${
        isEmbedded ? "py-1 px-0" : "py-4 px-3 sm:px-6"
      } ${className}`}
    >
      {/* 1. Primary Comprehensive Filter Box (Academic Hierarchy + Search + Date Range + Session) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        filterProps={effectiveFilterProps}
        showPeriodSwitcher={false}
        searchControl={
          <div className="space-y-1.5 w-full">
            <label className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
              Search Student
            </label>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none theme-text-secondary">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, session, roll..."
                className="w-full h-[42px] theme-bg-sub border theme-border theme-text-primary pl-9 pr-8 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/60 transition-all duration-200 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs theme-text-secondary hover:theme-text-primary cursor-pointer"
                  title="Clear search"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        }
        customDateComponent={
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={(start: string, end: string) => {
              setStartDate(start);
              setEndDate(end);
            }}
            minDate={minEarliestDate}
            maxDate={todayMaxDate}
            isHijriEnabled={false}
            onReset={() => {
              setStartDate("");
              setEndDate("");
            }}
          />
        }
        extraFields={
          /* Session Filter */
          <div className="col-span-1 space-y-1.5">
            <CustomSelect
              label="Session"
              placeholder="All Sessions"
              options={sessionOptions}
              value={selectedSessionFilter === "ALL" ? "" : selectedSessionFilter}
              onChange={(val: any) => {
                const selectedVal = typeof val === "object" ? (val?.value || val?.id) : val;
                setSelectedSessionFilter(selectedVal || "ALL");
              }}
              size="md"
            />
          </div>
        }
      >
        {/* Filter Box Bottom Footer Row */}
        <div className="pt-2.5 border-t theme-border grid grid-cols-1 sm:grid-cols-3 items-center gap-3 w-full">
          {/* Left: Showing count without background or border */}
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold theme-text-secondary select-none">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
            <span className="theme-text-primary font-bold">
              {filteredReports.length} / {reportsList.length}
            </span>
            <span>Reports</span>
          </div>

          {/* Center: 2 View Mode Switcher Buttons */}
          <div className="flex items-center justify-center">
            <div className="flex p-1 theme-bg-sub border theme-border rounded-xl shadow-2xs gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("RECORD_REPORTS")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === "RECORD_REPORTS"
                    ? "theme-bg-accent theme-accent-text shadow-sm scale-[1.01]"
                    : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50"
                }`}
              >
                <CloudIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Record Reports</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("STUDENT_VIEW")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === "STUDENT_VIEW"
                    ? "theme-bg-accent theme-accent-text shadow-sm scale-[1.01]"
                    : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50"
                }`}
              >
                <UsersIcon className="w-3.5 h-3.5 shrink-0" />
                <span>By Student</span>
              </button>
            </div>
          </div>

          {/* Right: Actions / Selection + Only-icon Refresh Button */}
          <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 p-1 px-2.5 rounded-xl shrink-0 animate-fade-in">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="p-1 rounded-lg theme-text-secondary hover:theme-accent transition cursor-pointer flex items-center gap-1 font-semibold text-xs"
                  title={
                    selectedIds.size === filteredReports.length
                      ? "Deselect All"
                      : `Select All (${selectedIds.size})`
                  }
                >
                  <CheckIcon className="w-3.5 h-3.5 theme-accent" />
                  <span className="theme-accent text-xs font-bold">{selectedIds.size} Selected</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintPDF()}
                  className="p-1 rounded-lg theme-text-secondary hover:theme-accent hover:theme-bg-sub transition cursor-pointer"
                  title={`Print Selected (${selectedIds.size})`}
                >
                  <PrinterIcon className="w-3.5 h-3.5 theme-accent" />
                </button>
              </div>
            )}

            <IconButton
              icon={RefreshIcon}
              onClick={handleRefresh}
              loading={loading}
              disabled={loading}
              variant="sub"
              size="sm"
              shape="rounded"
              title="Refresh Reports & Reset Filters"
              ariaLabel="Refresh Reports & Reset Filters"
            />
          </div>
        </div>
      </DailyClassroomFilterControls>

      {/* 2. Offline Banner (if offline) */}
      {offline && (
        <div className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs">
            Offline mode active — showing cached reports from LocalStorage.
          </span>
        </div>
      )}

      {/* VIEW MODES */}
      {loading ? (
        <SkeletonLoader type="list" count={4} />
      ) : (
        <>
          {viewMode === "RECORD_REPORTS" && (
            <RecordReportsTable
              reports={filteredReports}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectReport}
              onBatchSelect={handleBatchSelect}
              onDeselectAll={handleDeselectAll}
              onContextMenu={handleContextMenu}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
              onCopyText={(rep) => handleCopyTextReport(rep)}
              onExportCSV={(rep) => handleExportCSV(rep)}
              onExportJSON={(rep) => handleExportJSON(rep)}
              onPrintPDF={(rep) => handlePrintPDF(rep)}
              onResetFilters={handleResetAllFilters}
              onRefresh={handleRefresh}
            />
          )}

          {viewMode === "STUDENT_VIEW" && (
            <StudentGroupedTable
              studentGroupedData={studentGroupedData}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectReport}
              onBatchSelect={handleBatchSelect}
              onDeselectAll={handleDeselectAll}
              onContextMenu={handleContextMenu}
              onStudentContextMenu={handleStudentContextMenu}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
              onCopyText={(rep) => handleCopyTextReport(rep)}
              onExportCSV={(rep) => handleExportCSV(rep)}
              onExportJSON={(rep) => handleExportJSON(rep)}
              onPrintPDF={(rep) => handlePrintPDF(rep)}
              onResetFilters={handleResetAllFilters}
              onRefresh={handleRefresh}
            />
          )}

        </>
      )}

      {/* Right Click Popup Context Menu */}
      {contextMenu && (
        <ReportContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          report={contextMenu.report}
          targetList={contextMenu.targetList}
          onClose={() => setContextMenu(null)}
          onCopyText={() => handleCopyTextReport(contextMenu.targetList || contextMenu.report)}
          onExportCSV={() => handleExportCSV(contextMenu.targetList || contextMenu.report)}
          onExportJSON={() => handleExportJSON(contextMenu.targetList || contextMenu.report)}
          onPrintPDF={() => handlePrintPDF(contextMenu.targetList || contextMenu.report)}
          onEdit={handleEditReport}
          onDelete={handleDeleteReport}
        />
      )}
    </div>
  );
}

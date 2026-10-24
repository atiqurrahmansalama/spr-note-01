import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { fetchWithAuth } from "@/utils/authService";
import { isOnline } from "@/utils/localStore";
import { triggerCloudSync, isReportUnsynced, getLocalReports, deleteReportFromSync } from "@/utils/syncEngine";
import { formatDate } from "@/utils/reportGenerator";
import {
  CloudIcon,
  UsersIcon,
  CheckIcon,
  SearchIcon,
  CloseIcon,
  RefreshIcon,
  ChecklistIcon,
  TrashIcon,
  CopyIcon,
  TableIcon,
  Squares2X2Icon,
  TrendingUpIcon,
  ChevronIcon,
} from "@/components/ui/Icons";
import { ConfirmModal } from "@/components/ui/Modal";
import { useTranslation } from "@/i18n";
import CustomSelect from "@/components/ui/CustomSelect";
import IconButton from "@/components/ui/IconButton";
import SelectionActionBar from "@/components/ui/SelectionActionBar";
import { DateRangePicker } from "@/components/selectors";
import SegmentedSwitch from "@/components/ui/SegmentedSwitch";
import DailyClassroomFilterControls from "../../components/DailyClassroomFilterControls";
import { StudentSelector } from "../../components";
import { ProgressAnalyticsDashboard } from "../../components/progress-analytics";
import { normalizeToISODate } from "../../utils/dailyClassroomUtils";
import { useAcademicData } from "@/hooks/useAcademicData";
import { useTenant } from "@/context/TenantContext";
import { dailyProgressRepository, offlineDB } from "@/offline";
import {
  RecordReportsTable,
  RecordReportsCardGrid,
  StudentGroupedTable,
  StudentGroupedCardGrid,
  ReportContextMenu,
  SyncErrorsAlertBanner,
  ReportsTableSkeleton,
} from "./components";
import {
  ProgressReportsViewProps,
  ReportItem,
  StudentGroupedItem,
  ContextMenuState,
  SyncErrorItem,
} from "./types";

export default function ProgressReportsView({
  hideHeader = false,
  isEmbedded = false,
  className = "",
  filterProps = null,
  defaultReportView,
}: ProgressReportsViewProps) {
  const { t } = useTranslation("progressReports");
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Primary data state
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [reportToDelete, setReportToDelete] = useState<ReportItem | ReportItem[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [offline, setOffline] = useState(!isOnline());
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<SyncErrorItem[] | null>(null);
  const recentlyDeletedIdsRef = useRef<Set<string>>(new Set());
  const reportsListRef = useRef<ReportItem[]>([]);
  useEffect(() => {
    reportsListRef.current = reportsList;
  }, [reportsList]);

  // View modes resolution: "RECORD_REPORTS" | "STUDENT_VIEW" synced with URL
  const getResolvedViewMode = useCallback((): "RECORD_REPORTS" | "STUDENT_VIEW" => {
    const p = location.pathname.toLowerCase();
    if (p.includes("/by-student")) return "STUDENT_VIEW";
    if (p.includes("/records")) return "RECORD_REPORTS";
    if (defaultReportView) return defaultReportView;
    return "RECORD_REPORTS";
  }, [location.pathname, defaultReportView]);

  const [viewMode, setViewMode] = useState<"RECORD_REPORTS" | "STUDENT_VIEW">(getResolvedViewMode);

  // Keep viewMode synchronized when browser navigation (back/forward) occurs
  useEffect(() => {
    const resolved = getResolvedViewMode();
    setViewMode((prev) => (prev !== resolved ? resolved : prev));
  }, [getResolvedViewMode]);

  const handleViewModeChange = (newMode: "RECORD_REPORTS" | "STUDENT_VIEW") => {
    setViewMode(newMode);
    const targetSub = newMode === "STUDENT_VIEW" ? "by-student" : "records";
    const p = location.pathname.toLowerCase();
    if (p.includes("/by-student") || p.includes("/records")) {
      navigate(location.pathname.replace(/\/by-student|\/records/i, `/${targetSub}`) + location.search);
    } else if (p.includes("/progress-reports")) {
      navigate(`${location.pathname.replace(/\/$/, "")}/${targetSub}${location.search}`);
    } else {
      navigate(`/studies/progress-reports/${targetSub}${location.search}`);
    }
  };

  // Layout mode: "table" | "card" (persisted across sessions)
  const [layoutMode, setLayoutMode] = useState<"table" | "card">(() => {
    try {
      return (localStorage.getItem("spr_progress_reports_layout") as "table" | "card") || "table";
    } catch {
      return "table";
    }
  });

  const handleLayoutModeChange = (mode: "table" | "card") => {
    setLayoutMode(mode);
    try {
      localStorage.setItem("spr_progress_reports_layout", mode);
    } catch {}
  };

  // Collapsible Analytics State (persisted & synced with ?analytics=true)
  const [showAnalytics, setShowAnalytics] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("analytics") === "true") return true;
      return localStorage.getItem("spr_progress_reports_show_analytics") === "true";
    } catch {
      return false;
    }
  });

  const handleToggleAnalytics = () => {
    setShowAnalytics((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("spr_progress_reports_show_analytics", String(next));
      } catch {}
      return next;
    });
  };

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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("ALL");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("ALL");

  // Date Range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Table rows expand/collapse all state
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  const handleToggleExpandAll = useCallback(() => setIsAllExpanded((prev) => !prev), []);

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

    const hasEditedFlag = Boolean(rep.is_edited);
    const editedAtTime = hasEditedFlag ? (rep.edited_at || rep.edit_time || null) : null;

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

    const isNumericName = Boolean(rawStudentName && /^\d+$/.test(rawStudentName.trim()));
    const realStudentName =
      studentDetails?.name_en ||
      studentDetails?.name ||
      matchedStudent?.name_en ||
      matchedStudent?.name;

    const resolvedStudentName =
      isNumericName && realStudentName
        ? realStudentName
        : rawStudentName || realStudentName || "Unnamed Student";

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
      "";

    const hasNumericId =
      (typeof rep.id === "number" && !isNaN(rep.id)) ||
      (typeof rep.id === "string" && /^\d+$/.test(rep.id.trim()) && !rep.id.includes("-"));
    const serverId = rep.server_id || (hasNumericId ? Number(rep.id) : undefined);
    const syncStatus = rep.sync_status || (hasNumericId ? "SYNCED" : "PENDING");

    return {
      ...rep,
      server_id: serverId,
      sync_status: syncStatus,
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
      progress_mode: rep.progress_mode || rep.mode || (rep.book_title || rep.lesson_title ? "BOOK" : "QURAN"),
      mode: rep.progress_mode || rep.mode || (rep.book_title || rep.lesson_title ? "BOOK" : "QURAN"),
      book_title: rep.book_title || rep.curriculum_book_name || rep.book_name || "",
      curriculum_book_name: rep.curriculum_book_name || rep.book_title || rep.book_name || "",
      book_name: rep.book_name || rep.book_title || rep.curriculum_book_name || "",
      lesson_title: rep.lesson_title || rep.lesson_covered || "",
      lesson_covered: rep.lesson_covered || rep.lesson_title || "",
      teacher: rep.teacher || rep.teacher_name || "",
      teacher_id: rep.teacher_id || (typeof rep.teacher === "object" ? rep.teacher?.id : (typeof rep.teacher === "number" || (typeof rep.teacher === "string" && /^\d+$/.test(rep.teacher)) ? rep.teacher : "")) || "",
      teacher_name: rep.teacher_name || (typeof rep.teacher === "object" ? rep.teacher?.name || rep.teacher?.name_en : (typeof rep.teacher === "string" && isNaN(Number(rep.teacher)) ? rep.teacher : "")) || "",
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

  // Load Reports from IndexedDB / LocalStorage & API with multi-endpoint fallback
  // Load Reports from IndexedDB / LocalStorage & API with multi-endpoint fallback
  const loadReports = useCallback(async (isSilent = false) => {
    let localReps: any[] = [];
    const tenantScopedStorageKey = `spr_reports_local_${activeTenantId || 'default'}_v1`;
    const localMap = new Map<string, any>();

    const ingestLocal = (list: any[]) => {
      if (!Array.isArray(list)) return;
      list.forEach((r) => {
        if (!r) return;
        const uniqKey = r.report_unique_id ? String(r.report_unique_id).trim() : "";
        const idKey = r.id !== undefined && r.id !== null ? String(r.id).trim() : "";
        const serverKey = r.server_id ? String(r.server_id).trim() : "";

        // Canonical identity prioritizes report_unique_id, then server_id, then id
        const canonicalKey = uniqKey || (serverKey ? `srv_${serverKey}` : idKey);
        if (!canonicalKey) return;

        const lowerKeys = [uniqKey.toLowerCase(), idKey.toLowerCase(), serverKey.toLowerCase()].filter(Boolean);
        if (lowerKeys.some((k) => recentlyDeletedIdsRef.current.has(k))) {
          return;
        }

        const existing = localMap.get(canonicalKey);
        if (!existing) {
          localMap.set(canonicalKey, r);
        } else {
          // Merge keeping numeric server id and newest updates
          const existingHasServer = !isNaN(Number(existing.id)) || Boolean(existing.server_id);
          const currentHasServer = !isNaN(Number(r.id)) || Boolean(r.server_id);
          const existingTime = new Date(existing.updated_at || existing.client_updated_at || 0).getTime();
          const currentTime = new Date(r.updated_at || r.client_updated_at || 0).getTime();

          if ((!existingHasServer && currentHasServer) || currentTime >= existingTime) {
            localMap.set(canonicalKey, { ...existing, ...r });
          }
        }
      });
    };

    try {
      // 1. Instant read from Central IndexedDB strictly isolated to active tenant
      const idbReps = await dailyProgressRepository.list(undefined, { tenantId: activeTenantId });
      ingestLocal(idbReps);

      // 2. Central IndexedDB default fallback
      if (activeTenantId && activeTenantId !== 'default') {
        const defaultIdbReps = await dailyProgressRepository.list(undefined, { tenantId: 'default' });
        ingestLocal(defaultIdbReps);
      }

      // 3. Fallback to localStorage migration & tenant cache
      try {
        ingestLocal(JSON.parse(localStorage.getItem(tenantScopedStorageKey) || "[]"));
      } catch {}

      // 4. Central syncEngine storage ("spr_reports_local_v1")
      try {
        ingestLocal(JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]"));
      } catch {}
      try {
        ingestLocal(getLocalReports());
      } catch {}

      localReps = Array.from(localMap.values());
      // Prevent UI flickering / jumping:
      // Only set localReps immediately on initial cold boot (when current list is empty) or when offline.
      // When online with active reports, preserve current table rows until server reconciles.
      if (!isOnline() || reportsListRef.current.length === 0) {
        if (localReps.length > 0) {
          setReportsList(localReps.map(normalizeReport));
        } else {
          setReportsList([]);
        }
      }
    } catch {
      if (!isOnline() || reportsListRef.current.length === 0) {
        setReportsList([]);
      }
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
        const apiReports = rawData
          .filter((r: any) => {
            const k1 = String(r.id || "").toLowerCase();
            const k2 = String(r.server_id || "").toLowerCase();
            const k3 = String(r.report_unique_id || "").toLowerCase();
            return (
              !recentlyDeletedIdsRef.current.has(k1) &&
              (!k2 || !recentlyDeletedIdsRef.current.has(k2)) &&
              (!k3 || !recentlyDeletedIdsRef.current.has(k3))
            );
          })
          .map(normalizeReport);

        // Map API reports by database id and report_unique_id
        const apiDbIds = new Set<string>();
        const apiUniqueIds = new Set<string>();
        apiReports.forEach((r: ReportItem) => {
          if (r.id !== undefined && r.id !== null) apiDbIds.add(String(r.id));
          if (r.server_id !== undefined && r.server_id !== null) apiDbIds.add(String(r.server_id));
          if (r.report_unique_id) apiUniqueIds.add(String(r.report_unique_id));
        });

        const getLocalMatch = (apiRep: ReportItem) => {
          const uniq = apiRep.report_unique_id ? String(apiRep.report_unique_id).trim() : "";
          const srv = apiRep.server_id ? String(apiRep.server_id).trim() : "";
          const idStr = apiRep.id !== undefined && apiRep.id !== null ? String(apiRep.id).trim() : "";
          return (
            (uniq && localMap.get(uniq)) ||
            (srv && (localMap.get(`srv_${srv}`) || localMap.get(srv))) ||
            (idStr && (localMap.get(`srv_${idStr}`) || localMap.get(idStr))) ||
            null
          );
        };

        const merged = apiReports.map((apiRep: ReportItem) => {
          const localMatch = getLocalMatch(apiRep);

          if (localMatch) {
            // Enterprise Reconciliation: If local has unsynced changes or edits newer than server, preserve local edits!
            const isLocalUnsynced = isReportUnsynced(localMatch);
            const localUpdated = localMatch.client_updated_at ? new Date(localMatch.client_updated_at).getTime() : 0;
            const serverUpdated = (apiRep.updated_at || apiRep.created_at) ? new Date(apiRep.updated_at || apiRep.created_at).getTime() : 0;

            const isEditedLocal = Boolean(localMatch.is_edited);
            if (isLocalUnsynced || isEditedLocal || localUpdated > serverUpdated) {
              return {
                ...apiRep,
                ...localMatch,
                id: apiRep.id || localMatch.id,
                server_id: apiRep.id || localMatch.server_id,
                report_unique_id: apiRep.report_unique_id || localMatch.report_unique_id,
                is_edited: isEditedLocal || Boolean(apiRep.is_edited),
                edited_at: isEditedLocal ? (localMatch.edited_at || null) : (apiRep.is_edited ? (apiRep.edited_at || null) : null),
                sync_status: isLocalUnsynced ? "PENDING" : "SYNCED",
              };
            }
            return {
              ...apiRep,
              is_edited: Boolean(apiRep.is_edited || localMatch.is_edited),
              edited_at: (apiRep.is_edited ? apiRep.edited_at : localMatch.edited_at) || null,
            };
          }
          return apiRep;
        });

        // Retain ALL pending/unsynced local reports
        let pendingQueue = new Set<string>();
        try {
          pendingQueue = new Set(
            JSON.parse(localStorage.getItem("spr_reports_pending_queue") || "[]").map(String)
          );
        } catch {}

        const localOnly = localReps
          .filter((r) => {
            const rId = String(r.id || "");
            const rUniqId = String(r.report_unique_id || "");
            const rServerId = r.server_id ? String(r.server_id) : "";

            // If already present in server responses, skip adding as local duplicate
            const existsOnServer =
              (rId && apiDbIds.has(rId)) ||
              (rUniqId && apiUniqueIds.has(rUniqId)) ||
              (rServerId && apiDbIds.has(rServerId));

            if (existsOnServer) return false;

            // Retain all unsynced, queued, or local-draft reports with high priority
            const isUnsynced =
              isReportUnsynced(r) ||
              pendingQueue.has(rId) ||
              pendingQueue.has(rUniqId) ||
              r.sync_status === "PENDING" ||
              r.sync_status === "GRACE_PERIOD";

            if (isUnsynced) {
              return true;
            }

            // If it had an explicit numeric DB ID but server doesn't have it, it's deleted on server
            const hasNumericDbId = r.id && !isNaN(Number(r.id)) && !String(r.id).includes("-");
            if (hasNumericDbId) return false;

            return true;
          })
          .map((r) =>
            normalizeReport({
              ...r,
              sync_status: r.sync_status || "PENDING",
            })
          );

        const finalMerged = [...merged, ...localOnly];
        setReportsList(finalMerged);
        localStorage.setItem(tenantScopedStorageKey, JSON.stringify(finalMerged));
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(finalMerged));

        // Hydrate Central IndexedDB with fresh merged dataset strictly isolated to the active tenant
        dailyProgressRepository.bulkHydrate(finalMerged, { tenantId: activeTenantId }).catch(() => {});
      }
    } catch (err: any) {
      console.warn("[ProgressReportsView] Reports API fetch failed:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [normalizeReport, activeTenantId]);

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
    const handleReportSaved = (e: any) => {
      // Ignore background sync notifications to avoid cascading database hit loops
      if (e?.detail?.source === "sync") return;
      loadReports(true);
    };
    const handleReportDeleted = (e: any) => {
      // If deleted from this view directly, state is already updated
      if (e?.detail?.source === "progress_reports_view") return;
      const deletedKeys: string[] = e?.detail?.deletedKeys || [];
      if (deletedKeys.length > 0) {
        const delSet = new Set(deletedKeys.map((k) => String(k).toLowerCase()));
        setReportsList((prev) =>
          prev.filter((r) => {
            const k1 = String(r.id || "").toLowerCase();
            const k2 = String(r.server_id || "").toLowerCase();
            const k3 = String(r.report_unique_id || "").toLowerCase();
            return !delSet.has(k1) && (!k2 || !delSet.has(k2)) && (!k3 || !delSet.has(k3));
          })
        );
      } else {
        loadReports(true);
      }
    };
    const handleTenantChanged = () => {
      loadReports(true);
    };
    const handleOfflinePurged = () => {
      setReportsList([]);
    };
    window.addEventListener("spr_report_saved", handleReportSaved);
    window.addEventListener("spr_report_deleted", handleReportDeleted);
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_offline_purged", handleOfflinePurged);
    return () => {
      window.removeEventListener("spr_report_saved", handleReportSaved);
      window.removeEventListener("spr_report_deleted", handleReportDeleted);
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_offline_purged", handleOfflinePurged);
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

      // Teacher Filter
      if (selectedTeacherFilter && selectedTeacherFilter !== "ALL") {
        const repTeacherId = String(rep.teacher_id || (typeof rep.teacher === "object" ? rep.teacher?.id : rep.teacher) || "");
        const repTeacherName = String(rep.teacher_name || (typeof rep.teacher === "object" ? rep.teacher?.name : "") || "").toLowerCase();
        const target = String(selectedTeacherFilter).toLowerCase();
        const matchesId = repTeacherId && repTeacherId === String(selectedTeacherFilter);
        const matchesName = repTeacherName && (repTeacherName === target || repTeacherName.includes(target));
        if (!matchesId && !matchesName) {
          return false;
        }
      }

      return passesSearch && passesStudent && passesGroup && passesSession && passesDateRange;
    });
  }, [reportsList, searchQuery, selectedStudentId, selectedGroupFilter, selectedSessionFilter, selectedTeacherFilter, startDate, endDate, selectedDeptFilter, selectedClsFilter, selectedSecFilter]);

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

  const handleBatchSelect = (idsSet: Set<number | string>) => {
    setSelectedIds(idsSet);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSelectedStudentId(null);
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (isOnline()) {
        try {
          // Sync any pending / offline reports into PostgreSQL cloud database immediately
          const syncResult = await triggerCloudSync({ force: true });
          if (syncResult && syncResult.syncedCount && syncResult.syncedCount > 0) {
            showToast(`Synced ${syncResult.syncedCount} report(s) directly to Database!`, "success");
          }
        } catch {
          // Ignore background push errors during refresh
        }
      }
      await loadReports(false);
      showToast("Reports refreshed successfully!", "success");
    } catch (err: any) {
      showToast("Failed to refresh reports: " + (err?.message || "Network error"), "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Count unsynced offline reports
  const pendingSyncCount = useMemo(() => {
    return reportsList.filter(isReportUnsynced).length;
  }, [reportsList]);

  const handleSyncOfflineReports = async () => {
    setIsSyncing(true);
    setSyncErrors(null);
    try {
      // Pass the active reportsList so the syncEngine knows exactly which reports are pending
      const res = await triggerCloudSync({ force: true, reports: reportsList });
      if (res && res.errors && res.errors.length > 0) {
        setSyncErrors(res.errors);
        if (res.syncedCount && res.syncedCount > 0) {
          showToast(`Synced ${res.syncedCount} report(s), but ${res.errors.length} failed to sync.`, "warning");
        } else {
          showToast(`Failed to sync ${res.errors.length} report(s) to Database. Check details above.`, "error");
        }
      } else if (res && res.syncedCount && res.syncedCount > 0) {
        showToast(`Successfully synced ${res.syncedCount} report(s) to Database!`, "success");
      } else if (pendingSyncCount > 0) {
        showToast(`Sync attempted, but ${pendingSyncCount} report(s) still require review or cloud approval.`, "warning");
      } else {
        showToast("All local reports are already in sync with Database", "info");
      }
    } catch (err: any) {
      showToast("Sync failed: " + (err?.message || "Server error"), "error");
      setSyncErrors([
        {
          id: "err-all",
          student_name: "All Pending Records",
          reason: err?.message || "Server communication error",
        },
      ]);
    } finally {
      setIsSyncing(false);
      await loadReports(false);
    }
  };

  const getActiveTargetReports = (targetReports: any = null): ReportItem[] => {
    if (Array.isArray(targetReports)) return targetReports;
    if (targetReports && typeof targetReports === "object" && !Array.isArray(targetReports)) {
      return [targetReports];
    }
    if (selectedIds.size > 0) {
      return filteredReports.filter((r) => {
        const id = r.id;
        const uniqId = r.report_unique_id;
        const srvId = r.server_id;
        return (
          (id !== undefined && id !== null && (selectedIds.has(id) || selectedIds.has(String(id)) || (!isNaN(Number(id)) && selectedIds.has(Number(id))))) ||
          (uniqId && (selectedIds.has(uniqId) || selectedIds.has(String(uniqId)))) ||
          (srvId !== undefined && srvId !== null && (selectedIds.has(srvId) || selectedIds.has(String(srvId)) || (!isNaN(Number(srvId)) && selectedIds.has(Number(srvId)))))
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
    const reportsToCopy = getActiveTargetReports(target);
    if (reportsToCopy.length === 0) return;

    const formattedTexts = reportsToCopy.map(
      (rep) =>
        `Student: ${rep.student_name} (${rep.student_group})\nDate: ${rep.formattedDate} ${rep.formattedTime}\nSession: ${rep.session_name}\nPages: ${rep.totalPages}p | Mistakes: ${rep.mistakesCount} | Stucks: ${rep.stucksCount}\nComment: ${rep.comment || "N/A"}`
    );

    navigator.clipboard.writeText(formattedTexts.join("\n\n---\n\n"));
    showToast(`Copied summary for ${reportsToCopy.length} report(s)!`, "info");
  };

  // Edit single report
  const handleEditReport = (rep: ReportItem) => {
    const isBook = Boolean(
      rep.mode === "BOOK" ||
      rep.progress_mode === "BOOK" ||
      rep.curriculum_book_name ||
      rep.book_name ||
      rep.book_title ||
      rep.lesson_title ||
      rep.lesson_covered ||
      (Array.isArray(rep.bookPageData) && rep.bookPageData.length > 0)
    );
    const targetMode = isBook ? "book" : "quran";
    const rawDate = rep.report_date || rep.isoDateOnly || rep.date || rep.record_date || rep.selectedDate;
    const normalizedDate = normalizeToISODate(rawDate);
    const query = normalizedDate ? `?date=${encodeURIComponent(normalizedDate)}` : "";

    localStorage.setItem("spr_daily_progress_mode", isBook ? "BOOK" : "QURAN");
    localStorage.setItem("spr_editing_report", JSON.stringify(rep));
    window.dispatchEvent(new CustomEvent("spr_daily_progress_mode_change", { detail: isBook ? "BOOK" : "QURAN" }));
    window.dispatchEvent(new CustomEvent("spr_edit_report", { detail: rep }));
    navigate(`/studies/daily-progress/${targetMode}${query}`);
    showToast(`Loaded report for "${rep.student_name}" for editing!`, "info");
  };

  // Delete single report - opens project's reusable ConfirmModal
  const handleDeleteReport = (rep: ReportItem) => {
    setReportToDelete(rep);
  };

  // Batch delete selected reports
  const handleBatchDeleteReports = () => {
    const selected = getActiveTargetReports();
    if (selected.length === 0) return;
    setReportToDelete(selected);
  };

  // Sync individual report directly from 3-dots action menu or context menu
  const handleSyncSingleReport = async (report: ReportItem) => {
    setIsSyncing(true);
    setSyncErrors(null);
    try {
      const res = await triggerCloudSync({ force: true, reports: [report] });
      if (res && res.errors && res.errors.length > 0) {
        setSyncErrors(res.errors);
        showToast(`Failed to sync report: ${res.errors[0]?.reason || "Cloud error"}`, "error");
      } else if (res && res.syncedCount && res.syncedCount > 0) {
        showToast(`Report for "${report.student_name}" synced to Database!`, "success");
      } else {
        showToast(`Report is already in sync with Database`, "info");
      }
    } catch (err: any) {
      showToast("Sync failed: " + (err?.message || "Server error"), "error");
    } finally {
      setIsSyncing(false);
      await loadReports(false);
    }
  };

  // Sync all currently selected reports
  const handleSyncSelectedReports = async () => {
    const selectedReports = getActiveTargetReports();
    if (selectedReports.length === 0) {
      showToast("No reports selected for syncing", "warning");
      return;
    }
    setIsSyncing(true);
    setSyncErrors(null);
    try {
      const res = await triggerCloudSync({ force: true, reports: selectedReports });
      if (res && res.errors && res.errors.length > 0) {
        setSyncErrors(res.errors);
        if (res.syncedCount && res.syncedCount > 0) {
          showToast(`Synced ${res.syncedCount} report(s), ${res.errors.length} failed.`, "warning");
        } else {
          showToast(`Failed to sync ${res.errors.length} selected report(s): ${res.errors[0]?.reason || "Cloud error"}`, "error");
        }
      } else if (res && res.syncedCount && res.syncedCount > 0) {
        showToast(`Successfully synced ${res.syncedCount} selected report(s) to Database!`, "success");
      } else {
        showToast("Selected report(s) are already in sync with Database", "info");
      }
    } catch (err: any) {
      showToast("Sync failed: " + (err?.message || "Server error"), "error");
    } finally {
      setIsSyncing(false);
      await loadReports(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    const targetItems = Array.isArray(reportToDelete) ? reportToDelete : [reportToDelete];
    if (targetItems.length === 0) return;
    setIsDeleting(true);

    try {
      // 1. Collect all possible unique keys (both strings and numbers)
      const allTargetKeys: string[] = [];
      const serverLookupIds: string[] = [];

      targetItems.forEach((r) => {
        if (r.id !== undefined && r.id !== null && String(r.id).trim()) {
          const sId = String(r.id).trim();
          allTargetKeys.push(sId);
          serverLookupIds.push(sId);
        }
        if (r.server_id !== undefined && r.server_id !== null && String(r.server_id).trim()) {
          const sId = String(r.server_id).trim();
          allTargetKeys.push(sId);
          serverLookupIds.push(sId);
        }
        if (r.report_unique_id && String(r.report_unique_id).trim()) {
          const uniq = String(r.report_unique_id).trim();
          allTargetKeys.push(uniq);
          serverLookupIds.push(uniq);
        }
      });

      // 2. Track in recentlyDeletedIdsRef to prevent any background sync from re-injecting them
      allTargetKeys.forEach((k) => recentlyDeletedIdsRef.current.add(k.toLowerCase()));
      const deleteKeySet = new Set(allTargetKeys.map((k) => k.toLowerCase()));

      // 3. Purge immediately from syncEngine and all localStorage caches
      deleteReportFromSync(allTargetKeys, activeTenantId);

      // 4. Remove from Central IndexedDB cache (Dexie offlineDB)
      try {
        await offlineDB.entities
          .where("module")
          .equals("daily-progress")
          .filter((e) => {
            const eid = String(e.id || "").toLowerCase();
            const dataId = String(e.data?.id || "").toLowerCase();
            const dataServerId = String(e.data?.server_id || "").toLowerCase();
            const dataUniq = String(e.data?.report_unique_id || "").toLowerCase();
            return (
              deleteKeySet.has(eid) ||
              deleteKeySet.has(dataId) ||
              deleteKeySet.has(dataServerId) ||
              deleteKeySet.has(dataUniq)
            );
          })
          .delete();
      } catch (err) {
        console.warn("[ProgressReportsView] IndexedDB purge error:", err);
      }

      // Also call repository optimistic delete for both string and numeric variants
      for (const key of allTargetKeys) {
        dailyProgressRepository.deleteOptimistic(key, "/reports/", { skipOutbox: true, tenantId: activeTenantId }).catch(() => {});
        if (!isNaN(Number(key))) {
          dailyProgressRepository.deleteOptimistic(Number(key), "/reports/", { skipOutbox: true, tenantId: activeTenantId }).catch(() => {});
        }
      }

      // 5. Update local state immediately
      setReportsList((prev) =>
        prev.filter((r) => {
          const id1 = String(r.id || "").toLowerCase();
          const id2 = String(r.server_id || "").toLowerCase();
          const id3 = String(r.report_unique_id || "").toLowerCase();
          return (
            (!id1 || !deleteKeySet.has(id1)) &&
            (!id2 || !deleteKeySet.has(id2)) &&
            (!id3 || !deleteKeySet.has(id3))
          );
        })
      );

      setSelectedIds((prev) => {
        const next = new Set(prev);
        allTargetKeys.forEach((k) => {
          next.delete(k);
          if (!isNaN(Number(k))) next.delete(Number(k));
        });
        return next;
      });

      // 6. Delete from Cloud Database if online
      if (isOnline()) {
        const uniqueLookupIds = Array.from(new Set(serverLookupIds));

        // Fast path: Try bulk-delete endpoint
        let bulkSuccess = false;
        try {
          const bulkRes = await fetchWithAuth("/api/v1/reports/bulk-delete/", {
            method: "POST",
            body: JSON.stringify({ ids: uniqueLookupIds }),
          });
          if (bulkRes && (bulkRes.ok || bulkRes.status === 200 || bulkRes.status === 204)) {
            bulkSuccess = true;
          }
        } catch {
          bulkSuccess = false;
        }

        // Fallback: Delete individually if bulk endpoint did not complete
        if (!bulkSuccess) {
          for (const lookupId of uniqueLookupIds) {
            const endpoints = [
              `/api/v1/reports/${lookupId}/`,
              `/api/reports/${lookupId}/`,
              `/reports/${lookupId}/`,
            ];
            for (const ep of endpoints) {
              try {
                const res = await fetchWithAuth(ep, { method: "DELETE" });
                if (res && (res.ok || res.status === 200 || res.status === 204 || res.status === 404)) {
                  break;
                }
              } catch (err: any) {
                console.warn(`[ProgressReportsView] Delete API failed for ${ep}:`, err?.message);
              }
            }
          }
        }
      }

      // 7. Dispatch events with source tag so this view does not re-fetch against itself
      window.dispatchEvent(
        new CustomEvent("spr_report_deleted", {
          detail: { source: "progress_reports_view", deletedKeys: allTargetKeys },
        })
      );
      window.dispatchEvent(new CustomEvent("spr_project_changed"));

      if (targetItems.length === 1) {
        const rep = targetItems[0];
        const reportIdStr = rep.report_unique_id || `REP-#${rep.id}`;
        showToast(`Report ${reportIdStr} deleted permanently!`, "success");
      } else {
        showToast(`${targetItems.length} reports deleted permanently!`, "success");
      }
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  // Reusable Table Action Toolbar (Used in filter footer when analytics collapsed, or in dedicated box above table when analytics expanded)
  const renderTableActionToolbar = (extraRightControls?: React.ReactNode) => {
    if (selectedIds.size > 0) {
      return (
        <SelectionActionBar
          fullWidth={true}
          bordered={false}
          selectedCount={selectedIds.size}
          totalCount={filteredReports.length}
          onToggleSelectAll={toggleSelectAll}
          onClearSelection={handleDeselectAll}
          actions={[
            {
              id: "sync",
              label: `Sync to DB (${selectedIds.size})`,
              shortLabel: `Sync to DB (${selectedIds.size})`,
              icon: CloudIcon,
              variant: "sub",
              disabled: offline || isSyncing,
              loading: isSyncing,
              onClick: handleSyncSelectedReports,
            },
            {
              id: "copy",
              label: `Copy Summary (${selectedIds.size})`,
              shortLabel: "Copy Summary",
              icon: CopyIcon,
              variant: "sub",
              onClick: () => handleCopyTextReport(getActiveTargetReports()),
            },
            {
              id: "delete",
              label: `Delete (${selectedIds.size})`,
              shortLabel: `Delete (${selectedIds.size})`,
              icon: TrashIcon,
              variant: "danger",
              disabled: isDeleting,
              onClick: handleBatchDeleteReports,
            },
          ]}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 w-full">
        {/* Left: Reports Count */}
        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold theme-text-secondary select-none">
          <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
          <span className="theme-text-primary font-bold">
            {filteredReports.length} / {reportsList.length}
          </span>
          <span>Reports</span>
        </div>

        {/* Center: Reusable Segmented Switch (Record Reports vs By Student) */}
        <div className="flex items-center justify-center">
          <SegmentedSwitch<"RECORD_REPORTS" | "STUDENT_VIEW">
            value={viewMode}
            onChange={handleViewModeChange}
            options={[
              {
                value: "RECORD_REPORTS",
                label: "Record Reports",
                icon: CloudIcon,
              },
              {
                value: "STUDENT_VIEW",
                label: "By Student",
                icon: UsersIcon,
              },
            ]}
          />
        </div>

        {/* Right: Actions / Pending Sync + Cards/Table Toggle + Extra Controls */}
        <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
          {pendingSyncCount > 0 && !offline && (
            <button
              type="button"
              onClick={handleSyncOfflineReports}
              disabled={loading || isSyncing}
              className="py-1 px-2.5 rounded-xl text-xs font-semibold theme-bg-amber/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sync offline reports to database"
            >
              {isSyncing ? (
                <RefreshIcon className="w-3.5 h-3.5 shrink-0 animate-spin" />
              ) : (
                <CloudIcon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isSyncing ? "Syncing..." : `Sync to DB (${pendingSyncCount})`}
              </span>
            </button>
          )}

          {/* Expand All / Collapse All Button when Analytics is Expanded */}
          {showAnalytics && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
              title={isAllExpanded ? t("collapseAll", "Collapse All") : t("expandAll", "Expand All")}
            >
              <ChevronIcon isOpen={isAllExpanded} className="w-3.5 h-3.5 shrink-0" />
              <span>{isAllExpanded ? t("collapseAll", "Collapse All") : t("expandAll", "Expand All")}</span>
            </button>
          )}

          {/* Single Toggle Button for Cards / Table View */}
          <button
            type="button"
            onClick={() => handleLayoutModeChange(layoutMode === "card" ? "table" : "card")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
            title={layoutMode === "card" ? "Switch to Table View" : "Switch to Cards View"}
          >
            {layoutMode === "card" ? (
              <>
                <TableIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Table</span>
              </>
            ) : (
              <>
                <Squares2X2Icon className="w-3.5 h-3.5 theme-accent" />
                <span>Cards</span>
              </>
            )}
          </button>

          {extraRightControls}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${isEmbedded ? "" : "max-w-6xl mx-auto"} space-y-4 theme-text-primary animate-fade-in flex flex-col items-center justify-start ${
        isEmbedded ? "py-1 px-0" : "py-4 px-3 sm:px-6"
      } ${className}`}
    >
      {/* 1. Primary Comprehensive Filter Box (Line 1: Date | Student | Session; Line 2: Dept | Class | Sec | Teacher) */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        collapsible={true}
        filterProps={effectiveFilterProps}
        showPeriodSwitcher={false}
        hasTeachers={true}
        selectedTeacherId={selectedTeacherFilter}
        onTeacherChange={(tId: any) => setSelectedTeacherFilter(tId ? String(tId) : "ALL")}
        searchControl={
          <StudentSelector
            studentName={searchQuery}
            studentId={selectedStudentId}
            departmentId={selectedDeptFilter}
            classId={selectedClsFilter}
            sectionId={selectedSecFilter}
            size="md"
            label="STUDENT"
            placeholder="Search student, session, roll..."
            onStudentSelect={(selected) => {
              if (!selected) {
                setSearchQuery("");
                setSelectedStudentId(null);
              } else if (typeof selected === "string") {
                setSearchQuery(selected);
                setSelectedStudentId(null);
              } else {
                setSearchQuery(selected.label || selected.name || "");
                setSelectedStudentId(selected.id ? String(selected.id) : null);
              }
            }}
          />
        }
        sessionControl={
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
        }
        customDateComponent={
          <DateRangePicker
            label="Date Range"
            showTimezone={true}
            timezoneLink="/admin-tools?tab=classroom-config"
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
      >
        {/* Filter Box Bottom Footer Row */}
        <div className="pt-2.5 border-t theme-border w-full">
          {showAnalytics ? (
            /* When Analytics is expanded, table tools move down directly above the table */
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 text-xs font-semibold theme-text-secondary select-none">
                <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
                <span className="theme-text-primary font-bold">
                  {filteredReports.length} / {reportsList.length}
                </span>
                <span>Reports Filtered</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleAnalytics}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none theme-bg-accent theme-accent-text border-[var(--accent-main)]"
                  title={t("hideAnalytics", "Hide Analytics")}
                >
                  <TrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("hideAnalytics", "Hide Analytics")}</span>
                  <ChevronIcon isOpen={true} className="w-3 h-3 shrink-0" />
                </button>

                <IconButton
                  icon={RefreshIcon}
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={isRefreshing || isSyncing}
                  variant="sub"
                  size="sm"
                  shape="rounded"
                  title="Refresh Reports & Sync with Database"
                  ariaLabel="Refresh Reports & Sync with Database"
                />
              </div>
            </div>
          ) : (
            /* When Analytics is collapsed, table tools remain here in the filter bottom row */
            renderTableActionToolbar(
              <>
                <button
                  type="button"
                  onClick={handleToggleAnalytics}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary"
                  title={t("showAnalytics", "Show Analytics")}
                >
                  <TrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("analytics", "Analytics")}</span>
                  <ChevronIcon isOpen={false} className="w-3 h-3 shrink-0" />
                </button>

                <IconButton
                  icon={RefreshIcon}
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={isRefreshing || isSyncing}
                  variant="sub"
                  size="sm"
                  shape="rounded"
                  title="Refresh Reports & Sync with Database"
                  ariaLabel="Refresh Reports & Sync with Database"
                />
              </>
            )
          )}
        </div>
      </DailyClassroomFilterControls>

      {/* 2. Real-Time Analytics & Trends Dashboard (Filtered dynamically by all 7 filters via filteredReports) */}
      {showAnalytics && (
        <ProgressAnalyticsDashboard
          reports={filteredReports}
          startDate={startDate}
          endDate={endDate}
          variant="full"
          collapsible={false}
          className="w-full"
        />
      )}

      {/* 2a. Sync Errors Alert Banner */}
      {syncErrors && syncErrors.length > 0 && (
        <SyncErrorsAlertBanner
          syncErrors={syncErrors}
          reportsList={reportsList}
          isSyncing={isSyncing}
          loading={loading}
          onRetrySync={handleSyncOfflineReports}
          onDismiss={() => setSyncErrors(null)}
          onEditReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
        />
      )}

      {/* 2b. Offline Banner (if offline) */}
      {offline && (
        <div className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs">
            Offline mode active — showing cached reports from LocalStorage.
          </span>
        </div>
      )}

      {/* 2c. Dedicated Full-Width Single-Line Table Controls Box when Analytics is Expanded */}
      {showAnalytics && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-2xs select-none animate-fade-in">
          {renderTableActionToolbar()}
        </div>
      )}

      {/* VIEW MODES */}
      {loading ? (
        <ReportsTableSkeleton />
      ) : (
        <>
          {viewMode === "RECORD_REPORTS" && (
            layoutMode === "table" ? (
              <RecordReportsTable
                reports={filteredReports}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            ) : (
              <RecordReportsCardGrid
                reports={filteredReports}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            )
          )}

          {viewMode === "STUDENT_VIEW" && (
            layoutMode === "table" ? (
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
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            ) : (
              <StudentGroupedCardGrid
                studentGroupedData={studentGroupedData}
                reportsList={reportsList}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onStudentContextMenu={handleStudentContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            )
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
          onSync={handleSyncSingleReport}
          onCopyText={() => handleCopyTextReport(contextMenu.targetList || contextMenu.report)}
          onEdit={handleEditReport}
          onDelete={handleDeleteReport}
        />
      )}

      {/* Reusable Enterprise Delete Confirmation Modal */}
      {reportToDelete && (
        <ConfirmModal
          isOpen={Boolean(reportToDelete)}
          onClose={() => !isDeleting && setReportToDelete(null)}
          onConfirm={handleConfirmDelete}
          confirmLoading={isDeleting}
          title={
            Array.isArray(reportToDelete)
              ? t("deleteBatchReportsTitle", `Delete ${reportToDelete.length} Progress Reports`)
              : t("deleteReportTitle", "Delete Progress Report")
          }
          subtitle={
            Array.isArray(reportToDelete)
              ? t(
                  "deleteBatchReportsSubtitle",
                  `Are you sure you want to permanently delete ${reportToDelete.length} selected progress reports? This action cannot be undone.`
                )
              : t(
                  "deleteReportSubtitle",
                  `Are you sure you want to delete report "${reportToDelete.report_unique_id || `#${reportToDelete.id}`}" for ${reportToDelete.student_name}?`
                )
          }
          confirmText={t("delete", "Delete")}
          cancelText={t("cancel", "Cancel")}
          confirmVariant="danger"
          confirmIcon={TrashIcon}
          summaryItems={
            Array.isArray(reportToDelete)
              ? [
                  {
                    label: t("totalSelected", "Total Selected"),
                    value: `${reportToDelete.length} reports`,
                  },
                ]
              : [
                  {
                    label: t("student", "Student"),
                    value: reportToDelete.student_name,
                    subLabel:
                      reportToDelete.student_unique_id ||
                      (reportToDelete.student_roll ? `Roll ${reportToDelete.student_roll}` : undefined),
                  },
                  {
                    label: t("reportId", "Report ID"),
                    value: reportToDelete.report_unique_id || `#${reportToDelete.id}`,
                  },
                  {
                    label: t("date", "Date"),
                    value: formatDate(reportToDelete.date || reportToDelete.created_at || ""),
                  },
                ]
          }
        />
      )}
    </div>
  );
}

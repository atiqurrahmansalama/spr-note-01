import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { isOnline } from "../../../utils/localStore";
import { formatDate } from "../../../utils/reportGenerator";
import { 
  CloudIcon, 
  UsersIcon, 
  GroupsIcon,
  CheckIcon,
  SearchIcon,
  PrinterIcon,
  CloseIcon
} from "../../../components/ui/Icons";
import AutocompleteDropdown from "../../../components/ui/AutocompleteDropdown";

import ReportDateRangePicker from "./ReportDateRangePicker";
import RecordReportsList from "./RecordReportsList";
import StudentGroupedList from "./StudentGroupedList";
import ReportsAnalytics from "./ReportsAnalytics";
import ReportContextMenu from "./ReportContextMenu";
import SkeletonLoader from "../../../components/common/SkeletonLoader";

export default function StudentReportsView() {
  const { showToast } = useToast();
  const containerRef = useRef(null);

  // Primary data state
  const [reportsList, setReportsList] = useState([]);
  const [offline, setOffline] = useState(!isOnline());
  const [loading, setLoading] = useState(false);

  // View modes: "RECORD_REPORTS" | "STUDENT_VIEW" | "ANALYTICS"
  const [viewMode, setViewMode] = useState("RECORD_REPORTS");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("ALL");

  // Date Range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Context Menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Deselect items when clicking outside report cards or interactive controls
  useEffect(() => {
    const handleGlobalMouseDown = (e) => {
      if (!containerRef.current || !containerRef.current.contains(e.target)) {
        return;
      }
      if (
        e.target.closest(".report-card-row") ||
        e.target.closest(".student-grouped-row") ||
        e.target.closest(".report-context-menu") ||
        e.target.closest("button") ||
        e.target.closest("input") ||
        e.target.closest(".autocomplete-dropdown")
      ) {
        return;
      }
      setSelectedIds(new Set());
    };

    document.addEventListener("mousedown", handleGlobalMouseDown);
    return () => document.removeEventListener("mousedown", handleGlobalMouseDown);
  }, []);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleReportSaved = () => {
      loadReports();
    };
    window.addEventListener("spr_report_saved", handleReportSaved);
    return () => window.removeEventListener("spr_report_saved", handleReportSaved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: Normalize a single report object
  const normalizeReport = (rep) => {
    // 1. Report Date (Recitation Date)
    const rawReportDate = rep.report_date || rep.date || rep.selectedDate || "";
    let formattedReportDate = "—";
    let isoDateOnly = "";

    if (rawReportDate) {
      try {
        const d = new Date(rawReportDate);
        if (!isNaN(d.getTime())) {
          isoDateOnly = d.toISOString().split("T")[0];
          formattedReportDate = formatDate(d);
        } else {
          formattedReportDate = formatDate(rawReportDate);
        }
      } catch {
        formattedReportDate = String(rawReportDate);
      }
    }

    // 2. Generated Date / Created At (Timestamp when report was recorded in DB)
    const rawGenerateDate = rep.generate_date || rep.created_at || rep.client_created_at || rep.client_updated_at || rep.date_time || rawReportDate;
    let formattedGenerateDate = "—";
    let formattedGenerateTime = "";

    if (rawGenerateDate) {
      try {
        const gd = new Date(rawGenerateDate);
        if (!isNaN(gd.getTime())) {
          formattedGenerateDate = formatDate(gd);
          formattedGenerateTime = gd.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } else {
          formattedGenerateDate = String(rawGenerateDate);
        }
      } catch {
        formattedGenerateDate = String(rawGenerateDate);
      }
    }

    let calculatedPages = 0;
    if (Array.isArray(rep.juz_and_pages) && rep.juz_and_pages.length > 0) {
      rep.juz_and_pages.forEach((jp) => {
        if (Array.isArray(jp.ranges)) {
          jp.ranges.forEach((r) => {
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
      rep.portions.forEach((p) => {
        const start = parseInt(p.start_page || 0, 10);
        const end = parseInt(p.end_page || p.start_page || 0, 10);
        if (end >= start && start > 0) {
          calculatedPages += end - start + 1;
        } else if (start > 0) {
          calculatedPages += 1;
        }
      });
    }

    const hasEditedFlag = Boolean(
      rep.is_edited ||
      rep.edited_at ||
      (rep.updated_at && rep.created_at && Math.abs(new Date(rep.updated_at) - new Date(rep.created_at)) > 5000)
    );
    const editedAtTime = rep.edited_at || (hasEditedFlag ? rep.updated_at : null) || rep.client_updated_at || null;

    // Mistakes count (strictly 0 if no real mistakes)
    let mistakesCount = 0;
    if (rep.total_mistake !== undefined && rep.total_mistake !== null) {
      mistakesCount = Number(rep.total_mistake) || 0;
    } else if (Array.isArray(rep.mistake_details) && rep.mistake_details.length > 0) {
      mistakesCount = rep.mistake_details.filter((m) => (m.page && String(m.page).trim()) || (m.ayah && String(m.ayah).trim())).length;
    } else if (Array.isArray(rep.error_details)) {
      mistakesCount = rep.error_details.filter((e) => e.type === "Mistake").length;
    } else if (Array.isArray(rep.mistakes)) {
      let count = 0;
      rep.mistakes.forEach((m) => {
        if (m.ayahs && Array.isArray(m.ayahs)) {
          m.ayahs.forEach((a) => {
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
      stucksCount = rep.stuck_details.filter((s) => (s.page && String(s.page).trim()) || (s.ayah && String(s.ayah).trim())).length;
    } else if (Array.isArray(rep.error_details)) {
      stucksCount = rep.error_details.filter((e) => e.type === "Stuck").length;
    } else if (Array.isArray(rep.stucks)) {
      let count = 0;
      rep.stucks.forEach((s) => {
        if (s.ayahs && Array.isArray(s.ayahs)) {
          s.ayahs.forEach((a) => {
            const val = typeof a === "object" ? (a.value || a.ayah) : a;
            if (val && String(val).trim()) count += 1;
          });
        } else if (s.page && String(s.page).trim()) {
          count += 1;
        }
      });
      stucksCount = count;
    }

    return {
      ...rep,
      student_name:
        rep.student_name ||
        rep.student_details?.name ||
        (typeof rep.student === "object" ? rep.student?.name : null) ||
        (typeof rep.student === "string" ? rep.student : null) ||
        "Unnamed Student",
      student_group:
        rep.student_group ||
        rep.subject_course ||
        rep.student_details?.group_name ||
        (typeof rep.student === "object" ? (rep.student?.group_name || rep.student?.group) : null) ||
        "General Group",
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
      totalPages: calculatedPages || rep.total_page || rep.total_pages || rep.pages || 0,
      mistakesCount,
      stucksCount,
    };
  };

  // Load Reports from LocalStorage & API
  const loadReports = async () => {
    setLoading(true);
    let localReps = [];
    try {
      localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
      if (localReps.length > 0) {
        setReportsList(localReps.map(normalizeReport));
      }
    } catch {
      setReportsList([]);
    }

    if (!isOnline()) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth("/reports/");
      if (res.ok) {
        const raw = await res.json();
        const rawData = Array.isArray(raw) ? raw : (raw.results || []);
        const apiReports = rawData.map(normalizeReport);

        const localMap = new Map();
        localReps.forEach((r) => {
          const key = String(r.id || r.report_unique_id || "");
          if (key) localMap.set(key, r);
        });

        const merged = apiReports.map((apiRep) => {
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

        const apiKeys = new Set(apiReports.map((r) => String(r.id || r.report_unique_id || "")).filter(Boolean));
        const localOnly = localReps
          .filter((r) => {
            const hasDbId = r.id && !isNaN(Number(r.id)) && !String(r.id).includes("-");
            const existsOnServer = apiKeys.has(String(r.id || r.report_unique_id || ""));

            // If a server report already exists with matching student, recitation date, and session, it is already synced
            const matchesApiReport = apiReports.some((apiR) => {
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

            // Keep locally only if it is a pure offline draft not present on server
            return !existsOnServer && !hasDbId && !matchesApiReport;
          })
          .map(normalizeReport);

        const finalMerged = [...merged, ...localOnly];
        setReportsList(finalMerged);
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(finalMerged));
      }
    } catch (err) {
      console.warn("[StudentReportsView] Reports API fetch failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Date Boundaries Calculation
  const { minEarliestDate, todayMaxDate } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    if (reportsList.length === 0) {
      return { minEarliestDate: today, todayMaxDate: today };
    }
    const validDates = reportsList
      .map((r) => r.isoDateOnly)
      .filter(Boolean)
      .sort();

    const earliest = validDates.length > 0 ? validDates[0] : today;
    return { minEarliestDate: earliest, todayMaxDate: today };
  }, [reportsList]);

  // Extract unique groups & sessions for AutocompleteDropdown
  const availableGroups = useMemo(() => {
    const list = Array.from(new Set(reportsList.map((r) => r.student_group).filter(Boolean))).sort();
    return [{ label: "All Groups", value: "ALL" }, ...list.map((g) => ({ label: g, value: g }))];
  }, [reportsList]);

  const availableSessions = useMemo(() => {
    const list = Array.from(new Set(reportsList.map((r) => r.session_name).filter(Boolean))).sort();
    return [{ label: "All Sessions", value: "ALL" }, ...list.map((s) => ({ label: s, value: s }))];
  }, [reportsList]);

  // Filtered reports calculation
  const filteredReports = useMemo(() => {
    return reportsList.filter((rep) => {
      const q = searchQuery.toLowerCase().trim();
      const studentName = (rep.student_name || "").toLowerCase();
      const groupName = (rep.student_group || "").toLowerCase();
      const sessionName = (rep.session_name || "").toLowerCase();
      const commentStr = (rep.comment || "").toLowerCase();

      const passesSearch = !q || (
        studentName.includes(q) || 
        groupName.includes(q) || 
        sessionName.includes(q) || 
        commentStr.includes(q)
      );

      const passesGroup = selectedGroupFilter === "ALL" || groupName === selectedGroupFilter.toLowerCase();
      const passesSession = selectedSessionFilter === "ALL" || sessionName === selectedSessionFilter.toLowerCase();

      let passesDateRange = true;
      if (startDate && rep.isoDateOnly) {
        passesDateRange = passesDateRange && rep.isoDateOnly >= startDate;
      }
      if (endDate && rep.isoDateOnly) {
        passesDateRange = passesDateRange && rep.isoDateOnly <= endDate;
      }

      return passesSearch && passesGroup && passesSession && passesDateRange;
    });
  }, [reportsList, searchQuery, selectedGroupFilter, selectedSessionFilter, startDate, endDate]);

  // Grouped by Student calculation for STUDENT_VIEW
  const studentGroupedData = useMemo(() => {
    const map = new Map();
    filteredReports.forEach((rep) => {
      const name = rep.student_name || "Unnamed Student";
      if (!map.has(name)) {
        map.set(name, {
          student_name: name,
          student_group: rep.student_group,
          reports: [],
        });
      }
      map.get(name).reports.push(rep);
    });

    map.forEach((value) => {
      value.reports.sort((a, b) => (b.isoDateOnly || "").localeCompare(a.isoDateOnly || ""));
    });

    return Array.from(map.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [filteredReports]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map((r) => r.id || r.report_unique_id)));
    }
  };

  const toggleSelectReport = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchSelect = (idsSet) => {
    setSelectedIds(idsSet);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const getActiveExportReports = (targetReports = null) => {
    if (Array.isArray(targetReports)) return targetReports;
    if (targetReports && typeof targetReports === "object" && !Array.isArray(targetReports)) {
      return [targetReports];
    }
    if (selectedIds.size > 0) {
      return filteredReports.filter((r) => selectedIds.has(r.id || r.report_unique_id));
    }
    return filteredReports;
  };

  // Right click Context Menu triggers
  const handleContextMenu = (e, report) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      report,
      targetList: [report],
    });
  };

  const handleStudentContextMenu = (e, studentObj) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      report: studentObj.reports[0] || { student_name: studentObj.student_name, session_name: "All Student Reports" },
      targetList: studentObj.reports,
    });
  };

  // Action: Copy Text Report Summary
  const handleCopyTextReport = (target) => {
    const reportsToCopy = getActiveExportReports(target);
    if (reportsToCopy.length === 0) return;

    const formattedTexts = reportsToCopy.map((rep) => (
      `Student: ${rep.student_name} (${rep.student_group})\nDate: ${rep.formattedDate} ${rep.formattedTime}\nSession: ${rep.session_name}\nPages: ${rep.totalPages}p | Mistakes: ${rep.mistakesCount} | Stucks: ${rep.stucksCount}\nComment: ${rep.comment || 'N/A'}`
    ));

    navigator.clipboard.writeText(formattedTexts.join("\n\n---\n\n"));
    showToast(`Copied summary for ${reportsToCopy.length} report(s)!`, "info");
  };

  // Export to CSV
  const handleExportCSV = (target = null) => {
    const targetReports = getActiveExportReports(target);
    if (targetReports.length === 0) return;

    const headers = ["Report ID", "Date", "Time", "Student Name", "Group", "Session", "Pages", "Mistakes", "Stucks", "Comment"];
    const rows = targetReports.map((r) => [
      `"${r.report_unique_id || r.id || ''}"`,
      `"${r.formattedDate}"`,
      `"${r.formattedTime}"`,
      `"${r.student_name.replace(/"/g, '""')}"`,
      `"${r.student_group.replace(/"/g, '""')}"`,
      `"${r.session_name.replace(/"/g, '""')}"`,
      r.totalPages,
      r.mistakesCount,
      r.stucksCount,
      `"${(r.comment || '').replace(/"/g, '""')}"`,
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
  const handleExportJSON = (target = null) => {
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
  const handlePrintPDF = (target = null) => {
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
              ${targetReports.map((r) => `
                <tr>
                  <td>${r.formattedDate} ${r.formattedTime}</td>
                  <td><strong>${r.student_name}</strong></td>
                  <td>${r.student_group}</td>
                  <td>${r.session_name}</td>
                  <td><span class="badge badge-page">${r.totalPages}p</span></td>
                  <td><span class="badge badge-mistake">X ${r.mistakesCount}</span></td>
                  <td><span class="badge badge-stuck">ST ${r.stucksCount}</span></td>
                  <td>${r.comment || '—'}</td>
                </tr>
              `).join("")}
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

  // Edit single report — dispatches edit data then navigates back to Dashboard
  const handleEditReport = (rep) => {
    localStorage.setItem("spr_editing_report", JSON.stringify(rep));
    window.dispatchEvent(new CustomEvent("spr_edit_report", { detail: rep }));
    // Navigate to Dashboard so the form can load the report
    window.dispatchEvent(new CustomEvent("spr_navigate_dashboard"));
    showToast(`Loaded report for "${rep.student_name}" for editing!`, "info");
  };

  // Delete single report
  const handleDeleteReport = async (rep) => {
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
      } catch (err) {
        console.warn("[StudentReportsView] Delete API failed:", err.message);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-6xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6"
    >
      
      {/* 1. Dedicated Top Header Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
            <CloudIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">
              Student Progress & Daily Reports
            </h2>
            <p className="text-[11px] theme-text-secondary mt-0.5 leading-snug">
              Explore reports list, student-wise grouped logs, and professional analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <span className="px-3.5 py-1.5 text-xs font-semibold theme-text-primary theme-bg-sub border theme-border rounded-xl flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span>{reportsList.length} Total Reports</span>
          </span>
        </div>
      </div>

      {/* 2. Filter & View Controls Section Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 sm:space-y-5">
        
        {/* Offline Banner */}
        {offline && (
          <div className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-[11px] sm:text-xs">Offline mode active — showing cached reports from LocalStorage.</span>
          </div>
        )}

        {/* 3 View Mode Navigation Tabs Bar (Single line on desktop, 3 lines on small screens) */}
        <div className="w-full max-w-xl mx-auto flex flex-col sm:flex-row p-1.5 theme-bg-sub border theme-border rounded-2xl shadow-inner gap-1.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setViewMode("RECORD_REPORTS")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              viewMode === "RECORD_REPORTS"
                ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50"
            }`}
          >
            <CloudIcon className="w-4 h-4 shrink-0" />
            <span>Record Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("STUDENT_VIEW")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              viewMode === "STUDENT_VIEW"
                ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50"
            }`}
          >
            <UsersIcon className="w-4 h-4 shrink-0" />
            <span>By Student</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("ANALYTICS")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              viewMode === "ANALYTICS"
                ? "theme-bg-accent theme-accent-text shadow-md scale-[1.01]"
                : "theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50"
            }`}
          >
            <GroupsIcon className="w-4 h-4 shrink-0" />
            <span>Analytics</span>
          </button>
        </div>

        {/* 4-Column Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end pt-1">
          
          {/* 1. Search Box */}
          <div className="space-y-1.5">
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
                placeholder="Search student, session, comment..."
                className="w-full h-[42px] theme-bg-sub border theme-border theme-text-primary pl-9 pr-8 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/60 transition-all duration-200 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    showToast("Search cleared", "info");
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs theme-text-secondary hover:theme-text-primary"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Select Date Range Picker (moved here after Search) */}
          <ReportDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            minDate={minEarliestDate}
            maxDate={todayMaxDate}
            onReset={() => {
              setStartDate("");
              setEndDate("");
              showToast("Date filter cleared", "info");
            }}
          />

          {/* 3. Group Filter Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
              Group Filter
            </label>
            <AutocompleteDropdown
              options={availableGroups}
              value={selectedGroupFilter === "ALL" ? "" : selectedGroupFilter}
              disableSaveButton={true}
              showAllOptionsOnFocus={true}
              readOnly={true}
              onChange={(val) => {
                const selectedVal = typeof val === "object" ? (val.value || val.label) : val;
                setSelectedGroupFilter(selectedVal || "ALL");
              }}
              placeholder="Select Group..."
            />
          </div>

          {/* 4. Session Filter Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
              Session Filter
            </label>
            <AutocompleteDropdown
              options={availableSessions}
              value={selectedSessionFilter === "ALL" ? "" : selectedSessionFilter}
              disableSaveButton={true}
              showAllOptionsOnFocus={true}
              readOnly={true}
              onChange={(val) => {
                const selectedVal = typeof val === "object" ? (val.value || val.label) : val;
                setSelectedSessionFilter(selectedVal || "ALL");
              }}
              placeholder="Select Session..."
            />
          </div>

        </div>

        {/* Selection Toolbar Bar (Shows when items selected) */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between pt-3 border-t theme-border animate-fade-in">
            <span className="text-xs font-semibold theme-text-secondary">
              Selected Actions ({selectedIds.size} Items)
            </span>
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 p-1.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="p-1.5 rounded-lg theme-text-secondary hover:theme-accent hover:theme-bg-sub transition cursor-pointer flex items-center gap-1 font-semibold text-xs"
                title={selectedIds.size === filteredReports.length ? "Deselect All" : `Select All (${selectedIds.size})`}
              >
                <CheckIcon className="w-4 h-4 theme-accent" />
                <span className="theme-accent text-xs font-bold">{selectedIds.size} Selected</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintPDF()}
                className="p-1.5 rounded-lg theme-text-secondary hover:theme-accent hover:theme-bg-sub transition cursor-pointer"
                title={`Print Selected (${selectedIds.size})`}
              >
                <PrinterIcon className="w-4 h-4 theme-accent" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* VIEW MODES */}
      {loading ? (
        <SkeletonLoader type="list" count={4} />
      ) : (
        <>
          {viewMode === "RECORD_REPORTS" && (
            <RecordReportsList
              reports={filteredReports}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectReport}
              onBatchSelect={handleBatchSelect}
              onDeselectAll={handleDeselectAll}
              onContextMenu={handleContextMenu}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
            />
          )}

      {viewMode === "STUDENT_VIEW" && (
        <StudentGroupedList
          studentGroupedData={studentGroupedData}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelectReport}
          onBatchSelect={handleBatchSelect}
          onDeselectAll={handleDeselectAll}
          onContextMenu={handleContextMenu}
          onStudentContextMenu={handleStudentContextMenu}
          onEdit={handleEditReport}
          onDelete={handleDeleteReport}
        />
      )}

      {viewMode === "ANALYTICS" && (
        <ReportsAnalytics
          filteredReports={filteredReports}
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



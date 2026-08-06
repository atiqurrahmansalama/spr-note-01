import { useState, useEffect, useMemo } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";
import { isOnline } from "../../utils/localStore";
import { 
  CloudIcon, 
  TrashIcon, 
  EditIcon, 
  RefreshIcon, 
  UsersIcon, 
  GroupsIcon,
  ChevronIcon,
  CheckIcon,
  SessionsIcon,
  CalendarIcon
} from "../ui/Icons";

export default function StudentReportsView() {
  const { showToast } = useToast();

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

  // Expand states
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [expandedStudentName, setExpandedStudentName] = useState(null);

  // Selection state for Export / Print
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Edit report inline state
  const [editingReportId, setEditingReportId] = useState(null);
  const [editSessionName, setEditSessionName] = useState("");
  const [editComment, setEditComment] = useState("");

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
    const rawDateStr = rep.date_time || rep.date || rep.created_at || "";
    let formattedDate = "—";
    let formattedTime = "";
    let isoDateOnly = "";

    if (rawDateStr) {
      try {
        const d = new Date(rawDateStr);
        if (!isNaN(d.getTime())) {
          isoDateOnly = d.toISOString().split("T")[0];
          formattedDate = d.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          });
          formattedTime = d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } else {
          formattedDate = String(rawDateStr);
        }
      } catch {
        formattedDate = String(rawDateStr);
      }
    }

    // Calculate total pages from juz_and_pages if available
    let calculatedPages = 0;
    if (Array.isArray(rep.juz_and_pages)) {
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
        rep.student_details?.group_name ||
        rep.subject_course ||
        "General Group",
      session_name: rep.session_name || rep.session || "General Session",
      comment: rep.comment || "",
      formattedDate,
      formattedTime,
      isoDateOnly,
      totalPages: calculatedPages || rep.total_pages || rep.pages || 0,
      mistakesCount: rep.total_mistake ?? (rep.mistakes_count || rep.mistakes?.length || 0),
      stucksCount: rep.total_stuck ?? (rep.stucks_count || rep.stucks?.length || 0),
    };
  };

  // Load Reports from LocalStorage & API
  const loadReports = async () => {
    setLoading(true);
    try {
      const localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
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
        const apiReports = (Array.isArray(raw) ? raw : []).map(normalizeReport);

        const localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
        const apiUniqueIds = new Set(apiReports.map((r) => r.report_unique_id).filter(Boolean));
        const localOnly = localReps
          .filter((r) => !r.report_unique_id || !apiUniqueIds.has(r.report_unique_id))
          .map(normalizeReport);

        const merged = [...apiReports, ...localOnly];
        setReportsList(merged);
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(merged));
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

  // Extract unique groups & sessions for filter dropdowns
  const availableGroups = useMemo(() => {
    return Array.from(new Set(reportsList.map((r) => r.student_group).filter(Boolean))).sort();
  }, [reportsList]);

  const availableSessions = useMemo(() => {
    return Array.from(new Set(reportsList.map((r) => r.session_name).filter(Boolean))).sort();
  }, [reportsList]);

  // Filtered reports calculation
  const filteredReports = useMemo(() => {
    return reportsList.filter((rep) => {
      const q = searchQuery.toLowerCase().trim();
      const studentName = (rep.student_name || "").toLowerCase();
      const groupName = (rep.student_group || "").toLowerCase();
      const sessionName = (rep.session_name || "").toLowerCase();
      const commentStr = (rep.comment || "").toLowerCase();
      const reportIdStr = (rep.report_unique_id || String(rep.id) || "").toLowerCase();

      const passesSearch = !q || (
        studentName.includes(q) || 
        groupName.includes(q) || 
        sessionName.includes(q) || 
        commentStr.includes(q) ||
        reportIdStr.includes(q)
      );

      const passesGroup = selectedGroupFilter === "ALL" || groupName === selectedGroupFilter.toLowerCase();
      const passesSession = selectedSessionFilter === "ALL" || sessionName === selectedSessionFilter.toLowerCase();

      // Date Range Filter Logic
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

    // Sort reports in each student by date descending
    map.forEach((value) => {
      value.reports.sort((a, b) => (b.isoDateOnly || "").localeCompare(a.isoDateOnly || ""));
    });

    // Sort students alphabetically
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

  // Get selected reports list or all filtered reports if none explicitly checked
  const getActiveExportReports = () => {
    if (selectedIds.size > 0) {
      return filteredReports.filter((r) => selectedIds.has(r.id || r.report_unique_id));
    }
    return filteredReports;
  };

  // Export to CSV
  const handleExportCSV = () => {
    const targetReports = getActiveExportReports();
    if (targetReports.length === 0) {
      showToast("No reports available to export!", "warning");
      return;
    }

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
  const handleExportJSON = () => {
    const targetReports = getActiveExportReports();
    if (targetReports.length === 0) {
      showToast("No reports available to export!", "warning");
      return;
    }

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
  const handlePrintReports = () => {
    const targetReports = getActiveExportReports();
    if (targetReports.length === 0) {
      showToast("No reports available to print!", "warning");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Popup blocked! Please allow popups to print.", "error");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Daily Progress Reports</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #111; }
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
                  <td><span class="badge badge-stuck">⚑ ${r.stucksCount}</span></td>
                  <td>${r.comment || '—'}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Helper for Initials avatar
  const getInitials = (name) => {
    if (!name) return "S";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Start editing a report
  const startEditReport = (rep) => {
    setEditingReportId(rep.id || rep.report_unique_id);
    setEditSessionName(rep.session_name || rep.session || "");
    setEditComment(rep.comment || "");
  };

  // Save edited report comment & session
  const handleSaveEditReport = async (rep) => {
    const updatedList = reportsList.map((r) => {
      if ((r.id && r.id === rep.id) || (r.report_unique_id && r.report_unique_id === rep.report_unique_id)) {
        return {
          ...r,
          session_name: editSessionName.trim(),
          comment: editComment.trim(),
          client_updated_at: new Date().toISOString(),
        };
      }
      return r;
    });

    setReportsList(updatedList);
    localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedList));
    setEditingReportId(null);
    showToast("Report updated locally!", "success");

    if (isOnline() && rep.id) {
      try {
        const patchPayload = {
          session_name: editSessionName.trim(),
          comment: editComment.trim(),
        };

        const res = await fetchWithAuth(`/reports/${rep.id}/`, {
          method: "PATCH",
          body: JSON.stringify(patchPayload),
        });

        if (res.ok) {
          showToast("Report updated in Database!", "success");
        }
      } catch (err) {
        console.warn("[StudentReportsView] Patch API failed:", err.message);
      }
    }
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
    showToast(`Report ${reportIdStr} deleted!`, "success");

    if (isOnline() && rep.id) {
      try {
        await fetchWithAuth(`/reports/${rep.id}/`, { method: "DELETE" });
      } catch (err) {
        console.warn("[StudentReportsView] Delete API failed:", err.message);
      }
    }
  };

  // Analytics Metrics Calculation
  const analyticsData = useMemo(() => {
    const totalReports = filteredReports.length;
    const totalMistakes = filteredReports.reduce((sum, r) => sum + r.mistakesCount, 0);
    const totalStucks = filteredReports.reduce((sum, r) => sum + r.stucksCount, 0);
    const totalPages = filteredReports.reduce((sum, r) => sum + r.totalPages, 0);
    const uniqueStudents = new Set(filteredReports.map((r) => r.student_name)).size;

    const avgPagesPerReport = totalReports > 0 ? (totalPages / totalReports).toFixed(1) : "0";
    const avgMistakesPerReport = totalReports > 0 ? (totalMistakes / totalReports).toFixed(1) : "0";

    // Top groups distribution
    const groupMap = {};
    filteredReports.forEach((r) => {
      groupMap[r.student_group] = (groupMap[r.student_group] || 0) + 1;
    });

    return {
      totalReports,
      totalMistakes,
      totalStucks,
      totalPages,
      uniqueStudents,
      avgPagesPerReport,
      avgMistakesPerReport,
      groupMap,
    };
  }, [filteredReports]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      
      {/* Main Unified Header & Controls Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-5">
        
        {/* Header Title & Action Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <CloudIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary tracking-tight">
                Student Progress & Daily Reports
              </h2>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                Explore reports list, student-wise grouped logs, and professional analytics.
              </p>
            </div>
          </div>

          {/* View Switcher Tabs (3 Modes) */}
          <div className="flex p-1 theme-bg-sub border theme-border rounded-xl shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("RECORD_REPORTS")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === "RECORD_REPORTS"
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <CloudIcon className="w-3.5 h-3.5" />
              <span>Record Reports</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("STUDENT_VIEW")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === "STUDENT_VIEW"
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>By Student</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("ANALYTICS")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === "ANALYTICS"
                  ? "theme-bg-accent theme-accent-text shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              <GroupsIcon className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        {/* Offline Badge */}
        {offline && (
          <div className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>Offline mode active — showing cached reports from LocalStorage.</span>
          </div>
        )}

        {/* Search, Filter & Date Range Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, group, session, comments..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-xs theme-text-secondary hover:theme-text-primary"
              >
                ✕
              </button>
            )}
          </div>

          {/* Group Filter Dropdown */}
          <div>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Session Filter Dropdown */}
          <div>
            <select
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors cursor-pointer"
            >
              <option value="ALL">All Sessions</option>
              {availableSessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Picker Bar with Boundary Constraints */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t theme-border text-xs">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <span className="theme-text-secondary font-semibold flex items-center gap-1.5 shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Date Range:</span>
            </span>

            {/* From Date */}
            <div className="flex items-center gap-1.5 theme-bg-sub border theme-border rounded-xl px-2.5 py-1">
              <span className="text-[10px] theme-text-secondary uppercase">From</span>
              <input
                type="date"
                value={startDate}
                min={minEarliestDate}
                max={todayMaxDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="theme-bg-sub theme-text-primary text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5 theme-bg-sub border theme-border rounded-xl px-2.5 py-1">
              <span className="text-[10px] theme-text-secondary uppercase">To</span>
              <input
                type="date"
                value={endDate}
                min={startDate || minEarliestDate}
                max={todayMaxDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="theme-bg-sub theme-text-primary text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[11px] theme-accent hover:underline font-medium cursor-pointer ml-1"
              >
                Reset Dates
              </button>
            )}
          </div>

          {/* Action Toolbar (Select All & Export Buttons) */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckIcon className="w-3.5 h-3.5 theme-accent" />
              <span>
                {selectedIds.size > 0 && selectedIds.size === filteredReports.length
                  ? "Deselect All"
                  : `Select All (${selectedIds.size})`}
              </span>
            </button>

            {/* Export & Print Dropdown Actions */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition cursor-pointer"
              title="Export to Excel/CSV"
            >
              CSV
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition cursor-pointer"
              title="Export to JSON"
            >
              JSON
            </button>

            <button
              type="button"
              onClick={handlePrintReports}
              className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition shadow-sm cursor-pointer"
              title="Print or Save as PDF"
            >
              Print / PDF
            </button>

            <button
              type="button"
              onClick={loadReports}
              className="p-2 rounded-xl theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer"
              title="Refresh Reports"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

      </div>

      {/* VIEW MODE 1: RECORD REPORTS (LATEST SOUGHT COMPACT CARDS WITH EXPANDABLE DETAILS) */}
      {viewMode === "RECORD_REPORTS" && (
        <div className="w-full space-y-3">
          
          {filteredReports.length === 0 ? (
            <div className="w-full theme-bg-surface border theme-border rounded-2xl p-10 text-center space-y-3">
              <p className="text-xs theme-text-secondary italic">
                No daily reports match your search or date filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGroupFilter("ALL");
                  setSelectedSessionFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
                className="theme-accent hover:underline text-xs font-semibold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredReports.map((rep) => {
              const repKey = rep.id || rep.report_unique_id;
              const isExpanded = expandedReportId === repKey;
              const isChecked = selectedIds.has(repKey);
              const initials = getInitials(rep.student_name);
              const isEditing = editingReportId === repKey;

              return (
                <div
                  key={repKey}
                  className={`w-full theme-bg-surface border transition-all duration-200 rounded-2xl overflow-hidden shadow-md ${
                    isChecked ? "border-[var(--accent-main)]" : "theme-border hover:border-slate-600"
                  }`}
                >
                  {/* Compact Header Row (Matches requested image layout) */}
                  <div
                    onClick={() => setExpandedReportId(isExpanded ? null : repKey)}
                    className="p-3.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    
                    {/* Left Section: Checkbox + Avatar + Name + Subtitle */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectReport(repKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-600 theme-accent cursor-pointer shrink-0"
                      />

                      {/* Initials Avatar */}
                      <div className="w-10 h-10 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {initials}
                      </div>

                      {/* Name & Subtitle */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold theme-text-primary truncate tracking-tight">
                            {rep.student_name}
                          </h4>
                          {rep.sync_status === "PENDING" && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Pending Sync" />
                          )}
                        </div>
                        <p className="text-[11px] theme-text-secondary mt-0.5 truncate font-sans">
                          {rep.formattedDate} {rep.formattedTime && `· ${rep.formattedTime}`} · <span className="theme-text-primary font-medium">{rep.student_group}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Badges & Pills Section */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      
                      {/* Total Pages Badge */}
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono theme-bg-sub theme-text-primary border theme-border">
                        {rep.totalPages}p
                      </span>

                      {/* Session Name Badge */}
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold theme-bg-elevated theme-text-primary border theme-border">
                        {rep.session_name}
                      </span>

                      {/* Mistakes Count Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono flex items-center gap-1 ${
                        rep.mistakesCount > 0
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "theme-bg-sub theme-text-secondary"
                      }`}>
                        <span>X</span>
                        <span>{rep.mistakesCount}</span>
                      </span>

                      {/* Stucks Count Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono flex items-center gap-1 ${
                        rep.stucksCount > 0
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "theme-bg-sub theme-text-secondary"
                      }`}>
                        <span>⚑</span>
                        <span>{rep.stucksCount}</span>
                      </span>

                      {/* Chevron Indicator */}
                      <ChevronIcon isOpen={isExpanded} className="w-4 h-4 theme-text-secondary ml-1" />
                    </div>

                  </div>

                  {/* Expanded Full Details Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t theme-border theme-bg-sub space-y-4 animate-fade-in text-xs">
                      
                      {/* Inline Editing Form if active */}
                      {isEditing ? (
                        <div className="space-y-3 theme-bg-surface p-4 rounded-xl border theme-border">
                          <h5 className="font-bold theme-text-primary text-xs">Edit Report Details</h5>
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] theme-text-secondary uppercase font-bold">Session Name</label>
                              <input
                                type="text"
                                value={editSessionName}
                                onChange={(e) => setEditSessionName(e.target.value)}
                                className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] theme-text-secondary uppercase font-bold">Teacher Comment</label>
                              <textarea
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                className="w-full h-16 theme-bg-sub border theme-border theme-text-primary p-2 rounded-lg text-xs resize-none"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingReportId(null)}
                              className="px-3 py-1 text-xs font-medium theme-text-secondary"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditReport(rep)}
                              className="px-3 py-1 text-xs font-semibold theme-bg-accent theme-accent-text rounded-lg"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Juz & Page Ranges */}
                          {Array.isArray(rep.juz_and_pages) && rep.juz_and_pages.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary">
                                Juz & Page Recitation Log
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {rep.juz_and_pages.map((jp, idx) => (
                                  <div key={idx} className="theme-bg-surface border theme-border rounded-lg px-3 py-1.5 text-xs font-mono">
                                    <span className="theme-accent font-bold">Para/Juz {jp.juz}</span>
                                    {Array.isArray(jp.ranges) && jp.ranges.map((r, rIdx) => (
                                      <span key={rIdx} className="theme-text-primary ml-2">
                                        (Pages: {r.start || r.page_start || 0} - {r.end || r.page_end || 0})
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mistake Details */}
                          {Array.isArray(rep.mistake_details) && rep.mistake_details.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-rose-400">
                                Mistakes Log ({rep.mistake_details.length})
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {rep.mistake_details.map((m, idx) => (
                                  <span key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-lg font-mono text-[11px]">
                                    Juz {m.juz} · Page {m.page || '—'} · Ayah {m.ayah || '—'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Stuck Details */}
                          {Array.isArray(rep.stuck_details) && rep.stuck_details.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400">
                                Stucks Log ({rep.stuck_details.length})
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {rep.stuck_details.map((s, idx) => (
                                  <span key={idx} className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg font-mono text-[11px]">
                                    Juz {s.juz} · Page {s.page || '—'} · Ayah {s.ayah || '—'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comment */}
                          <div className="space-y-1 pt-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider theme-text-secondary">
                              Teacher Feedback Comment
                            </span>
                            <p className="theme-bg-surface p-3 rounded-xl border theme-border theme-text-primary text-xs font-medium italic leading-relaxed">
                              "{rep.comment || "No comment recorded for this report."}"
                            </p>
                          </div>

                          {/* Bottom Actions Toolbar */}
                          <div className="flex items-center justify-between pt-2 border-t theme-border">
                            <span className="text-[10px] font-mono theme-text-secondary">
                              Report ID: {rep.report_unique_id || rep.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditReport(rep)}
                                className="px-3 py-1.5 rounded-lg theme-bg-surface border theme-border hover:theme-accent theme-text-secondary transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                              >
                                <EditIcon className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(rep)}
                                className="px-3 py-1.5 rounded-lg theme-bg-surface border theme-border hover:text-rose-400 theme-text-secondary transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>
      )}

      {/* VIEW MODE 2: STUDENT-WISE GROUPED VIEW */}
      {viewMode === "STUDENT_VIEW" && (
        <div className="w-full space-y-4">
          
          {studentGroupedData.length === 0 ? (
            <div className="w-full theme-bg-surface border theme-border rounded-2xl p-10 text-center space-y-3">
              <p className="text-xs theme-text-secondary italic">
                No student reports found matching the filters.
              </p>
            </div>
          ) : (
            studentGroupedData.map((stu) => {
              const isExpanded = expandedStudentName === stu.student_name;
              const initials = getInitials(stu.student_name);
              const totalMistakes = stu.reports.reduce((sum, r) => sum + r.mistakesCount, 0);
              const totalStucks = stu.reports.reduce((sum, r) => sum + r.stucksCount, 0);
              const totalPages = stu.reports.reduce((sum, r) => sum + r.totalPages, 0);

              return (
                <div
                  key={stu.student_name}
                  className="w-full theme-bg-surface border theme-border rounded-2xl overflow-hidden shadow-md transition-all"
                >
                  {/* Compact Student Header Item */}
                  <div
                    onClick={() => setExpandedStudentName(isExpanded ? null : stu.student_name)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:theme-bg-sub transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold theme-text-primary truncate">
                          {stu.student_name}
                        </h4>
                        <p className="text-[11px] theme-text-secondary mt-0.5">
                          Group: <span className="theme-text-primary font-medium">{stu.student_group}</span> · Total <span className="theme-accent font-bold font-mono">{stu.reports.length}</span> Session Reports
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono theme-bg-sub theme-text-primary border theme-border">
                        {totalPages}p Total
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        X {totalMistakes}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        ⚑ {totalStucks}
                      </span>
                      <ChevronIcon isOpen={isExpanded} className="w-4 h-4 theme-text-secondary ml-1" />
                    </div>
                  </div>

                  {/* Expanded Student Reports List by Date */}
                  {isExpanded && (
                    <div className="p-4 border-t theme-border theme-bg-sub space-y-3 animate-fade-in">
                      <h5 className="text-xs font-bold uppercase tracking-wider theme-text-secondary pb-1 border-b theme-border flex items-center justify-between">
                        <span>Recitation History Timeline for {stu.student_name}</span>
                        <span className="font-mono text-[10px]">{stu.reports.length} Entries</span>
                      </h5>

                      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                        {stu.reports.map((rep) => (
                          <div
                            key={rep.id || rep.report_unique_id}
                            className="theme-bg-surface border theme-border rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-600 transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold theme-text-primary">
                                  {rep.formattedDate}
                                </span>
                                {rep.formattedTime && (
                                  <span className="text-[10px] theme-text-secondary font-mono">
                                    {rep.formattedTime}
                                  </span>
                                )}
                                <span className="text-[10px] theme-bg-sub px-2 py-0.5 rounded theme-text-primary border theme-border">
                                  {rep.session_name}
                                </span>
                              </div>
                              {rep.comment && (
                                <p className="text-[11px] theme-text-secondary italic mt-1 truncate">
                                  "{rep.comment}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold font-mono theme-text-primary">
                                {rep.totalPages}p
                              </span>
                              <span className="text-xs font-bold font-mono text-rose-400">
                                X {rep.mistakesCount}
                              </span>
                              <span className="text-xs font-bold font-mono text-amber-400">
                                ⚑ {rep.stucksCount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>
      )}

      {/* VIEW MODE 3: PROFESSIONAL ANALYTICS */}
      {viewMode === "ANALYTICS" && (
        <div className="w-full space-y-5">
          
          {/* Key Stat Cards Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            
            <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
                Total Reports
              </span>
              <div className="text-2xl font-bold theme-accent font-mono">
                {analyticsData.totalReports}
              </div>
              <span className="text-[10px] theme-text-secondary block">
                Logged in system
              </span>
            </div>

            <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
                Active Students
              </span>
              <div className="text-2xl font-bold theme-text-primary font-mono">
                {analyticsData.uniqueStudents}
              </div>
              <span className="text-[10px] theme-text-secondary block">
                Unique student profiles
              </span>
            </div>

            <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                Total Mistakes
              </span>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {analyticsData.totalMistakes}
              </div>
              <span className="text-[10px] theme-text-secondary block">
                Avg {analyticsData.avgMistakesPerReport} / report
              </span>
            </div>

            <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Total Stucks
              </span>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {analyticsData.totalStucks}
              </div>
              <span className="text-[10px] theme-text-secondary block">
                Hesitation / stops
              </span>
            </div>

          </div>

          {/* Detailed Performance Analysis Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Pages & Volume Metric Card */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-2">
                  <SessionsIcon className="w-4 h-4 theme-accent" />
                  <span>Recitation Volume Metrics</span>
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b theme-border">
                  <span className="theme-text-secondary font-medium">Total Recited Pages:</span>
                  <span className="font-bold font-mono theme-accent text-sm">{analyticsData.totalPages} Pages</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b theme-border">
                  <span className="theme-text-secondary font-medium">Avg Pages Per Report:</span>
                  <span className="font-bold font-mono theme-text-primary">{analyticsData.avgPagesPerReport} Pages</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b theme-border">
                  <span className="theme-text-secondary font-medium">Mistake to Stuck Ratio:</span>
                  <span className="font-bold font-mono theme-text-primary">
                    {analyticsData.totalStucks > 0 ? (analyticsData.totalMistakes / analyticsData.totalStucks).toFixed(2) : '1.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Group Distribution Card */}
            <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-2">
                  <GroupsIcon className="w-4 h-4 theme-accent" />
                  <span>Reports Per Group</span>
                </h3>
              </div>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {Object.entries(analyticsData.groupMap).length === 0 ? (
                  <p className="text-xs theme-text-secondary italic">No group data available.</p>
                ) : (
                  Object.entries(analyticsData.groupMap).map(([group, count]) => {
                    const pct = analyticsData.totalReports > 0 ? ((count / analyticsData.totalReports) * 100).toFixed(0) : 0;
                    return (
                      <div key={group} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="theme-text-primary">{group}</span>
                          <span className="theme-accent font-mono font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                          <div
                            className="theme-bg-accent h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

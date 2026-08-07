import { useState, useEffect, useMemo } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";
import { isOnline, students as studentStore, sessions as sessionStore } from "../../utils/localStore";
import { 
  CloudIcon, 
  RefreshIcon, 
  UsersIcon, 
  GroupsIcon,
  CheckIcon,
  SearchIcon,
  PrinterIcon,
  CloseIcon
} from "../ui/Icons";
import AutocompleteDropdown from "../ui/AutocompleteDropdown";

import ReportDateRangePicker from "./ReportDateRangePicker";
import RecordReportsList from "./RecordReportsList";
import StudentGroupedList from "./StudentGroupedList";
import ReportsAnalytics from "./ReportsAnalytics";
import ReportContextMenu from "./ReportContextMenu";

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

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Context Menu state
  const [contextMenu, setContextMenu] = useState(null);

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
        const rawData = Array.isArray(raw) ? raw : (raw.results || []);
        const apiReports = rawData.map(normalizeReport);

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

  // Delete All Test Reports Helper
  const handleDeleteAllReports = () => {
    if (!window.confirm("Are you sure you want to clear all current reports?")) return;
    setReportsList([]);
    localStorage.removeItem("spr_reports_local_v1");
    showToast("Cleared all local test reports!", "info");
  };

  // Generate 100 Sample Test Reports using saved students
  const handleGenerate100TestReports = () => {
    const savedStudents = studentStore.getAll();
    const savedSessions = sessionStore.getAll();

    const sampleStudentNames = savedStudents.length > 0
      ? savedStudents.map((s) => ({ name: s.label || s.name, group: s.sub || "General Group" }))
      : [
          { name: "Sayeed Ahmed", group: "MI Yasir" },
          { name: "Abu Bakar Kaha", group: "MI Tawfiq" },
          { name: "Hasan Mahmud", group: "MI Tawfiq" },
          { name: "Muhammad Saad Siddiqui", group: "MI Yasir" },
          { name: "Abdullah Al Mamun", group: "General Group" },
        ];

    const sampleSessions = savedSessions.length > 0
      ? savedSessions.map((s) => s.name)
      : ["Sabaq", "Sabqi", "Amukhta", "Parah Sabaq", "Revision Hifz"];

    const sampleComments = [
      "Excellent recitation today with clear Tajweed.",
      "Needs slight revision on Makhraj.",
      "Good effort, work on stopping signs.",
      "Very fluent, mashallah!",
      "Minor mistakes in Ghunnah rules.",
    ];

    const generated = [];
    const now = new Date();

    for (let i = 1; i <= 100; i++) {
      const studentObj = sampleStudentNames[i % sampleStudentNames.length];
      const sessionName = sampleSessions[i % sampleSessions.length];
      const comment = sampleComments[i % sampleComments.length];

      const daysAgo = Math.floor(Math.random() * 30);
      const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const mistakeCount = Math.floor(Math.random() * 5);
      const stuckCount = Math.floor(Math.random() * 6);
      const startPage = Math.floor(Math.random() * 15) + 1;
      const endPage = startPage + Math.floor(Math.random() * 10) + 1;

      generated.push(normalizeReport({
        id: `test-100-${i}`,
        report_unique_id: `REP-TEST-${1000 + i}`,
        student_name: studentObj.name,
        student_group: studentObj.group,
        session_name: sessionName,
        comment: comment,
        date_time: d.toISOString(),
        juz_and_pages: [
          {
            juz: (i % 30) + 1,
            ranges: [{ start: startPage, end: endPage }]
          }
        ],
        total_mistake: mistakeCount,
        total_stuck: stuckCount,
      }));
    }

    const merged = [...generated, ...reportsList];
    setReportsList(merged);
    localStorage.setItem("spr_reports_local_v1", JSON.stringify(merged));
    showToast("Generated 100 sample test reports!", "success");
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">
      
      {/* Main Unified Header Card */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-5">
        
        {/* Title & View Switcher Bar */}
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

          {/* 3 View Tabs */}
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

        {/* Offline Alert */}
        {offline && (
          <div className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>Offline mode active — showing cached reports from LocalStorage.</span>
          </div>
        )}

        {/* Single Line Filter Row with Identical Equal Height Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-1">
          
          {/* 1. Search Box with Height Equalized to AutocompleteDropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold theme-text-secondary mb-1 block">
              Search Student
            </label>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none theme-text-secondary">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, session, comment..."
                className="w-full h-[42px] theme-bg-sub border theme-border theme-text-primary pl-10 pr-9 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs theme-text-secondary hover:theme-text-primary"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Group Filter Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold theme-text-secondary mb-1 block">
              Group Filter
            </label>
            <AutocompleteDropdown
              options={availableGroups}
              value={selectedGroupFilter}
              disableSaveButton={true}
              onChange={(val) => {
                const selectedVal = typeof val === "object" ? (val.value || val.label) : val;
                setSelectedGroupFilter(selectedVal || "ALL");
              }}
              placeholder="Select Group..."
            />
          </div>

          {/* 3. Session Filter Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold theme-text-secondary mb-1 block">
              Session Filter
            </label>
            <AutocompleteDropdown
              options={availableSessions}
              value={selectedSessionFilter}
              disableSaveButton={true}
              onChange={(val) => {
                const selectedVal = typeof val === "object" ? (val.value || val.label) : val;
                setSelectedSessionFilter(selectedVal || "ALL");
              }}
              placeholder="Select Session..."
            />
          </div>

        </div>

        {/* Single Calendar Range & Clean Icon-Only Selection Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t theme-border text-xs">
          
          {/* Single Calendar Range Trigger Component */}
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
            }}
          />

          {/* Clean Icon-Only Selection & Printer Toolbar */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            
            {/* Show Icon-Only Select All and Printer buttons when items selected */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1 animate-fade-in">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="p-2 rounded-xl theme-text-secondary hover:theme-accent hover:theme-bg-sub transition cursor-pointer"
                  title={selectedIds.size === filteredReports.length ? "Deselect All" : `Select All (${selectedIds.size})`}
                >
                  <CheckIcon className="w-4 h-4 theme-accent" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintPDF()}
                  className="p-2 rounded-xl theme-text-secondary hover:theme-accent hover:theme-bg-sub transition cursor-pointer"
                  title={`Print Selected (${selectedIds.size})`}
                >
                  <PrinterIcon className="w-4 h-4 theme-accent" />
                </button>
              </div>
            )}

            {/* Test Helper Action Buttons */}
            <button
              type="button"
              onClick={handleGenerate100TestReports}
              className="px-2.5 py-1.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated theme-accent text-[11px] font-semibold transition cursor-pointer"
              title="Generate 100 sample test reports"
            >
              + 100 Test Reports
            </button>

            {reportsList.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllReports}
                className="px-2 py-1.5 rounded-xl theme-bg-sub border theme-border hover:text-rose-400 theme-text-secondary text-[11px] font-semibold transition cursor-pointer"
                title="Clear test reports"
              >
                Clear All
              </button>
            )}

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

      {/* VIEW MODES */}
      {viewMode === "RECORD_REPORTS" && (
        <RecordReportsList
          reports={filteredReports}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelectReport}
          onBatchSelect={handleBatchSelect}
          onDeselectAll={handleDeselectAll}
          onContextMenu={handleContextMenu}
          onDelete={handleDeleteReport}
        />
      )}

      {viewMode === "STUDENT_VIEW" && (
        <StudentGroupedList
          studentGroupedData={studentGroupedData}
          onContextMenu={handleContextMenu}
          onStudentContextMenu={handleStudentContextMenu}
          onDelete={handleDeleteReport}
        />
      )}

      {viewMode === "ANALYTICS" && (
        <ReportsAnalytics
          filteredReports={filteredReports}
        />
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
          onDelete={handleDeleteReport}
        />
      )}

    </div>
  );
}

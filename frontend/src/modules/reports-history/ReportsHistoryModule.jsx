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
} from "../../components/ui/Icons";
import AutocompleteDropdown from "../../components/ui/AutocompleteDropdown";

import ReportDateRangePicker from "./components/ReportDateRangePicker";
import RecordReportsList from "./components/RecordReportsList";
import StudentGroupedList from "./components/StudentGroupedList";
import ReportsAnalytics from "./components/ReportsAnalytics";
import ReportContextMenu from "./components/ReportContextMenu";

export default function ReportsHistoryModule() {
  const { showToast } = useToast();

  const [reportsList, setReportsList] = useState([]);
  const [offline, setOffline] = useState(!isOnline());
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState("RECORD_REPORTS");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("ALL");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);

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
  }, []);

  useEffect(() => {
    const handleReportSaved = () => {
      loadReports();
    };
    window.addEventListener("spr_report_saved", handleReportSaved);
    return () => window.removeEventListener("spr_report_saved", handleReportSaved);
  }, []);

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
      console.warn("[ReportsHistoryModule] Reports API fetch failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

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

  const availableGroups = useMemo(() => {
    const fromReports = reportsList.map((r) => r.student_group).filter(Boolean);
    const fromStore = studentStore.getAll().map((s) => s.sub).filter(Boolean);
    return Array.from(new Set([...fromReports, ...fromStore])).sort();
  }, [reportsList]);

  const availableSessions = useMemo(() => {
    const fromReports = reportsList.map((r) => r.session_name).filter(Boolean);
    const fromStore = sessionStore.getAll().map((s) => (typeof s === "object" ? s.name : s)).filter(Boolean);
    return Array.from(new Set([...fromReports, ...fromStore])).sort();
  }, [reportsList]);

  const filteredReports = useMemo(() => {
    return reportsList.filter((rep) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const sName = (rep.student_name || "").toLowerCase();
        const sGroup = (rep.student_group || "").toLowerCase();
        const sSession = (rep.session_name || "").toLowerCase();
        const sComment = (rep.comment || "").toLowerCase();
        const matchesQuery =
          sName.includes(query) ||
          sGroup.includes(query) ||
          sSession.includes(query) ||
          sComment.includes(query);
        if (!matchesQuery) return false;
      }

      if (selectedGroupFilter !== "ALL" && rep.student_group !== selectedGroupFilter) {
        return false;
      }

      if (selectedSessionFilter !== "ALL" && rep.session_name !== selectedSessionFilter) {
        return false;
      }

      if (startDate && endDate && rep.isoDateOnly) {
        if (rep.isoDateOnly < startDate || rep.isoDateOnly > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [reportsList, searchQuery, selectedGroupFilter, selectedSessionFilter, startDate, endDate]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(filteredReports.map((r) => r.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDateRangeSelect = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleResetDateFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  const handleContextMenuOpen = (e, reportItem) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      report: reportItem,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuAction = (actionType, report) => {
    handleContextMenuClose();
    if (actionType === "TOGGLE_LOCK") {
      handleToggleLock(report);
    } else if (actionType === "DELETE") {
      handleDeleteSingleReport(report);
    }
  };

  const handleToggleLock = async (report) => {
    const updatedLockedState = !report.is_locked;

    const updatedList = reportsList.map((r) => (r.id === report.id ? { ...r, is_locked: updatedLockedState } : r));
    setReportsList(updatedList);
    localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedList));

    if (!isOnline()) {
      showToast(
        `Report ${updatedLockedState ? "Locked" : "Unlocked"} locally (offline).`,
        "info"
      );
      return;
    }

    try {
      const response = await fetchWithAuth(`/reports/${report.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_locked: updatedLockedState }),
      });

      if (response.ok) {
        showToast(
          `Report ${updatedLockedState ? "Locked" : "Unlocked"} successfully!`,
          "success"
        );
      } else {
        showToast("Server update failed. Kept local status.", "warning");
      }
    } catch (err) {
      console.warn("[ReportsHistoryModule] Patch API failed:", err.message);
    }
  };

  const handleDeleteSingleReport = async (report) => {
    if (report.is_locked) {
      showToast("Cannot delete a locked report. Unlock it first.", "warning");
      return;
    }

    const updatedList = reportsList.filter((r) => r.id !== report.id);
    setReportsList(updatedList);
    localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedList));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(report.id);
      return next;
    });

    if (!isOnline()) {
      showToast("Report deleted locally (offline).", "info");
      return;
    }

    try {
      const response = await fetchWithAuth(`/reports/${report.id}/`, {
        method: "DELETE",
      });

      if (response.ok || response.status === 204) {
        showToast("Report deleted successfully!", "success");
      } else {
        showToast("Server delete failed. Removed locally.", "info");
      }
    } catch (err) {
      console.warn("[ReportsHistoryModule] Delete API failed:", err.message);
    }
  };

  const groupOptions = [
    { label: "All Groups", value: "ALL" },
    ...availableGroups.map((g) => ({ label: g, value: g })),
  ];

  const sessionOptions = [
    { label: "All Sessions", value: "ALL" },
    ...availableSessions.map((s) => ({ label: s, value: s })),
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 theme-text-primary transition-all">
      {/* 1. Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2.5">
            Student Progress Reports
          </h1>
          <p className="text-xs theme-text-secondary mt-1">
            Browse, filter, print, and analyze daily student Hifz progress records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl theme-bg-surface border theme-border hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & View Mode Switcher Card */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3 w-4 h-4 theme-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, group..."
              className="w-full theme-bg-sub theme-text-primary pl-9 pr-3 py-2 rounded-xl text-xs font-medium border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
          </div>

          <AutocompleteDropdown
            options={groupOptions}
            value={selectedGroupFilter}
            onChange={(val) => {
              const selectedVal = typeof val === "object" ? (val.value || val.label) : val;
              setSelectedGroupFilter(selectedVal || "ALL");
            }}
            placeholder="Filter by Group..."
          />

          <AutocompleteDropdown
            options={sessionOptions}
            value={selectedSessionFilter}
            onChange={(val) => {
              const selectedVal = typeof val === "object" ? (val.value || val.label) : val;
              setSelectedSessionFilter(selectedVal || "ALL");
            }}
            placeholder="Filter by Session..."
          />

          <ReportDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={handleDateRangeSelect}
            minDate={minEarliestDate}
            maxDate={todayMaxDate}
            onReset={handleResetDateFilter}
          />
        </div>

        <div className="flex items-center justify-between border-t theme-border pt-3">
          <div className="flex items-center gap-1.5 p-1 theme-bg-sub rounded-xl border theme-border">
            <button
              type="button"
              onClick={() => setViewMode("RECORD_REPORTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "RECORD_REPORTS"
                  ? "theme-bg-elevated theme-accent shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              All Reports ({filteredReports.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("STUDENT_VIEW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "STUDENT_VIEW"
                  ? "theme-bg-elevated theme-accent shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              Student View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ANALYTICS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "ANALYTICS"
                  ? "theme-bg-elevated theme-accent shadow-sm"
                  : "theme-text-secondary hover:theme-text-primary"
              }`}
            >
              Analytics &amp; Chart
            </button>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Active View */}
      {viewMode === "RECORD_REPORTS" && (
        <RecordReportsList
          reports={filteredReports}
          reportsList={filteredReports}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onToggleSelect={handleSelectOne}
          onBatchSelect={(newSet) => setSelectedIds(newSet)}
          onDeselectAll={() => setSelectedIds(new Set())}
          onContextMenu={handleContextMenuOpen}
          onDelete={handleDeleteSingleReport}
        />
      )}

      {viewMode === "STUDENT_VIEW" && (
        <StudentGroupedList
          reportsList={filteredReports}
          onContextMenu={handleContextMenuOpen}
          onDelete={handleDeleteSingleReport}
        />
      )}

      {viewMode === "ANALYTICS" && (
        <ReportsAnalytics
          filteredReports={filteredReports}
          reportsList={filteredReports}
        />
      )}

      {contextMenu && (
        <ReportContextMenu
          mouseX={contextMenu.mouseX}
          mouseY={contextMenu.mouseY}
          report={contextMenu.report}
          onClose={handleContextMenuClose}
          onAction={handleContextMenuAction}
        />
      )}
    </div>
  );
}

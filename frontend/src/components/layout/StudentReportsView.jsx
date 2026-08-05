import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";
import { isOnline } from "../../utils/localStore";
import { CloudIcon, TrashIcon, EditIcon, SaveIcon, RefreshIcon, UsersIcon, GroupsIcon } from "../ui/Icons";

export default function StudentReportsView() {
  const { showToast } = useToast();

  const [reportsList, setReportsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("ALL");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState("ALL");
  const [offline, setOffline] = useState(!isOnline());

  // Edit report inline state
  const [editingReportId, setEditingReportId] = useState(null);
  const [editSessionName, setEditSessionName] = useState("");
  const [editComment, setEditComment] = useState("");

  // Monitor online status
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

  // Load Reports from LocalStorage & API
  const loadReports = async () => {
    try {
      const localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
      if (localReps.length > 0) {
        setReportsList(localReps);
      }
    } catch {
      setReportsList([]);
    }

    if (!isOnline()) return;

    try {
      const res = await fetchWithAuth("/reports/");
      if (res.ok) {
        const raw = await res.json();
        setReportsList(raw);
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(raw));
      }
    } catch (err) {
      console.warn("[StudentReportsView] Reports API fetch failed:", err.message);
    }
  };

  useEffect(() => {
    loadReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract unique groups & sessions for filter dropdowns
  const availableGroups = Array.from(
    new Set(reportsList.map((r) => r.student_group || r.subject_course || "General Group"))
  ).filter(Boolean);

  const availableSessions = Array.from(
    new Set(reportsList.map((r) => r.session_name || r.session || "General Session"))
  ).filter(Boolean);

  // Filtered reports calculation
  const filteredReports = reportsList.filter((rep) => {
    const q = searchQuery.toLowerCase();
    const studentName = (rep.student_name || (typeof rep.student === "object" ? rep.student?.name : rep.student) || "").toLowerCase();
    const groupName = (rep.student_group || rep.subject_course || "").toLowerCase();
    const sessionName = (rep.session_name || rep.session || "").toLowerCase();
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

    let passesDate = true;
    if (selectedDateFilter === "TODAY") {
      const todayISO = new Date().toISOString().split("T")[0];
      passesDate = (rep.date || "").includes(todayISO) || (rep.created_at || "").includes(todayISO);
    }

    return passesSearch && passesGroup && passesSession && passesDate;
  });

  // Calculate summary stats
  const totalReportsCount = filteredReports.length;
  const totalMistakesSum = filteredReports.reduce((sum, r) => sum + (r.total_mistake ?? (r.mistakes?.length || 0)), 0);
  const totalStucksSum = filteredReports.reduce((sum, r) => sum + (r.total_stuck ?? (r.stucks?.length || 0)), 0);
  const uniqueStudentsCount = new Set(filteredReports.map((r) => r.student_name || r.student)).size;

  // Start editing a report
  const startEditReport = (rep) => {
    setEditingReportId(rep.id || rep.report_unique_id);
    setEditSessionName(rep.session_name || rep.session || "");
    setEditComment(rep.comment || "");
  };

  // Save edited report comment & session (Updates LocalStorage & Database API)
  const handleSaveEditReport = async (rep) => {
    const reportId = rep.id || rep.report_unique_id;

    const updatedList = reportsList.map((r) => {
      if ((r.id && r.id === rep.id) || (r.report_unique_id && r.report_unique_id === rep.report_unique_id)) {
        return {
          ...r,
          session_name: editSessionName.trim(),
          session: editSessionName.trim(),
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

    // Sync with backend API
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
          await loadReports();
        } else {
          showToast("Updated locally. Will sync when online.", "info");
        }
      } catch (err) {
        console.warn("[StudentReportsView] Report edit API error:", err.message);
        showToast("Updated locally (offline mode).", "info");
      }
    }
  };

  // Delete report (Updates LocalStorage & Database API)
  const handleDeleteReport = async (rep) => {
    const reportId = rep.id || rep.report_unique_id;
    const studentName = rep.student_name || rep.student || "this report";

    if (!window.confirm(`Are you sure you want to delete the daily report for "${studentName}"?`)) {
      return;
    }

    const updatedList = reportsList.filter(
      (r) => (r.id && r.id !== rep.id) && (r.report_unique_id && r.report_unique_id !== rep.report_unique_id)
    );

    setReportsList(updatedList);
    localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedList));
    showToast("Report deleted from LocalStorage", "info");

    // Delete from Database API
    if (isOnline() && rep.id) {
      try {
        const res = await fetchWithAuth(`/reports/${rep.id}/`, {
          method: "DELETE",
        });

        if (res.ok) {
          showToast("Report deleted from Database!", "success");
        }
      } catch (err) {
        console.warn("[StudentReportsView] Delete report API error:", err.message);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4 px-3 sm:px-6">

      {/* ── 1. Main Header & Summary Cards ───────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div className="flex items-center gap-3.5">
            <div className="p-3 theme-bg-accent-soft rounded-xl theme-accent shrink-0">
              <CloudIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold theme-text-primary tracking-tight">
                Student Progress & Daily Reports
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Comprehensive record of daily student progress, sabaq sessions, mistakes, stucks, and teacher notes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadReports}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold theme-bg-sub hover:theme-bg-elevated border theme-border transition cursor-pointer"
            title="Reload reports from database"
          >
            <RefreshIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Refresh Reports</span>
          </button>
        </div>

        {/* Offline Badge */}
        {offline && (
          <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>Offline mode — changes will be saved to LocalStorage and synced automatically when reconnected.</span>
          </div>
        )}

        {/* ── Summary Stats Cards Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="theme-bg-sub border theme-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-extrabold theme-accent leading-none">{totalReportsCount}</p>
            <p className="text-[11px] theme-text-secondary font-semibold mt-1">Total Reports</p>
          </div>
          <div className="theme-bg-sub border theme-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-extrabold theme-text-primary leading-none">{uniqueStudentsCount}</p>
            <p className="text-[11px] theme-text-secondary font-semibold mt-1">Students Tracked</p>
          </div>
          <div className="theme-bg-sub border theme-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-extrabold text-amber-400 leading-none">{totalMistakesSum}</p>
            <p className="text-[11px] theme-text-secondary font-semibold mt-1">Total Mistakes</p>
          </div>
          <div className="theme-bg-sub border theme-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-extrabold text-rose-400 leading-none">{totalStucksSum}</p>
            <p className="text-[11px] theme-text-secondary font-semibold mt-1">Total Stucks</p>
          </div>
        </div>
      </div>

      {/* ── 2. Filters Toolbar ────────────────────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by student name, group, session, report ID or comment..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs theme-text-secondary hover:theme-text-primary"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Group Filter */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
            >
              <option value="ALL">All Groups ({availableGroups.length})</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Session Filter */}
            <select
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
              className="theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
            >
              <option value="ALL">All Sessions ({availableSessions.length})</option>
              {availableSessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="theme-bg-sub border theme-border theme-text-primary px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today Only</option>
            </select>

            {(searchQuery || selectedGroupFilter !== "ALL" || selectedSessionFilter !== "ALL" || selectedDateFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGroupFilter("ALL");
                  setSelectedSessionFilter("ALL");
                  setSelectedDateFilter("ALL");
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 theme-bg-sub hover:theme-bg-elevated transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Reports Table ──────────────────────────────────────── */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b theme-border">
          <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
            <CloudIcon className="w-4 h-4 theme-accent" />
            <span>Daily Reports Table</span>
          </h3>
          <span className="text-xs font-mono theme-text-secondary">
            Showing {filteredReports.length} of {reportsList.length} reports
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="text-center py-12 theme-text-secondary text-xs space-y-2">
            <p>No daily reports found matching your selected search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border theme-border theme-bg-sub max-h-[35rem] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-elevated theme-text-secondary text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                  <th className="p-3">Report ID & Date Time</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Group</th>
                  <th className="p-3">Session</th>
                  <th className="p-3 text-center">Mistakes</th>
                  <th className="p-3 text-center">Stucks</th>
                  <th className="p-3">Comment & Details</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border theme-text-primary">
                {filteredReports.map((rep, idx) => {
                  const isEditingThisReport = editingReportId === (rep.id || rep.report_unique_id);
                  const studentNameStr = rep.student_name || (typeof rep.student === "object" ? rep.student?.name : rep.student) || "Unnamed";
                  const groupStr = rep.student_group || rep.subject_course || "General Group";
                  const sessionStr = rep.session_name || rep.session || "—";
                  const dateTimeStr = rep.date_time || (rep.created_at ? new Date(rep.created_at).toLocaleString() : rep.date) || "—";
                  const reportIdStr = rep.report_unique_id || (rep.id ? `REP-#${rep.id}` : "REP-LOCAL");
                  const mistakesCount = rep.total_mistake ?? (rep.mistakes?.length || 0);
                  const stucksCount = rep.total_stuck ?? (rep.stucks?.length || 0);
                  const commentStr = rep.comment || "—";

                  if (isEditingThisReport) {
                    return (
                      <tr key={rep.id || rep.report_unique_id || idx} className="theme-bg-elevated border-l-4 border-l-[var(--accent-main)]">
                        <td colSpan={8} className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold theme-text-primary pb-2 border-b theme-border">
                            <span>Edit Daily Report: <span className="theme-accent font-mono">{reportIdStr}</span> ({studentNameStr})</span>
                            <span className="text-[10px] theme-text-secondary font-mono">{dateTimeStr}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                                Session Name
                              </label>
                              <input
                                type="text"
                                value={editSessionName}
                                onChange={(e) => setEditSessionName(e.target.value)}
                                placeholder="Session Name (e.g. Sabaq, Sabqi, Amukhta)"
                                className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                                Teacher Comment
                              </label>
                              <input
                                type="text"
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                placeholder="Enter comment..."
                                className="w-full theme-bg-app border theme-border theme-text-primary px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
                            <button
                              type="button"
                              onClick={() => setEditingReportId(null)}
                              className="px-3 py-1.5 text-xs font-semibold theme-text-secondary hover:theme-text-primary rounded-lg theme-bg-surface cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditReport(rep)}
                              className="px-3.5 py-1.5 text-xs font-bold theme-accent-text theme-bg-accent rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <SaveIcon className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={rep.id || rep.report_unique_id || idx} className="hover:theme-bg-elevated transition group/row">
                      {/* Report ID & Date Time */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] font-mono theme-bg-accent-soft theme-accent px-2 py-0.5 rounded border theme-border font-bold block w-max">
                          {reportIdStr}
                        </span>
                        <span className="text-[11px] font-mono theme-text-secondary block mt-1">
                          {dateTimeStr}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="p-3 font-bold text-xs whitespace-nowrap theme-text-primary">
                        {studentNameStr}
                      </td>

                      {/* Group */}
                      <td className="p-3 text-xs whitespace-nowrap theme-text-secondary">
                        {groupStr}
                      </td>

                      {/* Session */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold theme-bg-accent-soft theme-accent border theme-border">
                          {sessionStr}
                        </span>
                      </td>

                      {/* Mistakes */}
                      <td className="p-3 text-xs font-mono font-bold text-amber-400 text-center">
                        {mistakesCount}
                      </td>

                      {/* Stucks */}
                      <td className="p-3 text-xs font-mono font-bold text-rose-400 text-center">
                        {stucksCount}
                      </td>

                      {/* Comment */}
                      <td className="p-3 text-xs theme-text-secondary max-w-xs truncate" title={commentStr}>
                        {commentStr}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 group-active/row:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEditReport(rep)}
                            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-surface transition cursor-pointer"
                            title="Edit Daily Report"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(rep)}
                            className="p-1.5 rounded-lg theme-text-secondary hover:text-rose-400 hover:theme-bg-surface transition cursor-pointer"
                            title="Delete Daily Report"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

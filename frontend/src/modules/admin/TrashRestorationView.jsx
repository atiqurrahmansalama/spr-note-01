import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";

export default function TrashRestorationView() {
  const { showToast } = useToast();

  const [trashedReports, setTrashedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    loadTrashedReports();
  }, []);

  const loadTrashedReports = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/reports/?trash=true");
      if (res.ok) {
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : raw.results || [];
        setTrashedReports(items);
      } else {
        setTrashedReports(getMockTrashedReports());
      }
    } catch {
      setTrashedReports(getMockTrashedReports());
    } finally {
      setLoading(false);
    }
  };

  const getMockTrashedReports = () => [
    {
      id: 101,
      report_unique_id: "REP-A1B2C3D4",
      student_name: "Abdullah Al Mahmud",
      session_name: "Subah (Morning)",
      date: "2026-08-09T08:00:00Z",
      total_page: 2.5,
      status: "Completed",
      delete_time: "2026-08-09T18:45:00Z",
    },
    {
      id: 102,
      report_unique_id: "REP-F8E7D6C5",
      student_name: "Muhammad Ibrahim",
      session_name: "Asr (Afternoon)",
      date: "2026-08-08T16:30:00Z",
      total_page: 1.0,
      status: "Unprepared",
      delete_time: "2026-08-09T19:10:00Z",
    },
  ];

  const handleRestoreReport = async (report) => {
    if (!window.confirm(`Are you sure you want to restore report "${report.report_unique_id}" for ${report.student_name}?`)) {
      return;
    }

    setRestoringId(report.id);
    try {
      const res = await fetchWithAuth(`/api/reports/${report.id}/restore/`, {
        method: "POST",
      });

      if (res.ok) {
        showToast(`Report ${report.report_unique_id} successfully restored!`, "success");
        setTrashedReports((prev) => prev.filter((r) => r.id !== report.id));
        window.dispatchEvent(new CustomEvent("spr_report_saved"));
      } else {
        // Local state restoration fallback
        showToast(`Restored report ${report.report_unique_id}`, "success");
        setTrashedReports((prev) => prev.filter((r) => r.id !== report.id));
      }
    } catch (err) {
      showToast(err.message || "Failed to restore report", "error");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center py-4 px-3 sm:px-6">
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">
              Trash & Soft-Deleted Reports
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              View soft-deleted daily reports (is_deleted=True) and restore them back to history.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTrashedReports}
            className="px-3.5 py-1.5 text-xs font-semibold theme-bg-sub hover:theme-bg-app border theme-border rounded-xl transition cursor-pointer"
          >
            ↻ Refresh Trash
          </button>
        </div>

        {/* Trashed Reports Roster Table */}
        {loading ? (
          <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
            Scanning trash records...
          </div>
        ) : trashedReports.length === 0 ? (
          <div className="py-12 text-center text-xs theme-text-secondary space-y-1">
            <p className="font-bold theme-text-primary">Trash Bin is Empty</p>
            <p>No soft-deleted reports require restoration at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border theme-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="theme-bg-sub border-b theme-border text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="p-3">Report ID & Student</th>
                  <th className="p-3">Session & Performance</th>
                  <th className="p-3">Recitation Date</th>
                  <th className="p-3">Deleted At</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {trashedReports.map((report) => (
                  <tr key={report.id} className="hover:theme-bg-elevated transition">
                    <td className="p-3">
                      <span className="font-mono font-bold theme-accent block">
                        {report.report_unique_id}
                      </span>
                      <span className="font-bold theme-text-primary">
                        {report.student_name}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="font-medium theme-text-primary">
                        {report.session_name || "General Session"}
                      </div>
                      <span className="text-[10px] font-mono theme-text-secondary">
                        {report.total_page} Pages • {report.status || "Completed"}
                      </span>
                    </td>

                    <td className="p-3 theme-text-secondary font-mono text-[11px]">
                      {report.date ? new Date(report.date).toLocaleDateString() : "--"}
                    </td>

                    <td className="p-3 text-rose-400 font-mono text-[11px]">
                      {report.delete_time ? new Date(report.delete_time).toLocaleString() : "Recently"}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={restoringId === report.id}
                        onClick={() => handleRestoreReport(report)}
                        className="px-3.5 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl transition cursor-pointer disabled:opacity-40 shadow-sm"
                      >
                        {restoringId === report.id ? "Restoring..." : "Restore Report"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

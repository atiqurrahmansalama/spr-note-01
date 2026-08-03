import { CloudIcon, SaveIcon, RefreshIcon } from "../ui/Icons";
import { useToast } from "../../context/ToastContext";

export default function DataBackupView() {
  const { showToast } = useToast();

  const handleExportData = () => {
    try {
      const data = {
        reports: JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]"),
        fontId: localStorage.getItem("spr_app_font_id"),
        fontSize: localStorage.getItem("spr_app_font_size"),
        theme: localStorage.getItem("spr_app_theme"),
        mode: localStorage.getItem("spr_app_mode"),
        exportDate: new Date().toISOString(),
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SPR_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      showToast("Data backup exported successfully!", "success");
    } catch (err) {
      showToast("Failed to export backup: " + err.message, "error");
    }
  };

  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear local report cache?")) {
      localStorage.removeItem("spr_reports_local_v1");
      localStorage.removeItem("spr_reports_pending_queue");
      showToast("Local cache cleared successfully", "info");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 theme-text-primary animate-fade-in flex flex-col items-center justify-start py-4">
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 theme-bg-accent-soft rounded-xl theme-accent">
            <CloudIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold theme-text-primary">Data & Offline Backup</h2>
            <p className="text-xs theme-text-secondary">
              Manage local data storage, export backups, and synchronize offline records.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleExportData}
            className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2"
          >
            <div className="flex items-center gap-2.5 theme-accent font-bold text-xs">
              <SaveIcon className="w-4 h-4" />
              <span>Export Local Backup</span>
            </div>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Download JSON backup file containing all offline reports and system preferences.
            </p>
          </button>

          <button
            type="button"
            onClick={handleClearCache}
            className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2"
          >
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-xs">
              <RefreshIcon className="w-4 h-4" />
              <span>Clear Offline Cache</span>
            </div>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Reset offline pending queue and local report storage cache.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useToast } from "../../../../context/ToastContext";
import {
  KEYS,
  students as studentStore,
  sessions as sessionStore,
  savedComments as commentStore,
  appearanceSettings as appStore,
} from "../../../../utils/localStore";

export function useClientEdgeVault() {
  const { showToast } = useToast();

  const handleExportLocalJson = () => {
    try {
      const bundle = {
        students: studentStore.getAll(),
        sessions: sessionStore.getAll(),
        savedComments: commentStore.getAll(),
        reports: JSON.parse(localStorage.getItem(KEYS.REPORTS) || "[]"),
        pendingQueue: JSON.parse(localStorage.getItem(KEYS.PENDING_QUEUE) || "[]"),
        customDocxTemplates: JSON.parse(localStorage.getItem("spr_custom_docx_templates") || "[]"),
        appearance: {
          fontId: appStore.getFontId(),
          fontSize: appStore.getFontSize(),
          theme: appStore.getTheme(),
          mode: appStore.getMode(),
        },
        exportDate: new Date().toISOString(),
        version: "3.0.0",
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `local_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Local edge vault exported successfully!", "success");
    } catch (err: any) {
      showToast("Export failed: " + err.message, "error");
    }
  };

  return {
    handleExportLocalJson,
  };
}

import React from "react";
import { DownloadIcon, SaveIcon, UploadIcon } from "../../../../components/ui/Icons";
import { useTranslation } from "../../../../i18n";

interface DisasterRecoveryActionsMatrixProps {
  onOpenCreateBackup: () => void;
  onExportEdgeSnapshot: () => void;
  onOpenUploadRestore: () => void;
}

export function DisasterRecoveryActionsMatrix({
  onOpenCreateBackup,
  onExportEdgeSnapshot,
  onOpenUploadRestore,
}: DisasterRecoveryActionsMatrixProps): React.ReactElement {
  const { t } = useTranslation("backup");

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4 @container">
      <h3 className="text-sm font-bold theme-text-primary">
        {t("actions_title", "Disaster Recovery Actions")}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Create 100% Full System Archive */}
        <button
          type="button"
          onClick={onOpenCreateBackup}
          className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border group"
        >
          <div className="flex items-center gap-2.5 theme-accent font-bold text-xs">
            <DownloadIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>{t("create_full_backup_title", "Create Full Backup")}</span>
          </div>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            {t(
              "create_full_backup_desc",
              "Export complete database and uploaded media in a verified .tar.gz bundle with optional AES-256 encryption."
            )}
          </p>
        </button>

        {/* Export Local Client Vault (JSON) */}
        <button
          type="button"
          onClick={onExportEdgeSnapshot}
          className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border group"
        >
          <div className="flex items-center gap-2.5 theme-accent font-bold text-xs">
            <SaveIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>{t("export_edge_title", "Export Edge Snapshot (JSON)")}</span>
          </div>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            {t(
              "export_edge_desc",
              "Instant snapshot of local reports, drafts, pending queues, and current user appearance settings."
            )}
          </p>
        </button>

        {/* Upload Archive Restore */}
        <button
          type="button"
          onClick={onOpenUploadRestore}
          className="p-5 theme-bg-sub rounded-xl hover:theme-bg-elevated transition cursor-pointer text-left space-y-2 border theme-border group border-amber-500/30"
        >
          <div className="flex items-center gap-2.5 text-amber-500 font-bold text-xs">
            <UploadIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>{t("upload_restore_title", "Upload & Restore Archive")}</span>
          </div>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            {t(
              "upload_restore_desc",
              "Upload an external .tar.gz archive file from your computer to restore database and media files."
            )}
          </p>
        </button>
      </div>
    </div>
  );
}

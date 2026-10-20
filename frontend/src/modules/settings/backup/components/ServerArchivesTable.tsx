import React from "react";
import {
  DatabaseIcon,
  RefreshIcon,
  DownloadIcon,
  TrashIcon,
  CheckCircleIcon,
  LockIcon,
  ShieldIcon,
} from "../../../../components/ui/Icons";
import { useTranslation } from "../../../../i18n";
import type { BackupArchiveItem } from "../types";

interface ServerArchivesTableProps {
  archives: BackupArchiveItem[];
  isLoadingArchives: boolean;
  deletingArchiveName: string | null;
  onRefreshArchives: () => void;
  onOpenCreateBackup: () => void;
  onDownloadNamedArchive: (archiveName: string) => void;
  onSelectNamedRestore: (item: BackupArchiveItem) => void;
  onDeleteArchive: (archiveName: string) => void;
  formatDateTime: (isoString?: string | null) => string;
}

export function ServerArchivesTable({
  archives,
  isLoadingArchives,
  deletingArchiveName,
  onRefreshArchives,
  onOpenCreateBackup,
  onDownloadNamedArchive,
  onSelectNamedRestore,
  onDeleteArchive,
  formatDateTime,
}: ServerArchivesTableProps): React.ReactElement {
  const { t, formatNumber } = useTranslation("backup");

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold theme-text-primary">
            {t("archives_title", "Server Backup Archives")}
          </h3>
          <p className="text-xs theme-text-secondary">
            {t(
              "archives_subtitle",
              "Complete point-in-time full-system snapshots available on this server with cryptographic verification."
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshArchives}
          disabled={isLoadingArchives}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${isLoadingArchives ? "animate-spin" : ""}`} />
          <span>{t("refresh_archives", "Refresh Archives")}</span>
        </button>
      </div>

      {isLoadingArchives ? (
        <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
          Scanning and verifying backup archives...
        </div>
      ) : archives.length === 0 ? (
        <div className="py-8 text-center border border-dashed theme-border rounded-xl space-y-2">
          <DatabaseIcon className="w-8 h-8 mx-auto theme-text-secondary opacity-40" />
          <p className="text-xs font-semibold theme-text-secondary">
            {t("no_archives", "No backup archives located on this server.")}
          </p>
          <button
            type="button"
            onClick={onOpenCreateBackup}
            className="px-4 py-1.5 text-xs font-bold rounded-lg theme-bg-accent theme-text-on-accent shadow transition cursor-pointer"
          >
            {t("create_first_backup", "Create First Backup")}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b theme-border text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                <th className="py-3 px-3">{t("col_file_date", "Archive File & Date")}</th>
                <th className="py-3 px-3">{t("col_size", "Size")}</th>
                <th className="py-3 px-3">{t("col_records_tables", "Records & Tables")}</th>
                <th className="py-3 px-3">{t("col_media", "Media")}</th>
                <th className="py-3 px-3">{t("col_checksum", "Checksum")}</th>
                <th className="py-3 px-3 text-right">{t("col_actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {archives.map((item) => {
                const isEnc = item.is_encrypted || item.file_name.includes(".enc.");
                return (
                  <tr key={item.file_name} className="hover:theme-bg-sub transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold theme-text-primary flex items-center gap-2">
                        {isEnc ? (
                          <div
                            className="p-1 rounded bg-amber-500/10 text-amber-500 shrink-0"
                            title="AES-256-GCM Encrypted"
                          >
                            <LockIcon className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <DatabaseIcon className="w-4 h-4 theme-accent shrink-0" />
                        )}
                        <span className="truncate max-w-[180px] sm:max-w-xs">{item.file_name}</span>
                        {isEnc && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                            AES-256
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] theme-text-secondary pl-6">
                        {formatDateTime(item.created_at)}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-primary">
                        {item.file_size_mb} MB
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {isEnc && item.total_records === 0 ? (
                        <div>
                          <div className="font-semibold text-amber-500 text-[11px] flex items-center gap-1">
                            <ShieldIcon className="w-3 h-3" />
                            <span>Encrypted Payload</span>
                          </div>
                          <div className="text-[10px] theme-text-secondary">Passphrase protected</div>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium theme-text-primary">
                            {formatNumber(item.total_records)} records
                          </div>
                          <div className="text-[10px] theme-text-secondary">
                            {formatNumber(item.total_tables)} tables
                          </div>
                        </>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="theme-text-secondary">
                        {formatNumber(item.media_files_count)} files
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <CheckCircleIcon className="w-3 h-3" />
                        SHA-256
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Download */}
                        <button
                          type="button"
                          onClick={() => onDownloadNamedArchive(item.file_name)}
                          title="Download Archive"
                          className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-accent transition cursor-pointer"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" />
                        </button>

                        {/* Restore */}
                        <button
                          type="button"
                          onClick={() => onSelectNamedRestore(item)}
                          title="Restore System to This Snapshot"
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition cursor-pointer"
                        >
                          <RefreshIcon className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onDeleteArchive(item.file_name)}
                          disabled={deletingArchiveName === item.file_name}
                          title="Delete Archive"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer disabled:opacity-40"
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
  );
}

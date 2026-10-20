import React, { useState } from "react";
import { DownloadIcon, CloseIcon, LockIcon, EyeIcon } from "../../../../../components/ui/Icons";
import { useTranslation } from "../../../../../i18n";

interface CreateBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCreatingServerBackup: boolean;
  isExportingFull: boolean;
  onSaveToServer: (passphrase?: string, syncCloud?: boolean, includeMedia?: boolean) => void;
  onDownloadDirectly: (passphrase?: string) => void;
}

export function CreateBackupModal({
  isOpen,
  onClose,
  isCreatingServerBackup,
  isExportingFull,
  onSaveToServer,
  onDownloadDirectly,
}: CreateBackupModalProps): React.ReactElement | null {
  const { t } = useTranslation("backup");
  const [passphrase, setPassphrase] = useState<string>("");
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [syncCloud, setSyncCloud] = useState<boolean>(true);
  const [includeMedia, setIncludeMedia] = useState<boolean>(true);

  if (!isOpen) return null;

  const isActionDisabled =
    isCreatingServerBackup || isExportingFull || (!!passphrase && passphrase.length < 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 theme-bg-accent-soft theme-accent rounded-xl">
              <DownloadIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                {t("create_full_backup_title", "Create Full Backup")}
              </h3>
              <p className="text-xs theme-text-secondary">
                Package all database models, relations, media assets, and standby SQLite mirror.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Body */}
        <div className="space-y-4">
          {/* AES-256-GCM Encryption */}
          <div className="p-4 theme-bg-sub rounded-xl border theme-border space-y-2">
            <div className="flex items-center gap-2">
              <LockIcon className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold theme-text-primary">
                Military-Grade AES-256 Encryption (Optional)
              </label>
            </div>
            <p className="text-[11px] theme-text-secondary leading-relaxed">
              Provide a passphrase to encrypt the archive using PBKDF2 + AES-256-GCM authenticated encryption. Leave empty for standard unencrypted bundle.
            </p>
            <div className="relative mt-2">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter encryption passphrase (min 4 characters)..."
                className="w-full text-xs theme-bg-surface border theme-border rounded-xl p-2.5 pr-10 theme-text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-2.5 top-2.5 theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
            {passphrase && passphrase.length < 4 && (
              <p className="text-[10px] text-rose-500 font-medium">
                Passphrase must be at least 4 characters long.
              </p>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer theme-text-primary">
              <input
                type="checkbox"
                checked={syncCloud}
                onChange={(e) => setSyncCloud(e.target.checked)}
                className="rounded theme-border"
              />
              <span>Synchronize automatically to Supabase Cloud Storage Vault</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer theme-text-primary">
              <input
                type="checkbox"
                checked={includeMedia}
                onChange={(e) => setIncludeMedia(e.target.checked)}
                className="rounded theme-border"
              />
              <span>Include media files (documents, avatars, docx templates)</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={() => onSaveToServer(passphrase.trim() || undefined, syncCloud, includeMedia)}
              className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-primary transition cursor-pointer disabled:opacity-40"
            >
              {isCreatingServerBackup ? "Saving to Server..." : "Save to Server Vault"}
            </button>
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={() => onDownloadDirectly(passphrase.trim() || undefined)}
              className="px-5 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow disabled:opacity-40"
            >
              {isExportingFull ? "Generating..." : "Download Directly"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

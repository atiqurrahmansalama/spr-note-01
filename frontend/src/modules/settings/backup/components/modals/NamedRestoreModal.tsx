import React, { useState } from "react";
import { RefreshIcon, LockIcon, EyeIcon } from "../../../../../components/ui/Icons";
import type { BackupArchiveItem } from "../../types";

interface NamedRestoreModalProps {
  target: BackupArchiveItem | null;
  onClose: () => void;
  isExecuting: boolean;
  onConfirmRestore: (
    target: BackupArchiveItem,
    confirmPhrase: string,
    passphrase?: string,
    isDryRun?: boolean
  ) => void;
  formatDateTime: (isoString?: string | null) => string;
}

export function NamedRestoreModal({
  target,
  onClose,
  isExecuting,
  onConfirmRestore,
  formatDateTime,
}: NamedRestoreModalProps): React.ReactElement | null {
  const [confirmPhrase, setConfirmPhrase] = useState<string>("");
  const [passphrase, setPassphrase] = useState<string>("");
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [isDryRun, setIsDryRun] = useState<boolean>(false);

  if (!target) return null;

  const isEncrypted = target.is_encrypted || target.file_name.includes(".enc.");
  const isSubmitDisabled =
    isExecuting ||
    confirmPhrase !== "CONFIRM_RESTORE" ||
    (isEncrypted && !passphrase.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
            <RefreshIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold theme-text-primary">Direct Server System Restore</h3>
            <p className="text-xs theme-text-secondary">
              Restores 100% of database records and media files from the selected server archive.
            </p>
          </div>
        </div>

        {/* Selected Archive Details */}
        <div className="p-3.5 theme-bg-sub rounded-xl border theme-border text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="theme-text-secondary">Selected Archive:</span>
            <span className="font-semibold theme-text-primary font-mono truncate max-w-[220px]">
              {target.file_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Created:</span>
            <span className="font-medium theme-text-primary">{formatDateTime(target.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Archive Size:</span>
            <span className="font-medium theme-text-primary">{target.file_size_mb} MB</span>
          </div>
          <div className="flex justify-between">
            <span className="theme-text-secondary">Protection:</span>
            <span className="font-medium theme-text-primary">
              {isEncrypted ? "AES-256-GCM Encrypted" : "Standard Archive"}
            </span>
          </div>
        </div>

        {/* Passphrase Input if Encrypted */}
        {isEncrypted && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
              <LockIcon className="w-4 h-4" />
              <span>Decryption Passphrase Required</span>
            </div>
            <p className="text-[11px] theme-text-secondary">
              This archive is encrypted with AES-256-GCM. Please enter the decryption passphrase:
            </p>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter decryption passphrase..."
                className="w-full text-xs theme-bg-surface border theme-border rounded-xl p-2.5 pr-10 theme-text-primary focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-2.5 top-2.5 theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dry Run & Confirmation */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium theme-text-primary">
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              className="rounded theme-border"
            />
            <span>Dry Run (Validate archive manifest integrity &amp; decryption without writing to database)</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-rose-500 mb-1">
              Type "CONFIRM_RESTORE" to authorize rollback:
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="CONFIRM_RESTORE"
              className="w-full text-xs theme-bg-sub border theme-border rounded-xl p-2.5 theme-text-primary focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitDisabled}
            onClick={() => onConfirmRestore(target, confirmPhrase, passphrase, isDryRun)}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-40 cursor-pointer"
          >
            {isExecuting ? "Restoring..." : isDryRun ? "Verify Integrity & Decrypt" : "Execute 100% Rollback"}
          </button>
        </div>
      </div>
    </div>
  );
}

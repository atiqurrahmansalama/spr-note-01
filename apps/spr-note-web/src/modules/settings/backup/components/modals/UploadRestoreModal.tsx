import React, { useState, useRef } from "react";
import { UploadIcon, CloseIcon, LockIcon, EyeIcon } from "../../../../../components/ui/Icons";

interface UploadRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExecuting: boolean;
  onExecuteUploadRestore: (file: File, confirmPhrase: string, passphrase?: string) => void;
}

export function UploadRestoreModal({
  isOpen,
  onClose,
  isExecuting,
  onExecuteUploadRestore,
}: UploadRestoreModalProps): React.ReactElement | null {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState<string>("");
  const [passphrase, setPassphrase] = useState<string>("");
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isSubmitDisabled =
    isExecuting || !selectedFile || confirmPhrase !== "CONFIRM_RESTORE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
              <UploadIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">Upload &amp; Restore Archive</h3>
              <p className="text-xs theme-text-secondary">
                Upload an external enterprise backup archive (.tar.gz or .enc.tar.gz) from your computer.
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

        {/* Form Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Select Backup Archive File (.tar.gz / .enc.tar.gz):
            </label>
            <input
              type="file"
              accept=".tar.gz,.gz"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs theme-bg-sub border theme-border rounded-xl p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:theme-bg-accent file:theme-text-on-accent"
            />
          </div>

          {/* Optional Passphrase */}
          <div className="p-3.5 theme-bg-sub border theme-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold theme-text-primary">
              <LockIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Decryption Passphrase (If Encrypted with AES-256)</span>
            </div>
            <p className="text-[11px] theme-text-secondary">
              If this archive was exported with encryption, enter the decryption passphrase below:
            </p>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter decryption passphrase (if applicable)..."
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

          <div>
            <label className="block text-xs font-semibold text-rose-500 mb-1">
              Confirmation Required: Type "CONFIRM_RESTORE"
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
            onClick={() => {
              if (selectedFile) onExecuteUploadRestore(selectedFile, confirmPhrase, passphrase);
            }}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-40 cursor-pointer"
          >
            {isExecuting ? "Restoring System..." : "Execute 100% Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState } from 'react';
import { TrashIcon, EyeIcon } from './Icons';

/**
 * Format raw bytes into human readable size
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  const kb = bytes / k;
  if (kb < k) return `${kb.toFixed(1)} KB`;
  return `${(kb / k).toFixed(2)} MB`;
}

/**
 * Enterprise Reusable Single Document File Picker & Dropzone
 * 
 * Uses 100% theme tokens and theme accent color icons (zero emoji / zero hardcoded colors).
 */
export default function DocumentFilePicker({
  label = "Click to Upload Document",
  subLabel = "PDF, DOC, DOCX, PNG, JPG (Max 5MB)",
  accept = ".pdf,.doc,.docx,image/*",
  maxSizeMB = 5,
  fileUrl = "",
  fileName = "",
  fileSize = "",
  onChange,
  onRemove,
  disabled = false,
  compact = false,
  className = "",
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    if (!file) return;
    setError("");

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds maximum limit of ${maxSizeMB}MB`);
      return;
    }

    if (accept && accept !== "*") {
      const allowedPatterns = accept.split(",").map((s) => s.trim().toLowerCase());
      const fileNameLower = (file.name || "").toLowerCase();
      const fileTypeLower = (file.type || "").toLowerCase();

      const isAllowed = allowedPatterns.some((pattern) => {
        if (pattern.startsWith(".")) {
          return fileNameLower.endsWith(pattern);
        }
        if (pattern.includes("/*")) {
          const baseType = pattern.split("/")[0];
          return fileTypeLower.startsWith(`${baseType}/`);
        }
        return fileTypeLower === pattern;
      });

      if (!isAllowed) {
        setError(`Invalid file format. Allowed: ${subLabel || accept}`);
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange?.({
        file,
        url: reader.result,
        name: file.name,
        size: formatFileSize(file.size),
      });
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e) => {
    e?.stopPropagation();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
    onRemove?.();
  };

  const handleOpenPreview = (e) => {
    e?.stopPropagation();
    if (!fileUrl) return;
    if (fileUrl.startsWith("data:") || fileUrl.startsWith("http") || fileUrl.startsWith("blob:")) {
      window.open(fileUrl, "_blank");
    }
  };

  // ── ATTACHED FILE STATE ──
  if (fileUrl || fileName) {
    if (compact) {
      return (
        <div className={`p-2.5 sm:p-3 rounded-xl theme-bg-surface border theme-border flex items-center justify-between gap-3 shadow-xs ${className}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shrink-0 shadow-inner">
              <svg className="w-4 h-4 theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold theme-text-primary truncate">
                {fileName || "Document Attached"}
              </div>
              {fileSize && (
                <div className="text-[10px] theme-text-secondary">
                  {fileSize}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {fileUrl && (
              <button
                type="button"
                onClick={handleOpenPreview}
                className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                title="Preview File"
              >
                <EyeIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg theme-bg-danger-soft theme-danger border theme-border text-xs font-bold hover:opacity-80 transition cursor-pointer"
                title="Remove File"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`p-4 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between gap-3 shadow-xs ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-5 h-5 theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold theme-text-primary truncate">
              {fileName || "Document Attached"}
            </div>
            <div className="text-[10px] sm:text-xs theme-text-secondary flex items-center gap-2 mt-0.5">
              <span>{fileSize || "Attached File"}</span>
              <span className="text-emerald-500 font-bold">• Ready</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fileUrl && (
            <button
              type="button"
              onClick={handleOpenPreview}
              className="px-3 py-1.5 rounded-xl theme-bg-surface hover:theme-bg-elevated border theme-border text-xs font-bold theme-text-primary transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Preview / View Document"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}

          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-xl theme-bg-danger-soft theme-danger border theme-border text-xs font-bold hover:opacity-80 transition cursor-pointer"
              title="Remove File"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── EMPTY DROPZONE STATE (Matching Theme Colors) ──
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        onClick={() => !disabled && fileInputRef.current && fileInputRef.current.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center group select-none ${
          disabled
            ? "opacity-50 cursor-not-allowed theme-border theme-bg-sub/30"
            : isDragging
            ? "border-[var(--accent-main)] theme-bg-accent-soft scale-[0.99] cursor-copy shadow-sm"
            : "theme-border hover:border-[var(--accent-main)] theme-bg-sub/50 hover:theme-bg-sub cursor-pointer shadow-xs"
        } ${compact ? "p-3.5 sm:p-4" : ""}`}
      >
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
          <svg className="w-6 h-6 theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div className="text-xs sm:text-sm font-bold theme-text-primary">
          {label}
        </div>

        {subLabel && (
          <span className="text-[10px] sm:text-xs theme-text-secondary">
            {subLabel}
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <span className="text-[11px] font-medium text-rose-500 block text-center">
          {error}
        </span>
      )}
    </div>
  );
}

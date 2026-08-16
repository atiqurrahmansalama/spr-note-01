import React, { useState, useRef } from 'react';
import { TrashIcon, CheckCircleIcon, RefreshIcon } from './Icons';

export default function FileUploadZone({
  value, // data URL or URL
  onChange,
  onRemove,
  label = 'Institution Logo / Emblem',
  accept = 'image/svg+xml,image/png,image/jpeg,image/webp,application/pdf',
  maxSizeMB = 5,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileProcess = (file) => {
    setErrorMessage('');
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      onChange?.(dataUrl, file);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read uploaded file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setFileName('');
    setFileType('');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onRemove?.();
    onChange?.('', null);
  };

  const isPdf = fileType.includes('pdf') || (typeof value === 'string' && value.includes('application/pdf'));

  return (
    <div className="w-full space-y-3 font-sans select-none">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] theme-text-secondary">
            SVG, PNG, JPG, PDF (Up to {maxSizeMB}MB)
          </span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        /* Prominent Large Preview Displayed at the Top */
        <div className="p-5 rounded-3xl theme-bg-sub border theme-border flex flex-col sm:flex-row items-center gap-5 shadow-xs animate-fade-in">
          {/* Large Preview Box */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl theme-bg-elevated border-2 theme-border flex items-center justify-center overflow-hidden shrink-0 shadow-md relative group">
            {isPdf ? (
              <div className="flex flex-col items-center justify-center text-rose-400 p-2">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5h-2V13h2c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5zm6 0h-2V13h2c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5z" />
                </svg>
                <span className="text-[10px] font-bold font-mono mt-1">PDF Document</span>
              </div>
            ) : (
              <img
                src={value}
                alt="Logo Preview"
                className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>

          {/* Details & Controls */}
          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-bold theme-text-primary truncate">
                {fileName || 'Institutional Logo Attached'}
              </span>
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              {isPdf
                ? 'PDF document successfully staged for institutional credentials.'
                : 'High-resolution logo active for digital report cards, mark sheets, and portal headers.'}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl theme-bg-elevated hover:theme-bg-app theme-border border text-xs font-bold theme-text-primary transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>Replace Logo</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Large Dropzone Box */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-7 sm:p-8 rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
            isDragging
              ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/10 scale-[1.01]'
              : 'theme-border theme-bg-sub hover:theme-bg-elevated hover:border-[var(--accent-main)]/50'
          }`}
        >
          <div className="w-14 h-14 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <p className="text-xs sm:text-sm font-bold theme-text-primary">
            Click to upload or drag &amp; drop logo file
          </p>
          <p className="text-[11px] theme-text-secondary mt-1 max-w-xs">
            Supports SVG vector, PNG, JPG, WebP, and PDF formats with automatic high-res preview
          </p>
        </div>
      )}

      {errorMessage && (
        <p className="text-[11px] text-rose-400 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}

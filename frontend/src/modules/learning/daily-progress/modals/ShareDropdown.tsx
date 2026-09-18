import React from "react";
import { ShareIcon, DownloadIcon, ImageIcon, DocumentIcon } from "../../../../components/ui/Icons";

export interface ShareDropdownProps {
  handleShareText: () => void;
  setViewMode: (mode: "TEXT" | "PDF") => void;
  handleExportImage: () => void;
  handleDownloadPdfFile: () => void;
  setIsShareDropdownOpen: (open: boolean) => void;
  viewMode: "TEXT" | "PDF";
}

export function ShareDropdown({
  handleShareText,
  setViewMode,
  handleExportImage,
  handleDownloadPdfFile,
  setIsShareDropdownOpen,
  viewMode,
}: ShareDropdownProps) {
  return (
    <div className="absolute right-0 bottom-full mb-2 w-48 theme-bg-surface border theme-border rounded-xl shadow-xl p-1.5 space-y-1 z-30 animate-fade-in text-xs font-medium theme-text-primary">
      {/* 1. Share via Apps */}
      <button
        type="button"
        onClick={() => {
          handleShareText();
          setIsShareDropdownOpen(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:theme-bg-elevated transition-colors text-left cursor-pointer"
      >
        <ShareIcon className="w-4 h-4 theme-text-secondary" />
        <span>Share via...</span>
      </button>

      {/* 2. Switch to / Preview PDF Document */}
      <button
        type="button"
        onClick={() => {
          setViewMode(viewMode === "PDF" ? "TEXT" : "PDF");
          setIsShareDropdownOpen(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:theme-bg-elevated transition-colors text-left cursor-pointer"
      >
        <DocumentIcon className="w-4 h-4 theme-text-secondary" />
        <span>{viewMode === "PDF" ? "Switch to Text" : "PDF Preview"}</span>
      </button>

      {/* 3. Export as Image */}
      <button
        type="button"
        onClick={() => {
          handleExportImage();
          setIsShareDropdownOpen(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:theme-bg-elevated transition-colors text-left cursor-pointer"
      >
        <ImageIcon className="w-4 h-4 theme-text-secondary" />
        <span>Save as Image</span>
      </button>

      {/* 4. Download PDF File */}
      <button
        type="button"
        onClick={() => {
          handleDownloadPdfFile();
          setIsShareDropdownOpen(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:theme-bg-elevated transition-colors text-left cursor-pointer"
      >
        <DownloadIcon className="w-4 h-4 theme-text-secondary" />
        <span>Download PDF</span>
      </button>
    </div>
  );
}

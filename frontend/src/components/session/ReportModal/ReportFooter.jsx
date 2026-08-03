import { ShareDropdown } from "./ShareDropdown";

export function ReportFooter({
  viewMode,
  setViewMode,
  isEditing,
  setIsEditing,
  copied,
  handleCopy,
  isShareDropdownOpen,
  setIsShareDropdownOpen,
  shareDropdownRef,
  handleShareText,
  handleExportImage,
  handleDownloadPdfFile,
}) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-3 sm:px-5 py-3.5 border-t theme-border theme-bg-sub gap-2 sm:gap-3">
      {viewMode === "PDF" ? (
        <>
          <button
            type="button"
            onClick={() => setViewMode("TEXT")}
            className="px-3.5 py-2 rounded-xl theme-bg-elevated hover:opacity-80 theme-text-primary font-semibold text-xs transition-all border theme-border flex items-center gap-1.5"
          >
            ← Back to Text Mode
          </button>

          <button
            type="button"
            onClick={handleDownloadPdfFile}
            className="px-4 py-2 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs transition-all flex items-center gap-1.5 shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download PDF</span>
          </button>
        </>
      ) : (
        <>
          {/* Left Action: Edit Text Button */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow ${
              isEditing
                ? "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 hover:opacity-80"
                : "theme-bg-elevated hover:opacity-80 theme-text-primary border theme-border"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{isEditing ? "Done Editing" : "Edit Text"}</span>
          </button>

          {/* Right Actions: Copy & Share/Export Buttons */}
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow ${
                copied
                  ? "theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40"
                  : "theme-bg-accent hover:opacity-90 theme-accent-text"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>

            {/* Share / Export Dropdown */}
            <div ref={shareDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
                className="px-3.5 py-2 rounded-xl theme-bg-elevated hover:opacity-80 theme-text-primary font-semibold text-xs transition-all border theme-border flex items-center gap-1.5 shadow"
              >
                <svg className="w-3.5 h-3.5 theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 10-5.367-2.684 3 3 0 005.367 2.684zm0 9.316a3 3 0 10-5.368 2.684 3 3 0 005.368-2.684z" />
                </svg>
                <span>Share / Export</span>
              </button>

              {isShareDropdownOpen && (
                <ShareDropdown
                  handleShareText={handleShareText}
                  setViewMode={setViewMode}
                  handleExportImage={handleExportImage}
                  setIsShareDropdownOpen={setIsShareDropdownOpen}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

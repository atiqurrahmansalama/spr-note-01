import { ShareDropdown } from "./ShareDropdown";
import { EditIcon, CopyIcon, SleekCheckIcon, ShareIcon } from "../../../components/ui/Icons";

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
    <div className="grid grid-cols-3 gap-2 px-5 py-4 border-t theme-border theme-bg-sub select-none">
      {/* Button 1: Edit Text */}
      <button
        type="button"
        onClick={() => {
          if (viewMode === "PDF") {
            setViewMode("TEXT");
            setIsEditing(true);
          } else {
            setIsEditing(!isEditing);
          }
        }}
        className={`h-10 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow border cursor-pointer ${
          isEditing
            ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 hover:opacity-80"
            : "theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary theme-border"
        }`}
      >
        <EditIcon className="w-3.5 h-3.5" />
        <span>{isEditing ? "Done" : "Edit"}</span>
      </button>

      {/* Button 2: Copy Text */}
      <button
        type="button"
        onClick={handleCopy}
        className={`h-10 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow border cursor-pointer ${
          copied
            ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40"
            : "theme-bg-accent hover:opacity-90 theme-accent-text border-[var(--accent-main)]"
        }`}
      >
        {copied ? (
          <SleekCheckIcon className="w-3.5 h-3.5" />
        ) : (
          <CopyIcon className="w-3.5 h-3.5" />
        )}
        <span>{copied ? "Copied!" : "Copy"}</span>
      </button>

      {/* Button 3: Export Dropdown */}
      <div ref={shareDropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
          className={`w-full h-10 rounded-xl theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary font-semibold text-xs transition-all border theme-border flex items-center justify-center gap-1.5 shadow cursor-pointer ${
            isShareDropdownOpen ? "border-[var(--accent-main)]" : ""
          }`}
        >
          <ShareIcon className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {isShareDropdownOpen && (
          <ShareDropdown
            handleShareText={handleShareText}
            setViewMode={setViewMode}
            handleExportImage={handleExportImage}
            handleDownloadPdfFile={handleDownloadPdfFile}
            setIsShareDropdownOpen={setIsShareDropdownOpen}
            viewMode={viewMode}
          />
        )}
      </div>
    </div>
  );
}

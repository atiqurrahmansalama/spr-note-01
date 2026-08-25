import { ShareIcon, FileTextIcon, BookOpenIcon, DownloadIcon, ImageIcon } from "../../../components/ui/Icons";

export function ShareDropdown({
  handleShareText,
  setViewMode,
  handleExportImage,
  handleDownloadPdfFile,
  setIsShareDropdownOpen,
  viewMode,
}) {
  return (
    <div className="absolute right-0 bottom-full mb-2 w-48 theme-bg-surface border theme-border rounded-xl shadow-2xl z-50 p-1.5 space-y-1 text-xs select-none">
      <button
        type="button"
        onClick={() => {
          setIsShareDropdownOpen(false);
          handleShareText();
        }}
        className="w-full px-3 py-2 theme-text-primary hover:theme-bg-accent-soft hover:theme-accent rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
      >
        <ShareIcon className="w-4 h-4 theme-text-secondary" />
        <span>Share Plain Text</span>
      </button>

      {viewMode === "TEXT" ? (
        <button
          type="button"
          onClick={() => {
            setIsShareDropdownOpen(false);
            setViewMode("PDF");
          }}
          className="w-full px-3 py-2 theme-text-primary hover:theme-bg-accent-soft hover:theme-accent rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
        >
          <FileTextIcon className="w-4 h-4 theme-accent" />
          <span>Preview PDF Document</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsShareDropdownOpen(false);
            setViewMode("TEXT");
          }}
          className="w-full px-3 py-2 theme-text-primary hover:theme-bg-accent-soft hover:theme-accent rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
        >
          <BookOpenIcon className="w-4 h-4 theme-text-secondary" />
          <span>Switch to Text Mode</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setIsShareDropdownOpen(false);
          handleDownloadPdfFile();
        }}
        className="w-full px-3 py-2 theme-text-primary hover:theme-bg-accent-soft hover:theme-accent rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
      >
        <DownloadIcon className="w-4 h-4 theme-accent" />
        <span>Download PDF File</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setIsShareDropdownOpen(false);
          handleExportImage();
        }}
        className="w-full px-3 py-2 theme-text-primary hover:theme-bg-accent-soft hover:theme-accent rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
      >
        <ImageIcon className="w-4 h-4 theme-accent" />
        <span>Export Image File</span>
      </button>
    </div>
  );
}

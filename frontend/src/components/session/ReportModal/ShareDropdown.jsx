export function ShareDropdown({
  handleShareText,
  setViewMode,
  handleExportImage,
  setIsShareDropdownOpen,
}) {
  return (
    <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#1c1e22] border border-slate-700/80 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 text-xs">
      <button
        type="button"
        onClick={handleShareText}
        className="w-full px-3 py-2 text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-200 rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 10-5.367-2.684 3 3 0 005.367 2.684zm0 9.316a3 3 0 10-5.368 2.684 3 3 0 005.368-2.684z" />
        </svg>
        <span>Share Plain Text</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setIsShareDropdownOpen(false);
          setViewMode("PDF");
        }}
        className="w-full px-3 py-2 text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-200 rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
      >
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>Preview / Export PDF</span>
      </button>

      <button
        type="button"
        onClick={handleExportImage}
        className="w-full px-3 py-2 text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-200 rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-left"
      >
        <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Export Image</span>
      </button>
    </div>
  );
}

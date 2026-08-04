export function ReportControls({
  includeGroup,
  setIncludeGroup,
  includeTeacher,
  setIncludeTeacher,
  pdfFont,
  setPdfFont,
  isPdfBold,
  setIsPdfBold,
  isPdfItalic,
  setIsPdfItalic,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-3 theme-bg-sub border-t theme-border text-xs theme-text-secondary select-none">
      {/* Checkboxes Group */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none hover:theme-text-primary transition-colors">
          <input
            type="checkbox"
            checked={includeGroup}
            onChange={(e) => {
              const checked = e.target.checked;
              setIncludeGroup(checked);
              if (!checked) setIncludeTeacher(false);
            }}
            className="w-4 h-4 rounded accent-[var(--accent-main)] theme-bg-elevated theme-border cursor-pointer"
          />
          <span>Include Group</span>
        </label>

        <label
          className={`flex items-center gap-2 select-none transition-colors ${
            includeGroup ? "cursor-pointer theme-text-secondary hover:theme-text-primary" : "cursor-not-allowed opacity-40"
          }`}
        >
          <input
            type="checkbox"
            checked={includeTeacher}
            disabled={!includeGroup}
            onChange={(e) => setIncludeTeacher(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--accent-main)] theme-bg-elevated theme-border cursor-pointer disabled:opacity-40"
          />
          <span>Mention Teacher</span>
        </label>
      </div>

      {/* Formatting Options Group (One line, Icons only) */}
      <div className="flex items-center gap-1.5 border-l theme-border pl-0 sm:pl-4">
        {/* Font Select Icon */}
        <div className="relative w-8 h-8 flex items-center justify-center rounded-xl theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent transition-all cursor-pointer border theme-border shadow-sm" title="Change Font">
          <span className="text-[11px] font-bold theme-text-secondary select-none font-mono">Aa</span>
          <select
            value={pdfFont}
            onChange={(e) => setPdfFont(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="Outfit">Outfit</option>
            <option value="Inter">Inter</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier</option>
          </select>
        </div>

        {/* Bold Button */}
        <button
          type="button"
          onClick={() => setIsPdfBold(!isPdfBold)}
          className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all shadow-sm ${
            isPdfBold
              ? "theme-bg-accent theme-accent-text border-[var(--accent-main)]"
              : "theme-bg-elevated theme-border theme-text-secondary hover:theme-bg-accent-soft hover:theme-accent"
          }`}
          title="Toggle Bold"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h8a4 4 0 100-8H6v8zm0 0h9a4 4 0 110 8H6v-8z" />
          </svg>
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onClick={() => setIsPdfItalic(!isPdfItalic)}
          className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all shadow-sm ${
            isPdfItalic
              ? "theme-bg-accent theme-accent-text border-[var(--accent-main)]"
              : "theme-bg-elevated theme-border theme-text-secondary hover:theme-bg-accent-soft hover:theme-accent"
          }`}
          title="Toggle Italic"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="4" x2="10" y2="4" strokeLinecap="round" />
            <line x1="14" y1="20" x2="5" y2="20" strokeLinecap="round" />
            <line x1="15" y1="4" x2="9" y2="20" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ReportControls({
  includeGroup,
  setIncludeGroup,
  includeTeacher,
  setIncludeTeacher,
  showGroupCheckbox,
  showTeacherCheckbox,
}) {
  // Only render the bar if at least one checkbox is visible
  if (!showGroupCheckbox && !showTeacherCheckbox) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-3 theme-bg-sub border-t theme-border text-xs theme-text-secondary select-none">
      {showGroupCheckbox && (
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
      )}

      {showTeacherCheckbox && (
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
      )}
    </div>
  );
}

export function ReportControls({
  includeGroup,
  setIncludeGroup,
  includeTeacher,
  setIncludeTeacher,
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 px-5 py-3 bg-[#181a1e] border-t border-slate-800/80 text-xs text-slate-300">
      <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
        <input
          type="checkbox"
          checked={includeGroup}
          onChange={(e) => {
            const checked = e.target.checked;
            setIncludeGroup(checked);
            if (!checked) setIncludeTeacher(false);
          }}
          className="w-4 h-4 rounded accent-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
        />
        <span>Include Group Name</span>
      </label>

      <label
        className={`flex items-center gap-2 select-none transition-colors ${
          includeGroup ? "cursor-pointer text-slate-300 hover:text-white" : "cursor-not-allowed text-slate-600"
        }`}
      >
        <input
          type="checkbox"
          checked={includeTeacher}
          disabled={!includeGroup}
          onChange={(e) => setIncludeTeacher(e.target.checked)}
          className="w-4 h-4 rounded accent-indigo-600 bg-slate-800 border-slate-700 cursor-pointer disabled:opacity-40"
        />
        <span>Mention Teacher</span>
      </label>
    </div>
  );
}

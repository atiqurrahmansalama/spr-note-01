export default function CalendarSettings({ timeZone, setTimeZone, dateFormat, setDateFormat }) {
  return (
    <div className="p-3 bg-[#141517] border border-slate-800/80 rounded-xl space-y-3.5 my-1">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <span className="text-sm">📅</span>
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Calendar Settings</h4>
      </div>

      {/* Timezone Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Timezone Offset</label>
        <select
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className="w-full bg-[#1c1d1f] border border-slate-700/80 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="America/New_York">America/New_York (EDT)</option>
          <option value="America/Chicago">America/Chicago (CDT)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PDT)</option>
          <option value="Asia/Dhaka">Asia/Dhaka (BST)</option>
          <option value="Europe/London">Europe/London (BST)</option>
          <option value="UTC">UTC (Coordinated Universal)</option>
        </select>
      </div>

      {/* Date Format Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date Format Display</label>
        <select
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
          className="w-full bg-[#1c1d1f] border border-slate-700/80 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        >
          <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/30/2026)</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 30/07/2026)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-30)</option>
        </select>
      </div>
    </div>
  );
}
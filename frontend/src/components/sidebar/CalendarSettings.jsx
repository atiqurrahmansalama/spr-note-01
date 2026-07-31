import CustomSelect from "../common/CustomSelect";

export default function CalendarSettings({ timeZone, setTimeZone, dateFormat, setDateFormat }) {
  const timeZoneOptions = [
    { label: "America/New_York (EDT)", value: "America/New_York" },
    { label: "America/Chicago (CDT)", value: "America/Chicago" },
    { label: "America/Los_Angeles (PDT)", value: "America/Los_Angeles" },
    { label: "Asia/Dhaka (BST)", value: "Asia/Dhaka" },
    { label: "Europe/London (BST)", value: "Europe/London" },
    { label: "UTC (Coordinated Universal)", value: "UTC" },
  ];

  const dateFormatOptions = [
    { label: "MM/DD/YYYY (e.g. 07/30/2026)", value: "MM/DD/YYYY" },
    { label: "DD/MM/YYYY (e.g. 30/07/2026)", value: "DD/MM/YYYY" },
    { label: "YYYY-MM-DD (e.g. 2026-07-30)", value: "YYYY-MM-DD" },
  ];

  return (
    <div className="p-3 bg-[#141517] border border-slate-800/80 rounded-xl space-y-3.5 my-1">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {/* <span className="text-sm">📅</span> */}
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Calendar Settings
        </h4>
      </div>

      {/* Timezone Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
          Timezone Offset
        </label>
        <CustomSelect
          options={timeZoneOptions}
          value={timeZone}
          onChange={setTimeZone}
          placeholder="Select Timezone..."
        />
      </div>

      {/* Date Format Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
          Date Format Display
        </label>
        <CustomSelect
          options={dateFormatOptions}
          value={dateFormat}
          onChange={setDateFormat}
          placeholder="Select Date Format..."
        />
      </div>
    </div>
  );
}
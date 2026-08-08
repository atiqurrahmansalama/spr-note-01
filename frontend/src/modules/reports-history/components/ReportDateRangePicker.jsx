import ReusableCalendar from "../../../components/common/Calendar/ReusableCalendar";

export default function ReportDateRangePicker({
  startDate,
  endDate,
  onRangeSelect,
  minDate,
  maxDate,
  onReset
}) {
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
          Select Date Range
        </label>
        {(startDate || endDate) && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] text-rose-400 hover:underline cursor-pointer font-bold uppercase tracking-wider"
            title="Reset date filter"
          >
            Clear Date
          </button>
        )}
      </div>

      <ReusableCalendar
        isRange={true}
        startDate={startDate}
        endDate={endDate}
        onRangeSelect={onRangeSelect}
        minDate={minDate}
        maxDate={maxDate}
        placeholder="Select Date Range..."
        className="w-full"
      />
    </div>
  );
}

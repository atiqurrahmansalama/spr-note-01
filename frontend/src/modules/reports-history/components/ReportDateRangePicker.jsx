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
    <div className="flex items-center gap-2">
      <ReusableCalendar
        isRange={true}
        startDate={startDate}
        endDate={endDate}
        onRangeSelect={onRangeSelect}
        minDate={minDate}
        maxDate={maxDate}
        placeholder="Select Date Range"
      />
      {(startDate || endDate) && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-rose-400 hover:underline px-1 py-1 cursor-pointer font-medium"
          title="Reset date filter"
        >
          Reset
        </button>
      )}
    </div>
  );
}

import NumberScrollInput from "../ui/NumberScrollInput";
import PageRangeInput from "./PageRangeInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../constants/quranConstants";

export default function JuzRow({ rowData, onChange, onRemoveJuz, showLabel }) {
  const handleJuzChange = (val) => {
    onChange((prevRow) => ({ ...prevRow, juz: val }));
  };

  const handleRangeChange = (index, newRange) => {
    onChange((prevRow) => {
      const newRanges = [...prevRow.ranges];
      newRanges[index] = newRange;
      return { ...prevRow, ranges: newRanges };
    });
  };

  const addRange = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ranges: [...prevRow.ranges, { id: newId, start: "", end: "" }]
    }));
    setTimeout(() => {
      const el = document.getElementById(`${newId}-start`);
      if (el) el.focus();
    }, 100);
  };

  const removeRange = (index) => {
    onChange((prevRow) => {
      if (prevRow.ranges.length > 1) {
        const newRanges = prevRow.ranges.filter((_, idx) => idx !== index);
        return { ...prevRow, ranges: newRanges };
      }
      return prevRow;
    });
  };

  const totalPages = rowData.ranges.reduce((sum, range) => {
    const start = parseInt(range.start, 10);
    const end = parseInt(range.end, 10);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      return sum + (end - start + 1);
    }
    return sum;
  }, 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 w-full">
      {/* Label or Empty Spacer of exact same width */}
      <div className="w-full sm:w-20 shrink-0 mb-3.5 sm:mb-0">
        {showLabel ? (
          <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary block whitespace-nowrap">
            JUZ / PAGE
          </label>
        ) : (
          <div className="hidden sm:block h-4" />
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 flex-1 w-full min-w-0">
        {/* Juz Input */}
        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-9 sm:h-10 w-12 sm:w-16 shadow-sm shrink-0 transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 mr-2 sm:mr-3.5">
          <NumberScrollInput
            value={rowData.juz}
            onChange={handleJuzChange}
            onEnter={handleEnterFocusNext}
            onEmptyBackspace={(e) => {
               if (onRemoveJuz) onRemoveJuz();
               handleBackspaceFocusPrev(e, true);
            }}
            min={1}
            max={QURAN_CONSTANTS.MAX_JUZ}
            placeholder="--"
            className="w-full h-full text-xs sm:text-sm theme-text-primary font-semibold"
          />
        </div>

        {/* Page Ranges & Actions - Side-by-side flex row */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 flex-1 min-w-0">
          {rowData.ranges.map((range, idx) => {
            const isLast = idx === rowData.ranges.length - 1;
            return (
              <div key={range.id} className="flex items-center gap-1 shrink-0">
                <PageRangeInput
                  range={range}
                  onChange={(newR) => handleRangeChange(idx, newR)}
                  onRemove={() => removeRange(idx)}
                  juzValue={rowData.juz}
                  isLast={isLast}
                  onAddNextRange={addRange}
                />
                {!isLast && <span className="theme-text-secondary font-mono text-xs sm:text-sm px-0.5 text-center shrink-0">/</span>}
              </div>
            );
          })}

          {/* Action Buttons & Badge Group */}
          <div className="flex items-center gap-1 ml-0.5 sm:ml-1 shrink-0 whitespace-nowrap">
            <button
              onClick={addRange}
              className="w-6 h-6 text-sm rounded-full border theme-border flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-all shrink-0 cursor-pointer"
              title="Add Page Range"
            >
              +
            </button>

            {totalPages > 0 && (
              <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 ml-0.5 rounded-md theme-bg-sub text-[11px] sm:text-xs font-medium theme-text-secondary shrink-0">
                {totalPages} p
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

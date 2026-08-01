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

  // Calculate total pages for this row
  const totalPages = rowData.ranges.reduce((sum, range) => {
    const start = parseInt(range.start, 10);
    const end = parseInt(range.end, 10);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      return sum + (end - start + 1);
    }
    return sum;
  }, 0);

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Label (only shown on first row) */}
      <div className="w-20 shrink-0">
        {showLabel && (
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block whitespace-nowrap">
            JUZ / PAGE
          </label>
        )}
      </div>

      <div className="flex items-center gap-3 flex-1">
        {/* Juz Input */}
        <div className="bg-[#1c1d1f] rounded-lg border border-slate-700/50 overflow-hidden h-10 w-16 shadow-inner shrink-0 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
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
            placeholder="Juz"
            className="w-full h-full text-sm text-slate-300 font-semibold focus:bg-slate-800"
          />
        </div>

        {/* Page Ranges & Actions - Wraps after ~2 ranges */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-3 max-w-[300px]">
          {rowData.ranges.map((range, idx) => {
            const isLast = idx === rowData.ranges.length - 1;
            return (
              <div key={range.id} className="flex items-center gap-1">
                <PageRangeInput
                  range={range}
                  onChange={(newR) => handleRangeChange(idx, newR)}
                  onRemove={() => removeRange(idx)}
                  juzValue={rowData.juz}
                  isLast={isLast}
                  onAddNextRange={addRange}
                />
                {/* Slash at the end of the line if there is a next range */}
                {!isLast && <span className="text-slate-600 font-mono text-sm px-0.5 text-center">/</span>}
              </div>
            );
          })}

          {/* Action Buttons & Badge Group (Always together on one line) */}
          <div className="flex items-center gap-1 ml-2 shrink-0 whitespace-nowrap">
            <button
              onClick={addRange}
              className="w-6 h-6 text-sm rounded-full border border-slate-700/80 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-800 transition-all shrink-0"
              title="Add Page Range"
            >
              +
            </button>

            {totalPages > 0 && (
              <div className="px-3 py-1 ml-1 rounded-md bg-[#1f2125] border border-slate-800 text-xs font-medium text-slate-400 shadow-sm shrink-0">
                {totalPages} pages
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

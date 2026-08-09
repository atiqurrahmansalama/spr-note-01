import NumberScrollInput from "../ui/NumberScrollInput";
import PageRangeInput from "./PageRangeInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../constants/quranConstants";

const PAGES_PER_LINE = 2; // max page-range boxes per line (like DetailRow)

export default function JuzRow({ rowData, onChange, onRemoveJuz, onAddJuz }) {
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
      ranges: [...prevRow.ranges, { id: newId, start: "", end: "" }],
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

  // Group ranges into rows of max PAGES_PER_LINE
  const rangeChunks = [];
  for (let i = 0; i < rowData.ranges.length; i += PAGES_PER_LINE) {
    rangeChunks.push(rowData.ranges.slice(i, i + PAGES_PER_LINE).map((r, j) => ({
      range: r,
      globalIdx: i + j,
    })));
  }

  return (
    <div className="flex items-start gap-2 sm:gap-4 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-all duration-150 select-none">

      {/* Left Column: Juz Label & Input — fixed width, matching DetailRow */}
      <div className="flex items-center gap-1 shrink-0 h-[38px] sm:h-10 self-start">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Juz</label>
        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm shrink-0 transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30">
          <NumberScrollInput
            id={rowData.juzInputId}
            value={rowData.juz}
            onChange={handleJuzChange}
            onEnter={handleEnterFocusNext}
            onAddShift={onAddJuz}
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
      </div>

      {/* Right Column: "Page" label + range boxes in rows of max 2, matching DetailRow alignment */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {rangeChunks.map((chunk, chunkIdx) => {
          const isLastChunk = chunkIdx === rangeChunks.length - 1;
          return (
            <div key={chunkIdx} className="flex items-center gap-1.5 flex-wrap">
              {/* Show "Page" label only on the first row */}
              {chunkIdx === 0 && (
                <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none shrink-0 h-[38px] sm:h-10 flex items-center">
                  Page
                </label>
              )}
              {/* Indent subsequent rows to align under range boxes */}
              {chunkIdx > 0 && (
                <span className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none shrink-0 h-[38px] sm:h-10 flex items-center opacity-0">
                  Page
                </span>
              )}

              {chunk.map(({ range, globalIdx }, itemIdx) => {
                const isLastRange = globalIdx === rowData.ranges.length - 1;
                return (
                  <div key={range.id} className="flex items-center gap-1 shrink-0">
                    <PageRangeInput
                      range={range}
                      onChange={(newR) => handleRangeChange(globalIdx, newR)}
                      onRemove={rowData.ranges.length > 1 ? () => removeRange(globalIdx) : undefined}
                      juzValue={rowData.juz}
                      isLast={isLastRange}
                      onAddNextRange={addRange}
                      onAddJuzRow={onAddJuz}
                    />
                    {/* Separator between ranges (not after last in the chunk) */}
                    {!isLastRange && itemIdx < chunk.length - 1 && (
                      <span className="theme-text-secondary font-mono text-xs sm:text-sm px-0.5 text-center shrink-0">/</span>
                    )}
                  </div>
                );
              })}

              {/* Add range (+) button and page count badge on last chunk row */}
              {isLastChunk && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={addRange}
                    className="w-5 h-5 sm:w-6 sm:h-6 text-xs sm:text-sm rounded-full border theme-border flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-all shrink-0 cursor-pointer"
                    title="Add Page Range"
                  >
                    +
                  </button>
                  {totalPages > 0 && (
                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md theme-bg-sub text-[11px] sm:text-xs font-medium theme-text-secondary shrink-0">
                      {totalPages} p
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remove row X button */}
      {onRemoveJuz && (
        <button
          type="button"
          onClick={onRemoveJuz}
          className="p-1 theme-text-secondary hover:text-red-400 transition-colors shrink-0 flex items-center justify-center h-[38px] sm:h-10 cursor-pointer self-start"
          title="Remove Juz Row"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}
    </div>
  );
}

import React from "react";
import CustomInput from "../../../../../../components/ui/CustomInput";
import PageRangeInput, { type PageRange } from "../../../../../../components/ui/PageRangeInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../../../../../utils/keyboardUtils";
import { QURAN_CONSTANTS } from "../../../../../../constants/quranConstants";
import { RowRemoveButton, RowAddCircleButton } from "./QuranRowUI";
import { JuzRowData } from "../../types";

export interface JuzRowProps {
  rowData: JuzRowData;
  onChange: (updater: (prevRow: JuzRowData) => JuzRowData) => void;
  onRemoveJuz?: () => void;
  onAddJuz?: () => void;
}

export default function JuzRow({
  rowData,
  onChange,
  onRemoveJuz,
  onAddJuz,
}: JuzRowProps) {
  const handleJuzChange = (val: string | number) => {
    onChange((prevRow) => ({ ...prevRow, juz: val }));
  };

  const handleRangeChange = (index: number, newRange: PageRange) => {
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

  const removeRange = (index: number) => {
    onChange((prevRow) => {
      if (prevRow.ranges.length > 1) {
        const newRanges = prevRow.ranges.filter((_, idx) => idx !== index);
        return { ...prevRow, ranges: newRanges };
      }
      return prevRow;
    });
  };

  const totalPages = (rowData.ranges || []).reduce((sum, range) => {
    const start = parseInt(String(range.start), 10);
    const end = parseInt(String(range.end), 10);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      return sum + (end - start + 1);
    }
    return sum;
  }, 0);

  return (
    <div className="flex items-start gap-2 sm:gap-4 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-all duration-150 select-none">
      {/* Left Column: Juz Label & Input — fixed width */}
      <div className="flex items-center gap-1 shrink-0 h-[38px] sm:h-10 self-start">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Juz</label>
        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm shrink-0 transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
          <CustomInput
            id={rowData.juzInputId}
            type="number"
            variant="borderless"
            scrollable={true}
            allowDecimals={false}
            value={rowData.juz}
            onChange={handleJuzChange}
            onEnter={handleEnterFocusNext}
            onAddShift={onAddJuz}
            onEmptyBackspace={(e: any) => {
              if (onRemoveJuz) onRemoveJuz();
              handleBackspaceFocusPrev(e, true);
            }}
            min={1}
            max={QURAN_CONSTANTS.MAX_JUZ}
            placeholder="--"
            className="w-full h-full p-0 min-h-0"
            wrapperClassName="w-full h-full"
            inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
          />
        </div>
      </div>

      {/* Right Column: "Page" label + Flexible Auto-wrapping Range Boxes */}
      <div className="flex items-start gap-1.5 sm:gap-2 flex-1 min-w-0">
        {/* Fixed "Page" label at top-left of the page boxes section */}
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none shrink-0 h-[38px] sm:h-10 flex items-center">
          Page
        </label>

        {/* Dynamic wrapping Page Boxes Container */}
        <div className="flex items-center flex-wrap gap-y-2.5 gap-x-1 sm:gap-x-1.5 flex-1 min-w-0">
          {(rowData.ranges || []).map((range, index) => {
            const isLastRange = index === rowData.ranges.length - 1;
            return (
              <div key={range.id} className="flex items-center gap-1 shrink-0">
                <PageRangeInput
                  range={range}
                  onChange={(newR) => handleRangeChange(index, newR)}
                  onRemove={rowData.ranges.length > 1 ? () => removeRange(index) : undefined}
                  juzValue={rowData.juz}
                  isLast={isLastRange}
                  onAddNextRange={addRange}
                  onAddJuzRow={onAddJuz}
                />
                {!isLastRange && (
                  <span className="theme-text-secondary font-bold text-xs sm:text-sm opacity-70 px-0.5 text-center shrink-0 select-none">,</span>
                )}
              </div>
            );
          })}

          {/* Add Range (+) Button and Total Page Badge */}
          <div className="flex items-center gap-1 shrink-0 ml-0.5 h-[38px] sm:h-10">
            <RowAddCircleButton onAdd={addRange} title="Add Page Range" />
            {totalPages > 0 && (
              <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md theme-bg-sub text-[11px] sm:text-xs font-medium theme-text-secondary shrink-0 font-mono shadow-sm">
                {totalPages} p
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Far Right: Row Remove (X) button */}
      {onRemoveJuz && (
        <div className="shrink-0 h-[38px] sm:h-10 flex items-center self-start">
          <RowRemoveButton onRemove={onRemoveJuz} title="Remove Juz Row" />
        </div>
      )}
    </div>
  );
}

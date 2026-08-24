import React from "react";
import CustomInput from "../../../../components/ui/CustomInput";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "../../../../utils/keyboardUtils";

export default function PageRangeInput({ range, onChange, onRemove, juzValue, isLast, onAddNextRange, onAddJuzRow }) {
  const getMaxPage = (juzStr) => {
    const j = parseInt(juzStr, 10);
    if (j === 29) return 24;
    if (j === 30) return 25;
    return 20;
  };

  const maxPage = getMaxPage(juzValue);

  const startVal = parseInt(range.start, 10);
  const endVal = parseInt(range.end, 10);

  const maxStartPage = !isNaN(endVal) && endVal > 0 ? Math.min(endVal, maxPage) : maxPage;
  const minEndPage = !isNaN(startVal) && startVal > 0 ? Math.max(startVal, 1) : 1;

  return (
    <div className="flex items-center theme-bg-sub rounded-lg border theme-border overflow-hidden h-9 sm:h-10 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 shrink-0">
      <CustomInput
        id={`${range.id}-start`}
        type="number"
        variant="borderless"
        scrollable={true}
        allowDecimals={false}
        value={range.start}
        onChange={(val) => onChange({ ...range, start: val })}
        onEnter={handleEnterFocusNext}
        onAdd={onAddNextRange}
        onAddShift={onAddJuzRow}
        onEmptyBackspace={(e) => {
          handleBackspaceFocusPrev(e, true);
          if (onRemove) onRemove();
        }}
        min={1}
        max={maxStartPage}
        placeholder="--"
        className="w-8 sm:w-10 h-full p-0 min-h-0"
        inputClassName="w-8 sm:w-10 h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
      />
      <div className="w-px h-5 sm:h-6 theme-border border-r mx-[2px] sm:mx-1"></div>
      <span className="theme-text-secondary font-mono text-[11px] sm:text-xs">-</span>
      <div className="w-px h-5 sm:h-6 theme-border border-r mx-[2px] sm:mx-1"></div>
      <CustomInput
        type="number"
        variant="borderless"
        scrollable={true}
        allowDecimals={false}
        value={range.end}
        onChange={(val) => onChange({ ...range, end: val })}
        onEnter={handleEnterFocusNext}
        onAdd={onAddNextRange}
        onAddShift={onAddJuzRow}
        onEmptyBackspace={(e) => {
          handleBackspaceFocusPrev(e, true);
        }}
        min={minEndPage}
        max={maxPage}
        placeholder="--"
        className="w-8 sm:w-10 h-full p-0 min-h-0"
        inputClassName="w-8 sm:w-10 h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
      />
    </div>
  );
}

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
    <div className="flex items-center theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 shadow-sm transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 shrink-0">
      <div className="w-9 sm:w-11 h-full flex items-center justify-center">
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
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
        />
      </div>
      <div className="w-px h-5 sm:h-6 theme-border border-r shrink-0"></div>
      <span className="theme-text-secondary font-mono text-[11px] sm:text-xs select-none px-1 text-center">-</span>
      <div className="w-px h-5 sm:h-6 theme-border border-r shrink-0"></div>
      <div className="w-9 sm:w-11 h-full flex items-center justify-center">
        <CustomInput
          id={`${range.id}-end`}
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
          className="w-full h-full p-0 min-h-0"
          wrapperClassName="w-full h-full"
          inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
        />
      </div>
    </div>
  );
}

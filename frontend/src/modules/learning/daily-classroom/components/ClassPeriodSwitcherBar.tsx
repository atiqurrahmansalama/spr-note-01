import React from 'react';
import { TimerIcon } from '@/components/ui/Icons';
import { useHorizontalScroll } from '@/hooks';

export interface ClassPeriodSwitcherBarProps {
  title?: string;
  allPeriodFilterOptions?: Array<{ value: string; label: string; [key: string]: any }>;
  activePeriodId?: string;
  onPeriodChange?: (val: string) => void;
  getSlotCount?: (val: string) => number;
  getPeriodSubtitle?: (val: string) => string;
}

export default function ClassPeriodSwitcherBar({
  title = 'CLASS ROUTINE PERIODS',
  allPeriodFilterOptions = [],
  activePeriodId = '1',
  onPeriodChange,
  getSlotCount,
  getPeriodSubtitle,
}: ClassPeriodSwitcherBarProps) {
  const periodScrollRef = useHorizontalScroll();
  const totalSlotsCount = allPeriodFilterOptions.length;

  return (
    <div className="col-span-full pt-1">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold theme-text-accent uppercase tracking-wider">
          <TimerIcon className="w-4 h-4 shrink-0" />
          <span>
            {title} ({totalSlotsCount} {totalSlotsCount === 1 ? 'SLOT' : 'SLOTS'})
          </span>
        </div>
      </div>

      <div
        ref={periodScrollRef}
        className="flex items-center gap-2 overflow-x-auto pt-1 pb-2 no-scrollbar flex-nowrap cursor-grab active:cursor-grabbing select-none"
      >
        {allPeriodFilterOptions.map((opt) => {
          const isSelected = activePeriodId === opt.value;
          const count = getSlotCount ? getSlotCount(opt.value) : 0;
          const subtitleText = getPeriodSubtitle ? getPeriodSubtitle(opt.value) : 'Routine Time';

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPeriodChange?.(opt.value)}
              className={`px-2.5 py-1.5 rounded-xl border transition-all text-left cursor-pointer w-[115px] min-w-[115px] max-w-[115px] shrink-0 select-none ${
                isSelected
                  ? 'theme-bg-accent text-white border-transparent shadow-sm'
                  : 'theme-bg-surface theme-border theme-text-primary hover:theme-bg-sub/60 shadow-2xs'
              }`}
            >
              {/* Row 1: Period Label & Count Badge */}
              <div className="flex items-center justify-between gap-1 min-w-0">
                <span className={`font-bold text-xs truncate min-w-0 shrink ${isSelected ? 'text-white' : 'theme-text-primary'}`}>
                  {opt.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[17px] text-center leading-none ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'theme-bg-sub border theme-border theme-text-secondary'
                  }`}
                >
                  {count}
                </span>
              </div>

              {/* Row 2: Period Time / Details */}
              <span
                className={`text-[10px] font-medium truncate block mt-0.5 w-full leading-tight ${
                  isSelected ? 'text-white/80' : 'theme-text-secondary'
                }`}
                title={subtitleText}
              >
                {subtitleText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

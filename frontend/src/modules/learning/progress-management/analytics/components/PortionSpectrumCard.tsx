import React from "react";
import { PortionCoverageItem } from "../types";
import { BookOpenIcon } from "@/components/ui/Icons";

interface PortionSpectrumCardProps {
  portionBreakdown: PortionCoverageItem[];
}

export const PortionSpectrumCard: React.FC<PortionSpectrumCardProps> = ({
  portionBreakdown,
}) => {
  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
            <BookOpenIcon className="w-4 h-4 theme-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Portion & Juz Coverage Spectrum
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Recitation portion spans and volume concentration
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono theme-text-secondary">
          {portionBreakdown.length} Portions Logged
        </span>
      </div>

      {portionBreakdown.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <BookOpenIcon className="w-8 h-8 mx-auto theme-text-secondary opacity-40" />
          <p className="text-xs theme-text-secondary">
            No specific portion details available for this selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[840px]:grid-cols-3 gap-3 pt-1">
          {portionBreakdown.map((item) => (
            <div
              key={item.portionKey}
              className="theme-bg-subtle border theme-border rounded-xl p-3.5 space-y-2.5 hover:border-slate-600/50 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold theme-text-primary truncate">
                    {item.portionTitle}
                  </h4>
                  <span className="text-[10px] theme-text-secondary font-mono block">
                    {item.activeLearners} Active Learners
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {item.totalVolume} {item.unitType}
                </span>
              </div>

              <div className="pt-2 border-t theme-border flex items-center justify-between text-[10px] font-mono theme-text-secondary">
                <span>Mistakes: {item.mistakesCount}</span>
                <span>Stucks: {item.stucksCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

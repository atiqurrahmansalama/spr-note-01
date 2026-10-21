import React from "react";
import { SessionProgressItem } from "../types";
import { ClockIcon } from "@/components/ui/Icons";

interface SessionDistributionCardProps {
  sessionBreakdown: SessionProgressItem[];
}

export const SessionDistributionCard: React.FC<SessionDistributionCardProps> = ({
  sessionBreakdown,
}) => {
  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
            <ClockIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Session-wise Progress Distribution
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Recitation pacing and clean completion across daily classroom shifts
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono theme-text-secondary">
          {sessionBreakdown.length} Sessions Logged
        </span>
      </div>

      {sessionBreakdown.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <ClockIcon className="w-8 h-8 mx-auto theme-text-secondary opacity-40" />
          <p className="text-xs theme-text-secondary">
            No session-specific progress reports logged for this selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[840px]:grid-cols-3 gap-3 pt-1">
          {sessionBreakdown.map((item) => (
            <div
              key={item.sessionKey}
              className="theme-bg-subtle border theme-border rounded-xl p-3.5 space-y-2.5 hover:border-slate-600/50 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold theme-text-primary truncate">
                    {item.sessionName}
                  </h4>
                  <span className="text-[10px] theme-text-secondary font-mono block">
                    {item.reportsCount} Submissions
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  {item.totalPages} Pages
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t theme-border text-center text-[10px] font-mono">
                <div className="space-y-0.5">
                  <span className="theme-text-secondary block">Clean</span>
                  <span className="font-bold text-emerald-400">{item.cleanRate}%</span>
                </div>
                <div className="space-y-0.5">
                  <span className="theme-text-secondary block">Mistakes</span>
                  <span className="font-bold text-rose-400">{item.mistakesCount}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="theme-text-secondary block">Stucks</span>
                  <span className="font-bold text-amber-400">{item.stucksCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

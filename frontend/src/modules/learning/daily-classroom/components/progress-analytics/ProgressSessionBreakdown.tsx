import React, { useState } from "react";
import { SessionBreakdownItem } from "./types";
import { InfoIcon, SparklesIcon, ChevronIcon } from "@/components/ui/Icons";

export interface ProgressSessionBreakdownProps {
  sessionBreakdown: SessionBreakdownItem[];
  aiInsight: string;
  className?: string;
}

/**
 * Domain-Specific Recitation Session Breakdown Component
 * Located in Learning / Daily Classroom module.
 * Visualizes prayer session distribution (Fajr, Zuhr, Asr, Maghrib, Isha) with AI insights.
 */
export const ProgressSessionBreakdown: React.FC<ProgressSessionBreakdownProps> = ({
  sessionBreakdown = [],
  aiInsight = "",
  className = "",
}) => {
  const [showInsight, setShowInsight] = useState(true);

  const maxValue = Math.max(
    ...sessionBreakdown.map((s) => s.totalPages ?? s.primaryValue ?? s.totalCount ?? 0),
    1
  );

  return (
    <div
      className={`theme-bg-surface border-0 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between select-none ${className}`}
    >
      <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
        {/* 1. Header */}
        <div className="flex items-center justify-between pb-3 border-b theme-border shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wider uppercase theme-text-secondary">
              Session Distribution
            </span>
            <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60" />
          </div>
          <span className="text-xs font-bold font-mono theme-accent">
            {sessionBreakdown.length} Active
          </span>
        </div>

        {/* 2. Analytical Insight Box */}
        {aiInsight && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setShowInsight(!showInsight)}
              className="w-full text-left p-3 rounded-xl border-0 theme-bg-sub hover:theme-bg-elevated transition-all flex items-start justify-between gap-2.5 cursor-pointer shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg theme-bg-accent-soft theme-accent shrink-0 mt-0.5">
                  <SparklesIcon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-xs font-bold theme-text-primary block">
                    Classroom Insights
                  </span>
                  {showInsight ? (
                    <p className="text-[11px] theme-text-secondary leading-relaxed pt-0.5">
                      {aiInsight}
                    </p>
                  ) : (
                    <span className="text-[10px] theme-accent font-medium">
                      Click to expand analysis
                    </span>
                  )}
                </div>
              </div>
              <ChevronIcon isOpen={showInsight} className="w-3.5 h-3.5 theme-text-secondary shrink-0 mt-1" />
            </button>
          </div>
        )}

        {/* 3. Session Volume Split List */}
        <div className="space-y-3 pt-1 flex-1 flex flex-col min-h-0">
          <div className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary shrink-0">
            Volume by Session
          </div>

          {sessionBreakdown.length === 0 ? (
            <div className="text-xs text-center py-4 theme-text-secondary opacity-60 border-0 rounded-xl theme-bg-sub/30">
              No session data in active filter
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto min-h-[140px] pr-1 scrollbar-thin">
              {sessionBreakdown.map((item, idx) => {
                const label = item.sessionName || item.label || `Session ${idx + 1}`;
                const val = item.totalPages ?? item.primaryValue ?? item.totalCount ?? 0;
                const percent = Math.min(100, Math.round((val / maxValue) * 100));

                return (
                  <div key={item.sessionKey || item.id || idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold theme-text-primary truncate max-w-[140px]">
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold theme-text-primary">
                          {Number(val).toFixed(1)}
                        </span>
                        <span className="text-[10px] theme-text-secondary font-mono w-7 text-right">
                          {item.percentOfTotal}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full theme-bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full theme-bg-accent transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressSessionBreakdown;

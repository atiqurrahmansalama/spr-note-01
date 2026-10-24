import React, { useState } from "react";
import { SessionBreakdownItem } from "./types";
import { InfoIcon, SparklesIcon, ChevronIcon } from "@/components/ui/Icons";

export interface ProgressSessionBreakdownProps {
  sessionBreakdown: SessionBreakdownItem[];
  aiInsight: string;
  className?: string;
}

export const ProgressSessionBreakdown: React.FC<ProgressSessionBreakdownProps> = ({
  sessionBreakdown,
  aiInsight,
  className = "",
}) => {
  const [showAiInsight, setShowAiInsight] = useState(true);

  const maxPages = Math.max(...sessionBreakdown.map((s) => s.totalPages), 1);

  return (
    <div
      className={`theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 flex flex-col justify-between select-none ${className}`}
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
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setShowAiInsight(!showAiInsight)}
            className="w-full text-left p-3 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated transition-all flex items-start justify-between gap-2.5 cursor-pointer shadow-2xs"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg theme-bg-accent-soft theme-accent shrink-0 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-xs font-bold theme-text-primary block">
                  Classroom Insights
                </span>
                {showAiInsight ? (
                  <p className="text-[11px] theme-text-secondary leading-relaxed pt-0.5">
                    {aiInsight}
                  </p>
                ) : (
                  <span className="text-[10px] theme-accent font-medium">Click to expand analysis</span>
                )}
              </div>
            </div>
            <ChevronIcon isOpen={showAiInsight} className="w-3.5 h-3.5 theme-text-secondary shrink-0 mt-1" />
          </button>
        </div>

        {/* 3. Session Volume Split List */}
        <div className="space-y-3 pt-1 flex-1 flex flex-col min-h-0">
          <div className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary shrink-0">
            Volume by Session
          </div>

          {sessionBreakdown.length === 0 ? (
            <div className="text-xs text-center py-4 theme-text-secondary opacity-60 border border-dashed theme-border rounded-xl">
              No session data in active filter
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto min-h-[140px] pr-1 scrollbar-thin">
              {sessionBreakdown.map((sess) => {
                const percent = Math.min(100, Math.round((sess.totalPages / maxPages) * 100));

                return (
                  <div key={sess.sessionKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold theme-text-primary truncate max-w-[140px]" title={sess.sessionName}>
                        {sess.sessionName}
                      </span>
                      <span className="font-mono text-xs theme-text-secondary">
                        {sess.totalPages}p · {sess.totalErrors} errors
                      </span>
                    </div>

                    {/* Progress Bar Line */}
                    <div className="w-full h-1.5 rounded-full theme-bg-sub overflow-hidden border theme-border">
                      <div
                        className="h-full theme-bg-accent rounded-full transition-all duration-500"
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

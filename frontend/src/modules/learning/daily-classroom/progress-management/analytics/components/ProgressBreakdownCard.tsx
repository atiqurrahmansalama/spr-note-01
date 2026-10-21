import React, { useState } from "react";
import { SessionProgressItem, PortionCoverageItem } from "../types";
import { InfoIcon, DotsVerticalIcon, SparklesIcon, ChevronIcon } from "@/components/ui/Icons";

export interface ProgressBreakdownCardProps {
  sessionBreakdown: SessionProgressItem[];
  portionBreakdown: PortionCoverageItem[];
  aiInsight: string;
}

export const ProgressBreakdownCard: React.FC<ProgressBreakdownCardProps> = ({
  sessionBreakdown,
  portionBreakdown,
  aiInsight,
}) => {
  const [showAiInsight, setShowAiInsight] = useState(true);

  const totalVolume = portionBreakdown.reduce((sum, p) => sum + p.totalVolume, 0) || 1;

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div>
        {/* 1. Header */}
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wider uppercase theme-text-secondary">
              Session & Portion Breakdown
            </span>
            <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60" />
          </div>
          <button
            type="button"
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition"
            title="Options"
          >
            <DotsVerticalIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Top Summary */}
        <div className="pt-3 pb-2">
          <span className="text-xs theme-text-secondary block">Active Distribution:</span>
          <span className="text-lg font-bold font-mono theme-text-primary block mt-0.5">
            {sessionBreakdown.length} Active Sessions
          </span>
        </div>

        {/* 3. AI Insight Box (Matching Reference Image) */}
        <div className="my-2">
          <button
            type="button"
            onClick={() => setShowAiInsight(!showAiInsight)}
            className="w-full text-left p-3 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated transition-all flex items-start justify-between gap-2 cursor-pointer shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg theme-bg-accent-soft theme-accent shrink-0 mt-0.5">
                <SparklesIcon className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold theme-text-primary block">
                  AI Recitation Insight
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

        {/* 4. Vertical Distribution Bars List */}
        <div className="space-y-3 pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
            Session Volume Split
          </div>

          <div className="space-y-2.5">
            {sessionBreakdown.map((sess) => {
              const maxSessPages = Math.max(...sessionBreakdown.map((s) => s.totalPages), 1);
              const percent = Math.min(100, Math.round((sess.totalPages / maxSessPages) * 100));

              return (
                <div key={sess.sessionKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold theme-text-primary truncate max-w-[150px]">
                      {sess.sessionName}
                    </span>
                    <span className="font-mono text-xs theme-text-secondary">
                      {sess.totalPages}p ({sess.cleanRate}% clean)
                    </span>
                  </div>
                  {/* Slim Progress Bar Line (Matching Image) */}
                  <div className="w-full h-1.5 rounded-full theme-bg-sub overflow-hidden border theme-border">
                    <div
                      className="h-full theme-bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Bottom Quick Stat */}
      <div className="pt-3 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
        <span>Total Portions Recorded:</span>
        <span className="font-mono font-bold theme-text-primary">{portionBreakdown.length} Categories</span>
      </div>
    </div>
  );
};

export default ProgressBreakdownCard;

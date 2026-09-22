import React, { useState } from "react";
import { LearnerProgressPerformanceItem } from "../types";
import { AwardIcon, AlertCircleIcon, CheckCircleIcon } from "@/components/ui/Icons";

interface ProgressStudentLeaderboardProps {
  topPacesetters: LearnerProgressPerformanceItem[];
  remedialLearners: LearnerProgressPerformanceItem[];
}

export const ProgressStudentLeaderboard: React.FC<ProgressStudentLeaderboardProps> = ({
  topPacesetters,
  remedialLearners,
}) => {
  const [activeTab, setActiveTab] = useState<"top" | "remedial">("top");

  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 @container">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
            <AwardIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Learner Pacing Momentum & Attention Spectrum
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Top incremental progress pacesetters and learners requiring remedial coaching
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 rounded-xl theme-bg-subtle border theme-border">
          <button
            type="button"
            onClick={() => setActiveTab("top")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "top"
                ? "bg-emerald-500 text-white shadow-sm"
                : "theme-text-secondary hover:theme-text-primary"
            }`}
          >
            Top Pacesetters ({topPacesetters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("remedial")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "remedial"
                ? "bg-rose-500 text-white shadow-sm"
                : "theme-text-secondary hover:theme-text-primary"
            }`}
          >
            Attention Needed ({remedialLearners.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "top" ? (
        topPacesetters.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <AwardIcon className="w-8 h-8 mx-auto text-emerald-400 opacity-40" />
            <p className="text-xs theme-text-secondary">
              No learner progress logged yet for this selection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 @[640px]:grid-cols-2 gap-3 pt-1">
            {topPacesetters.map((learner, idx) => (
              <div
                key={learner.studentId || idx}
                className="theme-bg-subtle border theme-border rounded-xl p-3.5 space-y-2.5 hover:border-emerald-500/40 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold theme-text-primary">
                      {learner.studentName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono theme-text-secondary">
                      <span>Roll: {learner.rollNumber || "N/A"}</span>
                      {learner.groupName && (
                        <>
                          <span className="opacity-40">•</span>
                          <span>{learner.groupName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-blue-400">
                    {learner.totalPages} Pages
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] theme-text-secondary font-mono">
                    {learner.isClean ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircleIcon className="w-3 h-3" />
                        Clean
                      </span>
                    ) : (
                      <span>{learner.totalMistakes} M | {learner.totalStucks} S</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : remedialLearners.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            ✓
          </div>
          <p className="text-xs text-emerald-400 font-semibold">
            All learners are progressing with pristine accuracy!
          </p>
          <p className="text-[11px] theme-text-secondary">
            No learners exceeding error density thresholds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 @[640px]:grid-cols-2 gap-3 pt-1">
          {remedialLearners.map((learner, idx) => (
            <div
              key={learner.studentId || idx}
              className="theme-bg-subtle border border-rose-500/30 rounded-xl p-3.5 space-y-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertCircleIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold theme-text-primary">
                    {learner.studentName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] theme-text-secondary font-mono">
                    <span>Roll: {learner.rollNumber || "N/A"}</span>
                    <span className="text-rose-400 font-semibold uppercase">
                      {learner.errorDensity} err/pg
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-rose-400">
                  {learner.totalMistakes} M | {learner.totalStucks} S
                </div>
                <div className="text-[10px] theme-text-secondary font-mono">
                  {learner.totalPages} Pages logged
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

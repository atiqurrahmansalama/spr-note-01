import React from "react";
import { EvaluationStatusCount } from "../types";
import { ChecklistIcon } from "@/components/ui/Icons";

interface EvaluationStatusBreakdownProps {
  statusBreakdown: EvaluationStatusCount[];
  totalStudents: number;
}

export const EvaluationStatusBreakdown: React.FC<EvaluationStatusBreakdownProps> = ({
  statusBreakdown,
  totalStudents,
}) => {
  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
            <ChecklistIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Student Assessment Status Distribution
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Mastery, retake, and preparedness breakdown for {totalStudents} students
            </p>
          </div>
        </div>
      </div>

      {/* Multi-segment Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-700/20 h-3 rounded-full overflow-hidden flex">
          {statusBreakdown.map((item) => {
            if (item.percentage <= 0) return null;
            return (
              <div
                key={item.status}
                className={`${item.bgClass} h-full transition-all duration-500`}
                style={{ width: `${item.percentage}%` }}
                title={`${item.label}: ${item.count} (${item.percentage}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-3 @[800px]:grid-cols-5 gap-2.5 pt-1">
        {statusBreakdown.map((item) => (
          <div
            key={item.status}
            className="theme-bg-subtle border theme-border rounded-xl p-3 flex flex-col justify-between space-y-1"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.bgClass}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary truncate">
                {item.label}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono theme-text-primary">
                {item.count}
              </span>
              <span className={`text-xs font-mono font-semibold ${item.colorClass}`}>
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

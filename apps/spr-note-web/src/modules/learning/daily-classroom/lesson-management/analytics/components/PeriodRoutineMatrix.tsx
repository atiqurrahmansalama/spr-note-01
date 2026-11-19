import React from "react";
import { PeriodSlotRoutineItem } from "../types";
import { ClockIcon, CheckCircleIcon, AlertCircleIcon } from "@/components/ui/Icons";

interface PeriodRoutineMatrixProps {
  periodRoutines: PeriodSlotRoutineItem[];
}

export const PeriodRoutineMatrix: React.FC<PeriodRoutineMatrixProps> = ({
  periodRoutines,
}) => {
  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b theme-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg theme-bg-subtle border theme-border">
            <ClockIcon className="w-4 h-4 theme-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              Period Routine & Delivery Matrix
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Slot-by-slot status of teacher delivery and classroom evaluation
            </p>
          </div>
        </div>
      </div>

      {/* Routine Slots Grid */}
      <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[840px]:grid-cols-4 gap-3 pt-1">
        {periodRoutines.map((slot) => (
          <div
            key={slot.periodSlot}
            className={`rounded-xl p-3 border transition-all space-y-2.5 flex flex-col justify-between ${
              slot.isAssigned
                ? "theme-bg-subtle border-emerald-500/30 shadow-sm"
                : "theme-bg-subtle/50 theme-border opacity-70"
            }`}
          >
            {/* Top: Slot name and badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-mono theme-text-primary">
                  {slot.periodName}
                </span>
              </div>
              {slot.isAssigned ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircleIcon className="w-3 h-3" />
                  Assigned
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  Unscheduled
                </span>
              )}
            </div>

            {/* Time */}
            <span className="text-[10px] font-mono theme-text-secondary block">
              {slot.timeRange}
            </span>

            {/* Middle: Content details */}
            <div className="pt-2 border-t theme-border space-y-1">
              {slot.isAssigned ? (
                <>
                  <div className="text-xs font-semibold theme-text-primary truncate">
                    {slot.bookName || slot.subjectName || slot.lessonTitle || "Lesson Covered"}
                  </div>
                  <div className="text-[10px] theme-text-secondary truncate">
                    Teacher: {slot.teacherName || "Assigned Faculty"}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic py-1">
                  No lesson planned
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

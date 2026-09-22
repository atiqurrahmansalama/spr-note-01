import React from "react";
import { SubjectCoverageItem } from "../types";
import { BookOpenIcon, StarIcon } from "@/components/ui/Icons";

interface SubjectCoverageMatrixProps {
  subjectCoverage: SubjectCoverageItem[];
}

export const SubjectCoverageMatrix: React.FC<SubjectCoverageMatrixProps> = ({
  subjectCoverage,
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
              Curriculum Book & Subject Coverage
            </h3>
            <p className="text-[11px] theme-text-secondary">
              Lesson delivery volume and student mastery per curriculum textbook
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono theme-text-secondary">
          {subjectCoverage.length} Subjects Active
        </span>
      </div>

      {subjectCoverage.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <BookOpenIcon className="w-8 h-8 mx-auto theme-text-secondary opacity-40" />
          <p className="text-xs theme-text-secondary">
            No curriculum subjects or lesson plans recorded for this selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 @[640px]:grid-cols-2 gap-3 pt-1">
          {subjectCoverage.map((item, idx) => (
            <div
              key={`${item.bookName}-${idx}`}
              className="theme-bg-subtle border theme-border rounded-xl p-3.5 space-y-3 hover:border-slate-600/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold theme-text-primary">
                    {item.bookName}
                  </h4>
                  <span className="text-[10px] theme-text-secondary uppercase tracking-wider block">
                    {item.subjectName}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  {item.unitSpan}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t theme-border text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] theme-text-secondary block">Assigned</span>
                  <span className="text-xs font-bold font-mono theme-text-primary">
                    {item.lessonsAssigned}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] theme-text-secondary block">Evaluated</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {item.studentsEvaluated}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] theme-text-secondary block">Avg Score</span>
                  <span className="text-xs font-bold font-mono text-amber-400">
                    {item.averageScore > 0 ? `${item.averageScore} / 10` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

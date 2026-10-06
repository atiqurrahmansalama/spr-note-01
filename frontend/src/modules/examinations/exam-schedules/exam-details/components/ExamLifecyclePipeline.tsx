import React from 'react';
import { CheckCircleIcon } from '../../../../../components/ui/Icons';
import { LIFECYCLE_STAGES, getLifecycleStageIndex } from '../utils';

export interface ExamLifecyclePipelineProps {
  status?: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * ExamLifecyclePipeline
 * Reusable visual pipeline stepper displaying the multi-stage lifecycle
 * progression of an examination session (Draft -> Mark Entry -> Review -> Certified).
 */
export default function ExamLifecyclePipeline({
  status,
  showLabel = false,
  className = '',
}: ExamLifecyclePipelineProps) {
  const currentStageIdx = getLifecycleStageIndex(status);

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 ${className}`}>
      {showLabel && (
        <span className="font-bold theme-text-secondary uppercase tracking-wider text-[10px] mr-0.5 shrink-0">
          Lifecycle:
        </span>
      )}
      {LIFECYCLE_STAGES.map((st, idx) => {
        const isCurrent = currentStageIdx === idx;
        const isPast = currentStageIdx > idx;
        return (
          <React.Fragment key={st.key}>
            {idx > 0 && (
              <span
                className={`text-[10px] select-none ${
                  isPast ? 'theme-accent font-bold' : 'theme-text-secondary opacity-30'
                }`}
              >
                →
              </span>
            )}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                isCurrent
                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 font-bold shadow-2xs'
                  : isPast
                  ? 'theme-text-primary font-medium'
                  : 'theme-text-secondary opacity-50'
              }`}
            >
              {isPast ? (
                <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
              ) : (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isCurrent ? 'bg-[var(--accent-main)]' : 'theme-bg-subtle'
                  }`}
                />
              )}
              <span>{st.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

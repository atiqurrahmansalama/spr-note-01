import React from 'react';
import { CheckIcon } from './Icons';

export interface StepItem {
  id?: string | number;
  label: string;
  description?: string;
  [key: string]: any;
}

export interface StepperProps {
  steps?: Array<StepItem | string>;
  currentStep?: number;
  onStepClick?: (stepNumber: number, stepObj: StepItem) => void;
  clickable?: boolean;
  allowFutureClick?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable Enterprise Multi-Step Stepper / Progress Tracker
 * Clean, borderless and transparent design.
 * Features a seamless full-width connecting line across step nodes,
 * solid completed checks, target active dot, and clean upcoming nodes.
 */
export default function Stepper({
  steps = [],
  currentStep = 1,
  onStepClick,
  clickable = true,
  allowFutureClick = false,
  size = 'md',
  className = '',
}: StepperProps) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  // Normalized steps objects
  const normalizedSteps: StepItem[] = steps.map((s, idx) => {
    if (typeof s === 'string') {
      return { id: idx + 1, label: s };
    }
    return { id: s.id ?? idx + 1, label: s.label || `Step ${idx + 1}`, ...s };
  });

  const totalSteps = normalizedSteps.length;

  // Node dimension configs based on size
  const sizeConfig = {
    sm: {
      node: 'w-7 h-7',
      dot: 'w-2 h-2',
      icon: 'w-3.5 h-3.5',
      topOffset: 'top-3.5',
      label: 'text-[10px] sm:text-[11px]',
      padding: 'py-1.5 px-1',
    },
    md: {
      node: 'w-8 h-8 sm:w-9 sm:h-9',
      dot: 'w-2.5 h-2.5',
      icon: 'w-4 h-4',
      topOffset: 'top-4 sm:top-4.5',
      label: 'text-[11px] sm:text-xs',
      padding: 'py-2 px-1 sm:px-2',
    },
    lg: {
      node: 'w-10 h-10 sm:w-11 sm:h-11',
      dot: 'w-3 h-3',
      icon: 'w-5 h-5',
      topOffset: 'top-5 sm:top-5.5',
      label: 'text-xs sm:text-sm',
      padding: 'py-3 px-2 sm:px-4',
    },
  }[size] || {
    node: 'w-8 h-8 sm:w-9 sm:h-9',
    dot: 'w-2.5 h-2.5',
    icon: 'w-4 h-4',
    topOffset: 'top-4 sm:top-4.5',
    label: 'text-[11px] sm:text-xs',
    padding: 'py-2 px-1 sm:px-2',
  };

  // Calculate percentage step offset for center-to-center continuous track line
  const halfStepPercent = 100 / (totalSteps * 2);
  const activeProgressPercent =
    totalSteps > 1
      ? Math.min(Math.max((currentStep - 1) / (totalSteps - 1), 0), 1) * 100
      : 100;

  return (
    <div
      className={`w-full select-none transition-all ${sizeConfig.padding} ${className}`}
      role="navigation"
      aria-label="Progress Tracker"
    >
      <div className="relative w-full">
        {/* Continuous Background Track Line spanning from Step 1 Center to Step N Center */}
        {totalSteps > 1 && (
          <div
            className={`absolute ${sizeConfig.topOffset} -translate-y-1/2 h-[2px] bg-zinc-200 dark:bg-zinc-700/60 z-0 overflow-hidden rounded-full`}
            style={{
              left: `${halfStepPercent}%`,
              right: `${halfStepPercent}%`,
            }}
            aria-hidden="true"
          >
            {/* Active Progress Fill Line */}
            <div
              className="h-full theme-bg-accent transition-all duration-500 ease-out rounded-full"
              style={{ width: `${activeProgressPercent}%` }}
            />
          </div>
        )}

        {/* Step Nodes Row */}
        <div className="flex items-start justify-between w-full relative z-10">
          {normalizedSteps.map((step, idx) => {
            const stepNumber = idx + 1;
            const isCompleted = stepNumber < currentStep;
            const isActive = stepNumber === currentStep;
            const isUpcoming = stepNumber > currentStep;

            const isNodeClickable =
              Boolean(onStepClick) &&
              clickable &&
              (isCompleted || (allowFutureClick && isUpcoming));

            return (
              <div
                key={step.id || stepNumber}
                className="flex-1 flex flex-col items-center text-center relative px-1 min-w-0"
              >
                {/* Step Circle Node */}
                <button
                  type="button"
                  disabled={!isNodeClickable}
                  onClick={() => isNodeClickable && onStepClick?.(stepNumber, step)}
                  className={`relative rounded-full flex items-center justify-center transition-all duration-300 ${sizeConfig.node} ${
                    isNodeClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                  } ${
                    isCompleted
                      ? 'theme-bg-accent theme-accent-text shadow-sm ring-4 ring-[var(--bg-surface,white)]'
                      : isActive
                      ? 'border-2 border-[var(--accent-main)] bg-[var(--bg-surface,white)] shadow-xs ring-4 ring-[var(--bg-surface,white)]'
                      : 'border border-zinc-300 dark:border-zinc-700 bg-[var(--bg-surface,white)] ring-4 ring-[var(--bg-surface,white)]'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`${step.label} (${isCompleted ? 'Completed' : isActive ? 'Current' : 'Upcoming'})`}
                  title={step.label}
                >
                  {isCompleted ? (
                    // Completed Checkmark
                    <CheckIcon className={`${sizeConfig.icon} text-white stroke-[3]`} />
                  ) : isActive ? (
                    // Active Target Center Dot
                    <span className={`rounded-full bg-[var(--accent-main)] ${sizeConfig.dot}`} />
                  ) : (
                    // Inactive Subtle Hollow
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 opacity-60" />
                  )}
                </button>

                {/* Step Label Beneath */}
                <span
                  className={`mt-2 text-center truncate w-full font-medium leading-tight transition-colors duration-200 ${sizeConfig.label} ${
                    isActive
                      ? 'font-bold theme-text-primary'
                      : isCompleted
                      ? 'theme-text-primary opacity-85 font-semibold'
                      : 'theme-text-secondary opacity-60'
                  }`}
                  title={step.label}
                >
                  {step.label}
                </span>

                {step.description && (
                  <span className="hidden md:block text-[10px] theme-text-secondary opacity-60 text-center truncate w-full mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

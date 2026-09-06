import React, { useState } from 'react';
import { AlertCircleIcon, AlertTriangleIcon } from '@/components/ui/Icons';

/**
 * RoutineConflictBadge
 * Miniature warning indicator rendered inside cells with scheduling clashes.
 * Displays interactive hover tooltip detailing the clash.
 */
export default function RoutineConflictBadge({ conflictInfo }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!conflictInfo || !conflictInfo.hasConflict) return null;

  const isDanger = conflictInfo.severity === 'danger';
  const conflicts = conflictInfo.conflicts || [];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`flex items-center justify-center transition-transform hover:scale-125 cursor-help ${
          isDanger
            ? 'theme-danger animate-pulse'
            : 'theme-warning'
        }`}
        title="Scheduling Conflict Detected"
      >
        <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
      </div>

      {/* Hover Details Floating Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 sm:w-64 p-2.5 rounded-xl border theme-border theme-bg-surface shadow-xl text-left pointer-events-none animate-fade-in">
          <div className="flex items-center gap-1.5 pb-1 border-b theme-border mb-1.5 font-bold text-xs theme-danger">
            <AlertTriangleIcon className="w-3.5 h-3.5" />
            <span>Scheduling Conflict Detected</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {conflicts.map((c, idx) => (
              <div key={idx} className="space-y-0.5">
                <p className="font-semibold theme-text-primary">{c.title}</p>
                <p className="text-[10px] theme-text-secondary leading-tight">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

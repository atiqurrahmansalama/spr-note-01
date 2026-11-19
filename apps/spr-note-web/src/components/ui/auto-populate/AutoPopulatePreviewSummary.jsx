/**
 * AutoPopulatePreviewSummary.jsx
 * Enterprise Live Simulation Diff & Metrics Card.
 * Displays real-time breakdown of records to create, update, preserve, or remove before committing.
 */

import React from 'react';
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LayersIcon,
} from '../Icons';

export default function AutoPopulatePreviewSummary({
  simulation = null,
  isSimulating = false,
  errors = [],
  warnings = [],
  className = '',
}) {
  if (isSimulating) {
    return (
      <div className={`p-4 rounded-xl border theme-border theme-bg-sub flex items-center gap-3 animate-pulse ${className}`}>
        <SparklesIcon className="w-5 h-5 theme-accent animate-spin" />
        <div className="text-xs font-semibold theme-text-secondary">
          Simulating generation rules & calculating dataset diff...
        </div>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className={`p-3.5 rounded-xl border border-[var(--danger-main)]/30 theme-bg-danger-soft space-y-2 text-xs ${className}`}>
        <div className="flex items-center gap-2 font-bold theme-danger">
          <AlertTriangleIcon className="w-4 h-4 shrink-0" />
          <span>Cannot proceed with Auto-Populate</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 theme-danger text-[11px]">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!simulation) {
    return null;
  }

  const { summary = {}, toCreate = [], toUpdate = [], toRemove = [] } = simulation;

  return (
    <div className={`space-y-3 animate-fade-in ${className}`}>
      {/* ── Summary Statistics Grid ── */}
      <div className="grid grid-cols-2 @[480px]:grid-cols-4 gap-2 text-left">
        <div className="p-2.5 rounded-xl theme-bg-sub border theme-border">
          <div className="text-[10px] theme-text-secondary font-medium uppercase tracking-wider">
            Total Target
          </div>
          <div className="text-lg font-bold font-mono theme-text-primary">
            {summary.totalFinal || simulation.items?.length || 0}
          </div>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-success-soft border border-[var(--success-main)]/30">
          <div className="text-[10px] theme-success font-medium uppercase tracking-wider">
            New to Create
          </div>
          <div className="text-lg font-bold font-mono theme-success">
            +{summary.createdCount ?? toCreate.length}
          </div>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-accent-soft border theme-border">
          <div className="text-[10px] theme-accent font-medium uppercase tracking-wider">
            To Update / Merge
          </div>
          <div className="text-lg font-bold font-mono theme-accent">
            {summary.updatedCount ?? toUpdate.length}
          </div>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-sub border theme-border">
          <div className="text-[10px] theme-text-secondary font-medium uppercase tracking-wider">
            Preserved
          </div>
          <div className="text-lg font-bold font-mono theme-text-secondary">
            {summary.preservedCount ?? 0}
          </div>
        </div>
      </div>

      {/* ── Warnings if any ── */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl border border-[var(--warning-main)]/30 theme-bg-warning-soft text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold theme-warning">
            <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Notices</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 theme-warning text-[11px]">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

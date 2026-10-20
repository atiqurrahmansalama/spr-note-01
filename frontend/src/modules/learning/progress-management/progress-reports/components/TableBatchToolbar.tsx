import React from "react";
import { ChevronIcon } from "@/components/ui/Icons";

export interface TableBatchToolbarProps {
  totalItems: number;
  selectedCount: number;
  isAllExpanded: boolean;
  onToggleExpandAll: () => void;
  expandAllLabel: string;
  collapseAllLabel: string;
  showingLabel?: string;
  selectedBadgeLabel?: string;
  children?: React.ReactNode;
}

/**
 * Enterprise Reusable Batch Toolbar for Progress Reports DataTables
 * Handles Expand/Collapse All toggling, selection counts, and header actions symmetrically.
 */
export function TableBatchToolbar({
  totalItems,
  selectedCount,
  isAllExpanded,
  onToggleExpandAll,
  expandAllLabel,
  collapseAllLabel,
  showingLabel,
  selectedBadgeLabel = "selected",
  children,
}: TableBatchToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs theme-text-secondary">
      <div className="flex items-center gap-2">
        {showingLabel && (
          <span className="font-medium">
            {showingLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {totalItems > 0 && (
          <button
            type="button"
            onClick={onToggleExpandAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border theme-border hover:theme-bg-elevated transition cursor-pointer text-xs font-semibold theme-text-primary"
          >
            <ChevronIcon isOpen={isAllExpanded} className="w-3.5 h-3.5" />
            <span>{isAllExpanded ? collapseAllLabel : expandAllLabel}</span>
          </button>
        )}

        {selectedCount > 0 && (
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg theme-bg-accent-soft theme-accent border border-current/20">
            {selectedCount} {selectedBadgeLabel}
          </span>
        )}

        {children}
      </div>
    </div>
  );
}

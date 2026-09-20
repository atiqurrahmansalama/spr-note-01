import React from "react";
import { CloseIcon, RefreshIcon } from "../../../../../../components/ui/Icons";

export interface RowRemoveButtonProps {
  onRemove?: () => void;
  title?: string;
  className?: string;
}

/**
 * Reusable Row Close / Remove (X) button for Daily Progress rows.
 * Positions at the far right with ml-auto and consistent hover/active feedback.
 */
export function RowRemoveButton({ 
  onRemove, 
  title = "Remove Row", 
  className = "" 
}: RowRemoveButtonProps) {
  if (!onRemove) return <div className="shrink-0" />;
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`p-1 theme-text-secondary hover:theme-danger transition-colors shrink-0 flex items-center justify-center h-[38px] sm:h-10 cursor-pointer ml-auto ${className}`}
      title={title}
    >
      <CloseIcon className="w-3.5 h-3.5" />
    </button>
  );
}

export interface RowAddCircleButtonProps {
  onAdd: () => void;
  title?: string;
  className?: string;
}

/**
 * Reusable small circular (+) button for adding Ayahs or Page Ranges.
 */
export function RowAddCircleButton({ 
  onAdd, 
  title = "Add", 
  className = "" 
}: RowAddCircleButtonProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`w-5 h-5 sm:w-6 sm:h-6 text-xs sm:text-sm rounded-full border theme-border flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-all shrink-0 cursor-pointer ${className}`}
      title={title}
    >
      +
    </button>
  );
}

export interface SectionHeaderBarProps {
  title: string;
  count?: number;
  showReset?: boolean;
  onReset?: () => void;
  resetTitle?: string;
}

/**
 * Reusable Section Header Bar with title, count badge, and optional reset button.
 */
export function SectionHeaderBar({
  title,
  count = 0,
  showReset = false,
  onReset,
  resetTitle = "Reset",
}: SectionHeaderBarProps) {
  return (
    <div className="flex items-center justify-between min-h-[34px] sm:min-h-[38px] mb-2 sm:mb-2.5 select-none">
      <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
        {title}
        {count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border font-mono shadow-sm">
            {count}
          </span>
        )}
      </h3>
      {showReset && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="theme-bg-sub border theme-border theme-text-secondary hover:theme-danger hover:theme-bg-elevated p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center"
          title={resetTitle}
        >
          <RefreshIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit transition-colors" />
        </button>
      ) : (
        <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 pointer-events-none opacity-0" />
      )}
    </div>
  );
}

export interface AddMoreSectionButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Reusable "+ Add More" dashed button positioned beneath row items.
 */
export function AddMoreSectionButton({
  onClick,
  label = "+ Add More",
  className = "",
}: AddMoreSectionButtonProps) {
  return (
    <div className={`flex justify-center sm:justify-start sm:pl-[80px] pt-3.5 mt-2 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="px-4 py-1.5 rounded-full border theme-border border-dashed hover:border-solid theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-sm"
      >
        {label}
      </button>
    </div>
  );
}

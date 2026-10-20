import React from "react";
import { ChecklistIcon } from "@/components/ui/Icons";

export interface EmptyReportsStateProps {
  onResetFilters?: () => void;
  onRefresh?: () => void;
  t: (key: string, defaultText: string) => string;
}

/**
 * Enterprise empty state placeholder for progress report data grids.
 */
export const EmptyReportsState: React.FC<EmptyReportsStateProps> = ({
  onResetFilters,
  onRefresh,
  t,
}) => {
  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3.5 shadow-sm select-none">
      <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center theme-text-secondary opacity-80">
        <ChecklistIcon className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold theme-text-primary">
          {t("noReportsFound", "No Progress Reports Found")}
        </h4>
        <p className="text-xs theme-text-secondary max-w-sm">
          {t("noReportsDesc", "No daily progress reports match the current filters or date criteria.")}
        </p>
      </div>
      {(onResetFilters || onRefresh) && (
        <div className="flex items-center gap-2 pt-1">
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
            >
              {t("resetFilters", "Reset Filters")}
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-xs"
            >
              {t("refreshData", "Refresh Data")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyReportsState;

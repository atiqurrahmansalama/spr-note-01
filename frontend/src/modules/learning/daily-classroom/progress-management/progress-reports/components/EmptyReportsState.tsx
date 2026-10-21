import React, { useMemo } from "react";
import EmptyState, { EmptyStateAction } from "@/components/ui/EmptyState";
import { ChecklistIcon } from "@/components/ui/Icons";

export interface EmptyReportsStateProps {
  onResetFilters?: () => void;
  onRefresh?: () => void;
  t: (key: string, defaultText: string) => string;
  className?: string;
}

/**
 * Enterprise empty state placeholder for progress report data grids.
 * Fully powered by the central project EmptyState UI component.
 */
export const EmptyReportsState: React.FC<EmptyReportsStateProps> = ({
  onResetFilters,
  onRefresh,
  t,
  className = "",
}) => {
  const actions = useMemo<EmptyStateAction[]>(() => {
    const list: EmptyStateAction[] = [];
    if (onResetFilters) {
      list.push({
        label: t("resetFilters", "Reset Filters"),
        onClick: onResetFilters,
        variant: "sub",
        size: "sm",
      });
    }
    if (onRefresh) {
      list.push({
        label: t("refreshData", "Refresh Data"),
        onClick: onRefresh,
        variant: "primary",
        size: "sm",
      });
    }
    return list;
  }, [onResetFilters, onRefresh, t]);

  return (
    <EmptyState
      icon={ChecklistIcon}
      iconVariant="default"
      iconSize="lg"
      variant="card"
      size="lg"
      title={t("noReportsFound", "No Progress Reports Found")}
      titleClassName="text-sm font-bold theme-text-primary"
      description={t(
        "noReportsDesc",
        "No daily progress reports match the current filters or date criteria."
      )}
      descriptionClassName="text-xs theme-text-secondary max-w-sm"
      actions={actions}
      className={className}
    />
  );
};

export default EmptyReportsState;

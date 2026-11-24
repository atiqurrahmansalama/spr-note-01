import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  TrendChartProps,
  ChartViewMode,
  MetricType,
} from "./types";
import ActionMenu from "@/components/ui/ActionMenu";
import SegmentedSwitch, { SegmentedSwitchOption } from "@/components/ui/SegmentedSwitch";
import { useToast } from "@/context/ToastContext";
import {
  TrendingUpIcon,
  InfoIcon,
  BarChartIcon,
  LineChartIcon,
} from "@/components/ui/Icons";
import {
  TrendSummaryCards,
  TrendChartLegend,
  TrendChartFooter,
  TrendPlotArea,
  useTrendChartExport,
} from "./trends";

/**
 * Universal, Enterprise Domain-Agnostic Analytical Trend Chart
 * Strictly decoupling UI presentation and metric visualization from business domains.
 */
export const TrendChart: React.FC<TrendChartProps> = ({
  dataPoints = [],
  series = [],
  activeMetric = "combined",
  onMetricChange,
  metricOptions = [],
  title = "Analytical Trends",
  subtitle = "Chronological metrics driven by date criteria",
  emptyMessage = "No data points found for this range.",
  emptyIcon: EmptyIcon = TrendingUpIcon,
  kpiItems = [],
  footerFields = [],
  viewMode: controlledViewMode,
  onViewModeChange,
  hoveredIndex: controlledHoveredIndex,
  onHoverIndexChange,
  exportFilename = "trend_analytics",
  exportTitle = "Analytical Trends",
  className = "",
  customTooltipRenderer,
  trendPoints: legacyTrendPoints,
  extraMenuItems = [],
}) => {
  const { showToast } = useToast() as any;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Controlled vs internal hover state support
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<number | null>(null);
  const isHoverControlled = controlledHoveredIndex !== undefined;
  const hoveredIndex = isHoverControlled ? controlledHoveredIndex : internalHoveredIndex;

  const handleHoverChange = useCallback(
    (index: number | null) => {
      if (!isHoverControlled) {
        setInternalHoveredIndex(index);
      }
      onHoverIndexChange?.(index);
    },
    [isHoverControlled, onHoverIndexChange]
  );

  const effectivePoints = dataPoints.length > 0 ? dataPoints : legacyTrendPoints || [];

  const activeHoverPoint =
    hoveredIndex !== null && effectivePoints[hoveredIndex] ? effectivePoints[hoveredIndex] : null;

  const resolvedFooterFields = useMemo(() => {
    if (typeof footerFields === "function") {
      return footerFields(hoveredIndex, activeHoverPoint);
    }
    return footerFields || [];
  }, [footerFields, hoveredIndex, activeHoverPoint]);

  // Auto-switch to line chart if dense dataset (> 14 points)
  const isDenseDataset = effectivePoints.length > 14;
  const [internalViewMode, setInternalViewMode] = useState<ChartViewMode | null>(null);
  const viewMode: ChartViewMode =
    controlledViewMode ?? internalViewMode ?? (isDenseDataset ? "line" : "bars");

  const handleViewModeChange = (mode: ChartViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const defaultViewModeOptions: SegmentedSwitchOption[] = [
    { value: "bars", label: "Bars", icon: BarChartIcon },
    { value: "line", label: "Line", icon: LineChartIcon },
  ];

  // Callback holder for coordinate calculator (used during medium-width canvas export)
  const [coordCalculator, setCoordCalculator] = useState<
    ((width: number) => Record<string, Array<{ x: number; y: number }>>) | undefined
  >(undefined);

  // Reusable export hook with Toast integration
  const { exportMenuItems } = useTrendChartExport({
    chartContainerRef,
    dataPoints: effectivePoints,
    series,
    activeMetric,
    exportFilename,
    exportTitle,
    footerFields: resolvedFooterFields,
    onSuccess: (msg) => showToast?.(msg, "success"),
    computeCoordinatesForWidth: coordCalculator,
  });

  const combinedMenuItems = useMemo(() => {
    if (!extraMenuItems || extraMenuItems.length === 0) {
      return exportMenuItems;
    }
    return [...extraMenuItems, ...exportMenuItems];
  }, [extraMenuItems, exportMenuItems]);

  return (
    <div
      ref={chartContainerRef}
      className={`@container theme-bg-surface border-0 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-2.5 sm:space-y-3 select-none relative w-full min-w-0 overflow-hidden ${className}`}
    >
      {/* 1. Header Toolbar: Left Title + Right Unified Controls */}
      <div className="flex flex-col @[680px]:flex-row @[680px]:items-center justify-between gap-2.5 border-b theme-border pb-2 sm:pb-2.5 w-full min-w-0">
        {/* Row 1 on mobile: Left Title + Right 3-Dot ActionMenu */}
        <div className="flex items-center justify-between w-full @[680px]:w-auto min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <TrendingUpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold tracking-wider uppercase theme-text-primary whitespace-nowrap">
                    {title}
                  </h4>
                  <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60 shrink-0" />
                </div>
                {subtitle && (
                  <p className="text-[11px] theme-text-secondary truncate hidden xl:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile 3-dot button */}
          <div className="@[680px]:hidden shrink-0">
            <ActionMenu
              items={combinedMenuItems}
              size="sm"
              variant="ghost"
              align="right"
              showChevron={false}
              title={`${title}`}
              ariaLabel="Chart Options"
            />
          </div>
        </div>

        {/* Row 2 on mobile: Metric Switch + View Switch + Desktop 3-dot button */}
        <div className="flex items-center gap-1.5 @[680px]:gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar justify-center @[680px]:justify-end w-full @[680px]:w-auto">
          {metricOptions.length > 0 && onMetricChange && (
            <SegmentedSwitch
              options={metricOptions}
              value={activeMetric}
              onChange={(val) => onMetricChange(val as MetricType)}
              size="xs"
              ariaLabel="Metric Selection"
            />
          )}

          <SegmentedSwitch
            options={defaultViewModeOptions}
            value={viewMode}
            onChange={(val) => handleViewModeChange(val as ChartViewMode)}
            size="xs"
            ariaLabel="Chart View Mode"
          />

          {/* Desktop 3-dot button */}
          <div className="hidden @[680px]:block shrink-0">
            <ActionMenu
              items={combinedMenuItems}
              size="sm"
              variant="ghost"
              align="right"
              showChevron={false}
              title={`${title}`}
              ariaLabel="Chart Options"
            />
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {kpiItems.length > 0 && (
        <TrendSummaryCards items={kpiItems as any} currentMetric={activeMetric} />
      )}

      {/* 3. Legend Row */}
      {series.length > 0 && <TrendChartLegend items={series as any} />}

      {/* 4. Main Chart Canvas or Empty State */}
      {effectivePoints.length === 0 ? (
        <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed theme-border rounded-xl">
          <EmptyIcon className="w-8 h-8 theme-text-secondary opacity-40 mb-2" />
          <p className="text-xs font-semibold theme-text-secondary">{emptyMessage}</p>
        </div>
      ) : (
        <TrendPlotArea
          dataPoints={effectivePoints}
          series={series}
          viewMode={viewMode}
          hoveredIndex={hoveredIndex}
          onHoverIndexChange={handleHoverChange}
          customTooltipRenderer={customTooltipRenderer}
          onCoordinatesComputed={setCoordCalculator}
        />
      )}

      {/* 5. Dynamic Footer Metadata */}
      {resolvedFooterFields.length > 0 && <TrendChartFooter fields={resolvedFooterFields as any} />}
    </div>
  );
};

export default TrendChart;

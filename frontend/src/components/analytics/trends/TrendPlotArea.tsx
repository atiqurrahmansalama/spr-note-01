import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { TrendDataPoint, ChartSeriesConfig, ChartViewMode } from "../types";
import {
  computeNiceYAxis,
  formatTickValue,
  parseDateParts,
  generateSmoothPath,
  extendCoordsToEdges,
  generateAreaPath,
} from "../chartUtils";
import TrendBar from "./TrendBar";
import TrendChartTooltip from "./TrendChartTooltip";

export interface TrendPlotAreaProps {
  dataPoints: TrendDataPoint[];
  series: ChartSeriesConfig[];
  viewMode: ChartViewMode;
  hoveredIndex: number | null;
  onHoverIndexChange: (index: number | null) => void;
  customTooltipRenderer?: (point: TrendDataPoint, series: ChartSeriesConfig[]) => React.ReactNode;
  onCoordinatesComputed?: (
    fn: (width: number) => Record<string, Array<{ x: number; y: number }>>
  ) => void;
}

/**
 * Enterprise Reusable Time-Series Chart Plot Canvas
 * Restores 100% pixel-perfect fidelity, precise Y-axis spacer, SVG bar overlays, and absolute timeline.
 */
export const TrendPlotArea: React.FC<TrendPlotAreaProps> = ({
  dataPoints,
  series,
  viewMode,
  hoveredIndex,
  onHoverIndexChange,
  customTooltipRenderer,
  onCoordinatesComputed,
}) => {
  const chartCanvasRef = useRef<HTMLDivElement>(null);

  const chartHeight = 220;
  const topPadding = 12;
  const bottomPadding = 4;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const baselineY = chartHeight - bottomPadding;

  const visibleSeries = useMemo(() => {
    return series.filter((s) => s.visible !== false);
  }, [series]);

  // Compute maximum value across all visible series and points
  const rawMax = useMemo(() => {
    if (dataPoints.length === 0 || visibleSeries.length === 0) return 5;
    let max = 1;
    dataPoints.forEach((p) => {
      visibleSeries.forEach((s) => {
        const raw =
          p.values?.[s.key] !== undefined
            ? p.values[s.key]
            : (p as Record<string, any>)[s.key];
        const val = Number(raw) || 0;
        if (val > max) max = val;
      });
    });
    return max;
  }, [dataPoints, visibleSeries]);

  const { max: niceMax, ticks: yTicks } = useMemo(() => computeNiceYAxis(rawMax), [rawMax]);

  // Responsive chart plot container size
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== "undefined" ? Math.max(280, Math.min(window.innerWidth - 64, 900)) : 600
  );

  useEffect(() => {
    const updateSize = () => {
      if (chartCanvasRef.current) {
        const rect = chartCanvasRef.current.getBoundingClientRect();
        const w = rect.width || chartCanvasRef.current.clientWidth;
        if (w > 0) setContainerWidth(Math.round(w));
      }
    };
    updateSize();

    const rafId = requestAnimationFrame(updateSize);
    const timer1 = setTimeout(updateSize, 80);
    const timer2 = setTimeout(updateSize, 250);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) setContainerWidth(Math.round(w));
        }
      });
      if (chartCanvasRef.current) ro.observe(chartCanvasRef.current);
    }

    window.addEventListener("resize", updateSize);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", updateSize);
      if (ro) ro.disconnect();
    };
  }, [dataPoints.length, viewMode]);

  // Unified coordinate calculation helper for any width
  const computeCoordinatesForWidth = useCallback(
    (targetWidth: number): Record<string, Array<{ x: number; y: number }>> => {
      if (dataPoints.length === 0 || targetWidth <= 0 || visibleSeries.length === 0) {
        return {};
      }
      const n = dataPoints.length;
      const colWidth = targetWidth / n;
      const coordsMap: Record<string, Array<{ x: number; y: number }>> = {};

      visibleSeries.forEach((s) => {
        coordsMap[s.key] = [];
      });

      dataPoints.forEach((p, i) => {
        const x = i * colWidth + colWidth / 2;
        visibleSeries.forEach((s) => {
          const raw =
            p.values?.[s.key] !== undefined
              ? p.values[s.key]
              : (p as Record<string, any>)[s.key];
          const val = Number(raw) || 0;
          const y = Math.min(
            baselineY,
            Math.max(topPadding, topPadding + plotHeight - (val / niceMax) * plotHeight)
          );
          coordsMap[s.key].push({ x, y });
        });
      });

      return coordsMap;
    },
    [dataPoints, visibleSeries, niceMax, plotHeight, topPadding, baselineY]
  );

  useEffect(() => {
    if (onCoordinatesComputed) {
      onCoordinatesComputed(computeCoordinatesForWidth);
    }
  }, [computeCoordinatesForWidth, onCoordinatesComputed]);

  const chartCoordinates = useMemo(
    () => computeCoordinatesForWidth(containerWidth),
    [computeCoordinatesForWidth, containerWidth]
  );

  // Dynamic bar sizing adapted to container width and series count
  const { barWidth, barGapClass, colPaddingClass, barRoundedClass, circleSize } = useMemo(() => {
    const n = Math.max(dataPoints.length, 1);
    const colWidth = Math.max(containerWidth / n, 4);
    const interDateGap = Math.max(6, Math.min(28, Math.round(colWidth * 0.36)));
    const clusterWidth = Math.max(colWidth - interDateGap, 4);

    const sCount = Math.max(visibleSeries.length, 1);
    const intraGapPx = clusterWidth > 32 ? (sCount > 2 ? 1.5 : 2) : 1;
    const computedBarWidth = Math.max(
      2,
      Math.min(32, Math.floor((clusterWidth - intraGapPx * (sCount - 1)) / sCount))
    );

    let rounded = "rounded-md";
    if (computedBarWidth >= 14) rounded = "rounded-lg";
    else if (computedBarWidth >= 7) rounded = "rounded-md";
    else if (computedBarWidth >= 4) rounded = "rounded-sm";
    else rounded = "rounded-xs";

    const cSize = Math.max(5, Math.min(10, Math.round(computedBarWidth * 0.75)));
    const gapClass = clusterWidth > 36 ? "gap-1" : clusterWidth > 20 ? "gap-0.5" : "gap-[1px]";

    const colPad =
      interDateGap >= 20
        ? "px-2 sm:px-3"
        : interDateGap >= 12
        ? "px-1.5 sm:px-2"
        : interDateGap >= 8
        ? "px-1"
        : "px-0.5";

    return {
      barWidth: computedBarWidth,
      barGapClass: gapClass,
      colPaddingClass: colPad,
      barRoundedClass: rounded,
      circleSize: cSize,
    };
  }, [containerWidth, dataPoints.length, visibleSeries.length]);

  // X-axis visible date indices
  const visibleDateIndices = useMemo(() => {
    const n = dataPoints.length;
    if (n <= 1) return new Set([0]);

    const minPxPerTick = 34;
    const maxTicks = Math.max(2, Math.floor(containerWidth / minPxPerTick));
    const stride = Math.max(1, Math.ceil(n / maxTicks));

    if (stride === 1) {
      return new Set(Array.from({ length: n }, (_, i) => i));
    }

    const indices = new Set<number>();
    for (let i = 0; i < n; i += stride) {
      indices.add(i);
    }

    const lastIndex = n - 1;
    const lastAdded = Math.max(...Array.from(indices));
    const distanceToLast = ((lastIndex - lastAdded) / n) * containerWidth;
    if (distanceToLast >= minPxPerTick * 0.8) {
      indices.add(lastIndex);
    } else if (lastIndex !== lastAdded && indices.size > 1) {
      indices.delete(lastAdded);
      indices.add(lastIndex);
    }

    return indices;
  }, [dataPoints.length, containerWidth]);

  return (
    <div className="relative pt-1.5 pb-0.5 select-none">
      <div className="flex items-start gap-1 sm:gap-2 w-full min-w-0">
        {/* Left Fixed Y-Axis Scale with proper bottom spacer matching timeline height */}
        <div className="flex flex-col shrink-0 select-none">
          <div
            className="w-7 sm:w-9 flex flex-col justify-between items-end pr-1 text-[9px] sm:text-[11px] font-mono theme-text-secondary"
            style={{
              height: `${chartHeight}px`,
              paddingTop: `${topPadding}px`,
              paddingBottom: `${bottomPadding}px`,
            }}
          >
            {yTicks.map((tickVal) => (
              <span key={`ytick-${tickVal}`} className="leading-none">
                {formatTickValue(tickVal)}
              </span>
            ))}
          </div>
          <div className="w-7 sm:w-9 min-h-[34px]" />
        </div>

        {/* Right Main Chart & Timeline */}
        <div className="relative flex-1 min-w-0">
          {/* Main Plot Canvas */}
          <div
            ref={chartCanvasRef}
            className="relative w-full overflow-hidden"
            style={{ height: `${chartHeight}px` }}
          >
            {/* Background Gridlines */}
            <div
              className="absolute inset-0 flex flex-col justify-between pointer-events-none"
              style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}
            >
              {yTicks.map((tickVal, idx) => (
                <div
                  key={`gridline-${tickVal}-${idx}`}
                  className={`w-full border-t ${
                    idx === yTicks.length - 1
                      ? "border-[var(--border-color)]"
                      : "border-dashed border-[var(--border-color)] opacity-60"
                  }`}
                />
              ))}
            </div>

            {/* View 1: Bar Chart */}
            {viewMode === "bars" && (
              <div
                className="absolute inset-0 flex items-stretch w-full min-w-0"
                style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}
              >
                {dataPoints.map((point, idx) => {
                  const isHovered = hoveredIndex === idx;

                  return (
                    <div
                      key={`bar-col-${point.key || idx}`}
                      className={`flex-1 min-w-0 flex flex-col items-stretch h-full cursor-pointer relative group ${colPaddingClass}`}
                      onMouseEnter={() => onHoverIndexChange(idx)}
                      onMouseLeave={() => onHoverIndexChange(null)}
                    >
                      <div
                        className={`w-full min-w-0 flex items-stretch justify-center ${barGapClass} h-full`}
                      >
                        {visibleSeries.map((s) => {
                          const raw =
                            point.values?.[s.key] !== undefined
                              ? point.values[s.key]
                              : (point as Record<string, any>)[s.key];
                          const val = Number(raw) || 0;
                          const pct =
                            val > 0 ? Math.max(6, Math.round((val / niceMax) * 100)) : 0;

                          return (
                            <TrendBar
                              key={`bar-${point.key}-${s.key}`}
                              pct={pct}
                              barWidth={barWidth}
                              colorClass={s.color || "theme-bg-accent"}
                              ringColorClass={s.ringClass}
                              circleColorClass={s.circleBorderClass}
                              circleSize={circleSize}
                              isHovered={isHovered}
                              roundedClass={barRoundedClass}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trend Line Overlay across data points in Bar mode */}
            {viewMode === "bars" && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden"
                viewBox={`0 0 ${containerWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%" }}
              >
                {visibleSeries.map((s) => {
                  const coords = chartCoordinates[s.key];
                  if (!coords || coords.length <= 1) return null;
                  return (
                    <path
                      key={`bar-overlay-${s.key}`}
                      d={generateSmoothPath(
                        extendCoordsToEdges(coords, containerWidth),
                        topPadding,
                        baselineY
                      )}
                      fill="none"
                      stroke={s.strokeColor || s.color || "var(--accent-main)"}
                      strokeWidth="1.6"
                      strokeDasharray="3 3"
                      opacity="0.8"
                    />
                  );
                })}
              </svg>
            )}

            {/* View 2: Line & Area Chart */}
            {viewMode === "line" && (
              <div className="absolute inset-0 z-10 overflow-hidden">
                <svg
                  className="w-full h-full overflow-hidden"
                  viewBox={`0 0 ${containerWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                  style={{ width: "100%", height: "100%" }}
                >
                  <defs>
                    {visibleSeries.map((s) => (
                      <linearGradient
                        key={`grad-${s.key}`}
                        id={`grad-${s.key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={s.fillColor || s.strokeColor || "var(--accent-main)"}
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor={s.fillColor || s.strokeColor || "var(--accent-main)"}
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* Render Area fills */}
                  {visibleSeries.map((s) => {
                    const coords = chartCoordinates[s.key];
                    if (!coords || coords.length === 0) return null;
                    return (
                      <path
                        key={`area-${s.key}`}
                        data-series-key={s.key}
                        d={generateAreaPath(coords, baselineY, topPadding, containerWidth)}
                        fill={`url(#grad-${s.key})`}
                      />
                    );
                  })}

                  {/* Render Stroke lines */}
                  {visibleSeries.map((s) => {
                    const coords = chartCoordinates[s.key];
                    if (!coords || coords.length === 0) return null;
                    return (
                      <path
                        key={`line-${s.key}`}
                        data-series-key={s.key}
                        d={generateSmoothPath(
                          extendCoordsToEdges(coords, containerWidth),
                          topPadding,
                          baselineY
                        )}
                        fill="none"
                        stroke={s.strokeColor || "var(--accent-main)"}
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* Hover vertical crosshair & tiny dots */}
                  {hoveredIndex !== null && dataPoints[hoveredIndex] && (
                    <g>
                      {(() => {
                        const firstKey = visibleSeries[0]?.key;
                        const pt = firstKey ? chartCoordinates[firstKey]?.[hoveredIndex] : null;
                        if (!pt) return null;
                        return (
                          <line
                            x1={pt.x}
                            y1={topPadding}
                            x2={pt.x}
                            y2={baselineY}
                            stroke="var(--text-secondary)"
                            strokeWidth="1"
                            strokeDasharray="2 3"
                            opacity="0.6"
                          />
                        );
                      })()}

                      {visibleSeries.map((s) => {
                        const pt = chartCoordinates[s.key]?.[hoveredIndex];
                        if (!pt) return null;
                        return (
                          <circle
                            key={`hover-dot-${s.key}`}
                            cx={pt.x}
                            cy={pt.y}
                            r="3.5"
                            fill="var(--bg-surface)"
                            stroke={s.strokeColor || "var(--accent-main)"}
                            strokeWidth="1.8"
                          />
                        );
                      })}
                    </g>
                  )}
                </svg>

                {/* Mouse Tracking Invisible Columns */}
                <div className="absolute inset-0 flex items-stretch">
                  {dataPoints.map((_, idx) => (
                    <div
                      key={`line-tracker-${idx}`}
                      className="flex-1 cursor-pointer"
                      onMouseEnter={() => onHoverIndexChange(idx)}
                      onMouseLeave={() => onHoverIndexChange(null)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Floating Pill Tooltip */}
          {hoveredIndex !== null && dataPoints[hoveredIndex] && (
            <TrendChartTooltip
              hoveredIndex={hoveredIndex}
              label={dataPoints[hoveredIndex].label}
              subLabel={dataPoints[hoveredIndex].dateStr}
              totalPointsCount={dataPoints.length}
              containerWidth={containerWidth}
              rows={visibleSeries.map((s) => {
                const raw =
                  dataPoints[hoveredIndex].values?.[s.key] !== undefined
                    ? dataPoints[hoveredIndex].values![s.key]
                    : (dataPoints[hoveredIndex] as Record<string, any>)[s.key];
                const val = Number(raw) || 0;
                return {
                  label: s.label,
                  value: typeof val === "number" ? `${Number(val.toFixed(1))}${s.unit ? s.unit : ""}` : val,
                  dotColorClass: s.indicatorClass || s.color || "theme-bg-accent",
                  valueColorClass: s.strokeColor ? "" : "theme-text-primary",
                };
              })}
              footerNote={
                dataPoints[hoveredIndex].accuracyRate !== undefined
                  ? `${dataPoints[hoveredIndex].accuracyRate}%`
                  : undefined
              }
            >
              {customTooltipRenderer
                ? customTooltipRenderer(dataPoints[hoveredIndex], visibleSeries)
                : undefined}
            </TrendChartTooltip>
          )}

          {/* Bottom X-Axis Timeline Dates (Absolute positioned, aligned with bars) */}
          <div className="relative w-full h-8 pt-1 select-none min-w-0 overflow-visible">
            {Array.from(visibleDateIndices).map((idx) => {
              const point = dataPoints[idx];
              if (!point) return null;
              const isHovered = hoveredIndex === idx;
              const dateParts = parseDateParts(point.dateStr, point.label);
              const leftPct = ((idx + 0.5) / dataPoints.length) * 100;

              return (
                <div
                  key={`anchor-label-${point.key || idx}`}
                  data-timeline-label="true"
                  className="absolute top-1.5 -translate-x-1/2 flex flex-col items-center pointer-events-none text-center transition-colors max-w-[70px]"
                  style={{ left: `${leftPct}%` }}
                >
                  <div className="flex flex-col items-center leading-none">
                    {dateParts.month && (
                      <span
                        className={`text-[9px] uppercase tracking-wider leading-none select-none ${
                          isHovered ? "theme-accent font-bold" : "theme-text-secondary opacity-70"
                        }`}
                      >
                        {dateParts.month}
                      </span>
                    )}
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold font-mono leading-tight mt-0.5 ${
                        isHovered ? "theme-accent" : "theme-text-secondary"
                      }`}
                    >
                      {dateParts.day}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendPlotArea;

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas-pro";
import { ProgressTrendPoint, MetricType, ChartViewMode } from "./types";
import ActionMenu, { ActionMenuItem } from "@/components/ui/ActionMenu";
import SegmentedSwitch, { SegmentedSwitchOption } from "@/components/ui/SegmentedSwitch";
import {
  TrendingUpIcon,
  BookOpenIcon,
  InfoIcon,
  BarChartIcon,
  LineChartIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  FileTextIcon,
  ShareIcon,
  SessionsIcon,
  StudentIcon,
} from "@/components/ui/Icons";
import {
  computeNiceYAxis,
  formatTickValue,
  parseDateParts,
  generateSmoothPath,
  extendCoordsToEdges,
  generateAreaPath,
} from "./chartUtils";

export interface ProgressTrendsChartProps {
  trendPoints: ProgressTrendPoint[];
  activeMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  totalPages: number;
  totalMistakes?: number;
  totalStucks?: number;
  totalErrors: number;
  avgPagesPerDay?: number;
  peakDayPages?: number;
  className?: string;
  // Optional legacy props kept for backward-compatibility with upstream consumers
  maxMetricValue?: number;
  studentCount?: number;
  totalReports?: number;
  timeHorizon?: any;
  onHorizonChange?: (horizon: any) => void;
  accuracyRate?: number;
}

interface TrendBarProps {
  pct: number;
  barWidth?: number;
  widthClass?: string;
  colorClass: string;
  ringColorClass?: string;
  isHovered: boolean;
  circleColorClass?: string;
  circleSize?: number;
  circleSizeClass?: string;
  roundedClass?: string;
  showWhiteCap?: boolean;
}

/**
 * Reusable individual bar renderer with rounded corners, unoccupied softer empty bar with bottom radius, and hover-only circle indicator
 */
const TrendBar: React.FC<TrendBarProps> = ({
  pct,
  barWidth,
  widthClass = "",
  colorClass,
  ringColorClass,
  isHovered,
  circleColorClass,
  circleSize = 8,
  circleSizeClass = "w-2.5 h-2.5",
  roundedClass = "rounded-md",
  showWhiteCap = true,
}) => {
  const emptyPct = Math.max(0, 100 - pct);

  return (
    <div
      data-trend-bar="true"
      className={`relative h-full shrink-0 flex flex-col justify-end ${widthClass}`}
      style={barWidth ? { width: `${barWidth}px`, maxWidth: "100%" } : undefined}
    >
      {/* 1. Unoccupied Upper Bar (Starts where the real bar ends and goes to the top, completely borderless, ultra-light soft shade, with bottom radius as well) */}
      <div
        className={`w-full ${roundedClass} transition-colors duration-200 pointer-events-none ${
          isHovered
            ? "bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--text-primary)_2.2%,transparent)]"
        }`}
        style={{ height: `${emptyPct}%` }}
      />

      {/* 2. Active Data Filled Bar (Starts from baseline up to pct%, borderless, with rounded corners) */}
      <div
        className={`relative w-full ${roundedClass} transition-all duration-300 flex flex-col justify-end overflow-hidden ${
          isHovered && ringColorClass
            ? `ring-2 ${ringColorClass} scale-[1.03] shadow-md z-10`
            : "hover:opacity-95"
        } ${colorClass}`}
        style={{ height: `${pct}%` }}
      >
        {pct > 0 && showWhiteCap && (
          <div className="w-full h-0.5 sm:h-1 bg-white/20 shrink-0" />
        )}
      </div>

      {/* 3. Small Indicator Circle: ONLY visible when hovered! */}
      {isHovered && pct > 0 && circleColorClass && (
        <div
          className={`absolute z-20 rounded-full theme-bg-surface border-2 ${circleColorClass} shadow-md pointer-events-none transition-all duration-150 scale-110 ${
            !circleSize ? circleSizeClass : ""
          }`}
          style={{
            width: circleSize ? `${circleSize}px` : undefined,
            height: circleSize ? `${circleSize}px` : undefined,
            bottom: `${pct}%`,
            left: "50%",
            transform: "translate(-50%, 50%)",
          }}
        />
      )}
    </div>
  );
};

export const ProgressTrendsChart: React.FC<ProgressTrendsChartProps> = ({
  trendPoints,
  activeMetric,
  onMetricChange,
  totalPages,
  totalMistakes: propMistakes,
  totalStucks: propStucks,
  totalErrors,
  avgPagesPerDay: propAvgPages,
  peakDayPages: propPeakPages,
  studentCount: propStudentCount,
  className = "",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartCanvasRef = useRef<HTMLDivElement>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Auto-switch to line chart if dense dataset (> 14 days)
  const isDenseDataset = trendPoints.length > 14;
  const [userViewMode, setUserViewMode] = useState<ChartViewMode | null>(null);
  const viewMode: ChartViewMode = userViewMode ?? (isDenseDataset ? "line" : "bars");

  // Normalized metric mode
  const currentMetric: "combined" | "pages" | "mistakes" =
    activeMetric === "mistakes"
      ? "mistakes"
      : activeMetric === "pages"
      ? "pages"
      : "combined";

  // Rounded values
  const formattedTotalPages = Number(Number(totalPages || 0).toFixed(1));
  const avgPagesVal = Number(
    (
      propAvgPages ??
      (trendPoints.length > 0
        ? Number((totalPages / Math.max(1, trendPoints.filter((p) => p.totalPages > 0).length || 1)).toFixed(1))
        : 0)
    ).toFixed(1)
  );
  const peakPagesVal = Number(
    (propPeakPages ?? Math.max(...trendPoints.map((p) => p.totalPages), 0)).toFixed(1)
  );

  const totalMistakesVal =
    propMistakes ?? trendPoints.reduce((acc, p) => acc + (p.totalMistakes || 0), 0);
  const totalStucksVal =
    propStucks ?? trendPoints.reduce((acc, p) => acc + (p.totalStucks || 0), 0);

  // Dynamic maximum calculation
  const rawMax = useMemo(() => {
    if (trendPoints.length === 0) return 5;
    if (currentMetric === "mistakes") {
      return Math.max(
        ...trendPoints.map((p) => Math.max(p.totalMistakes || 0, p.totalStucks || 0)),
        1
      );
    }
    if (currentMetric === "pages") {
      return Math.max(...trendPoints.map((p) => p.totalPages || 0), 1);
    }
    return Math.max(
      ...trendPoints.map((p) => Math.max(p.totalPages || 0, p.totalMistakes || 0, p.totalStucks || 0)),
      1
    );
  }, [trendPoints, currentMetric]);

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

    // Re-verify after layout stabilization / tab switch
    const rafId = requestAnimationFrame(updateSize);
    const timerId = setTimeout(updateSize, 120);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && chartCanvasRef.current) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) setContainerWidth(Math.round(w));
        }
      });
      ro.observe(chartCanvasRef.current);
    }

    window.addEventListener("resize", updateSize);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener("resize", updateSize);
      if (ro) ro.disconnect();
    };
  }, []);

  const chartHeight = 220;
  const topPadding = 18;
  const bottomPadding = 6;
  const plotHeight = chartHeight - topPadding - bottomPadding;
  const baselineY = chartHeight - bottomPadding;

  // Dynamic, container-responsive bar sizing based on containerWidth and data points count
  const {
    singleBarWidth,
    doubleBarWidth,
    tripleBarWidth,
    tripleBarGapClass,
    doubleBarGapClass,
    colPaddingClass,
    barRoundedClass,
    circleSize,
  } = useMemo(() => {
    const n = Math.max(trendPoints.length, 1);
    const colWidth = Math.max(containerWidth / n, 4);

    // Dynamic inter-date separation (clear spacing between adjacent dates/data points)
    // Reserves ~34% - 38% of colWidth as distinct inter-group space
    const interDateGap = Math.max(6, Math.min(28, Math.round(colWidth * 0.36)));
    const clusterWidth = Math.max(colWidth - interDateGap, 4);

    // 1. Single bar (Pages only): strictly sized within cluster
    const single = Math.max(3, Math.min(36, Math.round(clusterWidth * 0.45)));

    // 2. Double bar (Mistakes & Stucks - 2 bars): mathematically bounded within cluster
    const doubleGapPx = clusterWidth > 32 ? 3 : clusterWidth > 18 ? 2 : 1;
    const double = Math.max(2, Math.min(18, Math.floor((clusterWidth - doubleGapPx) / 2)));

    // 3. Triple bar (Combined - 3 bars: Pages, Mistakes, Stucks): tightly grouped within cluster
    const tripleGapPx = clusterWidth > 36 ? 2.5 : clusterWidth > 20 ? 1.5 : 1;
    const triple = Math.max(2, Math.min(12, Math.floor((clusterWidth - tripleGapPx * 2) / 3)));

    // Corner radius adapted to bar thickness
    let rounded = "rounded-md";
    if (single >= 14) rounded = "rounded-lg";
    else if (single >= 7) rounded = "rounded-md";
    else if (single >= 4) rounded = "rounded-sm";
    else rounded = "rounded-xs";

    // Circle size on hover adapted to bar thickness
    const cSize = Math.max(5, Math.min(10, Math.round(single * 0.75)));

    // Intra-bar gap (tight grouping within the same date)
    const tripleGap = clusterWidth > 36 ? "gap-1" : clusterWidth > 20 ? "gap-0.5" : "gap-[1px]";
    const doubleGap = clusterWidth > 32 ? "gap-1" : clusterWidth > 18 ? "gap-0.5" : "gap-[1px]";

    // Inter-column padding: creates the prominent gap between different date points
    const colPad =
      interDateGap >= 20
        ? "px-2 sm:px-3"
        : interDateGap >= 12
        ? "px-1.5 sm:px-2"
        : interDateGap >= 8
        ? "px-1"
        : "px-0.5";

    return {
      singleBarWidth: single,
      doubleBarWidth: double,
      tripleBarWidth: triple,
      singleBarWidthClass: "w-auto",
      doubleBarWidthClass: "w-auto",
      tripleBarWidthClass: "w-auto",
      tripleBarGapClass: tripleGap,
      doubleBarGapClass: doubleGap,
      colPaddingClass: colPad,
      barRoundedClass: rounded,
      circleSize: cSize,
      circleSizeClass: "w-2.5 h-2.5",
    };
  }, [containerWidth, trendPoints.length]);

  // Reusable unified coordinate calculation for any width (used for active viewport and desktop export)
  const computeCoordinatesForWidth = useCallback(
    (targetWidth: number) => {
      if (trendPoints.length === 0 || targetWidth <= 0) {
        return { mistakes: [], stucks: [], pages: [] };
      }
      const n = trendPoints.length;
      const colWidth = targetWidth / n;
      const mistakes: Array<{ x: number; y: number }> = [];
      const stucks: Array<{ x: number; y: number }> = [];
      const pages: Array<{ x: number; y: number }> = [];

      trendPoints.forEach((p, i) => {
        const x = i * colWidth + colWidth / 2;
        const mVal = p.totalMistakes || 0;
        const sVal = p.totalStucks || 0;
        const pVal = p.totalPages || 0;

        const mY = Math.min(baselineY, Math.max(topPadding, topPadding + plotHeight - (mVal / niceMax) * plotHeight));
        const sY = Math.min(baselineY, Math.max(topPadding, topPadding + plotHeight - (sVal / niceMax) * plotHeight));
        const pY = Math.min(baselineY, Math.max(topPadding, topPadding + plotHeight - (pVal / niceMax) * plotHeight));

        mistakes.push({ x, y: mY });
        stucks.push({ x, y: sY });
        pages.push({ x, y: pY });
      });

      return { mistakes, stucks, pages };
    },
    [trendPoints, niceMax, plotHeight, topPadding, baselineY]
  );

  const chartCoordinates = useMemo(
    () => computeCoordinatesForWidth(containerWidth),
    [computeCoordinatesForWidth, containerWidth]
  );

  // X-axis visible date indices: dynamically determined based on container width
  const visibleDateIndices = useMemo(() => {
    const n = trendPoints.length;
    if (n <= 1) return new Set([0]);

    // Each date label (Month + Day) needs ~32-35px to render cleanly.
    // If there is enough room for all dates (e.g. 12-16 data points on desktop), show every single date (stride = 1).
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
  }, [trendPoints.length, containerWidth]);

  const isDateStacked = trendPoints.length > 5 || containerWidth < 520;

  // Medium canvas capture for export - captures a balanced medium card layout (820px)
  const captureDesktopCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!chartContainerRef.current) return null;

    const sourceNode = chartContainerRef.current;
    const clone = sourceNode.cloneNode(true) as HTMLElement;

    // 1. Clean up active tooltips or hover indicators in clone
    clone.querySelectorAll("[role='tooltip'], .shadow-xl").forEach((el) => el.remove());

    // 2. Hide the 3-dots action menu / export dropdown button in exported image
    const actionMenu = clone.querySelector("[aria-label='Export Options']");
    if (actionMenu) {
      (actionMenu as HTMLElement).style.display = "none";
    }

    // 3. Medium export dimensions (820px container width for golden presentation ratio)
    const exportWidth = 820;
    const exportPadding = 20;
    const yAxisWidth = 36;
    const gap = 8;
    const exportCanvasWidth = exportWidth - exportPadding * 2 - yAxisWidth - gap; // ~736px

    clone.style.position = "fixed";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = `${exportWidth}px`;
    clone.style.minWidth = `${exportWidth}px`;
    clone.style.maxWidth = `${exportWidth}px`;
    clone.style.height = "auto";
    clone.style.zIndex = "-9999";
    clone.style.opacity = "1";
    clone.style.pointerEvents = "none";
    clone.style.transform = "none";
    clone.style.padding = `${exportPadding}px`;
    clone.style.borderRadius = "16px";
    clone.style.backgroundColor = "var(--bg-surface)";

    // 4. Force desktop typography & layout
    clone.querySelectorAll(".truncate").forEach((el) => {
      (el as HTMLElement).style.overflow = "visible";
      (el as HTMLElement).style.whiteSpace = "normal";
    });

    // 5. Update SVG paths for exportCanvasWidth
    const exportCoords = computeCoordinatesForWidth(exportCanvasWidth);
    const svgs = clone.querySelectorAll("svg");
    svgs.forEach((svg) => {
      if (svg.getAttribute("viewBox")?.includes("220")) {
        svg.setAttribute("viewBox", `0 0 ${exportCanvasWidth} ${chartHeight}`);

        const paths = svg.querySelectorAll("path");
        paths.forEach((p) => {
          const stroke = p.getAttribute("stroke");
          const fill = p.getAttribute("fill");

          if (stroke === "var(--accent-main)") {
            p.setAttribute(
              "d",
              generateSmoothPath(extendCoordsToEdges(exportCoords.pages, exportCanvasWidth), topPadding, baselineY)
            );
          } else if (stroke === "var(--color-danger)") {
            p.setAttribute(
              "d",
              generateSmoothPath(extendCoordsToEdges(exportCoords.mistakes, exportCanvasWidth), topPadding, baselineY)
            );
          } else if (stroke?.includes("#f59e0b") || stroke?.includes("warning")) {
            p.setAttribute(
              "d",
              generateSmoothPath(extendCoordsToEdges(exportCoords.stucks, exportCanvasWidth), topPadding, baselineY)
            );
          } else if (fill?.includes("trendPagesGrad")) {
            p.setAttribute(
              "d",
              generateAreaPath(exportCoords.pages, baselineY, topPadding, exportCanvasWidth)
            );
          } else if (fill?.includes("trendMistakesGrad")) {
            p.setAttribute(
              "d",
              generateAreaPath(exportCoords.mistakes, baselineY, topPadding, exportCanvasWidth)
            );
          } else if (fill?.includes("trendStucksGrad")) {
            p.setAttribute(
              "d",
              generateAreaPath(exportCoords.stucks, baselineY, topPadding, exportCanvasWidth)
            );
          }
        });
      }
    });

    // 6. Update bar widths in the clone to export proportions
    const n = Math.max(trendPoints.length, 1);
    const exportColWidth = exportCanvasWidth / n;
    const exportSingleBar = Math.max(6, Math.min(38, Math.round(exportColWidth * 0.44)));
    const exportDoubleBar = Math.max(4, Math.min(20, Math.round((exportColWidth - 3) * 0.36)));
    const exportTripleBar = Math.max(3, Math.min(14, Math.round((exportColWidth - 4) * 0.28)));

    const targetBarWidth =
      currentMetric === "pages"
        ? exportSingleBar
        : currentMetric === "mistakes"
        ? exportDoubleBar
        : exportTripleBar;

    const barCols = clone.querySelectorAll("[data-trend-bar='true']");
    barCols.forEach((bar) => {
      (bar as HTMLElement).style.width = `${targetBarWidth}px`;
    });

    // 7. Reveal all X-axis timeline dates in the export
    const timelineLabels = clone.querySelectorAll("[data-timeline-label='true']");
    timelineLabels.forEach((label) => {
      (label as HTMLElement).style.opacity = "1";
      (label as HTMLElement).style.visibility = "visible";
    });

    document.body.appendChild(clone);

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        width: exportWidth,
        windowWidth: exportWidth,
      });
      return canvas;
    } finally {
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  };

  // Unified, robust clipboard copy helper
  const copyChartCanvasToClipboard = async (): Promise<boolean> => {
    try {
      const canvas = await captureDesktopCanvas();
      if (!canvas) return false;

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2500);
          return true;
        }
      }
    } catch (err) {
      console.warn("[ProgressTrendsChart] Clipboard copy failed:", err);
    }
    return false;
  };

  // Export handlers (Always full desktop size)
  const handleExportPNG = async () => {
    try {
      const canvas = await captureDesktopCanvas();
      if (!canvas) return;

      const link = document.createElement("a");
      link.download = `recitation_trends_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      // Automatically copy to clipboard when downloading
      await copyChartCanvasToClipboard();
    } catch (err) {
      console.error("Export PNG failed:", err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = ["Date", "Pages Recited", "Mistakes", "Stucks", "Total Errors", "Students Active"];
      const rows = trendPoints.map((p) => [
        `"${p.dateStr}"`,
        p.totalPages,
        p.totalMistakes,
        p.totalStucks,
        p.totalErrors,
        p.studentCount,
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `recitation_trends_data_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      await copyChartCanvasToClipboard();
    } catch (err) {
      console.error("Export CSV failed:", err);
    }
  };

  const handleShareChart = async () => {
    try {
      const canvas = await captureDesktopCanvas();
      if (typeof navigator !== "undefined" && navigator.share && canvas) {
        const fileName = `recitation_trends_${new Date().toISOString().split("T")[0]}.png`;
        const shareData: ShareData = {
          title: "Recitation Trends Analytics",
          text: `Daily Classroom recitation trends: ${formattedTotalPages}p recited, ${avgPagesVal.toFixed(1)}p daily average, ${totalMistakesVal} mistakes, ${totalStucksVal} stucks across ${trendPoints.length} data points.`,
        };

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ ...shareData, files: [file] })) {
            await navigator.share({ ...shareData, files: [file] });
            return;
          }
        }
        await navigator.share(shareData);
      } else if (canvas) {
        await copyChartCanvasToClipboard();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
        await copyChartCanvasToClipboard();
      }
    }
  };

  // ActionMenu items
  const exportMenuItems: ActionMenuItem[] = useMemo(() => [
    {
      label: "Share Trends Chart",
      icon: ShareIcon,
      onClick: handleShareChart,
    },
    {
      label: "Export PNG Image",
      icon: DownloadIcon,
      onClick: handleExportPNG,
    },
    {
      label: "Export CSV Data",
      icon: FileTextIcon,
      onClick: handleExportCSV,
    },
    {
      label: copiedSuccess ? "Copied Image!" : "Copy Image",
      icon: copiedSuccess ? CheckIcon : CopyIcon,
      onClick: () => copyChartCanvasToClipboard(),
    },
  ], [copiedSuccess, trendPoints, formattedTotalPages, avgPagesVal, totalMistakesVal, totalStucksVal]);

  const metricOptions: SegmentedSwitchOption<MetricType>[] = useMemo(() => [
    {
      value: "combined",
      label: "All",
      icon: TrendingUpIcon,
      title: "View All Metrics (Combined: Pages + Mistakes & Stucks)",
    },
    {
      value: "pages",
      label: "Pages",
      icon: BookOpenIcon,
      title: "View Pages Recited Only",
    },
    {
      value: "mistakes",
      label: "Errors",
      icon: InfoIcon,
      title: "View Mistakes & Stucks Only",
    },
  ], []);

  const viewModeOptions: SegmentedSwitchOption<ChartViewMode>[] = useMemo(() => [
    {
      value: "bars",
      label: "Bars",
      icon: BarChartIcon,
      title: "Grouped Bars View",
    },
    {
      value: "line",
      label: "Line",
      icon: LineChartIcon,
      title: "Delicate Area Line Graph View",
    },
  ], []);

  // Dynamic KPI items array
  const kpiItems = useMemo(() => {
    if (currentMetric === "combined") {
      return [
        { label: "Total Recited", value: `${formattedTotalPages}p`, borderVar: "var(--accent-main)" },
        { label: "Daily Average", value: `${avgPagesVal}p`, borderVar: "var(--accent-main)" },
        { label: "Total Mistakes", value: totalMistakesVal, borderVar: "var(--color-danger)" },
        { label: "Total Stucks", value: totalStucksVal, borderVar: "var(--color-warning, #f59e0b)" },
      ];
    }
    if (currentMetric === "mistakes") {
      return [
        { label: "Total Mistakes", value: totalMistakesVal, borderVar: "var(--color-danger)" },
        { label: "Total Stucks", value: totalStucksVal, borderVar: "var(--color-warning, #f59e0b)" },
        {
          label: "Combined Errors",
          value: totalErrors,
          borderVar: "var(--border-strong)",
          colSpanClass: "col-span-2 sm:col-span-1",
        },
      ];
    }
    return [
      { label: "Total Recited", value: `${formattedTotalPages}p`, borderVar: "var(--accent-main)" },
      { label: "Daily Average", value: `${avgPagesVal}p`, borderVar: "var(--accent-main)" },
      {
        label: "Peak Day Volume",
        value: `${peakPagesVal}p`,
        borderVar: "var(--border-strong)",
        colSpanClass: "col-span-2 sm:col-span-1",
      },
    ];
  }, [currentMetric, formattedTotalPages, avgPagesVal, totalMistakesVal, totalStucksVal, totalErrors, peakPagesVal]);

  // Dynamic Legend items array
  const legendItems = useMemo(() => {
    const items: Array<{ key: string; label: string; iconNode: React.ReactNode }> = [];
    if (currentMetric === "combined") {
      items.push({
        key: "pages-recited",
        label: "Pages Recited",
        iconNode: <span className="w-2.5 h-2.5 rounded-full theme-bg-accent inline-block" />,
      });
    }
    if (currentMetric === "combined" || currentMetric === "mistakes") {
      items.push({
        key: "mistakes",
        label: "Mistakes",
        iconNode: <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)] inline-block" />,
      });
      items.push({
        key: "stucks",
        label: "Stucks",
        iconNode: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />,
      });
    }
    if (currentMetric === "pages") {
      items.push({
        key: "pages-recited",
        label: "Pages Recited",
        iconNode: <span className="w-2.5 h-2.5 rounded-full theme-bg-accent inline-block" />,
      });
    }
    return items;
  }, [currentMetric]);

  // Comprehensive Sessions & Students extraction across timeline
  const overallSessions = useMemo(() => {
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.sessionNames || []).forEach((s) => s && set.add(s)));
    return Array.from(set);
  }, [trendPoints]);

  const overallStudents = useMemo(() => {
    const set = new Set<string>();
    trendPoints.forEach((p) => (p.studentNames || []).forEach((s) => s && set.add(s)));
    return Array.from(set);
  }, [trendPoints]);

  // Context-aware Footer Sessions & Students (dynamically reflects hovered date if hovered, else overall scope)
  const isPointHovered = hoveredIndex !== null && trendPoints[hoveredIndex] !== undefined;
  const activeHoverPoint = isPointHovered ? trendPoints[hoveredIndex] : null;

  const footerSessions = activeHoverPoint?.sessionNames && activeHoverPoint.sessionNames.length > 0
    ? activeHoverPoint.sessionNames
    : overallSessions;

  const footerStudents = activeHoverPoint?.studentNames && activeHoverPoint.studentNames.length > 0
    ? activeHoverPoint.studentNames
    : overallStudents;

  return (
    <div
      ref={chartContainerRef}
      className={`theme-bg-surface border theme-border rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-4 select-none relative w-full min-w-0 overflow-hidden ${className}`}
    >
      {/* 1. Header Toolbar: Left Title + Right Unified Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b theme-border pb-3 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <TrendingUpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold tracking-wider uppercase theme-text-primary whitespace-nowrap">
                  Recitation Trends
                </h4>
                <InfoIcon className="w-3.5 h-3.5 theme-text-secondary opacity-60 shrink-0" />
              </div>
              <p className="text-[11px] theme-text-secondary truncate hidden lg:block">
                Chronological progress driven by date criteria
              </p>
            </div>

            {copiedSuccess && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-fade-in select-none whitespace-nowrap shadow-xs">
                <CheckIcon className="w-3 h-3 shrink-0" />
                <span>Copied to Clipboard!</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Unified Controls using project's SegmentedSwitch */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
          <SegmentedSwitch
            options={metricOptions}
            value={currentMetric}
            onChange={(val) => onMetricChange(val as MetricType)}
            size="xs"
            ariaLabel="Metric Mode Switcher"
          />

          <SegmentedSwitch
            options={viewModeOptions}
            value={viewMode}
            onChange={(val) => setUserViewMode(val as ChartViewMode)}
            size="xs"
            ariaLabel="Chart View Mode Switcher"
          />


          <ActionMenu
            items={exportMenuItems}
            size="sm"
            variant="ghost"
            align="right"
            showChevron={false}
            title="Export Trends Chart"
            ariaLabel="Export Options"
          />
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div
        className={`grid gap-3 pt-1 ${
          currentMetric === "combined"
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {kpiItems.map((item) => (
          <div
            key={item.label}
            className={`border-l-2 pl-3 py-0.5 ${item.colSpanClass || ""}`}
            style={{ borderColor: item.borderVar }}
          >
            <span className="text-xl sm:text-2xl font-extrabold font-mono theme-text-primary block tracking-tight">
              {item.value}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider theme-text-secondary block">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Legend Row */}
      <div className="flex items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4 text-[11px] flex-wrap">
          {legendItems.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              {item.iconNode}
              <span className="font-medium theme-text-primary">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-mono theme-text-secondary">
          {trendPoints.length} Data Point{trendPoints.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* 4. Main Chart Canvas with Background Gridlines & Y-Axis Scale */}
      {trendPoints.length === 0 ? (
        <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed theme-border rounded-xl">
          <BookOpenIcon className="w-8 h-8 theme-text-secondary opacity-40 mb-2" />
          <p className="text-xs font-semibold theme-text-secondary">
            No recitation reports found matching the selected date criteria.
          </p>
          <span className="text-[11px] theme-text-secondary opacity-75 mt-0.5">
            Adjust the date range above to view recitation trends.
          </span>
        </div>
      ) : (
        <div className="relative pt-6 pb-1">
          {/* Grid Layout: Left Fixed-Width Y-Axis Scale + Main Plot Area (Fit to Container, Zero Scroll) */}
          <div className="flex items-start gap-1 sm:gap-2 w-full min-w-0">
            {/* Left Fixed Y-Axis Scale & bottom spacer matching timeline height */}
            <div className="flex flex-col shrink-0 select-none">
              <div
                className="w-7 sm:w-9 flex flex-col justify-between items-end pr-1 text-[9px] sm:text-[11px] font-mono theme-text-secondary"
                style={{ height: `${chartHeight}px`, paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}
              >
                {yTicks.map((tickVal) => (
                  <span key={`ytick-${tickVal}`} className="leading-none">
                    {formatTickValue(tickVal)}
                  </span>
                ))}
              </div>
              <div className="w-7 sm:w-9 min-h-[52px]" />
            </div>

            {/* Right Main Chart & Timeline (No Scrollbars, 100% Fit) */}
            <div className="relative flex-1 min-w-0 overflow-hidden">
              {/* Main Plot Canvas */}
              <div
                ref={chartCanvasRef}
                className="relative w-full overflow-hidden"
                style={{ height: `${chartHeight}px` }}
              >
                {/* Background Horizontal Left-Right Gridlines */}
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
                    {trendPoints.map((point, idx) => {
                      const isHovered = hoveredIndex === idx;

                      const mistakesPct =
                        point.totalMistakes > 0
                          ? Math.max(6, Math.round((point.totalMistakes / niceMax) * 100))
                          : 0;
                      const stucksPct =
                        point.totalStucks > 0
                          ? Math.max(6, Math.round((point.totalStucks / niceMax) * 100))
                          : 0;
                      const pagesPct =
                        point.totalPages > 0
                          ? Math.max(6, Math.round((point.totalPages / niceMax) * 100))
                          : 0;

                      return (
                        <div
                          key={`bar-col-${point.key}-${idx}`}
                          className={`flex-1 min-w-0 flex flex-col items-stretch h-full cursor-pointer relative group ${colPaddingClass}`}
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          {/* MODE 1: COMBINED (3 Bars side-by-side: Pages, Mistakes, Stucks) */}
                          {currentMetric === "combined" && (
                            <div className={`w-full min-w-0 flex items-stretch justify-center ${tripleBarGapClass} h-full`}>
                              {/* Bar 1: Pages Recited (Theme Accent) */}
                              <TrendBar
                                pct={pagesPct}
                                barWidth={tripleBarWidth}
                                colorClass="theme-bg-accent"
                                ringColorClass="ring-[var(--accent-main)]"
                                circleColorClass="border-[var(--accent-main)]"
                                circleSize={circleSize}
                                isHovered={isHovered}
                                roundedClass={barRoundedClass}
                              />

                              {/* Bar 2: Mistakes (Rose) */}
                              <TrendBar
                                pct={mistakesPct}
                                barWidth={tripleBarWidth}
                                colorClass="bg-[var(--color-danger)]"
                                ringColorClass="ring-[var(--color-danger)]"
                                circleColorClass="border-[var(--color-danger)]"
                                circleSize={circleSize}
                                isHovered={isHovered}
                                roundedClass={barRoundedClass}
                              />

                              {/* Bar 3: Stucks (Amber - Progress Reports color) */}
                              <TrendBar
                                pct={stucksPct}
                                barWidth={tripleBarWidth}
                                colorClass="bg-amber-500"
                                ringColorClass="ring-amber-500"
                                circleColorClass="border-amber-500"
                                circleSize={circleSize}
                                isHovered={isHovered}
                                roundedClass={barRoundedClass}
                              />
                            </div>
                          )}

                          {/* MODE 2: MISTAKES & STUCKS ONLY */}
                          {currentMetric === "mistakes" && (
                            <div className={`w-full min-w-0 flex items-stretch justify-center ${doubleBarGapClass} h-full`}>
                              <TrendBar
                                pct={mistakesPct}
                                barWidth={doubleBarWidth}
                                colorClass="bg-[var(--color-danger)]"
                                ringColorClass="ring-[var(--color-danger)]"
                                circleColorClass="border-[var(--color-danger)]"
                                circleSize={circleSize}
                                isHovered={isHovered}
                                roundedClass={barRoundedClass}
                              />
                              <TrendBar
                                pct={stucksPct}
                                barWidth={doubleBarWidth}
                                colorClass="bg-amber-500"
                                ringColorClass="ring-amber-500"
                                circleColorClass="border-amber-500"
                                circleSize={circleSize}
                                isHovered={isHovered}
                                roundedClass={barRoundedClass}
                              />
                            </div>
                          )}

                          {/* MODE 3: PAGES ONLY */}
                          {currentMetric === "pages" && (
                            <div className="w-full min-w-0 flex items-stretch justify-center h-full">
                              <TrendBar
                                pct={pagesPct}
                                barWidth={singleBarWidth}
                                colorClass="theme-bg-accent"
                                ringColorClass="ring-[var(--accent-main)]"
                                circleColorClass="border-[var(--accent-main)]"
                                circleSize={circleSize}
                                isHovered={isHovered}
                                roundedClass={barRoundedClass}
                              />
                            </div>
                          )}
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
                    style={{ width: "100%", height: "100%" }}
                  >
                    {(currentMetric === "combined" || currentMetric === "pages") && chartCoordinates.pages.length > 1 && (
                      <path
                        d={generateSmoothPath(extendCoordsToEdges(chartCoordinates.pages, containerWidth), topPadding, baselineY)}
                        fill="none"
                        stroke="var(--accent-main)"
                        strokeWidth={currentMetric === "combined" ? "1.6" : "1.8"}
                        strokeDasharray={currentMetric === "combined" ? undefined : "3 3"}
                        opacity={currentMetric === "combined" ? "0.45" : "0.85"}
                      />
                    )}
                    {(currentMetric === "combined" || currentMetric === "mistakes") && chartCoordinates.mistakes.length > 1 && (
                      <path
                        d={generateSmoothPath(extendCoordsToEdges(chartCoordinates.mistakes, containerWidth), topPadding, baselineY)}
                        fill="none"
                        stroke="var(--color-danger)"
                        strokeWidth={currentMetric === "combined" ? "1.4" : "1.6"}
                        strokeDasharray="3 3"
                        opacity={currentMetric === "combined" ? "0.75" : "0.85"}
                      />
                    )}
                    {(currentMetric === "combined" || currentMetric === "mistakes") && chartCoordinates.stucks.length > 1 && (
                      <path
                        d={generateSmoothPath(extendCoordsToEdges(chartCoordinates.stucks, containerWidth), topPadding, baselineY)}
                        fill="none"
                        stroke="var(--color-warning, #f59e0b)"
                        strokeWidth={currentMetric === "combined" ? "1.4" : "1.6"}
                        strokeDasharray="3 3"
                        opacity={currentMetric === "combined" ? "0.75" : "0.85"}
                      />
                    )}
                  </svg>
                )}

                {/* View 2: Delicate, Tiny & Clean Line/Area Chart */}
                {viewMode === "line" && (
                  <div className="absolute inset-0 z-10 overflow-hidden">
                    <svg
                      className="w-full h-full overflow-hidden"
                      viewBox={`0 0 ${containerWidth} ${chartHeight}`}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <defs>
                        <linearGradient id="trendMistakesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-danger)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--color-danger)" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="trendStucksGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-warning, #f59e0b)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--color-warning, #f59e0b)" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="trendPagesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-main)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--accent-main)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fills */}
                      {(currentMetric === "combined" || currentMetric === "pages") && (
                        <path
                          d={generateAreaPath(chartCoordinates.pages, baselineY, topPadding, containerWidth)}
                          fill="url(#trendPagesGrad)"
                        />
                      )}
                      {currentMetric === "mistakes" && (
                        <>
                          <path
                            d={generateAreaPath(chartCoordinates.mistakes, baselineY, topPadding, containerWidth)}
                            fill="url(#trendMistakesGrad)"
                          />
                          <path
                            d={generateAreaPath(chartCoordinates.stucks, baselineY, topPadding, containerWidth)}
                            fill="url(#trendStucksGrad)"
                          />
                        </>
                      )}

                      {/* Smooth Stroke Paths */}
                      {(currentMetric === "combined" || currentMetric === "pages") && (
                        <path
                          d={generateSmoothPath(extendCoordsToEdges(chartCoordinates.pages, containerWidth), topPadding, baselineY)}
                          fill="none"
                          stroke="var(--accent-main)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={currentMetric === "combined" ? "0.85" : "1"}
                        />
                      )}
                      {(currentMetric === "combined" || currentMetric === "mistakes") && (
                        <>
                          <path
                            d={generateSmoothPath(extendCoordsToEdges(chartCoordinates.mistakes, containerWidth), topPadding, baselineY)}
                            fill="none"
                            stroke="var(--color-danger)"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={generateSmoothPath(extendCoordsToEdges(chartCoordinates.stucks, containerWidth), topPadding, baselineY)}
                            fill="none"
                            stroke="var(--color-warning, #f59e0b)"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}

                      {/* Interactive Crosshair & Refined Tiny Dots on Hover */}
                      {hoveredIndex !== null && (
                        <>
                          {chartCoordinates.pages[hoveredIndex] && (
                            <line
                              x1={chartCoordinates.pages[hoveredIndex].x}
                              y1={topPadding}
                              x2={chartCoordinates.pages[hoveredIndex].x}
                              y2={baselineY}
                              stroke="var(--text-secondary)"
                              strokeWidth="1"
                              strokeDasharray="2 3"
                              opacity="0.6"
                            />
                          )}

                          {(currentMetric === "combined" || currentMetric === "pages") && chartCoordinates.pages[hoveredIndex] && (
                            <circle
                              cx={chartCoordinates.pages[hoveredIndex].x}
                              cy={chartCoordinates.pages[hoveredIndex].y}
                              r="3.5"
                              fill="var(--bg-surface)"
                              stroke="var(--accent-main)"
                              strokeWidth="1.8"
                            />
                          )}
                          {(currentMetric === "combined" || currentMetric === "mistakes") && (
                            <>
                              {chartCoordinates.mistakes[hoveredIndex] && (
                                <circle
                                  cx={chartCoordinates.mistakes[hoveredIndex].x}
                                  cy={chartCoordinates.mistakes[hoveredIndex].y}
                                  r="3.5"
                                  fill="var(--bg-surface)"
                                  stroke="var(--color-danger)"
                                  strokeWidth="1.8"
                                />
                              )}
                              {chartCoordinates.stucks[hoveredIndex] && (
                                <circle
                                  cx={chartCoordinates.stucks[hoveredIndex].x}
                                  cy={chartCoordinates.stucks[hoveredIndex].y}
                                  r="3.5"
                                  fill="var(--bg-surface)"
                                  stroke="var(--color-warning, #f59e0b)"
                                  strokeWidth="1.8"
                                />
                              )}
                            </>
                          )}
                        </>
                      )}
                    </svg>

                    {/* Mouse Tracking Invisible Columns */}
                    <div className="absolute inset-0 flex items-stretch">
                      {trendPoints.map((_, idx) => (
                        <div
                          key={`line-tracker-${idx}`}
                          className="flex-1 cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Pill Tooltip - purely for recitation progress metrics */}
              {hoveredIndex !== null && trendPoints[hoveredIndex] && (() => {
                const pt = trendPoints[hoveredIndex];
                const leftPx = ((hoveredIndex + 0.5) / trendPoints.length) * containerWidth;
                const tooltipWidth = 220;
                const clampedLeft = Math.max(tooltipWidth / 2 + 10, Math.min(containerWidth - tooltipWidth / 2 - 10, leftPx));

                return (
                  <div
                    className="absolute z-50 pointer-events-none transition-all duration-150 animate-fade-in"
                    style={{
                      left: `${clampedLeft}px`,
                      top: "8px",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="bg-[var(--bg-elevated)] theme-bg-elevated border theme-border rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1.5 w-56 backdrop-blur-md">
                      <div className="font-bold theme-text-primary border-b theme-border pb-1 flex items-center justify-between">
                        <span>{pt.label}</span>
                        <span className="text-[10px] font-mono theme-text-secondary">{pt.dateStr}</span>
                      </div>

                      <div className="space-y-1 text-[11px] pt-0.5">
                        {(currentMetric === "combined" || currentMetric === "pages") && (
                          <div className="flex items-center justify-between">
                            <span className="theme-text-secondary">Pages Recited:</span>
                            <span className="font-mono font-bold theme-accent">
                              {Number(Number(pt.totalPages || 0).toFixed(1))}p
                            </span>
                          </div>
                        )}

                        {(currentMetric === "combined" || currentMetric === "mistakes") && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-[var(--color-danger)] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] inline-block" />
                                Mistakes:
                              </span>
                              <span className="font-mono font-bold theme-text-primary">{pt.totalMistakes}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                Stucks:
                              </span>
                              <span className="font-mono font-bold theme-text-primary">{pt.totalStucks}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t theme-border font-bold">
                              <span className="theme-text-secondary">Total Errors:</span>
                              <span className="font-mono theme-text-primary">{pt.totalErrors}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. X-Axis Timeline Labels - Pure Clean Date Header (Spacious & Zero Clutter) */}
              <div className="relative w-full h-8 pt-1.5 select-none min-w-0">
                {Array.from(visibleDateIndices).map((idx) => {
                  const point = trendPoints[idx];
                  if (!point) return null;
                  const isHovered = hoveredIndex === idx;
                  const dateParts = parseDateParts(point.dateStr, point.label);
                  const leftPct = ((idx + 0.5) / trendPoints.length) * 100;

                  // Edge tick clamping so text never overhangs container borders
                  const isFirst = idx === 0;
                  const isLast = idx === trendPoints.length - 1;
                  const transformClass = isFirst
                    ? "translate-x-0"
                    : isLast
                    ? "-translate-x-full"
                    : "-translate-x-1/2";
                  const leftStyle = isFirst ? "2px" : isLast ? "calc(100% - 2px)" : `${leftPct}%`;

                  return (
                    <div
                      key={`anchor-label-${point.key}-${idx}`}
                      className={`absolute top-1.5 flex flex-col items-center pointer-events-none text-center transition-colors max-w-[70px] ${transformClass}`}
                      style={{ left: leftStyle }}
                    >
                      {/* Date Header: Month + Day */}
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
      )}

      {/* 5. Dedicated Chart Card Footer: Sessions & Students Overview */}
      {trendPoints.length > 0 && (
        <div className="pt-3 border-t theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs theme-text-secondary select-none">
          {/* Students Overview / Active Focus (Left) */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5 font-semibold theme-text-primary shrink-0">
              <StudentIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Students:</span>
            </div>
            {footerStudents.length === 0 ? (
              <span className="text-xs theme-text-secondary opacity-70">
                {propStudentCount ? `${propStudentCount} Students` : "No student details"}
              </span>
            ) : footerStudents.length <= 4 ? (
              <span className="text-xs font-semibold theme-text-primary">
                {footerStudents.join(", ")}
              </span>
            ) : (
              <span className="text-xs font-semibold theme-text-primary">
                {footerStudents.length} Total Students
              </span>
            )}
            {activeHoverPoint && (
              <span className="text-[10px] theme-accent font-mono ml-1 font-semibold">
                ({activeHoverPoint.label})
              </span>
            )}
          </div>

          {/* Sessions Overview / Active Focus (Right) */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5 font-semibold theme-text-primary shrink-0">
              <SessionsIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Sessions:</span>
            </div>
            {footerSessions.length === 0 ? (
              <span className="text-xs theme-text-secondary opacity-70">No session details</span>
            ) : footerSessions.length <= 4 ? (
              <span className="text-xs font-semibold theme-text-primary">
                {footerSessions.join(", ")}
              </span>
            ) : (
              <span className="text-xs font-semibold theme-text-primary">
                {footerSessions.length} Total Sessions
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTrendsChart;

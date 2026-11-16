import { useState, useMemo, useCallback, RefObject } from "react";
import html2canvas from "html2canvas-pro";
import { TrendDataPoint, ChartSeriesConfig, MetricType } from "../types";
import { ActionMenuItem } from "@/components/ui/ActionMenu";
import {
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  FileTextIcon,
  ShareIcon,
} from "@/components/ui/Icons";
import {
  generateSmoothPath,
  extendCoordsToEdges,
  generateAreaPath,
} from "../chartUtils";

export interface UseTrendChartExportOptions {
  chartContainerRef: RefObject<HTMLDivElement | null>;
  dataPoints: TrendDataPoint[];
  series: ChartSeriesConfig[];
  activeMetric?: MetricType;
  exportFilename?: string;
  exportTitle?: string;
  onSuccess?: (message: string) => void;
  computeCoordinatesForWidth?: (width: number) => Record<string, Array<{ x: number; y: number }>>;
  // Backward compatibility options
  trendPoints?: TrendDataPoint[];
  currentMetric?: MetricType;
  formattedTotalPages?: number;
  avgPagesVal?: number;
  totalMistakesVal?: number;
  totalStucksVal?: number;
}

/**
 * Enterprise Reusable Chart Export Hook
 * Provides high-DPI desktop canvas capture, PNG download, CSV data extraction,
 * clipboard image copying, and native Web Share integration.
 */
export function useTrendChartExport({
  chartContainerRef,
  dataPoints: propDataPoints,
  series = [],
  activeMetric: propActiveMetric,
  exportFilename = "trend_analytics",
  exportTitle = "Analytics Trends",
  onSuccess,
  computeCoordinatesForWidth,
  trendPoints: legacyTrendPoints,
  currentMetric: legacyMetric,
}: UseTrendChartExportOptions) {
  const dataPoints = propDataPoints || legacyTrendPoints || [];
  const activeMetric = propActiveMetric || legacyMetric || "combined";

  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const chartHeight = 220;
  const topPadding = 18;
  const bottomPadding = 6;
  const baselineY = chartHeight - bottomPadding;

  const visibleSeries = useMemo(() => {
    return series.filter((s) => s.visible !== false);
  }, [series]);

  // Medium canvas capture for export - captures a balanced medium card layout (820px)
  const captureDesktopCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
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

    // 5. Update SVG paths for exportCanvasWidth if coordinate calculator is provided
    if (computeCoordinatesForWidth) {
      const exportCoords = computeCoordinatesForWidth(exportCanvasWidth);
      const svgs = clone.querySelectorAll("svg");
      svgs.forEach((svg) => {
        if (svg.getAttribute("viewBox")?.includes("220")) {
          svg.setAttribute("viewBox", `0 0 ${exportCanvasWidth} ${chartHeight}`);

          const paths = svg.querySelectorAll("path");
          paths.forEach((p) => {
            const seriesKey = p.getAttribute("data-series-key");
            const stroke = p.getAttribute("stroke");
            const fill = p.getAttribute("fill");

            if (seriesKey && exportCoords[seriesKey]) {
              const coords = exportCoords[seriesKey];
              if (stroke) {
                p.setAttribute(
                  "d",
                  generateSmoothPath(extendCoordsToEdges(coords, exportCanvasWidth), topPadding, baselineY)
                );
              } else if (fill) {
                p.setAttribute("d", generateAreaPath(coords, baselineY, topPadding, exportCanvasWidth));
              }
            } else if (stroke === "var(--accent-main)" && exportCoords.pages) {
              p.setAttribute(
                "d",
                generateSmoothPath(extendCoordsToEdges(exportCoords.pages, exportCanvasWidth), topPadding, baselineY)
              );
            } else if (stroke === "var(--color-danger)" && exportCoords.mistakes) {
              p.setAttribute(
                "d",
                generateSmoothPath(extendCoordsToEdges(exportCoords.mistakes, exportCanvasWidth), topPadding, baselineY)
              );
            } else if ((stroke?.includes("#f59e0b") || stroke?.includes("warning")) && exportCoords.stucks) {
              p.setAttribute(
                "d",
                generateSmoothPath(extendCoordsToEdges(exportCoords.stucks, exportCanvasWidth), topPadding, baselineY)
              );
            } else if (fill?.includes("trendPagesGrad") && exportCoords.pages) {
              p.setAttribute("d", generateAreaPath(exportCoords.pages, baselineY, topPadding, exportCanvasWidth));
            } else if (fill?.includes("trendMistakesGrad") && exportCoords.mistakes) {
              p.setAttribute("d", generateAreaPath(exportCoords.mistakes, baselineY, topPadding, exportCanvasWidth));
            } else if (fill?.includes("trendStucksGrad") && exportCoords.stucks) {
              p.setAttribute("d", generateAreaPath(exportCoords.stucks, baselineY, topPadding, exportCanvasWidth));
            }
          });
        }
      });
    }

    // 6. Update bar widths in the clone to export proportions
    const n = Math.max(dataPoints.length, 1);
    const exportColWidth = exportCanvasWidth / n;
    const activeSeriesCount = Math.max(visibleSeries.length, 1);
    const targetBarWidth = Math.max(
      2,
      Math.min(32, Math.floor((exportColWidth * 0.7) / activeSeriesCount))
    );

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
    } catch (err) {
      console.error("[useTrendChartExport] Canvas capture failed:", err);
      return null;
    } finally {
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  }, [
    chartContainerRef,
    computeCoordinatesForWidth,
    dataPoints.length,
    visibleSeries,
    baselineY,
  ]);

  // Unified, robust clipboard copy helper
  const copyChartCanvasToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      const canvas = await captureDesktopCanvas();
      if (!canvas) return false;

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2500);
          onSuccess?.("Copied to Clipboard!");
          return true;
        }
      }

      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
      onSuccess?.("Copied to Clipboard!");
      return true;
    } catch (err) {
      console.warn("[useTrendChartExport] Clipboard copy failed:", err);
      try {
        const canvas = await captureDesktopCanvas();
        if (canvas) {
          const a = document.createElement("a");
          a.download = `${exportFilename}_preview_${new Date().toISOString().split("T")[0]}.png`;
          a.href = canvas.toDataURL("image/png");
          a.click();
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2500);
          onSuccess?.("Chart image downloaded successfully!");
          return true;
        }
      } catch {}
      return false;
    }
  }, [captureDesktopCanvas, exportFilename, onSuccess]);

  const handleExportPNG = useCallback(async () => {
    try {
      const canvas = await captureDesktopCanvas();
      if (!canvas) return;
      const a = document.createElement("a");
      a.download = `${exportFilename}_${new Date().toISOString().split("T")[0]}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      await copyChartCanvasToClipboard();
    } catch (err) {
      console.error("Export PNG failed:", err);
    }
  }, [captureDesktopCanvas, copyChartCanvasToClipboard, exportFilename]);

  const handleExportCSV = useCallback(async () => {
    try {
      const headers = [
        "Date",
        ...visibleSeries.map((s) => `"${s.label}"`),
        "Entities Active",
      ];

      const rows = dataPoints.map((p) => {
        const dateCell = `"${p.dateStr || p.label}"`;
        const seriesCells = visibleSeries.map((s) => {
          const val =
            p.values?.[s.key] !== undefined
              ? p.values[s.key]
              : (p as Record<string, any>)[s.key];
          return val !== undefined ? val : 0;
        });
        const entityCell = p.entitiesCount ?? p.studentCount ?? "";
        return [dateCell, ...seriesCells, entityCell];
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportFilename}_data_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      await copyChartCanvasToClipboard();
    } catch (err) {
      console.error("Export CSV failed:", err);
    }
  }, [dataPoints, visibleSeries, copyChartCanvasToClipboard, exportFilename]);

  const handleShareChart = useCallback(async () => {
    try {
      const canvas = await captureDesktopCanvas();
      if (typeof navigator !== "undefined" && navigator.share && canvas) {
        const fileName = `${exportFilename}_${new Date().toISOString().split("T")[0]}.png`;
        const shareData: ShareData = {
          title: exportTitle,
          text: `${exportTitle} - Summary & Analytics`,
        };

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: "image/png" })] })) {
          const file = new File([blob], fileName, { type: "image/png" });
          shareData.files = [file];
        }

        await navigator.share(shareData);
        return;
      }
      await copyChartCanvasToClipboard();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.warn("Share failed, falling back to copy:", err);
        await copyChartCanvasToClipboard();
      }
    }
  }, [captureDesktopCanvas, copyChartCanvasToClipboard, exportFilename, exportTitle]);

  const exportMenuItems: ActionMenuItem[] = useMemo(
    () => [
      {
        id: "copy-image",
        label: copiedSuccess ? "Copied!" : "Copy Image to Clipboard",
        icon: copiedSuccess ? CheckIcon : CopyIcon,
        onClick: copyChartCanvasToClipboard,
      },
      {
        id: "download-png",
        label: "Download as PNG",
        icon: DownloadIcon,
        onClick: handleExportPNG,
      },
      {
        id: "export-csv",
        label: "Export Data as CSV",
        icon: FileTextIcon,
        onClick: handleExportCSV,
      },
      {
        id: "share-chart",
        label: "Share Chart",
        icon: ShareIcon,
        onClick: handleShareChart,
      },
    ],
    [
      copiedSuccess,
      copyChartCanvasToClipboard,
      handleExportPNG,
      handleExportCSV,
      handleShareChart,
    ]
  );

  return {
    copiedSuccess,
    exportMenuItems,
    handleExportPNG,
    handleExportCSV,
    copyChartCanvasToClipboard,
    handleShareChart,
  };
}

export default useTrendChartExport;

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
  footerFields?: any[];
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
  footerFields: propFooterFields,
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

  // Canvas capture for export - directly captures the chart container with resolved colors and styles
  const captureDesktopCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!chartContainerRef.current) return null;

    const sourceNode = chartContainerRef.current;
    const computedStyle = window.getComputedStyle(sourceNode);
    let resolvedBg = computedStyle.backgroundColor;
    if (!resolvedBg || resolvedBg === "transparent" || resolvedBg === "rgba(0, 0, 0, 0)") {
      resolvedBg = document.documentElement.classList.contains("dark") ? "#0f172a" : "#ffffff";
    }

    try {
      const canvas = await html2canvas(sourceNode, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: resolvedBg,
        ignoreElements: (el) => {
          if (
            el.getAttribute("aria-label") === "Export Options" ||
            el.getAttribute("role") === "menu" ||
            el.getAttribute("role") === "tooltip" ||
            el.hasAttribute("data-export-hide")
          ) {
            return true;
          }
          return false;
        },
      });
      return canvas;
    } catch (err) {
      console.error("[useTrendChartExport] Canvas capture failed:", err);
      return null;
    }
  }, [chartContainerRef]);

  // Unified, robust clipboard copy helper
  const copyChartCanvasToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      const canvas = await captureDesktopCanvas();
      if (!canvas) {
        onSuccess?.("Failed to generate chart image.");
        return false;
      }

      let copied = false;
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard && typeof navigator.clipboard.write === "function") {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (blob) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            copied = true;
          }
        } catch (clipErr) {
          console.warn("[useTrendChartExport] navigator.clipboard.write failed:", clipErr);
        }
      }

      if (copied) {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
        onSuccess?.("Chart image copied to clipboard!");
        return true;
      }

      // If clipboard write is not permitted by browser, fallback to automatic download
      const a = document.createElement("a");
      a.download = `${exportFilename}_${new Date().toISOString().split("T")[0]}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      onSuccess?.("Downloaded chart image (clipboard access restricted).");
      return true;
    } catch (err) {
      console.error("[useTrendChartExport] Copy to clipboard failed:", err);
      onSuccess?.("Unable to copy chart image.");
      return false;
    }
  }, [captureDesktopCanvas, exportFilename, onSuccess]);

  const handleExportPNG = useCallback(async () => {
    try {
      const canvas = await captureDesktopCanvas();
      if (!canvas) {
        onSuccess?.("Failed to generate chart image.");
        return;
      }
      const a = document.createElement("a");
      a.download = `${exportFilename}_${new Date().toISOString().split("T")[0]}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      onSuccess?.("Chart downloaded as PNG!");
    } catch (err) {
      console.error("Export PNG failed:", err);
      onSuccess?.("Failed to export chart as PNG.");
    }
  }, [captureDesktopCanvas, exportFilename, onSuccess]);

  const handleExportCSV = useCallback(async () => {
    try {
      // 1. Determine which metadata dimensions exist in the data points
      const hasStudents = dataPoints.some((p) => p.studentNames && p.studentNames.length > 0);
      const hasSessions = dataPoints.some((p) => p.sessionNames && p.sessionNames.length > 0);
      const hasDepartments = dataPoints.some((p) => p.departmentNames && p.departmentNames.length > 0);
      const hasClasses = dataPoints.some((p) => p.classNames && p.classNames.length > 0);
      const hasSections = dataPoints.some((p) => p.sectionNames && p.sectionNames.length > 0);
      const hasTeachers = dataPoints.some((p) => p.teacherNames && p.teacherNames.length > 0);

      // Metadata headers to include
      const metaHeaders: string[] = [];
      if (hasStudents) metaHeaders.push('"Students"');
      if (hasSessions) metaHeaders.push('"Sessions"');
      if (hasDepartments) metaHeaders.push('"Department"');
      if (hasClasses) metaHeaders.push('"Class"');
      if (hasSections) metaHeaders.push('"Section"');
      if (hasTeachers) metaHeaders.push('"Teacher"');

      const headers = [
        "Date",
        ...visibleSeries.map((s) => `"${s.label}"`),
        ...metaHeaders,
      ];

      const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

      const rows = dataPoints.map((p) => {
        const dateCell = escapeCsv(p.dateStr || p.label);
        const seriesCells = visibleSeries.map((s) => {
          const val =
            p.values?.[s.key] !== undefined
              ? p.values[s.key]
              : (p as Record<string, any>)[s.key];
          return val !== undefined && val !== null ? Number(val).toFixed(1).replace(/\.0$/, '') : "0";
        });

        const metaCells: string[] = [];
        if (hasStudents) metaCells.push(escapeCsv((p.studentNames || []).join('; ')));
        if (hasSessions) metaCells.push(escapeCsv((p.sessionNames || []).join('; ')));
        if (hasDepartments) metaCells.push(escapeCsv((p.departmentNames || []).join('; ')));
        if (hasClasses) metaCells.push(escapeCsv((p.classNames || []).join('; ')));
        if (hasSections) metaCells.push(escapeCsv((p.sectionNames || []).join('; ')));
        if (hasTeachers) metaCells.push(escapeCsv((p.teacherNames || []).join('; ')));

        return [dateCell, ...seriesCells, ...metaCells];
      });

      // 2. Append Summary Footer Totals Block
      const allStudents = new Set<string>();
      const allSessions = new Set<string>();
      const allDepartments = new Set<string>();
      const allClasses = new Set<string>();
      const allSections = new Set<string>();
      const allTeachers = new Set<string>();

      dataPoints.forEach((p) => {
        (p.studentNames || []).forEach((n) => n && allStudents.add(n));
        (p.sessionNames || []).forEach((n) => n && allSessions.add(n));
        (p.departmentNames || []).forEach((n) => n && allDepartments.add(n));
        (p.classNames || []).forEach((n) => n && allClasses.add(n));
        (p.sectionNames || []).forEach((n) => n && allSections.add(n));
        (p.teacherNames || []).forEach((n) => n && allTeachers.add(n));
      });

      if (propFooterFields && Array.isArray(propFooterFields)) {
        propFooterFields.forEach((f: any) => {
          if (f.id === 'students' && Array.isArray(f.items)) f.items.forEach((item: string) => allStudents.add(item));
          if (f.id === 'sessions' && Array.isArray(f.items)) f.items.forEach((item: string) => allSessions.add(item));
          if (f.id === 'departments' && Array.isArray(f.items)) f.items.forEach((item: string) => allDepartments.add(item));
          if (f.id === 'classes' && Array.isArray(f.items)) f.items.forEach((item: string) => allClasses.add(item));
          if (f.id === 'sections' && Array.isArray(f.items)) f.items.forEach((item: string) => allSections.add(item));
          if (f.id === 'teachers' && Array.isArray(f.items)) f.items.forEach((item: string) => allTeachers.add(item));
        });
      }

      const summaryRows = [
        [""],
        ['"--- OVERALL FOOTER METADATA SUMMARY ---"'],
        ['"Field / Dimension"', '"Total Count / Enrolled Entities"'],
        ['"Students"', escapeCsv(`${allStudents.size} Total (${Array.from(allStudents).join('; ')})`)],
        ['"Sessions"', escapeCsv(`${allSessions.size} Active (${Array.from(allSessions).join('; ')})`)],
        ['"Departments"', escapeCsv(Array.from(allDepartments).join('; ') || 'General')],
        ['"Classes"', escapeCsv(Array.from(allClasses).join('; ') || 'All Classes')],
        ['"Sections"', escapeCsv(Array.from(allSections).join('; ') || 'All Sections')],
        ['"Teachers"', escapeCsv(Array.from(allTeachers).join('; ') || 'Staff Teachers')],
      ];

      const csvLines = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        ...summaryRows.map((r) => r.join(',')),
      ];

      const csvContent = "\uFEFF" + csvLines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportFilename}_full_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      onSuccess?.("Chart and footer data exported as CSV!");
    } catch (err) {
      console.error("Export CSV failed:", err);
      onSuccess?.("Failed to export CSV.");
    }
  }, [dataPoints, visibleSeries, exportFilename, propFooterFields, onSuccess]);

  const handleShareChart = useCallback(async () => {
    try {
      const canvas = await captureDesktopCanvas();
      const fileName = `${exportFilename}_${new Date().toISOString().split("T")[0]}.png`;

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        const shareData: ShareData = {
          title: exportTitle,
          text: `${exportTitle} - Summary & Analytics`,
          url: window.location.href,
        };

        if (canvas) {
          try {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
            if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: "image/png" })] })) {
              const file = new File([blob], fileName, { type: "image/png" });
              shareData.files = [file];
            }
          } catch (fileShareErr) {
            console.warn("File share not supported, falling back to url share:", fileShareErr);
          }
        }

        try {
          await navigator.share(shareData);
          onSuccess?.("Chart shared successfully!");
          return;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            // User cancelled share dialog
            return;
          }
          console.warn("Navigator share failed, falling back to copy link:", shareErr);
        }
      }

      // Fallback: Copy link to clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(window.location.href);
        onSuccess?.("Chart link copied to clipboard!");
      } else {
        await copyChartCanvasToClipboard();
      }
    } catch (err) {
      console.warn("Share failed, falling back to copy:", err);
      await copyChartCanvasToClipboard();
    }
  }, [captureDesktopCanvas, copyChartCanvasToClipboard, exportFilename, exportTitle, onSuccess]);

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

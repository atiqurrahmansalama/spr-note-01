export * from "./types";
export * from "./chartUtils";
export * from "./trends";
export { TrendChart, default as TrendChartDefault } from "./TrendChart";

// Backward-compatibility aliases for recitation progress consumers
export {
  ProgressTrendsChart,
  ProgressSessionBreakdown,
} from "@/modules/learning/daily-classroom/components/progress-analytics";

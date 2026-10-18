import React from "react";
import { DateRangePicker } from "@/components/selectors";
import { DownloadIcon, TrendingUpIcon } from "@/components/ui/Icons";

export interface ProgressAnalyticsHeaderProps {
  timeHorizon: "weekly" | "monthly" | "yearly";
  onHorizonChange: (horizon: "weekly" | "monthly" | "yearly") => void;
  startDate: string;
  endDate: string;
  onRangeSelect: (start: string, end: string) => void;
  onResetDates: () => void;
  onExportCSV: () => void;
  totalRecordsCount: number;
}

export const ProgressAnalyticsHeader: React.FC<ProgressAnalyticsHeaderProps> = ({
  timeHorizon,
  onHorizonChange,
  startDate,
  endDate,
  onRangeSelect,
  onResetDates,
  onExportCSV,
  totalRecordsCount,
}) => {
  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Dedicated Page Header (Focused Learning Analytics - No general greeting) */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
            <TrendingUpIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Progress & Recitation Analytics
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary">
                {totalRecordsCount} Sessions
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-0.5">
              Daily memorization pace, revision velocity, and student accuracy trends
            </p>
          </div>
        </div>

        {/* Right: Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Time Horizon Switcher */}
          <div className="flex items-center p-1 theme-bg-sub border theme-border rounded-xl">
            {(["weekly", "monthly", "yearly"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onHorizonChange(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                  timeHorizon === mode
                    ? "theme-bg-accent theme-accent-text shadow-sm"
                    : "theme-text-secondary hover:theme-text-primary"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* 2. Date Range Selector */}
          <div className="w-48 sm:w-56">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onRangeSelect={onRangeSelect}
              onReset={onResetDates}
              label=""
              placeholder="Select Range..."
              size="sm"
            />
          </div>

          {/* 3. Export CSV Action Button */}
          <button
            type="button"
            onClick={onExportCSV}
            className="h-[38px] px-3.5 py-1.5 rounded-xl border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-primary text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            title="Export analytics to CSV"
          >
            <DownloadIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressAnalyticsHeader;

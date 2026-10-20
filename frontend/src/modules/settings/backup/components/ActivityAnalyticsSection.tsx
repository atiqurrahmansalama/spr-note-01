import React from "react";
import { useTranslation } from "../../../../i18n";
import type { FeatureAnalyticsData } from "../types";

interface ActivityAnalyticsSectionProps {
  analyticsData: FeatureAnalyticsData | null;
  isLoadingAnalytics: boolean;
  isArchivingLogs: boolean;
  onArchiveStaleLogs: (dryRun: boolean) => void;
}

export function ActivityAnalyticsSection({
  analyticsData,
  isLoadingAnalytics,
  isArchivingLogs,
  onArchiveStaleLogs,
}: ActivityAnalyticsSectionProps): React.ReactElement {
  const { t, formatNumber } = useTranslation("backup");

  return (
    <div className="w-full space-y-6">
      {/* Activity Logs & Feature Analytics Overview */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hot Operational Database */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
            {t("analytics_hot_db", "Hot Live Database")}
          </span>
          <h3 className="text-xl font-extrabold theme-text-primary">
            {isLoadingAnalytics
              ? "..."
              : formatNumber(analyticsData?.hot_db.total_hot_logs ?? 0)}
          </h3>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            Raw request logs in active SQLite / PostgreSQL database.
          </p>
          <div className="text-[10px] theme-text-secondary pt-2 border-t theme-border space-y-1">
            <div>
              ActivityLog: {formatNumber(analyticsData?.hot_db.activity_logs_count || 0)}
            </div>
            <div>
              UserActivityLog: {formatNumber(analyticsData?.hot_db.user_activity_logs_count || 0)}
            </div>
          </div>
        </div>

        {/* Aggregated Product Intelligence */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
            {t("analytics_intelligence", "Aggregated Intelligence")}
          </span>
          <h3 className="text-xl font-extrabold theme-text-primary">
            {isLoadingAnalytics
              ? "..."
              : formatNumber(analyticsData?.total_hits ?? 0)}
          </h3>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            Total tracked feature hits in the past 30 days retained in FeatureUsageSummary.
          </p>
          <div className="text-[10px] theme-text-secondary pt-2 border-t theme-border">
            Zero data loss for product usage roadmap.
          </div>
        </div>

        {/* Cold Archive Files */}
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
            {t("analytics_cold_archives", "Cold Archives")}
          </span>
          <h3 className="text-xl font-extrabold theme-text-primary">
            {isLoadingAnalytics
              ? "..."
              : formatNumber(analyticsData?.cold_archives_count ?? 0)}
          </h3>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            Compressed .jsonl.gz packages in cold storage.
          </p>
          <div className="text-[10px] theme-text-secondary pt-2 border-t theme-border">
            Ready for deep analytics and ML auditing.
          </div>
        </div>
      </div>

      {/* Action Bar for Log Archival */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold theme-text-primary">
            {t("smart_archival_title", "Smart 30-Day Log Archival & Storage Reclaim")}
          </h3>
          <p className="text-xs theme-text-secondary">
            {t(
              "smart_archival_desc",
              "Aggregates logs older than 30 days into FeatureUsageSummary, packages raw records to compressed cold storage, and vacuums the database."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onArchiveStaleLogs(true)}
            disabled={isArchivingLogs}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition cursor-pointer disabled:opacity-50"
          >
            {t("simulate_btn", "Simulate (Dry Run)")}
          </button>
          <button
            type="button"
            onClick={() => onArchiveStaleLogs(false)}
            disabled={isArchivingLogs}
            className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow disabled:opacity-50"
          >
            {isArchivingLogs ? "Archiving..." : t("archive_prune_btn", "Archive & Prune (>30 Days)")}
          </button>
        </div>
      </div>

      {/* Top Features Breakdown */}
      <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-sm font-bold theme-text-primary">
          {t("top_features_title", "Top Used Features & Actions (Past 30 Days)")}
        </h3>

        {isLoadingAnalytics ? (
          <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
            Analyzing feature usage rollups...
          </div>
        ) : !analyticsData || analyticsData.top_features.length === 0 ? (
          <div className="py-8 text-center text-xs theme-text-secondary">
            No feature analytics summaries generated yet. Run archival to aggregate past logs.
          </div>
        ) : (
          <div className="space-y-3">
            {analyticsData.top_features.map((feat) => {
              const maxHits = analyticsData.top_features[0]?.total_hits || 1;
              const pct = Math.round(((feat.total_hits || 0) / maxHits) * 100);

              return (
                <div
                  key={feat.action_name}
                  className="p-3 theme-bg-sub rounded-xl border theme-border space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="theme-text-primary font-mono">{feat.action_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="theme-text-secondary text-[11px]">
                        {formatNumber(feat.unique_users)} unique users
                      </span>
                      <span className="theme-accent font-bold">
                        {formatNumber(feat.total_hits)} hits
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full theme-bg-surface overflow-hidden">
                    <div
                      className="h-full theme-bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <div className="text-[10px] theme-text-secondary flex justify-between">
                    <span>
                      {feat.http_method} {feat.endpoint}
                    </span>
                    <span>{pct}% of peak volume</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

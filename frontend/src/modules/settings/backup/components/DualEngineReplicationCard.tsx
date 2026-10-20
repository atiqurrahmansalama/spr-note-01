import React, { useState, useEffect, useCallback } from "react";
import {
  ServerStackIcon,
  HardDriveIcon,
  CloudIcon,
  RefreshIcon,
  CheckCircleIcon,
  ShieldIcon,
  TimerIcon,
} from "../../../../components/ui/Icons";
import { useTranslation } from "../../../../i18n";
import { useToast } from "../../../../context/ToastContext";
import { fetchWithAuth } from "../../../../utils/authService";
import type { ReplicationTelemetryData } from "../types";
import "../locales";

interface DualEngineReplicationCardProps {
  onSyncCompleted?: () => void;
}

export function DualEngineReplicationCard({ onSyncCompleted }: DualEngineReplicationCardProps): React.ReactElement {
  const { t, formatNumber } = useTranslation("backup");
  const { showToast } = useToast();

  const [telemetry, setTelemetry] = useState<ReplicationTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchTelemetry = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth("/api/v1/system/replication/status/");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTelemetry(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[DualEngineReplicationCard] Telemetry fetch warning:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 20000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const res = await fetchWithAuth("/api/v1/system/replication/sync-now/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_size: 100 }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.status) {
          setTelemetry(json.status);
        }
        const syncedCount = json.result?.replicated_count ?? 0;
        showToast(
          syncedCount > 0
            ? `${syncedCount} mutations replicated to cloud vault successfully.`
            : "Cloud queue is fully synchronized.",
          "success"
        );
        if (onSyncCompleted) onSyncCompleted();
      } else {
        showToast(json.error || "Cloud sync encountered an issue.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error during sync.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = telemetry?.pending_count ?? 0;
  const syncedCount = telemetry?.synced_count ?? 0;
  const failedCount = telemetry?.failed_count ?? 0;
  const lagSeconds = telemetry?.queue_lag_seconds ?? 0;

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-5 shadow-sm space-y-5 @container">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b theme-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent">
            <ServerStackIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold theme-text-primary tracking-tight">
              {t("dual_engine_title", "Server-Side Dual-Engine Live Architecture")}
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t("dual_engine_subtitle", "Sub-millisecond local execution (~0.5ms) with asynchronous Cloud Replication (CDC)")}
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="p-2 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer disabled:opacity-50"
            title={t("refresh", "Refresh Telemetry")}
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold theme-bg-accent theme-text-on-accent hover:opacity-95 shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? t("syncing", "Synchronizing...") : t("sync_now", "Sync Cloud Now")}</span>
          </button>
        </div>
      </div>

      {/* Visual Dual Engine Display */}
      <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-4">
        {/* Engine A: Instant Local Store */}
        <div className="p-4 rounded-xl border theme-border theme-bg-sub/60 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDriveIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold theme-text-primary">
                {t("engine_local_title", "Engine A: Instant Local Store")}
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {t("engine_local_status", "Active (<0.5ms)")}
            </span>
          </div>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            {t("engine_local_desc", "SQLite WAL mode with 64MB working cache. Immediate reads and writes with zero UI delay.")}
          </p>
          <div className="pt-1 flex items-center gap-2 text-[11px] theme-text-muted">
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>WAL Zero-Wait Lock Concurrency</span>
          </div>
        </div>

        {/* Engine B: Cloud Durability Replicator */}
        <div className="p-4 rounded-xl border theme-border theme-bg-sub/60 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudIcon className="w-4 h-4 theme-accent" />
              <span className="text-xs font-bold theme-text-primary">
                {t("engine_cloud_title", "Engine B: Cloud Durability Replicator")}
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full theme-bg-accent-soft theme-accent">
              {t("engine_cloud_status", "Continuous Outbox Streaming")}
            </span>
          </div>
          <p className="text-[11px] theme-text-secondary leading-relaxed">
            {t("engine_cloud_desc", "Non-blocking worker continuously replicates transactional mutations to Supabase remote cluster.")}
          </p>
          <div className="pt-1 flex items-center gap-2 text-[11px] theme-text-muted">
            <ShieldIcon className="w-3.5 h-3.5 theme-accent" />
            <span className="truncate max-w-[220px]">
              {telemetry?.cloud_target || "Supabase Remote PostgreSQL"}
            </span>
          </div>
        </div>
      </div>

      {/* Queue Telemetry Metrics */}
      <div className="grid grid-cols-2 @[540px]:grid-cols-4 gap-3">
        {/* Pending Queue */}
        <div className="p-3 rounded-xl border theme-border theme-bg-surface space-y-1">
          <div className="text-[11px] font-semibold theme-text-secondary">
            {t("pending_mutations", "Pending Queue Depth")}
          </div>
          <div className="text-lg font-bold theme-text-primary">
            {formatNumber(pendingCount)}
          </div>
          <div className="text-[10px] theme-text-muted">
            {pendingCount === 0 ? t("all_synced", "All synced") : "Awaiting stream worker"}
          </div>
        </div>

        {/* Synced Mutations */}
        <div className="p-3 rounded-xl border theme-border theme-bg-surface space-y-1">
          <div className="text-[11px] font-semibold theme-text-secondary">
            {t("synced_mutations", "Total Synced Mutations")}
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(syncedCount)}
          </div>
          <div className="text-[10px] theme-text-muted">
            Durably committed to cloud
          </div>
        </div>

        {/* Queue Lag */}
        <div className="p-3 rounded-xl border theme-border theme-bg-surface space-y-1">
          <div className="text-[11px] font-semibold theme-text-secondary">
            {t("queue_lag", "Replication Lag")}
          </div>
          <div className="text-lg font-bold theme-text-primary flex items-center gap-1">
            <TimerIcon className="w-4 h-4 text-amber-500" />
            <span>{formatNumber(lagSeconds)}s</span>
          </div>
          <div className="text-[10px] theme-text-muted">
            Real-time latency
          </div>
        </div>

        {/* Failed / Retries */}
        <div className="p-3 rounded-xl border theme-border theme-bg-surface space-y-1">
          <div className="text-[11px] font-semibold theme-text-secondary">
            {t("failed_mutations", "Failed / Retries")}
          </div>
          <div className={`text-lg font-bold ${failedCount > 0 ? "text-rose-500" : "theme-text-primary"}`}>
            {formatNumber(failedCount)}
          </div>
          <div className="text-[10px] theme-text-muted">
            {failedCount > 0 ? "Retrying automatically" : "Zero errors"}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import type { FeatureAnalyticsData } from "../types";

export function useFeatureAnalytics(onArchivalComplete?: () => void) {
  const { showToast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<FeatureAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [isArchivingLogs, setIsArchivingLogs] = useState<boolean>(false);

  const loadAnalytics = useCallback(async (days: number = 30) => {
    try {
      setIsLoadingAnalytics(true);
      const res = await fetchWithAuth(`/api/v1/system/backup/feature-analytics/?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAnalyticsData(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[useFeatureAnalytics] Load error:", err.message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const handleArchiveStaleLogs = async (dryRun: boolean = false, daysToKeep: number = 30) => {
    try {
      setIsArchivingLogs(true);
      showToast(
        dryRun ? "Simulating log archival..." : "Archiving logs and reclaiming database space...",
        "info"
      );

      const res = await fetchWithAuth("/api/v1/system/backup/archive-logs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days_to_keep: daysToKeep, dry_run: dryRun }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (dryRun) {
          showToast(`Simulation complete: ${data.total_records || 0} records qualify for cold archival.`, "info");
        } else {
          showToast(
            `Successfully archived ${data.total_pruned || 0} records into ${data.archive_name} (${data.archive_size_mb || 0} MB). Storage reclaimed!`,
            "success"
          );
          loadAnalytics();
          if (onArchivalComplete) onArchivalComplete();
        }
      } else {
        throw new Error(data.error || "Archival operation failed.");
      }
    } catch (err: any) {
      showToast("Log archival failed: " + err.message, "error");
    } finally {
      setIsArchivingLogs(false);
    }
  };

  return {
    analyticsData,
    isLoadingAnalytics,
    isArchivingLogs,
    loadAnalytics,
    handleArchiveStaleLogs,
  };
}

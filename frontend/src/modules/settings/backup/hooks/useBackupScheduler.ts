import { useState, useCallback } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import type { BackupScheduleData } from "../types";

export function useBackupScheduler(onJobTriggered?: () => void) {
  const { showToast } = useToast();
  const [scheduleSettings, setScheduleSettings] = useState<BackupScheduleData | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [isTriggeringSchedule, setIsTriggeringSchedule] = useState<boolean>(false);

  const loadScheduleSettings = useCallback(async () => {
    try {
      setIsLoadingSchedule(true);
      const res = await fetchWithAuth("/api/v1/system/backup/schedule-settings/");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setScheduleSettings(json.data);
        }
      }
    } catch (err: any) {
      console.warn("[useBackupScheduler] Load schedule error:", err.message);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  const handleUpdateSchedule = async (updates: Partial<BackupScheduleData>) => {
    try {
      setIsSavingSchedule(true);
      const res = await fetchWithAuth("/api/v1/system/backup/schedule-settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setScheduleSettings(json.data);
        showToast("Automated backup schedule updated successfully.", "success");
      } else {
        throw new Error(json.error || "Failed to update backup schedule.");
      }
    } catch (err: any) {
      showToast("Schedule update failed: " + err.message, "error");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleTriggerScheduleJobNow = async () => {
    try {
      setIsTriggeringSchedule(true);
      showToast("Triggering automated backup job immediately...", "info");
      const res = await fetchWithAuth("/api/v1/system/backup/schedule-settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("Automated backup job executed successfully!", "success");
        if (json.data) setScheduleSettings(json.data);
        if (onJobTriggered) onJobTriggered();
      } else {
        throw new Error(json.error || "Execution failed.");
      }
    } catch (err: any) {
      showToast("Trigger failed: " + err.message, "error");
    } finally {
      setIsTriggeringSchedule(false);
    }
  };

  return {
    scheduleSettings,
    isLoadingSchedule,
    isSavingSchedule,
    isTriggeringSchedule,
    loadScheduleSettings,
    handleUpdateSchedule,
    handleTriggerScheduleJobNow,
  };
}

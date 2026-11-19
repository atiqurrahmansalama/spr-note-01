import React from "react";
import { TimerIcon, RefreshIcon } from "../../../../components/ui/Icons";
import { useTranslation } from "../../../../i18n";
import type { BackupScheduleData } from "../types";

interface SchedulerSettingsCardProps {
  scheduleSettings: BackupScheduleData | null;
  isSavingSchedule: boolean;
  isTriggeringSchedule: boolean;
  onUpdateSchedule: (updates: Partial<BackupScheduleData>) => void;
  onTriggerScheduleJobNow: () => void;
  formatDateTime: (isoString?: string | null) => string;
}

export function SchedulerSettingsCard({
  scheduleSettings,
  isSavingSchedule,
  isTriggeringSchedule,
  onUpdateSchedule,
  onTriggerScheduleJobNow,
  formatDateTime,
}: SchedulerSettingsCardProps): React.ReactElement {
  const { t, formatNumber } = useTranslation("backup");

  return (
    <div className="w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-4 @container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent">
            <TimerIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary">
              {t("scheduler_title", "Automated Zero-Touch Backup Scheduler")}
            </h3>
            <p className="text-xs theme-text-secondary">
              {t(
                "scheduler_subtitle",
                "Autonomous background worker executing regular full backups, cloud replication, and retention pruning."
              )}
            </p>
          </div>
        </div>

        {/* Manual trigger button */}
        <button
          type="button"
          onClick={onTriggerScheduleJobNow}
          disabled={isTriggeringSchedule}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-semibold theme-text-primary transition cursor-pointer disabled:opacity-50"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${isTriggeringSchedule ? "animate-spin" : ""}`} />
          <span>
            {isTriggeringSchedule ? t("executing_job", "Executing...") : t("run_job_now", "Run Backup Job Now")}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {/* Enabled Switch */}
        <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            {t("schedule_status", "Schedule Status")}
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold theme-text-primary">
              {scheduleSettings?.enabled
                ? t("schedule_active", "Automated Active")
                : t("schedule_paused", "Scheduler Paused")}
            </span>
            <button
              type="button"
              onClick={() => onUpdateSchedule({ enabled: !scheduleSettings?.enabled })}
              disabled={isSavingSchedule}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                scheduleSettings?.enabled
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                  : "theme-bg-elevated theme-text-secondary border theme-border"
              }`}
            >
              {scheduleSettings?.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {/* Frequency Selector */}
        <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            {t("trigger_interval", "Trigger Interval")}
          </span>
          <select
            value={scheduleSettings?.frequency || "daily"}
            onChange={(e) => onUpdateSchedule({ frequency: e.target.value as any })}
            disabled={isSavingSchedule}
            className="w-full text-xs font-semibold theme-bg-surface border theme-border rounded-lg p-1.5 theme-text-primary focus:outline-none focus:border-accent"
          >
            <option value="every_6h">Every 6 Hours</option>
            <option value="every_12h">Every 12 Hours</option>
            <option value="daily">Daily (Midnight UTC)</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        {/* Next Run Display */}
        <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            {t("next_run", "Next Scheduled Run")}
          </span>
          <div className="text-xs font-bold theme-text-primary truncate">
            {scheduleSettings?.next_run ? formatDateTime(scheduleSettings.next_run) : "Calculating..."}
          </div>
          <div className="text-[10px] theme-text-secondary">
            Last: {scheduleSettings?.last_run ? formatDateTime(scheduleSettings.last_run) : "None yet"}
          </div>
        </div>

        {/* Retention Policy */}
        <div className="p-3.5 theme-bg-sub rounded-xl border theme-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            {t("retention_policy", "Retention Policy")}
          </span>
          <div className="text-xs font-bold theme-text-primary">
            Keep Last {formatNumber(scheduleSettings?.retention_count || 24)} Backups
          </div>
          <div className="text-[10px] theme-text-secondary">FIFO automated pruning</div>
        </div>
      </div>
    </div>
  );
}

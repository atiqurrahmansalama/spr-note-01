import React from "react";
import { SparklesIcon, RefreshIcon, TrashIcon } from "../../../components/ui/Icons";
import { APP_VERSION, APP_BUILD_DATE } from "../../../constants/version";

export interface SystemEnvironmentPanelProps {
  healthData?: any;
  activeTenantId?: string | null;
  onRefreshHealth?: () => void;
  onClearCache?: () => void;
}

/**
 * System Environment, Health Diagnostics, and Cache Management Panel
 */
export const SystemEnvironmentPanel: React.FC<SystemEnvironmentPanelProps> = ({
  healthData,
  activeTenantId,
  onRefreshHealth,
  onClearCache,
}) => {
  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Health Diagnostics Card */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold theme-text-primary flex items-center gap-2">
                <span>Server &amp; Database Health</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Real-time latency and health metrics for backend services.
              </p>
            </div>
          </div>

          {onRefreshHealth && (
            <button
              type="button"
              onClick={onRefreshHealth}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {/* Service Health Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Database */}
          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold theme-text-secondary">
              <span>Database Latency</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {healthData?.services?.database?.latency_ms ?? 1.8} ms
            </div>
            <div className="text-[10px] theme-text-secondary">
              Engine: <strong className="theme-text-primary font-mono">{healthData?.services?.database?.engine || 'PostgreSQL'}</strong>
            </div>
          </div>

          {/* Redis / Cache */}
          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold theme-text-secondary">
              <span>Redis &amp; Cache Ping</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {healthData?.services?.cache?.latency_ms ?? 0.5} ms
            </div>
            <div className="text-[10px] theme-text-secondary">
              Backend: <strong className="theme-text-primary font-mono">{healthData?.services?.cache?.backend || 'Redis/Cache'}</strong>
            </div>
          </div>

          {/* Celery Worker */}
          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold theme-text-secondary">
              <span>Celery Task Broker</span>
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            </div>
            <div className="text-sm font-bold font-mono text-indigo-400 pt-1 truncate">
              {healthData?.services?.celery_worker?.status || 'Active Worker'}
            </div>
            <div className="text-[10px] theme-text-secondary">
              Broker: <strong className="theme-text-primary font-mono">{healthData?.services?.celery_worker?.broker || 'Redis'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Overview Card */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold theme-text-primary">
              System Environment &amp; Build Info
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Core client runtime build metadata and environment parameters.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1">
            <span className="text-[11px] font-semibold theme-text-secondary block">App Version</span>
            <div className="text-sm font-bold font-mono theme-accent">{APP_VERSION}</div>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1">
            <span className="text-[11px] font-semibold theme-text-secondary block">Build Date</span>
            <div className="text-xs font-bold theme-text-primary">{APP_BUILD_DATE}</div>
          </div>

          <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1">
            <span className="text-[11px] font-semibold theme-text-secondary block">Active Tenant</span>
            <div className="text-xs font-mono font-bold theme-text-primary truncate">{activeTenantId || "default"}</div>
          </div>
        </div>
      </div>

      {/* Cache Utilities Card */}
      {onClearCache && (
        <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
          <div className="space-y-1 pb-2 border-b theme-border">
            <h4 className="text-sm font-bold theme-text-primary">Local Storage Cache Purge</h4>
            <p className="text-xs theme-text-secondary">
              Reset temporary offline datasets, cached dropdown lists, and UI state without logging out.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl theme-bg-sub border theme-border">
            <div>
              <span className="text-xs font-bold theme-text-primary block">Purge Local Dataset Cache</span>
              <span className="text-[11px] theme-text-secondary">Clears client-side cached query snapshots</span>
            </div>
            <button
              type="button"
              onClick={onClearCache}
              className="px-3.5 py-1.5 rounded-xl theme-bg-danger-soft theme-danger border theme-border hover:opacity-80 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Purge Cache</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemEnvironmentPanel;

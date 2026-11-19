export interface BackupStatusData {
  tier_1_cloud: {
    status: string;
    provider: string;
    frequency: string;
    retention: string;
  };
  tier_2_server: {
    status: string;
    local_archives_count: number;
    latest_backup: {
      file_name: string;
      file_size_mb: number;
      created_at: string;
      is_encrypted?: boolean;
    } | null;
    total_db_records: number;
    media_files_count: number;
    media_size_mb: number;
  };
  tier_3_client: {
    status: string;
    offline_sync_engine: string;
    auto_download_supported: boolean;
  };
}

export interface BackupArchiveItem {
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_size_mb: number;
  created_at: string;
  sha256: string;
  is_verified: boolean;
  is_encrypted: boolean;
  total_records: number;
  total_tables: number;
  media_files_count: number;
  has_native_pg_dump: boolean;
  tenant_scope: string;
}

export interface BackupScheduleData {
  enabled: boolean;
  frequency: "every_6h" | "every_12h" | "daily" | "weekly";
  last_run: string | null;
  next_run: string | null;
  retention_count: number;
  is_worker_running: boolean;
}

export interface CloudStorageStatus {
  isTesting: boolean;
  tested: boolean;
  success?: boolean;
  bucket?: string;
  supabase_url?: string;
  message?: string;
  error?: string;
}

export interface FeatureAnalyticsData {
  period_days: number;
  total_hits: number;
  top_features: Array<{
    action_name: string;
    endpoint: string;
    http_method: string;
    total_hits: number;
    unique_users: number;
  }>;
  daily_trends: Array<{
    date: string;
    hits: number;
  }>;
  hot_db: {
    activity_logs_count: number;
    user_activity_logs_count: number;
    total_hot_logs: number;
    oldest_log: string | null;
    newest_log: string | null;
  };
  cold_archives_count: number;
  cold_archives: Array<{
    file_name: string;
    file_size_mb: number;
    created_at: string;
  }>;
}

export interface ReplicationTelemetryData {
  mode: string;
  local_engine: string;
  cloud_target: string;
  is_connected: boolean;
  is_worker_running: boolean;
  pending_count: number;
  synced_count: number;
  failed_count: number;
  total_count: number;
  last_synced_at: string | null;
  queue_lag_seconds: number;
  error?: string;
}

export interface TenantInstitution {
  id: string;
  name: string;
  bangla_name: string;
  slug: string;
  eiin_or_reg_no: string;
  is_current_user_tenant: boolean;
}

export interface TenantRestoreResult {
  success: boolean;
  is_dry_run: boolean;
  restored_records?: number;
  institution_name?: string;
  message?: string;
  error?: string;
  manifest?: {
    type: string;
    institution_id: string;
    institution_name: string;
    institution_code: string;
    exported_at: string;
    total_records: number;
    record_breakdown: Record<string, number>;
  };
}

export type BackupTabType = "vault" | "tenant" | "analytics";

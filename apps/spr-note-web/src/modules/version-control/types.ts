/**
 * Version Control & Release Management Module Types
 * -----------------------------------------------------------------------------
 * Explicit TypeScript contracts for multi-platform SemVer handshake,
 * force-update security gating, structured changelogs, and admin console.
 */

export type ReleaseChannel = 'STABLE' | 'BETA' | 'ALPHA';

export type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'security';

export interface AppRelease {
  id: string;
  version: string;
  build_number: number;
  channel: ReleaseChannel;
  is_critical_update: boolean;
  min_supported_version: string;
  min_supported_build: number;
  web_active: boolean;
  android_apk_url?: string;
  desktop_installer_url?: string;
  ios_testflight_url?: string;
  title: string;
  summary: string;
  changelog_features: string[];
  changelog_improvements: string[];
  changelog_fixes: string[];
  changelog_security: string[];
  published_by?: string | null;
  published_by_name?: string;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VersionCheckResponse {
  current_app_version: string;
  client_build: number;
  latest_version: string;
  latest_build: number;
  channel: ReleaseChannel;
  has_update: boolean;
  is_critical_update: boolean;
  is_force_update: boolean;
  min_supported_version: string;
  min_supported_build: number;
  release: AppRelease | null;
}

export interface CreateReleasePayload {
  version: string;
  build_number: number;
  channel?: ReleaseChannel;
  is_critical_update?: boolean;
  min_supported_version?: string;
  min_supported_build?: number;
  web_active?: boolean;
  android_apk_url?: string;
  desktop_installer_url?: string;
  ios_testflight_url?: string;
  title: string;
  summary?: string;
  changelog_features?: string[];
  changelog_improvements?: string[];
  changelog_fixes?: string[];
  changelog_security?: string[];
  is_published?: boolean;
}

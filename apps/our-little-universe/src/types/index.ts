/**
 * Our Little Universe — Shared Domain & Foundation TypeScript Contracts.
 */

export type UserRole = 'OWNER' | 'RECIPIENT';

export interface UniverseUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface UniverseSpaceConfig {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  recipient_name: string;
  landing_eyebrow: string;
  landing_cta_label: string;
  welcome_greeting: string;
  welcome_subtitle: string;
  welcome_animation_enabled: boolean;
  countdown_title: string;
  special_date: string | null;
  pin_enabled: boolean;
  pin_hint: string;
  has_pin_configured: boolean;
  active_theme_id: string;
  ambient_track_title: string;
  ambient_track_asset_id: string | null;
  ambient_track_url: string | null;
  dashboard_greeting: string;
  dashboard_message: string;
  featured_badge: string;
  featured_title: string;
  featured_subtitle: string;
  featured_route: string;
  updated_at: string;
}

export interface UniverseProgress {
  id: string;
  entry_unlocked: boolean;
  entry_unlocked_at: string | null;
  pin_verified_at: string | null;
  collected_stars: number;
  unlocked_modules: string[];
  discovered_clues: string[];
  unlocked_surprises: string[];
  completed_milestones: string[];
  last_visited_route: string;
  updated_at: string;
}

export type UnlockRuleType = 'manual' | 'date' | 'progress' | 'pin' | 'code';

export interface UniverseModuleItem {
  id: string;
  module_key: string;
  title: string;
  subtitle: string;
  route_path: string;
  icon_name: string;
  sort_order: number;
  is_enabled: boolean;
  is_locked: boolean;
  unlock_rule_type: UnlockRuleType;
  unlock_rule_config: Record<string, unknown>;
  badge_text: string;
  updated_at: string;
}

export interface UniverseMemberItem {
  id: string;
  user_id: number;
  email: string;
  role: UserRole;
  display_name: string;
  is_active: boolean;
  last_entered_at: string | null;
  created_at: string;
}

export interface UniverseMediaAsset {
  id: string;
  title: string;
  category: 'welcome' | 'memory' | 'letter' | 'audio' | 'gift' | 'general';
  media_type: 'image' | 'audio' | 'video' | 'document';
  mime_type: string;
  file_size: number;
  is_private: boolean;
  stream_url: string | null;
  created_at: string;
}

export interface UniverseAuditLogItem {
  id: string;
  event_type: string;
  actor_name: string;
  detail: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface UniverseSessionPayload {
  user: UniverseUser;
  space: UniverseSpaceConfig;
  progress: UniverseProgress;
  modules: UniverseModuleItem[];
  tokens?: {
    access: string;
    refresh: string;
  };
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  duration?: string;
  associatedMemory?: string;
}

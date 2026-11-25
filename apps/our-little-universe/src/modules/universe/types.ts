import type {
  UniverseModuleItem,
  UniverseProgress,
  UniverseSpaceConfig,
} from '../../types';

export type SurpriseType = 'note' | 'quote' | 'clue' | 'reward';

export interface DailySurpriseItem {
  id: string;
  title: string;
  message: string;
  surprise_type: SurpriseType;
  reward_stars: number;
  scheduled_date: string | null;
  action_route: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailySurpriseState {
  date: string;
  claimed_today: boolean;
  item: DailySurpriseItem | null;
}

export interface AchievementItem {
  id?: string;
  achievement_key: string;
  title: string;
  description: string;
  badge_label: string;
  icon_name: string;
  points: number;
  rule_type: string;
  rule_target: number;
  unlocked?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface DashboardStats {
  total_worlds: number;
  unlocked_worlds: number;
  explored_worlds: number;
  story_chapters: number;
  private_media_count: number;
  achievements_unlocked: number;
  achievements_total: number;
}

export interface RecentActivityItem {
  id: string;
  event_type: string;
  label: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface DashboardPayload {
  space: UniverseSpaceConfig;
  progress: UniverseProgress;
  modules: UniverseModuleItem[];
  daily_surprise: DailySurpriseState;
  achievements: AchievementItem[];
  stats: DashboardStats;
  recent_activities: RecentActivityItem[];
  can_edit: boolean;
}

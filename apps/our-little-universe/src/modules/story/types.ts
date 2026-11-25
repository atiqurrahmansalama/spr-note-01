import type { UniverseMediaAsset } from '../../types';

export type StoryEntryType = 'timeline' | 'first';

export type StoryColorToken = 'accent' | 'purple' | 'emerald' | 'amber' | 'sky';

export type StoryIconKey =
  | 'heart'
  | 'sparkles'
  | 'calendar'
  | 'map-pin'
  | 'music'
  | 'book'
  | 'camera'
  | 'gift'
  | 'stars'
  | 'flower';

export interface StoryFactItem {
  id: string;
  label: string;
  value: string;
  category: string;
  icon_name: StoryIconKey | string;
}

export interface StoryProfile {
  id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_badge: string;
  couple_names: string;
  relationship_start_date: string | null;
  meeting_place: string;
  our_song_title: string;
  signature_quote: string;
  beginning_eyebrow: string;
  beginning_story: string;
  beginning_asset_id: string | null;
  beginning_url: string | null;
  cover_asset_id: string | null;
  cover_url: string | null;
  profile_facts: StoryFactItem[];
  updated_at: string;
}

export interface StoryChapter {
  id: string;
  chapter_number: number;
  title: string;
  subtitle: string;
  summary: string;
  cover_asset_id: string | null;
  cover_url: string | null;
  accent_token: StoryColorToken | string;
  is_published: boolean;
  is_locked: boolean;
  surprise_title: string;
  surprise_message: string;
  surprise_stars: number;
  surprise_revealed?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoryMilestone {
  id: string;
  chapter_id: string | null;
  entry_type: StoryEntryType;
  event_date: string;
  title: string;
  subtitle: string;
  badge: string;
  location: string;
  description: string;
  icon_name: StoryIconKey | string;
  color_token: StoryColorToken | string;
  photo_asset_id: string | null;
  photo_url: string | null;
  audio_asset_id: string | null;
  audio_url: string | null;
  is_favorite: boolean;
  is_published: boolean;
  is_locked: boolean;
  surprise_note: string;
  surprise_stars: number;
  surprise_revealed?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoryComparison {
  id: string;
  title: string;
  caption: string;
  then_label: string;
  now_label: string;
  then_date: string;
  now_date: string;
  then_asset_id: string | null;
  then_url: string | null;
  now_asset_id: string | null;
  now_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SpecialDateCategory = 'anniversary' | 'first' | 'celebration' | 'milestone';

export interface StorySpecialDate {
  id: string;
  title: string;
  event_date: string;
  category: SpecialDateCategory;
  notes: string;
  repeats_yearly: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoryInteractionState {
  completed_chapter_ids: string[];
  unlocked_milestone_ids: string[];
}

export interface StoryHubPayload {
  profile: StoryProfile;
  chapters: StoryChapter[];
  milestones: StoryMilestone[];
  comparisons: StoryComparison[];
  special_dates: StorySpecialDate[];
  gallery_assets: UniverseMediaAsset[];
  audio_assets: UniverseMediaAsset[];
  interaction: StoryInteractionState;
  can_edit: boolean;
}

export interface StoryMilestoneFormPayload {
  chapter_id?: string | null;
  entry_type: StoryEntryType;
  event_date: string;
  title: string;
  subtitle?: string;
  badge?: string;
  location?: string;
  description?: string;
  icon_name: string;
  color_token: string;
  photo_asset_id?: string | null;
  audio_asset_id?: string | null;
  is_favorite?: boolean;
  is_published?: boolean;
  is_locked?: boolean;
  surprise_note?: string;
  surprise_stars?: number;
  sort_order?: number;
}

export interface StoryChapterFormPayload {
  chapter_number: number;
  title: string;
  subtitle?: string;
  summary?: string;
  cover_asset_id?: string | null;
  accent_token?: string;
  is_published?: boolean;
  is_locked?: boolean;
  surprise_title?: string;
  surprise_message?: string;
  surprise_stars?: number;
  sort_order?: number;
}

export interface StoryComparisonFormPayload {
  title: string;
  caption?: string;
  then_label?: string;
  now_label?: string;
  then_date?: string;
  now_date?: string;
  then_asset_id?: string | null;
  now_asset_id?: string | null;
  is_published?: boolean;
  sort_order?: number;
}

export interface StorySpecialDateFormPayload {
  title: string;
  event_date: string;
  category: SpecialDateCategory;
  notes?: string;
  repeats_yearly?: boolean;
  is_published?: boolean;
  sort_order?: number;
}

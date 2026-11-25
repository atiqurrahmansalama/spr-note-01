import React from 'react';
import {
  BookOpenIcon,
  CalendarIcon,
  FlowerIcon,
  GiftIcon,
  HeartIcon,
  ImageVaultIcon,
  LocationIcon,
  MusicNoteIcon,
  SparklesIcon,
  StarsIcon,
} from '../../../components/icons/UniverseIcons';
import type { StoryColorToken, StoryIconKey } from '../types';

export interface StoryIconOption {
  key: StoryIconKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STORY_ICON_OPTIONS: StoryIconOption[] = [
  { key: 'heart', label: 'Heart', icon: HeartIcon },
  { key: 'sparkles', label: 'Magic', icon: SparklesIcon },
  { key: 'calendar', label: 'Date', icon: CalendarIcon },
  { key: 'map-pin', label: 'Place', icon: LocationIcon },
  { key: 'music', label: 'Music', icon: MusicNoteIcon },
  { key: 'book', label: 'Chapter', icon: BookOpenIcon },
  { key: 'camera', label: 'Photo', icon: ImageVaultIcon },
  { key: 'gift', label: 'Gift', icon: GiftIcon },
  { key: 'stars', label: 'Stars', icon: StarsIcon },
  { key: 'flower', label: 'Bloom', icon: FlowerIcon },
];

export interface StoryColorStyleDef {
  id: StoryColorToken;
  label: string;
  solidBg: string;
  softBg: string;
  textColor: string;
  lineColor: string;
  solidText: string;
}

export const STORY_COLOR_TOKENS: Record<StoryColorToken, StoryColorStyleDef> = {
  accent: {
    id: 'accent',
    label: 'Theme Accent',
    solidBg: 'var(--accent-main)',
    softBg: 'var(--accent-soft)',
    textColor: 'var(--accent-main)',
    lineColor: 'color-mix(in srgb, var(--accent-main) 35%, transparent)',
    solidText: 'var(--accent-text)',
  },
  purple: {
    id: 'purple',
    label: 'Cosmic Violet',
    solidBg: 'var(--color-purple)',
    softBg: 'var(--color-purple-soft)',
    textColor: 'var(--color-purple-text)',
    lineColor: 'color-mix(in srgb, var(--color-purple) 35%, transparent)',
    solidText: 'var(--accent-text)',
  },
  emerald: {
    id: 'emerald',
    label: 'Garden Sage',
    solidBg: 'var(--color-success)',
    softBg: 'var(--color-success-soft)',
    textColor: 'var(--color-success-text)',
    lineColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
    solidText: 'var(--accent-text)',
  },
  amber: {
    id: 'amber',
    label: 'Golden Glow',
    solidBg: 'var(--color-warning)',
    softBg: 'var(--color-warning-soft)',
    textColor: 'var(--color-warning-text)',
    lineColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
    solidText: 'var(--accent-text)',
  },
  sky: {
    id: 'sky',
    label: 'Starlight Sky',
    solidBg: 'var(--color-info)',
    softBg: 'var(--color-info-soft)',
    textColor: 'var(--color-info-text)',
    lineColor: 'color-mix(in srgb, var(--color-info) 35%, transparent)',
    solidText: 'var(--accent-text)',
  },
};

export function resolveStoryIcon(iconName?: string | null): React.ComponentType<{ className?: string }> {
  const match = STORY_ICON_OPTIONS.find((item) => item.key === iconName);
  return match ? match.icon : HeartIcon;
}

export function resolveStoryColorStyle(token?: string | null): StoryColorStyleDef {
  if (token && token in STORY_COLOR_TOKENS) {
    return STORY_COLOR_TOKENS[token as StoryColorToken];
  }
  return STORY_COLOR_TOKENS.accent;
}

export function computeDaysTogether(startDateStr?: string | null): number | null {
  if (!startDateStr) return null;
  const start = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export interface JourneyBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

/**
 * Pure domain resolver computing live calendar-aware breakdown since relationship start date.
 */
export function computeJourneyBreakdown(
  startDateStr?: string | null,
  now: Date = new Date()
): JourneyBreakdown | null {
  if (!startDateStr) return null;
  const start = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const effectiveNow = now.getTime() < start.getTime() ? start : now;
  const totalDays = Math.max(
    1,
    Math.floor((effectiveNow.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  let years = effectiveNow.getFullYear() - start.getFullYear();
  let months = effectiveNow.getMonth() - start.getMonth();
  let days = effectiveNow.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(
      effectiveNow.getFullYear(),
      effectiveNow.getMonth(),
      0
    ).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: effectiveNow.getHours(),
    minutes: effectiveNow.getMinutes(),
    seconds: effectiveNow.getSeconds(),
    totalDays,
  };
}

export interface SpecialDateCountdown {
  isToday: boolean;
  daysAway: number | null;
  daysSince: number | null;
}

/**
 * Computes live celebration / anniversary countdown relative to local midnight.
 */
export function computeDaysToSpecialDate(
  eventDateStr?: string | null,
  repeatsYearly: boolean = true,
  todayRef: Date = new Date()
): SpecialDateCountdown {
  if (!eventDateStr) return { isToday: false, daysAway: null, daysSince: null };
  const parsed = new Date(`${eventDateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { isToday: false, daysAway: null, daysSince: null };

  const today = new Date(todayRef.getFullYear(), todayRef.getMonth(), todayRef.getDate());
  const eventDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;

  if (!repeatsYearly) {
    const diff = Math.round((eventDay.getTime() - today.getTime()) / msPerDay);
    if (diff === 0) return { isToday: true, daysAway: 0, daysSince: 0 };
    if (diff > 0) return { isToday: false, daysAway: diff, daysSince: null };
    return { isToday: false, daysAway: null, daysSince: Math.abs(diff) };
  }

  let nextOccurrence = new Date(today.getFullYear(), parsed.getMonth(), parsed.getDate());
  if (nextOccurrence.getTime() === today.getTime()) {
    return { isToday: true, daysAway: 0, daysSince: null };
  }
  if (nextOccurrence.getTime() < today.getTime()) {
    nextOccurrence = new Date(today.getFullYear() + 1, parsed.getMonth(), parsed.getDate());
  }
  const daysAway = Math.round((nextOccurrence.getTime() - today.getTime()) / msPerDay);
  return { isToday: false, daysAway, daysSince: null };
}

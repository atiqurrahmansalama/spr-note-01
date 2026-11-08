import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { HifzProgressData } from '../../types';
import { BookOpenIcon, CheckCircleIcon, SparklesIcon } from '../../../../components/ui/Icons';

export interface HifzQuranProgressWidgetProps {
  data?: HifzProgressData;
  title?: string;
  onOpenTracker?: () => void;
  className?: string;
}

export default function HifzQuranProgressWidget({
  data,
  title,
  onOpenTracker,
  className = '',
}: HifzQuranProgressWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  // Default visual snapshot if live data is not yet supplied
  const progress: HifzProgressData = data || {
    studentName: 'Muhammad Abdullah',
    currentJuz: 18,
    completedJuz: 17,
    currentSurah: 'Surah Al-Kahf',
    currentAyah: 46,
    sabaq: 'Surah Al-Kahf (Ayah 32-46)',
    sabaqStatus: 'EXCELLENT',
    sabqi: 'Juz 17 (Quarter 3 & 4)',
    dawr: 'Juz 5 & 6 (Full Review)',
    dailyMistakes: 1,
    dailyStucks: 0,
    lastExamScore: 98,
  };

  const completedPct = Math.round((progress.completedJuz / 30) * 100);

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs hover:shadow-md h-full flex flex-col justify-start space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <BookOpenIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold theme-text-primary leading-tight truncate">
              {title || t('hifzProgress', 'Hifz Quran Tracker')}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
              {progress.currentSurah} • Ayah {formatNumber(progress.currentAyah)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenTracker && (
            <button
              type="button"
              onClick={onOpenTracker}
              className="px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-primary transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{t('viewReport', 'Tracker')}</span>
              <span className="text-[10px]">→</span>
            </button>
          )}
        </div>
      </div>

      {/* 30-Juz Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold theme-text-secondary">
            {t('hifzCompletion', 'Completed Juz')}: <span className="theme-text-primary font-bold">{formatNumber(progress.completedJuz)} / 30</span>
          </span>
          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
            {formatNumber(completedPct)}%
          </span>
        </div>

        <div className="h-2.5 rounded-full overflow-hidden bg-zinc-800/15">
          <div
            style={{ width: `${completedPct}%` }}
            className="h-full bg-purple-500 rounded-full transition-all duration-500 shadow-xs"
          />
        </div>
      </div>

      {/* Sabaq, Sabqi, Dawr Tri-Pill Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {/* Sabaq */}
        <div className="p-2.5 rounded-xl theme-bg-sub/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Sabaq (New)
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Pass
            </span>
          </div>
          <p className="text-xs font-semibold theme-text-primary truncate">
            {progress.sabaq}
          </p>
        </div>

        {/* Sabqi */}
        <div className="p-2.5 rounded-xl theme-bg-sub/70 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            Sabqi (Recent)
          </span>
          <p className="text-xs font-semibold theme-text-primary truncate">
            {progress.sabqi}
          </p>
        </div>

        {/* Dawr */}
        <div className="p-2.5 rounded-xl theme-bg-sub/70 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
            Dawr (Review)
          </span>
          <p className="text-xs font-semibold theme-text-primary truncate">
            {progress.dawr}
          </p>
        </div>
      </div>

      {/* Mistakes & Stucks Counter */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl theme-bg-sub/40 text-xs">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
          <span className="theme-text-secondary font-medium">Daily Mistakes / Stucks:</span>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {formatNumber(progress.dailyMistakes)} M
          </span>
          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {formatNumber(progress.dailyStucks)} S
          </span>
        </div>
      </div>
    </div>
  );
}


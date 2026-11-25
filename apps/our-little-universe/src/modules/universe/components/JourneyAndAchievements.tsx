import React from 'react';
import { ProgressBar } from '@repo/ui';
import {
  AwardIcon,
  CheckCircleIcon,
  ClockIcon,
  CompassIcon,
  SparklesIcon,
  TrophyIcon,
} from '../../../components/icons/UniverseIcons';
import { getModuleIconComponent } from '../../../core/navigation/moduleIcons';
import type { AchievementItem, DashboardStats, RecentActivityItem } from '../types';
import { useUniverseTranslation } from '../locales';

export interface JourneyAndAchievementsProps {
  stats: DashboardStats;
  achievements: AchievementItem[];
  activities: RecentActivityItem[];
}

/**
 * LD-05 (Progress Tracker), LD-06 (Achievement System) & LD-08 (Recent Activities).
 */
export const JourneyAndAchievements: React.FC<JourneyAndAchievementsProps> = ({
  stats,
  achievements,
  activities,
}) => {
  const { t, formatNumber, formatDate } = useUniverseTranslation();

  const discoveryPercent =
    stats.unlocked_worlds > 0
      ? Math.round((stats.explored_worlds / stats.unlocked_worlds) * 100)
      : 100;

  return (
    <div className="@container space-y-6">
      {/* LD-05 Progress Tracker + LD-08 Recent Activities */}
      <div className="grid grid-cols-1 @[760px]:grid-cols-2 gap-6">
        <div className="rounded-3xl theme-bg-surface border-0 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <CompassIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                {t('journey.title', 'Our Journey Progress')}
              </h3>
              <p className="text-xs theme-text-secondary">
                {t('journey.subtitle', 'Synced automatically across every device.')}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl theme-bg-app space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="theme-text-primary">
                {t('journey.progressLabel', 'Universe Discovery')}
              </span>
              <span className="theme-accent font-mono">{formatNumber(discoveryPercent)}%</span>
            </div>
            <ProgressBar value={discoveryPercent} size="sm" />
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl theme-bg-app space-y-1">
              <div className="text-base font-black theme-text-primary font-mono">
                {formatNumber(stats.explored_worlds)}/{formatNumber(stats.unlocked_worlds)}
              </div>
              <div className="text-[10px] theme-text-secondary">
                {t('journey.worldsExplored', 'Worlds Explored')}
              </div>
            </div>
            <div className="p-3 rounded-2xl theme-bg-app space-y-1">
              <div className="text-base font-black theme-accent font-mono">
                {formatNumber(stats.story_chapters)}
              </div>
              <div className="text-[10px] theme-text-secondary">
                {t('journey.storyChapters', 'Story Chapters')}
              </div>
            </div>
            <div className="p-3 rounded-2xl theme-bg-app space-y-1">
              <div className="text-base font-black theme-text-primary font-mono">
                {formatNumber(stats.private_media_count)}
              </div>
              <div className="text-[10px] theme-text-secondary">
                {t('journey.privateVault', 'Keepsakes')}
              </div>
            </div>
          </div>
        </div>

        {/* LD-08 Recent Activities */}
        <div className="rounded-3xl theme-bg-surface border-0 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                {t('activities.title', 'Recent Activities')}
              </h3>
              <p className="text-xs theme-text-secondary">
                {t('activities.subtitle', 'Latest moments recorded across your private universe.')}
              </p>
            </div>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs theme-text-secondary py-6 text-center">
              {t('activities.empty', 'Your activity trail will appear here as you explore.')}
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-2xl theme-bg-app flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SparklesIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                    <span className="text-xs font-medium theme-text-primary truncate">
                      {act.label}
                    </span>
                  </div>
                  <span className="text-[10px] theme-text-secondary font-mono shrink-0">
                    {formatDate(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LD-06 Achievement System */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <TrophyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                {t('achievements.title', 'Achievement System')}
              </h3>
              <p className="text-xs theme-text-secondary">
                {t('achievements.subtitle', 'Milestones & luminous badges earned along the way.')}
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full theme-bg-accent-soft theme-accent font-mono">
            {formatNumber(stats.achievements_unlocked)} / {formatNumber(stats.achievements_total)}
          </span>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-3 gap-3.5">
          {achievements.map((ach) => {
            const IconComp =
              ach.icon_name === 'award' ? AwardIcon : getModuleIconComponent(ach.icon_name);
            const isUnlocked = Boolean(ach.unlocked);
            return (
              <div
                key={ach.achievement_key}
                className={`p-4 rounded-2xl flex flex-col justify-between gap-3 border-0 ${
                  isUnlocked
                    ? 'bg-[var(--accent-main)]/12 dark:bg-[var(--accent-main)]/20'
                    : 'theme-bg-app opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? 'theme-bg-accent theme-accent-text'
                        : 'theme-bg-surface theme-text-secondary'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isUnlocked
                        ? 'theme-bg-success-soft theme-success'
                        : 'theme-bg-surface theme-text-secondary'
                    }`}
                  >
                    {isUnlocked && <CheckCircleIcon className="w-3 h-3" />}
                    <span>
                      {isUnlocked
                        ? t('achievements.unlockedStatus', 'Unlocked')
                        : t('achievements.lockedStatus', 'In Progress')}
                    </span>
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold theme-text-primary">{ach.title}</h4>
                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold theme-text-secondary pt-1">
                  <span>{ach.badge_label}</span>
                  <span className="theme-accent font-mono">
                    +{formatNumber(ach.points)} {t('achievements.pointsUnit', 'Stars')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JourneyAndAchievements;

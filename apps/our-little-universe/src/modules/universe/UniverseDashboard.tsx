import React, { Suspense, lazy } from 'react';
import { RefreshIcon } from '../../components/icons/UniverseIcons';
import { useUniverseDashboard } from './hooks/useUniverseDashboard';
import { useUniverseTranslation } from './locales';
import { DailySurpriseHero } from './components/DailySurpriseHero';
import { FortunaWorldCardsGrid } from './components/FortunaWorldCardsGrid';
import { JourneyAndAchievements } from './components/JourneyAndAchievements';

const HolographicUniverseStage = lazy(() => import('./components/HolographicUniverseStage'));

/**
 * Module 03 — Love Universe Dashboard.
 * Opens directly into edge-to-edge Fullscreen 3D Space free of HUD box clutter;
 * when minimized, reveals Daily Surprise, Clean Astronomical World Cards,
 * Journey Discovery Progress, Recent Activities, and Achievement Medallions.
 */
export const UniverseDashboard: React.FC = () => {
  const { t } = useUniverseTranslation();
  const { data, loading, claiming, claimSurprise } = useUniverseDashboard();

  if (loading && !data) {
    return (
      <div className="max-w-7xl w-full mx-auto p-6 sm:p-10 py-24 text-center theme-text-secondary flex flex-col items-center gap-3">
        <RefreshIcon className="w-7 h-7 theme-accent animate-spin" />
        <span className="text-xs font-medium">{t('loading', 'Mapping our universe...')}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="@container max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 space-y-8">
      {/* 1. Fullscreen-First 3D Holographic Planetary Universe */}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 w-screen h-screen theme-bg-app flex flex-col items-center justify-center gap-3 theme-text-secondary">
            <RefreshIcon className="w-7 h-7 theme-accent animate-spin" />
            <span className="text-xs font-medium">{t('loading', 'Mapping our universe...')}</span>
          </div>
        }
      >
        <HolographicUniverseStage
          modules={data.modules}
          visitedKeys={data.progress.unlocked_modules || []}
          isOwner={data.can_edit}
        />
      </Suspense>

      {/* 2. Daily Surprise Hero + Featured Spotlight */}
      <DailySurpriseHero
        space={data.space}
        surprise={data.daily_surprise}
        claiming={claiming}
        onClaim={claimSurprise}
      />

      {/* 3. Clean Astronomical Moon/Planet World Cards */}
      <FortunaWorldCardsGrid
        modules={data.modules}
        visitedKeys={data.progress.unlocked_modules || []}
        isOwner={data.can_edit}
      />

      {/* 4. Progress Tracker, Recent Activities & Achievement Medallions */}
      <JourneyAndAchievements
        stats={data.stats}
        achievements={data.achievements}
        activities={data.recent_activities}
      />
    </div>
  );
};

export default UniverseDashboard;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomButton, useToast } from '@repo/ui';
import {
  ArrowRightIcon,
  CheckIcon,
  GiftIcon,
  SparklesIcon,
} from '../../../components/icons/UniverseIcons';
import type { UniverseSpaceConfig } from '../../../types';
import type { DailySurpriseState } from '../types';
import { useUniverseTranslation } from '../locales';

export interface DailySurpriseHeroProps {
  space: UniverseSpaceConfig;
  surprise: DailySurpriseState;
  claiming: boolean;
  onClaim: () => Promise<void>;
}

/**
 * Fortuna Top Section (Image 2): Wide cosmic artwork hero for Daily Surprise
 * paired with the Owner-configured Featured Spotlight portal card.
 */
export const DailySurpriseHero: React.FC<DailySurpriseHeroProps> = ({
  space,
  surprise,
  claiming,
  onClaim,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, formatNumber } = useUniverseTranslation();

  const item = surprise.item;

  const handleOpen = async () => {
    try {
      await onClaim();
      showToast(
        t('surprise.claimedToast', 'Daily Surprise opened! Stars added to your constellation.'),
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Unable to claim surprise.', 'error');
    }
  };

  return (
    <section className="@container grid grid-cols-1 @[880px]:grid-cols-[1.85fr_1fr] gap-5 items-stretch">
      {/* Left Wide Hero Banner — Fortuna Aesthetic with Custom Generated Cosmic Art */}
      <div className="relative overflow-hidden rounded-3xl theme-bg-surface border-0 shadow-lg min-h-[250px] flex flex-col justify-between p-6 @[640px]:p-8">
        <img
          src="/assets/worlds/daily-surprise.jpg"
          alt={t('surprise.title', 'Daily Surprise')}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
        {/* Theme-aware atmospheric gradient scrim preserving left headline contrast */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(95deg, color-mix(in srgb, var(--bg-surface) 94%, transparent) 0%, color-mix(in srgb, var(--bg-surface) 80%, transparent) 52%, color-mix(in srgb, var(--bg-surface) 22%, transparent) 100%)',
          }}
        />

        <div className="relative z-10 max-w-lg space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${
                surprise.claimed_today
                  ? 'theme-bg-success-soft theme-success'
                  : 'theme-bg-accent-soft theme-accent'
              }`}
            >
              {surprise.claimed_today ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                <GiftIcon className="w-3.5 h-3.5" />
              )}
              <span>
                {surprise.claimed_today
                  ? t('surprise.claimedBadge', 'Opened Today')
                  : t('surprise.title', 'Daily Surprise')}
              </span>
            </span>

            {item && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full theme-bg-app/85 theme-accent font-mono">
                <SparklesIcon className="w-3 h-3" />
                <span>
                  {t('surprise.rewardPrefix', '+')}
                  {formatNumber(item.reward_stars)} {t('surprise.starsUnit', 'Stars')}
                </span>
              </span>
            )}
          </div>

          {!item ? (
            <div className="space-y-2">
              <h3 className="text-xl @[640px]:text-2xl font-black tracking-tight theme-text-primary">
                {t('surprise.title', 'Daily Surprise')}
              </h3>
              <p className="text-xs @[640px]:text-sm theme-text-secondary">
                {t('surprise.empty', 'No daily surprises active yet.')}
              </p>
            </div>
          ) : surprise.claimed_today ? (
            <div className="space-y-3">
              <h3 className="text-xl @[640px]:text-2xl font-black tracking-tight theme-text-primary">
                {item.title}
              </h3>
              <p className="text-xs @[640px]:text-sm theme-text-secondary leading-relaxed">
                {item.message}
              </p>
              {item.action_route && item.action_route !== '/dashboard' && (
                <div className="pt-1">
                  <CustomButton
                    size="sm"
                    variant="primary"
                    iconRight={ArrowRightIcon}
                    onClick={() => navigate(item.action_route)}
                  >
                    {t('surprise.followAction', 'Visit Suggested World')}
                  </CustomButton>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xl @[640px]:text-2xl font-black tracking-tight theme-text-primary">
                {item.title}
              </h3>
              <p className="text-xs @[640px]:text-sm theme-text-secondary">
                {t('surprise.subtitle', 'A fresh gift or love note illuminated every day.')}
              </p>
              <div className="pt-1">
                <CustomButton
                  variant="primary"
                  size="md"
                  icon={GiftIcon}
                  loading={claiming}
                  loadingText={t('surprise.claiming', 'Opening...')}
                  onClick={handleOpen}
                >
                  {t('surprise.openButton', 'Open Today Surprise')}
                </CustomButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Featured Spotlight Card — Fortuna `Stellarium` Companion */}
      <div className="relative overflow-hidden rounded-3xl theme-bg-surface border-0 shadow-lg min-h-[250px] flex flex-col justify-between p-6">
        <img
          src="/assets/worlds/night-sky.jpg"
          alt={space.featured_title || 'Featured'}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none opacity-80"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 38%, transparent) 0%, color-mix(in srgb, var(--bg-surface) 95%, transparent) 92%)',
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full theme-bg-surface/85 theme-accent backdrop-blur-md">
            {space.featured_badge || 'Featured'}
          </span>
          <div className="w-8 h-8 rounded-full theme-bg-surface/85 theme-accent backdrop-blur-md flex items-center justify-center">
            <SparklesIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="relative z-10 space-y-3 pt-8">
          <div className="space-y-1">
            <h3 className="text-lg font-black theme-text-primary">
              {space.featured_title || t('home.openStory', 'Open Our Story')}
            </h3>
            <p className="text-xs theme-text-secondary line-clamp-2 leading-relaxed">
              {space.featured_subtitle || space.dashboard_message || space.subtitle}
            </p>
          </div>

          <CustomButton
            size="sm"
            variant="soft"
            fullWidth
            iconRight={ArrowRightIcon}
            onClick={() => navigate(space.featured_route || '/story')}
          >
            {t('home.featuredOpen', 'Open Highlight')}
          </CustomButton>
        </div>
      </div>
    </section>
  );
};

export default DailySurpriseHero;

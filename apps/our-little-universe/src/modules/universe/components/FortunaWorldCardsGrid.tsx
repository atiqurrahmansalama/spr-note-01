import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomButton, useToast } from '@repo/ui';
import {
  ArrowRightIcon,
  CheckIcon,
  CompassIcon,
  LockIcon,
} from '../../../components/icons/UniverseIcons';
import { getModuleIconComponent } from '../../../core/navigation/moduleIcons';
import type { UniverseModuleItem } from '../../../types';
import { useUniverseTranslation } from '../locales';

const WORLD_ARTWORK_PATHS: Record<string, string> = {
  story: '/assets/worlds/story.jpg',
  memories: '/assets/worlds/memories.jpg',
  letters: '/assets/worlds/letters.jpg',
  garden: '/assets/worlds/garden.jpg',
  games: '/assets/worlds/games.jpg',
  secrets: '/assets/worlds/secrets.jpg',
  dreams: '/assets/worlds/dreams.jpg',
  'night-sky': '/assets/worlds/night-sky.jpg',
  gifts: '/assets/worlds/daily-surprise.jpg',
};

export interface FortunaWorldCardsGridProps {
  modules: UniverseModuleItem[];
  visitedKeys: string[];
  isOwner: boolean;
}

/**
 * Fortuna Portrait Worlds Grid.
 * Rich vertical cosmic artwork cards with seamless bottom fade into semantic theme surfaces.
 */
export const FortunaWorldCardsGrid: React.FC<FortunaWorldCardsGridProps> = ({
  modules,
  visitedKeys,
  isOwner,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useUniverseTranslation();

  const worlds = modules.filter(
    (m) => m.module_key !== 'welcome' && m.module_key !== 'dashboard'
  );

  const handleOpen = (mod: UniverseModuleItem) => {
    if (!mod.is_enabled && !isOwner) {
      showToast(t('map.comingSoonToast', 'This world is coming soon in the next phase.'), 'info');
      return;
    }
    if (mod.is_locked && !isOwner) {
      showToast(
        t('map.lockedToast', 'This planet is sealed for now. Ask the Universe Owner to unlock it.'),
        'warning'
      );
      return;
    }
    navigate(mod.route_path);
  };

  return (
    <section className="@container space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <CompassIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold theme-text-primary">
              {t('map.hudWorldsHeading', 'Explore Realms & Worlds')}
            </h2>
            <p className="text-xs theme-text-secondary">
              {t('map.hudWorldsSub', 'Curated destinations illuminated across our shared cosmos.')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-4 gap-4">
        {worlds.map((mod) => {
          const artwork = WORLD_ARTWORK_PATHS[mod.module_key] || '/assets/worlds/night-sky.jpg';
          const IconComp = getModuleIconComponent(mod.icon_name);
          const isComingSoon = !mod.is_enabled;
          const isLocked = mod.is_locked && !isOwner;
          const isVisited = visitedKeys.includes(mod.module_key);
          const canEnter = isOwner || (mod.is_enabled && !mod.is_locked);

          const planetName = t(`map.planets.${mod.module_key}.name`, mod.title);
          const planetTagline = t(`map.planets.${mod.module_key}.tagline`, mod.subtitle);

          return (
            <div
              key={mod.id}
              onClick={() => handleOpen(mod)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen(mod);
                }
              }}
              className={`group relative overflow-hidden rounded-3xl theme-bg-surface border-0 shadow-md min-h-[290px] flex flex-col justify-between p-5 cursor-pointer transition-transform duration-300 hover:-translate-y-1 ${
                !canEnter ? 'opacity-75' : ''
              }`}
            >
              <img
                src={artwork}
                alt={planetName}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 12%, transparent) 0%, color-mix(in srgb, var(--bg-surface) 65%, transparent) 52%, color-mix(in srgb, var(--bg-surface) 97%, transparent) 84%)',
                }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-xl theme-bg-surface/80 backdrop-blur-md theme-accent flex items-center justify-center shrink-0">
                  <IconComp className="w-4 h-4" />
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full theme-bg-surface/85 backdrop-blur-md theme-text-primary">
                  {isVisited && canEnter && <CheckIcon className="w-3 h-3 theme-accent" />}
                  {!canEnter && <LockIcon className="w-3 h-3 theme-text-secondary" />}
                  <span>
                    {isComingSoon
                      ? t('map.comingSoonLabel', 'Coming Soon')
                      : isLocked
                        ? t('map.lockedLabel', 'Locked')
                        : isVisited
                          ? t('map.exploredBadge', 'Explored')
                          : mod.badge_text || t('map.unlockedLabel', 'Unlocked')}
                  </span>
                </span>
              </div>

              <div className="relative z-10 space-y-3 pt-20">
                <div className="space-y-1">
                  <h3 className="text-base font-black theme-text-primary tracking-tight">
                    {planetName}
                  </h3>
                  <p className="text-xs theme-text-secondary line-clamp-2 leading-relaxed">
                    {planetTagline}
                  </p>
                </div>

                <CustomButton
                  size="xs"
                  fullWidth
                  variant={canEnter ? 'soft' : 'app'}
                  icon={!canEnter ? LockIcon : undefined}
                  iconRight={canEnter ? ArrowRightIcon : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen(mod);
                  }}
                >
                  {isComingSoon
                    ? t('map.comingSoonLabel', 'Coming Soon')
                    : isLocked
                      ? t('map.lockedLabel', 'Locked')
                      : t('map.enterPlanet', 'Enter World')}
                </CustomButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FortunaWorldCardsGrid;

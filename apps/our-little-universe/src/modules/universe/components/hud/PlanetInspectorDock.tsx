import React from 'react';
import { CustomButton } from '@repo/ui';
import {
  ArrowRightIcon,
  LockIcon,
  SparklesIcon,
} from '../../../../components/icons/UniverseIcons';
import type { PlanetNodeSpec } from '../../three/types';
import { useUniverseTranslation } from '../../locales';

export interface PlanetInspectorDockProps {
  planet: PlanetNodeSpec | null;
  onEnterPlanet: (moduleKey: string) => void;
}

/**
 * Bottom Floating Glass Dock displaying hovered/focused 3D planet metadata & direct portal trigger.
 */
export const PlanetInspectorDock: React.FC<PlanetInspectorDockProps> = ({
  planet,
  onEnterPlanet,
}) => {
  const { t } = useUniverseTranslation();

  if (!planet) {
    return (
      <div className="px-4 py-2 rounded-full theme-bg-surface/75 backdrop-blur-xl shadow-md text-[11px] font-medium theme-text-secondary text-center pointer-events-none">
        {t('map.hudHintDrag', 'Drag to orbit 3D space • Scroll to zoom • Click any planet')}
      </div>
    );
  }

  const statusLabel = !planet.isEnabled
    ? t('map.comingSoonLabel', 'Coming Soon')
    : !planet.canEnter
      ? t('map.lockedLabel', 'Locked')
      : planet.isVisited
        ? t('map.exploredBadge', 'Explored')
        : planet.badgeText || t('map.unlockedLabel', 'Unlocked');

  return (
    <div className="w-full max-w-lg px-4 py-2.5 rounded-2xl theme-bg-surface/85 backdrop-blur-xl shadow-xl flex items-center justify-between gap-3 border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
          <SparklesIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold theme-text-primary truncate">
              {planet.title}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-app theme-accent shrink-0">
              {statusLabel}
            </span>
          </div>
          <p className="text-[11px] theme-text-secondary truncate">{planet.tagline}</p>
        </div>
      </div>

      <CustomButton
        size="xs"
        variant={planet.canEnter ? 'primary' : 'soft'}
        icon={planet.canEnter ? undefined : LockIcon}
        iconRight={planet.canEnter ? ArrowRightIcon : undefined}
        onClick={() => onEnterPlanet(planet.moduleKey)}
        className="shrink-0"
      >
        {planet.canEnter ? t('map.enterPlanet', 'Enter World') : statusLabel}
      </CustomButton>
    </div>
  );
};

export default PlanetInspectorDock;

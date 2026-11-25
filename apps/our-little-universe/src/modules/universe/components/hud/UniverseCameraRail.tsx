import React from 'react';
import { IconButton } from '@repo/ui';
import {
  Cube3DIcon,
  GridCardsIcon,
  PauseIcon,
  PlayIcon,
  TargetFocusIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../../../../components/icons/UniverseIcons';
import { useUniverseTranslation } from '../../locales';

export interface UniverseCameraRailProps {
  viewMode: '3d' | 'cards';
  autoRotate: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onToggleAutoRotate: () => void;
  onToggleViewMode: (next: '3d' | 'cards') => void;
}

/**
 * Floating Camera & View Mode Control Rail inspired by Knowledge Universe's side action stack.
 */
export const UniverseCameraRail: React.FC<UniverseCameraRailProps> = ({
  viewMode,
  autoRotate,
  onZoomIn,
  onZoomOut,
  onResetCamera,
  onToggleAutoRotate,
  onToggleViewMode,
}) => {
  const { t } = useUniverseTranslation();

  return (
    <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl theme-bg-surface/80 backdrop-blur-xl shadow-lg border-0">
      {viewMode === '3d' && (
        <>
          <IconButton
            icon={ZoomInIcon}
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            title={t('map.hudZoomIn', 'Zoom In')}
            aria-label={t('map.hudZoomIn', 'Zoom In')}
          />
          <IconButton
            icon={ZoomOutIcon}
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            title={t('map.hudZoomOut', 'Zoom Out')}
            aria-label={t('map.hudZoomOut', 'Zoom Out')}
          />
          <IconButton
            icon={TargetFocusIcon}
            variant="ghost"
            size="sm"
            onClick={onResetCamera}
            title={t('map.hudResetCamera', 'Reset 3D View')}
            aria-label={t('map.hudResetCamera', 'Reset 3D View')}
          />
          <IconButton
            icon={autoRotate ? PauseIcon : PlayIcon}
            variant="ghost"
            size="sm"
            onClick={onToggleAutoRotate}
            title={
              autoRotate
                ? t('map.hudAutoOrbitOn', 'Auto-Orbit On')
                : t('map.hudAutoOrbitOff', 'Auto-Orbit Off')
            }
            aria-label={
              autoRotate
                ? t('map.hudAutoOrbitOn', 'Auto-Orbit On')
                : t('map.hudAutoOrbitOff', 'Auto-Orbit Off')
            }
          />
        </>
      )}

      <IconButton
        icon={viewMode === '3d' ? GridCardsIcon : Cube3DIcon}
        variant="accent-soft"
        size="sm"
        onClick={() => onToggleViewMode(viewMode === '3d' ? 'cards' : '3d')}
        title={
          viewMode === '3d'
            ? t('map.viewModeGrid', 'All Worlds')
            : t('map.viewModeMap', '3D Hologram Map')
        }
        aria-label={
          viewMode === '3d'
            ? t('map.viewModeGrid', 'All Worlds')
            : t('map.viewModeMap', '3D Hologram Map')
        }
      />
    </div>
  );
};

export default UniverseCameraRail;

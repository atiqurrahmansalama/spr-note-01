import React from 'react';
import { CustomButton } from '@repo/ui';
import {
  ArrowRightIcon,
  HeartIcon,
  SparklesIcon,
  StarsIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from '../../../components/icons/UniverseIcons';
import { useWelcomeTranslation } from '../locales';
import type { UniverseSpaceConfig } from '../../../types';

export interface SecretLandingStageProps {
  space: UniverseSpaceConfig | null;
  isPlaying: boolean;
  shouldAnimate: boolean;
  onToggleSound: () => void;
  onUnseal: () => void;
}

/**
 * EW-01 — Secret Landing Doorway.
 * Mysterious editorial invitation portal using strictly @repo/theme semantic tokens
 * and @repo/ui controls before revealing the personalized greeting.
 */
export const SecretLandingStage: React.FC<SecretLandingStageProps> = ({
  space,
  isPlaying,
  shouldAnimate,
  onToggleSound,
  onUnseal,
}) => {
  const { t } = useWelcomeTranslation();

  return (
    <div className="@container flex-1 flex flex-col items-center justify-center p-4 @[520px]:p-8 text-center">
      <div
        className={`max-w-xl w-full p-7 @[520px]:p-10 rounded-3xl theme-bg-surface/90 backdrop-blur-xl love-glow-card space-y-7 border-0 ${
          shouldAnimate ? 'animate-cosmic-reveal' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-accent-soft theme-accent text-[11px] font-bold tracking-wide">
            <StarsIcon className="w-3.5 h-3.5" />
            <span>{space?.landing_eyebrow || t('landingEyebrow', 'A Private Sanctuary Awaits')}</span>
          </div>

          <CustomButton
            size="xs"
            variant="app"
            onClick={onToggleSound}
            icon={isPlaying ? VolumeOnIcon : VolumeOffIcon}
          >
            {t('ambientSound', 'Ambient Sound')}
          </CustomButton>
        </div>

        {/* Wax-Seal / Celestial Emblem */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full theme-bg-accent-soft ${
              shouldAnimate ? 'animate-pulse' : ''
            }`}
          />
          <div
            className={`relative w-18 h-18 rounded-3xl theme-bg-accent theme-accent-text flex items-center justify-center shadow-lg ${
              shouldAnimate ? 'animate-cosmic-float' : ''
            }`}
          >
            <HeartIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-3">
          {space?.recipient_name && (
            <p className="text-xs font-bold uppercase tracking-[0.2em] theme-accent">
              {t('sealedFor', 'Sealed exclusively for')} {space.recipient_name}
            </p>
          )}

          <h1 className="text-2xl @[520px]:text-4xl font-black tracking-tight theme-text-primary leading-tight">
            {space?.title || t('landingFallbackTitle', 'Our Little Universe')}
          </h1>

          <p className="text-xs @[520px]:text-sm theme-text-secondary max-w-md mx-auto leading-relaxed">
            {space?.subtitle ||
              t(
                'landingWhisper',
                'Beyond this quiet doorway lies a private galaxy written only for us.'
              )}
          </p>
        </div>

        <div className="pt-2 flex flex-col items-center gap-3">
          <CustomButton
            type="button"
            variant="primary"
            size="lg"
            icon={SparklesIcon}
            iconRight={ArrowRightIcon}
            onClick={onUnseal}
            className="px-8 rounded-2xl"
          >
            {space?.landing_cta_label || t('unsealButton', 'Unseal Our Universe')}
          </CustomButton>

          <span className="text-[11px] theme-text-secondary">
            {t('landingHint', 'Tap to reveal your personalized welcome')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SecretLandingStage;

import React from 'react';
import { CustomButton } from '@repo/ui';
import { ArrowRightIcon, HeartIcon, SparklesIcon } from '../../../components/icons/UniverseIcons';
import { useWelcomeTranslation } from '../locales';

export interface WelcomeAnimationOverlayProps {
  visible: boolean;
  recipientName?: string;
  greeting?: string;
  onSkip: () => void;
}

/**
 * EW-03 — Cinematic Welcome Portal Transition.
 * Triggered only when Admin `welcome_animation_enabled` is true and OS Reduced Motion is off.
 */
export const WelcomeAnimationOverlay: React.FC<WelcomeAnimationOverlayProps> = ({
  visible,
  recipientName,
  greeting,
  onSkip,
}) => {
  const { t } = useWelcomeTranslation();

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center theme-bg-app/95 backdrop-blur-2xl"
    >
      <div className="relative flex items-center justify-center w-44 h-44 mb-6">
        <div className="absolute inset-0 rounded-full theme-bg-accent-soft animate-ping opacity-40" />
        <div
          className="absolute inset-4 rounded-full opacity-55"
          style={{ backgroundColor: 'var(--olu-glow)' }}
        />
        <div className="relative w-24 h-24 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-2xl animate-cosmic-float">
          <HeartIcon className="w-10 h-10" />
        </div>
      </div>

      <div className="space-y-2 max-w-md animate-cosmic-reveal">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-accent-soft theme-accent text-xs font-bold">
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>{t('portalOpening', 'Entering Your Little Universe')}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black theme-text-primary">
          {greeting || t('landingFallbackTitle', 'Welcome Home')}
        </h2>

        {recipientName && (
          <p className="text-xs sm:text-sm theme-text-secondary">
            {recipientName}
          </p>
        )}
      </div>

      <div className="pt-8">
        <CustomButton
          variant="ghost"
          size="sm"
          iconRight={ArrowRightIcon}
          onClick={onSkip}
        >
          {t('skipAnimation', 'Enter Now')}
        </CustomButton>
      </div>
    </div>
  );
};

export default WelcomeAnimationOverlay;

import React from 'react';
import { CustomButton, CustomInput } from '@repo/ui';
import {
  ArrowLeftNavIcon,
  ArrowRightIcon,
  HeartIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UnlockIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from '../../../components/icons/UniverseIcons';
import type { UniverseSpaceConfig } from '../../../types';
import { useWelcomeTranslation } from '../locales';
import { CountdownTimer } from './CountdownTimer';

export interface PersonalizedWelcomeStageProps {
  space: UniverseSpaceConfig | null;
  requiresPin: boolean;
  alreadyUnlocked: boolean;
  pin: string;
  showHint: boolean;
  submitting: boolean;
  errorMessage: string;
  isPlaying: boolean;
  shouldAnimate: boolean;
  onPinChange: (val: string) => void;
  onToggleHint: () => void;
  onToggleSound: () => void;
  onReplayLanding: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * EW-02, EW-04 & EW-05 — Personalized Welcome, Countdown & Experiential Secret PIN.
 * Note: Secret PIN is an experiential romantic seal, decoupled from main authentication.
 */
export const PersonalizedWelcomeStage: React.FC<PersonalizedWelcomeStageProps> = ({
  space,
  requiresPin,
  alreadyUnlocked,
  pin,
  showHint,
  submitting,
  errorMessage,
  isPlaying,
  shouldAnimate,
  onPinChange,
  onToggleHint,
  onToggleSound,
  onReplayLanding,
  onSubmit,
}) => {
  const { t } = useWelcomeTranslation();

  return (
    <div className="@container flex-1 flex flex-col items-center justify-center p-4 @[520px]:p-8 text-center">
      <div
        className={`max-w-lg w-full p-6 @[520px]:p-8 rounded-3xl theme-bg-surface/90 backdrop-blur-xl love-glow-card space-y-6 border-0 ${
          shouldAnimate ? 'animate-cosmic-reveal' : ''
        }`}
      >
        {/* Top Portal Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CustomButton
            size="xs"
            variant="ghost"
            icon={ArrowLeftNavIcon}
            onClick={onReplayLanding}
          >
            {t('backToDoorway', 'Secret Doorway')}
          </CustomButton>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full theme-bg-accent-soft theme-accent text-xs font-bold">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{t('portalBadge', 'Private Starlit Portal')}</span>
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
        </div>

        {/* Floating Heart Emblem */}
        <div
          className={`w-16 h-16 mx-auto rounded-3xl theme-bg-accent-soft theme-accent flex items-center justify-center shadow-md ${
            shouldAnimate ? 'animate-cosmic-float' : ''
          }`}
        >
          <HeartIcon className="w-8 h-8" />
        </div>

        {/* Personalized Greeting */}
        <div className="space-y-2">
          {space?.recipient_name && (
            <p className="text-xs font-semibold uppercase tracking-widest theme-accent">
              {t('greetingFor', 'Prepared exclusively for')} • {space.recipient_name}
            </p>
          )}
          <h1 className="text-2xl @[480px]:text-3xl font-extrabold tracking-tight theme-text-primary">
            {space?.welcome_greeting || 'Welcome to Our Little Universe'}
          </h1>
          <p className="text-xs @[480px]:text-sm theme-text-secondary leading-relaxed">
            {space?.welcome_subtitle || 'Every star is a memory. Every story is a piece of us.'}
          </p>
        </div>

        {/* EW-05 Live Special Date Countdown */}
        {space && (
          <CountdownTimer
            title={space.countdown_title || 'Countdown'}
            targetIso={space.special_date}
          />
        )}

        {/* EW-04 Optional Experiential Secret PIN */}
        <form onSubmit={onSubmit} className="space-y-4">
          {!alreadyUnlocked && requiresPin && (
            <div className="space-y-2 text-start">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold theme-text-primary flex items-center gap-1.5">
                  <LockClosedIcon className="w-3.5 h-3.5 theme-accent" />
                  <span>{t('pinLabel', 'Enter Secret PIN')}</span>
                </label>
                {space?.pin_hint && (
                  <CustomButton
                    size="xs"
                    variant="ghost"
                    onClick={onToggleHint}
                    className="theme-accent"
                  >
                    {showHint ? t('hideHint', 'Hide hint') : t('showHint', 'Need a hint?')}
                  </CustomButton>
                )}
              </div>

              {showHint && space?.pin_hint && (
                <div className="p-2.5 rounded-xl theme-bg-app text-xs theme-text-secondary">
                  {space.pin_hint}
                </div>
              )}

              <CustomInput
                type="password"
                variant="app"
                placeholder={t('pinPlaceholder', '••••')}
                value={pin}
                onChange={onPinChange}
                inputClassName="text-center font-mono tracking-[0.4em] text-lg"
              />
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl theme-bg-danger-soft theme-danger text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <CustomButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            loadingText={t('entering', 'Unlocking portal...')}
            icon={alreadyUnlocked ? UnlockIcon : undefined}
            iconRight={ArrowRightIcon}
          >
            {alreadyUnlocked
              ? t('continueButton', 'Continue to Dashboard')
              : t('enterButton', 'Enter Our Galaxy')}
          </CustomButton>
        </form>

        <div className="pt-1 text-[11px] theme-text-secondary flex items-center justify-center gap-1.5">
          <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent" />
          <span>{t('securityFooter', 'Private & Database-Persisted Sanctuary')}</span>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedWelcomeStage;

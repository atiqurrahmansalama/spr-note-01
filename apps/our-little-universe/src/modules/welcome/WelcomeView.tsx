import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useToast } from '@repo/ui';
import { ApiError } from '../../core/api/client';
import { useAuth } from '../../core/auth/AuthContext';
import { useMusicStore } from '../../stores/musicStore';
import { PersonalizedWelcomeStage } from './components/PersonalizedWelcomeStage';
import { SecretLandingStage } from './components/SecretLandingStage';
import { WelcomeAnimationOverlay } from './components/WelcomeAnimationOverlay';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useWelcomeTranslation } from './locales';

type EntranceStage = 'landing' | 'welcome';

/**
 * Module 02 — Entrance & Welcome Orchestrator.
 * Flow: Secret Landing (EW-01) -> Personalized Welcome + Countdown + Optional PIN (EW-02/04/05)
 * -> Cinematic Transition (EW-03) -> Love Universe Dashboard.
 */
export const WelcomeView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { space, progress, verifyPin, syncRouteProgress } = useAuth();
  const { isPlaying, togglePlay } = useMusicStore();
  const { showToast } = useToast();
  const { t } = useWelcomeTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();

  const alreadyUnlocked = Boolean(progress?.entry_unlocked);
  const requiresPin = Boolean(space?.pin_enabled && space?.has_pin_configured);
  const animationEnabled = space?.welcome_animation_enabled !== false;
  const shouldAnimate = animationEnabled && !prefersReducedMotion;

  const requestedStage = searchParams.get('stage');
  const [stage, setStage] = useState<EntranceStage>(() => {
    if (requestedStage === 'landing') return 'landing';
    return alreadyUnlocked ? 'welcome' : 'landing';
  });

  const [pin, setPin] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [enteringAnimation, setEnteringAnimation] = useState(false);
  const navTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (requestedStage === 'landing') {
      setStage('landing');
    }
  }, [requestedStage]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
    };
  }, []);

  const finishEntranceNavigation = async () => {
    if (navTimerRef.current !== null) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    setEnteringAnimation(false);
    await syncRouteProgress('/dashboard');
    navigate('/dashboard');
  };

  const celebrateAndEnter = async () => {
    if (!shouldAnimate) {
      await finishEntranceNavigation();
      return;
    }

    setEnteringAnimation(true);
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore confetti error in unsupported browsers
    }

    navTimerRef.current = window.setTimeout(() => {
      void finishEntranceNavigation();
    }, 3500);
  };

  const handleUnsealLanding = () => {
    setStage('welcome');
    if (searchParams.has('stage')) {
      const next = new URLSearchParams(searchParams);
      next.delete('stage');
      setSearchParams(next, { replace: true });
    }
  };

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (alreadyUnlocked) {
      await celebrateAndEnter();
      return;
    }

    if (requiresPin && !pin.trim()) {
      setErrorMessage(t('pinRequiredError', 'Please enter the secret PIN to continue.'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyPin(pin.trim());
      if (result.verified) {
        showToast(t('unlockedSuccess', 'Welcome home! Portal unlocked.'), 'success');
        await celebrateAndEnter();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : t('pinRequiredError', 'Incorrect secret PIN. Please try again.');
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {stage === 'landing' ? (
        <SecretLandingStage
          space={space}
          isPlaying={isPlaying}
          shouldAnimate={shouldAnimate}
          onToggleSound={togglePlay}
          onUnseal={handleUnsealLanding}
        />
      ) : (
        <PersonalizedWelcomeStage
          space={space}
          requiresPin={requiresPin}
          alreadyUnlocked={alreadyUnlocked}
          pin={pin}
          showHint={showHint}
          submitting={submitting}
          errorMessage={errorMessage}
          isPlaying={isPlaying}
          shouldAnimate={shouldAnimate}
          onPinChange={setPin}
          onToggleHint={() => setShowHint((v) => !v)}
          onToggleSound={togglePlay}
          onReplayLanding={() => setStage('landing')}
          onSubmit={handleEnter}
        />
      )}

      <WelcomeAnimationOverlay
        visible={enteringAnimation}
        recipientName={space?.recipient_name}
        greeting={space?.welcome_greeting}
        onSkip={() => {
          void finishEntranceNavigation();
        }}
      />
    </>
  );
};

export default WelcomeView;

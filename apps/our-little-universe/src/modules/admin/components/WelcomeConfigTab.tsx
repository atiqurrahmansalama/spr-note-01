import React, { useEffect, useState } from 'react';
import { CustomButton, CustomCheckbox, CustomInput, CustomSelect, useAppTheme, useToast } from '@repo/ui';
import { LOVE_THEME_PALETTES } from '../../../core/theme/loveThemes';
import type { UniverseSpaceConfig } from '../../../types';
import { useAdminTranslation } from '../locales';
import { CheckIcon, KeyIcon, SparklesIcon } from '../../../components/icons/UniverseIcons';

interface WelcomeConfigTabProps {
  space: UniverseSpaceConfig;
  onSave: (payload: Partial<UniverseSpaceConfig> & { new_secret_pin?: string }) => Promise<unknown>;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export const WelcomeConfigTab: React.FC<WelcomeConfigTabProps> = ({ space, onSave }) => {
  const { t } = useAdminTranslation();
  const { showToast } = useToast();
  const { setPaletteId } = useAppTheme();

  const [title, setTitle] = useState(space.title);
  const [subtitle, setSubtitle] = useState(space.subtitle);
  const [recipientName, setRecipientName] = useState(space.recipient_name);
  const [landingEyebrow, setLandingEyebrow] = useState(space.landing_eyebrow || 'A Private Sanctuary Awaits');
  const [landingCtaLabel, setLandingCtaLabel] = useState(space.landing_cta_label || 'Unseal Our Universe');
  const [welcomeGreeting, setWelcomeGreeting] = useState(space.welcome_greeting);
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(space.welcome_subtitle);
  const [welcomeAnimationEnabled, setWelcomeAnimationEnabled] = useState(
    space.welcome_animation_enabled !== false
  );
  const [countdownTitle, setCountdownTitle] = useState(space.countdown_title);
  const [specialDate, setSpecialDate] = useState(toDatetimeLocalValue(space.special_date));
  const [pinEnabled, setPinEnabled] = useState(space.pin_enabled);
  const [pinHint, setPinHint] = useState(space.pin_hint);
  const [newPin, setNewPin] = useState('');
  const [activeThemeId, setActiveThemeId] = useState(space.active_theme_id || 'velvet-rose');
  const [ambientTrackTitle, setAmbientTrackTitle] = useState(space.ambient_track_title);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(space.title);
    setSubtitle(space.subtitle);
    setRecipientName(space.recipient_name);
    setLandingEyebrow(space.landing_eyebrow || 'A Private Sanctuary Awaits');
    setLandingCtaLabel(space.landing_cta_label || 'Unseal Our Universe');
    setWelcomeGreeting(space.welcome_greeting);
    setWelcomeSubtitle(space.welcome_subtitle);
    setWelcomeAnimationEnabled(space.welcome_animation_enabled !== false);
    setCountdownTitle(space.countdown_title);
    setSpecialDate(toDatetimeLocalValue(space.special_date));
    setPinEnabled(space.pin_enabled);
    setPinHint(space.pin_hint);
    setActiveThemeId(space.active_theme_id || 'velvet-rose');
    setAmbientTrackTitle(space.ambient_track_title);
  }, [space]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isoSpecialDate = specialDate ? new Date(specialDate).toISOString() : null;
      await onSave({
        title,
        subtitle,
        recipient_name: recipientName,
        landing_eyebrow: landingEyebrow,
        landing_cta_label: landingCtaLabel,
        welcome_greeting: welcomeGreeting,
        welcome_subtitle: welcomeSubtitle,
        welcome_animation_enabled: welcomeAnimationEnabled,
        countdown_title: countdownTitle,
        special_date: isoSpecialDate,
        pin_enabled: pinEnabled,
        pin_hint: pinHint,
        active_theme_id: activeThemeId,
        ambient_track_title: ambientTrackTitle,
        ...(newPin.trim() ? { new_secret_pin: newPin.trim() } : {}),
      });
      setPaletteId(activeThemeId);
      setNewPin('');
      showToast(t('welcomeConfig.savedSuccess', 'Universe configuration saved.'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="@container rounded-3xl theme-bg-surface p-6 space-y-6 shadow-xs border-0">
      {/* Personalization & Countdown Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1">
          <SparklesIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-base font-bold theme-text-primary">
            {t('welcomeConfig.sectionTitle', 'Personalization & Countdown')}
          </h3>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            variant="app"
            label={t('welcomeConfig.spaceTitle', 'Universe Title')}
            value={title}
            onChange={(val: string) => setTitle(val)}
            required
          />
          <CustomInput
            variant="app"
            label={t('welcomeConfig.recipientName', 'Recipient Display Name')}
            value={recipientName}
            onChange={(val: string) => setRecipientName(val)}
            required
          />
        </div>

        <CustomInput
          variant="app"
          label={t('welcomeConfig.spaceSubtitle', 'Universe Subtitle')}
          value={subtitle}
          onChange={(val: string) => setSubtitle(val)}
        />

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            variant="app"
            label={t('welcomeConfig.landingEyebrow', 'Secret Landing Badge')}
            value={landingEyebrow}
            onChange={(val: string) => setLandingEyebrow(val)}
          />
          <CustomInput
            variant="app"
            label={t('welcomeConfig.landingCtaLabel', 'Secret Doorway Button Label')}
            value={landingCtaLabel}
            onChange={(val: string) => setLandingCtaLabel(val)}
          />
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            variant="app"
            label={t('welcomeConfig.greeting', 'Welcome Greeting')}
            value={welcomeGreeting}
            onChange={(val: string) => setWelcomeGreeting(val)}
            required
          />
          <CustomInput
            variant="app"
            label={t('welcomeConfig.ambientTrackTitle', 'Ambient Audio Title')}
            value={ambientTrackTitle}
            onChange={(val: string) => setAmbientTrackTitle(val)}
          />
        </div>

        <CustomInput
          type="textarea"
          variant="app"
          rows={2}
          label={t('welcomeConfig.greetingSubtitle', 'Welcome Subtitle')}
          value={welcomeSubtitle}
          onChange={(val: string) => setWelcomeSubtitle(val)}
        />

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            variant="app"
            label={t('welcomeConfig.countdownTitle', 'Countdown Heading')}
            value={countdownTitle}
            onChange={(val: string) => setCountdownTitle(val)}
          />
          <CustomInput
            type="datetime-local"
            variant="app"
            label={t('welcomeConfig.specialDate', 'Countdown Target Date & Time')}
            value={specialDate}
            onChange={(val: string) => setSpecialDate(val)}
          />
        </div>
      </div>

      {/* Security & Appearance Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-1">
          <KeyIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-base font-bold theme-text-primary">
            {t('welcomeConfig.securityTitle', 'Secret PIN & Appearance')}
          </h3>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl theme-bg-app">
            <CustomCheckbox
              checked={pinEnabled}
              onChange={(checked: boolean) => setPinEnabled(checked)}
              label={t('welcomeConfig.pinEnabled', 'Require Secret PIN on Entrance')}
            />
          </div>
          <div className="p-4 rounded-2xl theme-bg-app">
            <CustomCheckbox
              checked={welcomeAnimationEnabled}
              onChange={(checked: boolean) => setWelcomeAnimationEnabled(checked)}
              label={t('welcomeConfig.animationEnabled', 'Enable Entrance Welcome Animation')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            type="password"
            variant="app"
            label={t('welcomeConfig.newPin', 'Set / Rotate Secret PIN')}
            placeholder={t('welcomeConfig.newPinPlaceholder', 'Leave blank to keep existing PIN')}
            value={newPin}
            onChange={(val: string) => setNewPin(val)}
          />
          <CustomInput
            variant="app"
            label={t('welcomeConfig.pinHint', 'Optional PIN Hint')}
            value={pinHint}
            onChange={(val: string) => setPinHint(val)}
          />
        </div>

        <CustomSelect
          label={t('welcomeConfig.themePalette', 'Default Theme Palette')}
          value={activeThemeId}
          onChange={(val: string) => setActiveThemeId(val)}
          options={LOVE_THEME_PALETTES.map((p) => ({
            value: p.id,
            label: p.name,
            description: p.category,
          }))}
          showDescription
        />
      </div>

      <div className="flex justify-end pt-2">
        <CustomButton
          type="submit"
          variant="primary"
          loading={saving}
          loadingText={t('welcomeConfig.saving', 'Saving...')}
          icon={CheckIcon}
        >
          {t('welcomeConfig.saveChanges', 'Save Configuration')}
        </CustomButton>
      </div>
    </form>
  );
};

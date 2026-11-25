import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CustomButton,
  DrawerBanner,
  DrawerContainer,
  DrawerSection,
  ProgressBar,
  SegmentedSwitch,
  useAppI18n,
  useAppTheme,
  useDrawerRegistration,
  useRightSidebar,
  type AppThemeMode,
  type LanguageCode,
} from '@repo/ui';
import { useAuth } from '../../core/auth/AuthContext';
import { getModuleIconComponent } from '../../core/navigation/moduleIcons';
import { useSyncLoveTheme } from '../../core/theme/useSyncLoveTheme';
import { useMusicStore } from '../../stores/musicStore';
import { useUniverseStore } from '../../stores/universeStore';
import {
  AppearanceIcon,
  CheckIcon,
  HeartIcon,
  LanguagesIcon,
  LockIcon,
  MusicNoteIcon,
  SparklesIcon,
} from '../icons/UniverseIcons';

export const UNIVERSE_PULSE_DRAWER_KEY = 'universe-pulse';

const UniversePulseDrawerBody: React.FC = () => {
  const navigate = useNavigate();
  const { user, space, modules, progress } = useAuth();
  const { mode, setMode } = useAppTheme();
  const { paletteId, palettes, selectLoveTheme } = useSyncLoveTheme();
  const { language, setLanguage, supportedLanguages, formatNumber, t } = useAppI18n('foundation');
  const { isPlaying, togglePlay, tracks, currentTrackIndex } = useMusicStore();
  const { collectedStars } = useUniverseStore();
  const currentTrack = tracks[currentTrackIndex];

  const enabledModules = modules.filter((m) => m.is_enabled);
  const unlockedModules = enabledModules.filter((m) => !m.is_locked);
  const progressPercent =
    enabledModules.length > 0 ? Math.round((unlockedModules.length / enabledModules.length) * 100) : 100;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <DrawerBanner
        icon={HeartIcon}
        title={user?.name || user?.email}
        subtitle={space?.subtitle || t('brandSubtitle', 'A private galaxy of memories & stories')}
        badge={
          user?.role === 'OWNER'
            ? t('roleOwner', 'Owner')
            : progress?.entry_unlocked
              ? t('entryUnlockedBadge', 'Entry Unlocked')
              : t('roleRecipient', 'Recipient')
        }
        actions={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full theme-bg-accent-soft theme-accent text-xs font-bold">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>{formatNumber(collectedStars)}</span>
          </div>
        }
      />

      {/* Love Atmosphere Theme Picker (Container-responsive, zero borders) */}
      <DrawerSection
        title={t('loveAtmosphere', 'Love Atmosphere')}
        subtitle={t('chooseLoveTheme', 'Choose Love Theme')}
        icon={AppearanceIcon}
      >
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5">
          {palettes.map((palette) => {
            const isSelected = palette.id === paletteId;
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => selectLoveTheme(palette.id)}
                className={`p-3 rounded-2xl text-start transition-all duration-150 cursor-pointer border-0 ring-0 flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                    : 'theme-bg-app hover:theme-bg-elevated/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-5 h-5 rounded-full shrink-0 shadow-xs border-0"
                    style={{ backgroundColor: palette.accentColor }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold theme-text-primary truncate">{palette.name}</div>
                    <div className="text-[10px] theme-text-secondary truncate">{palette.category}</div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </DrawerSection>

      {/* Mode & Display Language Pairing */}
      <DrawerSection
        title={t('displayPreferences', 'Display & Sound')}
        icon={LanguagesIcon}
      >
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl theme-bg-app space-y-2 border-0">
            <div className="text-[11px] font-semibold theme-text-secondary">
              {t('appearanceMode', 'Appearance Mode')}
            </div>
            <SegmentedSwitch
              size="sm"
              value={mode}
              onChange={(val: string) => setMode(val as AppThemeMode)}
              options={[
                { value: 'light', label: t('modeLight', 'Light') },
                { value: 'dark', label: t('modeDark', 'Dark') },
                { value: 'system', label: t('modeSystem', 'Auto') },
              ]}
            />
          </div>

          <div className="p-3 rounded-2xl theme-bg-app space-y-2 border-0">
            <div className="text-[11px] font-semibold theme-text-secondary">
              {t('displayLanguage', 'Display Language')}
            </div>
            <SegmentedSwitch
              size="sm"
              value={language}
              onChange={(val: string) => setLanguage(val as LanguageCode)}
              options={supportedLanguages.map((lang) => ({
                value: lang.code,
                label: lang.nativeName,
              }))}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl theme-bg-app flex items-center justify-between gap-3 border-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <MusicNoteIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold theme-text-primary truncate">
                {space?.ambient_track_title || currentTrack?.title || t('ambientMusic', 'Ambient Music')}
              </div>
              <div className="text-[11px] theme-text-secondary">
                {isPlaying ? t('playing', 'PLAYING') : t('paused', 'PAUSED')}
              </div>
            </div>
          </div>
          <CustomButton size="xs" variant={isPlaying ? 'primary' : 'soft'} onClick={togglePlay}>
            {isPlaying ? t('pauseBtn', 'Pause') : t('playBtn', 'Play')}
          </CustomButton>
        </div>
      </DrawerSection>

      {/* Universe Progress & Quick Jump */}
      <DrawerSection
        title={t('universeProgress', 'Universe Chapters')}
        badge={`${formatNumber(unlockedModules.length)} / ${formatNumber(enabledModules.length)}`}
        icon={SparklesIcon}
      >
        <ProgressBar value={progressPercent} size="sm" />
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2 pt-1">
          {enabledModules.map((mod) => {
            const ModIcon = getModuleIconComponent(mod.icon_name);
            const isLockedForUser = Boolean(mod.is_locked && user?.role !== 'OWNER');
            return (
              <button
                key={mod.id}
                type="button"
                disabled={isLockedForUser}
                onClick={() => navigate(mod.route_path)}
                className={`p-2.5 rounded-2xl theme-bg-app flex items-center justify-between gap-2 text-start border-0 transition-colors ${
                  isLockedForUser
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:theme-bg-elevated/50 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                    <ModIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold theme-text-primary truncate">{mod.title}</div>
                    {mod.badge_text && (
                      <div className="text-[10px] theme-text-secondary truncate">{mod.badge_text}</div>
                    )}
                  </div>
                </div>
                {isLockedForUser && <LockIcon className="w-3.5 h-3.5 theme-text-secondary shrink-0" />}
              </button>
            );
          })}
        </div>
      </DrawerSection>
    </DrawerContainer>
  );
};

export function useUniversePulseDrawerRegistration() {
  const { openDrawer, closeDrawer, isRightSidebarOpen, rightSidebarConfig } = useRightSidebar();
  const { t } = useAppI18n('foundation');

  useDrawerRegistration(
    UNIVERSE_PULSE_DRAWER_KEY,
    () => ({
      title: t('openQuickDrawer', 'Atmosphere & Quick Panel'),
      subtitle: t('brandSubtitle', 'A private galaxy of memories & stories'),
      category: t('liveBadge', 'Live'),
      icon: HeartIcon,
      size: 'md',
      content: <UniversePulseDrawerBody />,
    }),
    [t]
  );

  const togglePulseDrawer = useCallback(() => {
    if (isRightSidebarOpen && rightSidebarConfig?.drawerKey === UNIVERSE_PULSE_DRAWER_KEY) {
      closeDrawer();
    } else {
      openDrawer(UNIVERSE_PULSE_DRAWER_KEY);
    }
  }, [closeDrawer, isRightSidebarOpen, openDrawer, rightSidebarConfig?.drawerKey]);

  const openPulseDrawer = useCallback(() => {
    openDrawer(UNIVERSE_PULSE_DRAWER_KEY);
  }, [openDrawer]);

  return { togglePulseDrawer, openPulseDrawer };
}

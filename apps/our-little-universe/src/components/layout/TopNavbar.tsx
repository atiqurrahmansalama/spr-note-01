import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActionMenu,
  CustomButton,
  IconButton,
  useAppI18n,
  useAppTheme,
  type ActionMenuItem,
} from '@repo/ui';
import { useAuth } from '../../core/auth/AuthContext';
import { useSyncLoveTheme } from '../../core/theme/useSyncLoveTheme';
import { useMusicStore } from '../../stores/musicStore';
import { useUniverseStore } from '../../stores/universeStore';
import {
  AppearanceIcon,
  CheckIcon,
  GlobeIcon,
  HeartIcon,
  LanguagesIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  MusicNoteIcon,
  ShieldIcon,
  SidebarRightIcon,
  SparklesIcon,
  SunIcon,
  SystemModeIcon,
} from '../icons/UniverseIcons';

export interface TopNavbarProps {
  onToggleSidebar?: () => void;
  onToggleRightDrawer?: () => void;
  isRightDrawerOpen?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onToggleRightDrawer,
  isRightDrawerOpen = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, space, logout, progress } = useAuth();
  const canNavigateUniverse = Boolean(
    isAuthenticated &&
      location.pathname !== '/login' &&
      (user?.role === 'OWNER' || progress?.entry_unlocked)
  );
  const { collectedStars } = useUniverseStore();
  const { isPlaying, togglePlay, tracks, currentTrackIndex } = useMusicStore();
  const { mode, setMode } = useAppTheme();
  const { paletteId, palettes, selectLoveTheme } = useSyncLoveTheme();
  const { language, config, setLanguage, supportedLanguages, formatNumber, t } =
    useAppI18n('foundation');

  const currentTrack = tracks[currentTrackIndex];
  const isLoginRoute = location.pathname === '/login';

  const cycleThemeMode = () => {
    const next = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark';
    setMode(next);
  };

  const ModeIcon = mode === 'dark' ? MoonIcon : mode === 'light' ? SunIcon : SystemModeIcon;

  const languageMenuItems = useMemo<ActionMenuItem[]>(
    () =>
      supportedLanguages.map((lang) => {
        const isActive = lang.code === language;
        return {
          label: lang.nativeName,
          title: `${lang.nativeName} (${lang.name})`,
          icon: isActive ? CheckIcon : GlobeIcon,
          badge: lang.code.toUpperCase(),
          badgeClassName: isActive ? 'theme-accent font-bold' : 'theme-text-secondary',
          onClick: () => setLanguage(lang.code),
        };
      }),
    [supportedLanguages, language, setLanguage]
  );

  const loveThemeItems = useMemo<ActionMenuItem[]>(
    () =>
      palettes.map((p) => {
        const isActive = p.id === paletteId;
        return {
          label: p.name,
          subtitle: p.category,
          icon: isActive ? CheckIcon : HeartIcon,
          iconClassName: isActive ? 'theme-accent' : 'theme-text-secondary',
          badge: p.category.split(' ')[0],
          badgeClassName: isActive ? 'theme-accent font-bold' : 'theme-text-secondary',
          onClick: () => selectLoveTheme(p.id),
        };
      }),
    [palettes, paletteId, selectLoveTheme]
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl theme-bg-surface/85 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs border-0 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {canNavigateUniverse && onToggleSidebar && (
          <IconButton
            icon={MenuIcon}
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            title={t('toggleSidebar', 'Toggle Navigation Sidebar')}
            aria-label={t('toggleSidebar', 'Toggle Navigation Sidebar')}
          />
        )}

        {/* Romantic Brand Pill */}
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => navigate(isAuthenticated ? '/welcome' : '/login')}
          className="px-2 py-1.5 text-start"
        >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft flex items-center justify-center theme-accent shrink-0">
            <HeartIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 text-start">
            <div className="text-sm font-bold tracking-wide theme-text-primary truncate">
              {space?.title || t('brandTitle', 'Our Little Universe')}
            </div>
            <div className="text-[11px] theme-text-secondary hidden sm:block truncate max-w-[240px] font-normal">
              {space?.subtitle || t('brandSubtitle', 'A private galaxy of memories & stories')}
            </div>
          </div>
        </div>
      </CustomButton>
      </div>

      {/* Center: Ambient Music Pill */}
      {isAuthenticated && !isLoginRoute && (
        <CustomButton
          variant="app"
          size="sm"
          onClick={togglePlay}
          icon={MusicNoteIcon}
          className="hidden md:inline-flex rounded-full"
        >
          <span className="truncate max-w-[150px]">
            {space?.ambient_track_title || currentTrack?.title || t('ambientMusic', 'Ambient Music')}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent font-semibold ms-1.5">
            {isPlaying ? t('playing', 'PLAYING') : t('paused', 'PAUSED')}
          </span>
        </CustomButton>
      )}

      {/* Right Project UI Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dynamic Love Theme Palette Switcher */}
        <ActionMenu
          icon={AppearanceIcon}
          label={null}
          variant="ghost"
          size="sm"
          align="right"
          buttonClassName="theme-accent"
          ariaLabel={t('chooseLoveTheme', 'Choose Love Theme')}
          header={
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1.5 theme-text-secondary">
                <HeartIcon className="w-3.5 h-3.5 theme-accent" />
                {t('loveAtmosphere', 'Love Atmosphere')}
              </span>
            </div>
          }
          items={loveThemeItems}
        />

        {/* Language Selector (EN / BN) */}
        <ActionMenu
          icon={LanguagesIcon}
          label={null}
          variant="ghost"
          size="sm"
          align="right"
          buttonClassName="theme-accent"
          ariaLabel={t('switchLanguage', 'Change Display Language')}
          header={
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1.5 theme-text-secondary">
                <GlobeIcon className="w-3.5 h-3.5 theme-accent" />
                {t('displayLanguage', 'Display Language')}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md theme-bg-app theme-text-secondary">
                {config.code.toUpperCase()}
              </span>
            </div>
          }
          items={languageMenuItems}
        />

        {/* Theme Mode Switcher */}
        <IconButton
          icon={ModeIcon}
          variant="ghost"
          size="sm"
          onClick={cycleThemeMode}
          title={t('switchThemeMode', 'Switch Light / Dark / System Mode')}
          aria-label={t('switchThemeMode', 'Switch Light / Dark / System Mode')}
        />

        {isAuthenticated && !isLoginRoute && (
          <>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full theme-bg-accent-soft theme-accent text-xs font-bold">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{formatNumber(collectedStars)}</span>
            </div>

            {user?.role === 'OWNER' && (
              <CustomButton
                size="sm"
                variant={location.pathname === '/admin' ? 'primary' : 'soft'}
                onClick={() => navigate('/admin')}
                icon={ShieldIcon}
              >
                <span className="hidden sm:inline">{t('adminHub', 'Admin')}</span>
              </CustomButton>
            )}

            {onToggleRightDrawer && (
              <IconButton
                icon={SidebarRightIcon}
                variant={isRightDrawerOpen ? 'accent-soft' : 'ghost'}
                size="sm"
                onClick={onToggleRightDrawer}
                title={t('openQuickDrawer', 'Atmosphere & Quick Panel')}
                aria-label={t('openQuickDrawer', 'Atmosphere & Quick Panel')}
              />
            )}

            <IconButton
              icon={LogOutIcon}
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title={t('logout', 'Sign Out')}
              aria-label={t('logout', 'Sign Out')}
            />
          </>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;

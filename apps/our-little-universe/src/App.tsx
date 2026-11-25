import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  AppI18nProvider,
  AppThemeProvider,
  ErrorBoundary,
  RightSidebarProvider,
  ToastProvider,
  useRightSidebar,
} from '@repo/ui';
import './core/i18n/foundationLocales';
import { DEFAULT_LOVE_THEME_ID, LOVE_THEME_PALETTES } from './core/theme/loveThemes';
import { AuthProvider, useAuth } from './core/auth/AuthContext';
import {
  RequireAuth,
  RequireEntryUnlocked,
  RequireModuleAccess,
  RequireOwner,
} from './core/auth/RouteGuards';
import CosmicBackdrop from './components/layout/CosmicBackdrop';
import TopNavbar from './components/layout/TopNavbar';
import UniverseSidebar from './components/layout/UniverseSidebar';
import UniverseRightDrawer from './components/layout/UniverseRightDrawer';
import { useUniversePulseDrawerRegistration } from './components/layout/UniversePulseDrawer';

// Phase 01 & 02 Modules
import PrivateLoginView from './modules/auth/PrivateLoginView';
import WelcomeView from './modules/welcome/WelcomeView';
import AdminDashboardView from './modules/admin/AdminDashboardView';
import UniverseDashboard from './modules/universe/UniverseDashboard';

// Upcoming Phase Views (Protected Behind Auth + Entry Gate)
import OurStoryView from './modules/story/OurStoryView';
import MemoryMuseumView from './modules/memories/MemoryMuseumView';
import LettersView from './modules/letters/LettersView';
import VirtualGardenView from './modules/garden/VirtualGardenView';
import GamesHubView from './modules/games/GamesHubView';
import SecretRoomsView from './modules/secrets/SecretRoomsView';
import DigitalGiftsView from './modules/gifts/DigitalGiftsView';
import NightSkyView from './modules/night-sky/NightSkyView';
import DreamsFutureView from './modules/dreams/DreamsFutureView';

const UniverseLayout: React.FC = () => {
  const { isRightSidebarOpen } = useRightSidebar();
  const { togglePulseDrawer, openPulseDrawer } = useUniversePulseDrawerRegistration();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('olu_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const onResize = () => setIsDesktopViewport(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleToggleCollapse = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('olu_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleToggleSidebar = () => {
    if (isDesktopViewport) {
      handleToggleCollapse();
    } else {
      setIsMobileSidebarOpen((prev) => !prev);
    }
  };

  return (
    <CosmicBackdrop>
      <TopNavbar
        onToggleSidebar={handleToggleSidebar}
        onToggleRightDrawer={togglePulseDrawer}
        isRightDrawerOpen={isRightSidebarOpen}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <UniverseSidebar
          mode={isDesktopViewport ? (isDesktopCollapsed ? 'collapsed' : 'full') : 'overlay'}
          isOpen={isDesktopViewport ? true : isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onToggleCollapse={isDesktopViewport ? handleToggleCollapse : undefined}
          onOpenPulseDrawer={openPulseDrawer}
        />

        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          <Routes>
            <Route path="/login" element={<PrivateLoginView />} />
            <Route
              path="/welcome"
              element={
                <RequireAuth>
                  <WelcomeView />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireOwner>
                  <AdminDashboardView />
                </RequireOwner>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireEntryUnlocked>
                  <UniverseDashboard />
                </RequireEntryUnlocked>
              }
            />
            <Route
              path="/story"
              element={
                <RequireModuleAccess moduleKey="story">
                  <OurStoryView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/memories"
              element={
                <RequireModuleAccess moduleKey="memories">
                  <MemoryMuseumView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/letters"
              element={
                <RequireModuleAccess moduleKey="letters">
                  <LettersView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/garden"
              element={
                <RequireModuleAccess moduleKey="garden">
                  <VirtualGardenView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/games"
              element={
                <RequireModuleAccess moduleKey="games">
                  <GamesHubView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/secrets"
              element={
                <RequireModuleAccess moduleKey="secrets">
                  <SecretRoomsView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/gifts"
              element={
                <RequireModuleAccess moduleKey="gifts">
                  <DigitalGiftsView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/night-sky"
              element={
                <RequireModuleAccess moduleKey="night-sky">
                  <NightSkyView />
                </RequireModuleAccess>
              }
            />
            <Route
              path="/dreams"
              element={
                <RequireModuleAccess moduleKey="dreams">
                  <DreamsFutureView />
                </RequireModuleAccess>
              }
            />
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </main>

        <UniverseRightDrawer />
      </div>
    </CosmicBackdrop>
  );
};

const UniverseShell: React.FC = () => {
  const { space } = useAuth();

  return (
    <AppThemeProvider
      palettes={LOVE_THEME_PALETTES}
      defaultPaletteId={DEFAULT_LOVE_THEME_ID}
      initialPaletteId={space?.active_theme_id}
      paletteStorageKey="olu_love_theme_palette"
      modeStorageKey="olu_love_theme_mode"
    >
      <RightSidebarProvider storageKeyPrefix="olu_right_drawer_width">
        <UniverseLayout />
      </RightSidebarProvider>
    </AppThemeProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppI18nProvider allowedLanguages={['en', 'bn']}>
        <ToastProvider>
          <AuthProvider>
            <UniverseShell />
          </AuthProvider>
        </ToastProvider>
      </AppI18nProvider>
    </ErrorBoundary>
  );
}

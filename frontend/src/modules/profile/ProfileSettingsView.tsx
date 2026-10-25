import React, { useMemo } from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';
import { useTranslation } from '../../i18n';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import {
  KeyRoundIcon,
  SmartphoneIcon,
  ShieldCheckIcon,
  DownloadIcon,
  LogOutIcon,
  LockIcon,
  UserCheckIcon,
} from '../../components/ui/Icons';
import { ConfirmModal } from '../../components/ui/Modal';

import { useProfileSettings } from './hooks/useProfileSettings';
import {
  ProfileHeroCard,
  ProfileSecurityScoreCard,
  ProfileOptionGroup,
  ProfileOptionRow,
} from './components';

import {
  EditProfileDrawer,
  ChangePasswordDrawer,
  ActiveSessionsDrawer,
  SecurityLogsDrawer,
  AccountSwitcherDrawer,
  QRSyncDrawer,
  Setup2FADrawer,
  PasskeysDrawer,
} from './drawers';

import './locales';

export const ProfileSettingsView: React.FC = () => {
  const { t, formatNumber } = useTranslation('profile');
  const { isSectionEnabled } = useFeatureControl();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const {
    user,
    setUser,
    loading,
    is2FAEnabled,
    setIs2FAEnabled,
    passkeysCount,
    setPasskeysCount,
    savedAccountsCount,
    securityMetric,
    handleExportData,
    requestSignOut,
    confirmDialog,
    closeConfirmDialog,
  } = useProfileSettings();

  // ── Register Right Sidebar Drawers ── //

  useDrawerRegistration(
    'profile-edit',
    () => ({
      title: t('drawerEditProfileTitle', 'Edit Profile Information'),
      category: t('title', 'Profile & Account Settings'),
      size: 'md',
      content: (
        <EditProfileDrawer
          key={`drawer-profile-edit-${user?.id || 'me'}`}
          user={user}
          onProfileUpdated={(updated) => setUser(updated)}
          onClose={closeDrawer}
        />
      ),
    }),
    [user, setUser, closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-password',
    () => ({
      title: t('drawerPasswordTitle', 'Update Account Password'),
      category: t('title', 'Profile & Account Settings'),
      size: 'sm',
      content: (
        <ChangePasswordDrawer
          key="drawer-profile-password"
          onClose={closeDrawer}
        />
      ),
    }),
    [closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-sessions',
    () => ({
      title: t('drawerSessionsTitle', 'Active Sessions & Devices'),
      category: t('title', 'Profile & Account Settings'),
      size: 'md',
      content: (
        <ActiveSessionsDrawer
          key="drawer-profile-sessions"
          onClose={closeDrawer}
        />
      ),
    }),
    [closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-logs',
    () => ({
      title: t('drawerLogsTitle', 'Security & Authentication Logs'),
      category: t('title', 'Profile & Account Settings'),
      size: 'lg',
      content: (
        <SecurityLogsDrawer
          key="drawer-profile-logs"
          onClose={closeDrawer}
        />
      ),
    }),
    [closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-accounts',
    () => ({
      title: t('drawerAccountsTitle', 'Account Switcher'),
      category: t('title', 'Profile & Account Settings'),
      size: 'sm',
      content: (
        <AccountSwitcherDrawer
          key="drawer-profile-accounts"
          onClose={closeDrawer}
        />
      ),
    }),
    [closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-qr',
    () => ({
      title: t('drawerQrTitle', 'Cross-Device QR Sign-In'),
      category: t('title', 'Profile & Account Settings'),
      size: 'sm',
      content: (
        <QRSyncDrawer
          key="drawer-profile-qr"
          onClose={closeDrawer}
        />
      ),
    }),
    [closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-2fa',
    () => ({
      title: t('drawer2FaTitle', 'Two-Factor Authentication Setup'),
      category: t('title', 'Profile & Account Settings'),
      size: 'md',
      content: (
        <Setup2FADrawer
          key={`drawer-profile-2fa-${is2FAEnabled}`}
          is2FAEnabled={is2FAEnabled}
          onStatusChanged={(enabled) => setIs2FAEnabled(enabled)}
          onClose={closeDrawer}
        />
      ),
    }),
    [is2FAEnabled, setIs2FAEnabled, closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-passkeys',
    () => ({
      title: t('drawerPasskeysTitle', 'Manage Passkeys & Biometrics'),
      category: t('title', 'Profile & Account Settings'),
      size: 'md',
      content: (
        <PasskeysDrawer
          key="drawer-profile-passkeys"
          onPasskeysUpdated={(count) => setPasskeysCount(count)}
          onClose={closeDrawer}
        />
      ),
    }),
    [setPasskeysCount, closeDrawer, t]
  );

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6 font-sans animate-pulse select-none">
        <div className="h-44 theme-bg-surface border theme-border rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-64 theme-bg-surface border theme-border rounded-2xl" />
          <div className="lg:col-span-8 h-96 theme-bg-surface border theme-border rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 font-sans theme-text-primary animate-fade-in select-none">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
          {t('title', 'Profile & Account Settings')}
        </h1>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Hero Card & Security Scorecard */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <ProfileHeroCard
            user={user}
            onEditProfile={() => openDrawer('profile-edit')}
            onChangeAvatar={() => openDrawer('profile-edit')}
          />

          <ProfileSecurityScoreCard
            metric={securityMetric}
            onOpenCheckDrawer={(drawerKey) => openDrawer(drawerKey)}
          />
        </div>

        {/* Right Column: Settings Groups with Standard Theme Dividers */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Account Access & Security (Unified Section) */}
          <ProfileOptionGroup title={t('groupAccessSecurity', 'Account Access & Security')}>
            <ProfileOptionRow
              icon={<UserCheckIcon className="w-4 h-4 theme-accent" />}
              title={t('accountSwitcherTitle', 'Switch or Add Account')}
              subtitle={t('accountSwitcherSubtitle', 'Manage saved accounts and active session switches')}
              badgeText={t(
                savedAccountsCount > 1 ? 'badgeSavedAccounts_plural' : 'badgeSavedAccounts',
                `${formatNumber(savedAccountsCount)} Saved`,
                { count: formatNumber(savedAccountsCount) }
              )}
              badgeVariant="accent"
              onClick={() => openDrawer('profile-accounts')}
            />

            <ProfileOptionRow
              icon={<SmartphoneIcon className="w-4 h-4 theme-accent" />}
              title={t('qrSyncTitle', 'Scan QR to Login Elsewhere')}
              subtitle={t('qrSyncSubtitle', 'Instantly authorize login on another workstation or mobile device')}
              badgeText={t('badgeInstantSync', 'Instant Sync')}
              badgeVariant="accent"
              onClick={() => openDrawer('profile-qr')}
            />

            {isSectionEnabled('settings_security') && (
              <ProfileOptionRow
                icon={<LockIcon className="w-4 h-4 theme-accent" />}
                title={t('twoFactorTitle', 'Two-Factor Authentication (2FA)')}
                subtitle={t('twoFactorSubtitle', 'Safeguard sign-ins with TOTP Authenticator apps')}
                badgeText={
                  is2FAEnabled
                    ? t('badgeEnabled', 'Enabled')
                    : t('badgeDisabled', 'Disabled')
                }
                badgeVariant={is2FAEnabled ? 'success' : 'neutral'}
                onClick={() => openDrawer('profile-2fa')}
              />
            )}

            {isSectionEnabled('settings_security') && (
              <ProfileOptionRow
                icon={<KeyRoundIcon className="w-4 h-4 theme-accent" />}
                title={t('passkeysTitle', 'Passkeys & Biometrics')}
                subtitle={t('passkeysSubtitle', 'Passwordless authentication using Touch ID, Face ID, or Windows Hello')}
                badgeText={t(
                  passkeysCount !== 1 ? 'badgePasskeys_plural' : 'badgePasskeys',
                  `${formatNumber(passkeysCount)} Keys`,
                  { count: formatNumber(passkeysCount) }
                )}
                badgeVariant={passkeysCount > 0 ? 'accent' : 'neutral'}
                onClick={() => openDrawer('profile-passkeys')}
              />
            )}
          </ProfileOptionGroup>

          {/* 3. Security & Device Management */}
          {isSectionEnabled('settings_security') && (
            <ProfileOptionGroup title={t('groupSecurityManagement', 'Security & Device Management')}>
              <ProfileOptionRow
                icon={<KeyRoundIcon className="w-4 h-4 theme-accent" />}
                title={t('changePasswordTitle', 'Change Password')}
                subtitle={t('changePasswordSubtitle', 'Update your account login password credentials')}
                onClick={() => openDrawer('profile-password')}
              />

              <ProfileOptionRow
                icon={<SmartphoneIcon className="w-4 h-4 theme-accent" />}
                title={t('activeSessionsTitle', 'Active Devices & Sessions')}
                subtitle={t('activeSessionsSubtitle', 'Review currently active sessions and revoke unauthorized devices')}
                badgeText={t('badgeActiveNow', 'Active')}
                badgeVariant="accent"
                onClick={() => openDrawer('profile-sessions')}
              />

              <ProfileOptionRow
                icon={<ShieldCheckIcon className="w-4 h-4 theme-accent" />}
                title={t('securityLogsTitle', 'Security & Activity Logs')}
                subtitle={t('securityLogsSubtitle', 'Inspect recent authentication events and security activity audits')}
                onClick={() => openDrawer('profile-logs')}
              />
            </ProfileOptionGroup>
          )}

          {/* 4. Danger Zone & System Actions */}
          <ProfileOptionGroup title={t('groupDangerZone', 'Danger Zone & System Actions')}>
            {isSectionEnabled('settings_backup') && (
              <ProfileOptionRow
                icon={<DownloadIcon className="w-4 h-4 theme-accent" />}
                title={t('exportDataTitle', 'Export Personal Account Data')}
                subtitle={t('exportDataSubtitle', 'Download a full JSON archive of your personal profile and preferences')}
                onClick={handleExportData}
              />
            )}

            <ProfileOptionRow
              icon={<LogOutIcon className="w-4 h-4 theme-danger" />}
              title={t('signOutTitle', 'Sign Out of Account')}
              subtitle={t('signOutSubtitle', 'Safely terminate current session on this device')}
              isDanger={true}
              onClick={requestSignOut}
            />
          </ProfileOptionGroup>
        </div>
      </div>

      {/* Central Reusable Confirmation Modal: Kept strictly for critical confirmation actions */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.confirmVariant}
      />
    </div>
  );
};

export default ProfileSettingsView;

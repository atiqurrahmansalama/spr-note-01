import React, { useMemo } from 'react';
import { useFeatureControl } from '../../context/FeatureControlContext';
import { useTranslation } from '../../i18n';
import { useRightSidebar, useDrawerRegistration } from '../../context/RightSidebarContext';
import {
  PasskeyIcon,
  SmartphoneIcon,
  ShieldCheckIcon,
  DownloadIcon,
  LogOutIcon,
  LockIcon,
  UserCheckIcon,
  MailIcon,
} from '../../components/ui/Icons';
import { ConfirmModal } from '../../components/ui/Modal';
import RouteLoadingFallback from '../../components/ui/RouteLoadingFallback';

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
  ChangeEmailDrawer,
} from './drawers';

import './locales';

export const ProfileSettingsView: React.FC = () => {
  const { t, formatNumber } = useTranslation('profile');
  const { isSectionEnabled } = useFeatureControl();
  const { openDrawer, closeDrawer, isRightSidebarOpen, rightSidebarConfig } = useRightSidebar();
  const activeDrawerKey = isRightSidebarOpen ? rightSidebarConfig?.drawerKey : null;

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
      size: 'lg',
      content: (
        <ActiveSessionsDrawer
          key="drawer-profile-sessions"
          initialTab="sessions"
          onClose={closeDrawer}
        />
      ),
    }),
    [closeDrawer, t]
  );

  useDrawerRegistration(
    'profile-logs',
    () => ({
      title: t('securityDevicesHubTitle', 'Security Activity & Devices'),
      category: t('title', 'Profile & Account Settings'),
      size: 'lg',
      content: (
        <ActiveSessionsDrawer
          key="drawer-profile-logs"
          initialTab="logs"
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

  useDrawerRegistration(
    'profile-change-email',
    () => ({
      title: user?.email && !user?.is_email_verified
        ? t('verifyEmailTitle', 'Verify Email Address')
        : t('changeEmailTitle', 'Change Email Address'),
      category: t('title', 'Profile & Account Settings'),
      size: 'md',
      content: (
        <ChangeEmailDrawer
          key={`drawer-profile-email-${user?.email}-${user?.is_email_verified}`}
          initialMode={user?.email && !user?.is_email_verified ? 'verify' : 'change'}
          onClose={closeDrawer}
        />
      ),
    }),
    [user?.email, user?.is_email_verified, closeDrawer, t]
  );

  if (loading) {
    return (
      <RouteLoadingFallback
        title={t('loadingProfileTitle', 'Loading Profile Settings...')}
        subtitle={t('loadingProfileSubtitle', 'Please wait while account settings are being loaded')}
      />
    );
  }

  return (
    <div className="@container w-full max-w-6xl mx-auto px-4 sm:px-6 font-sans theme-text-primary animate-fade-in select-none h-full flex flex-col min-h-0 overflow-hidden">
      {/* Page Header */}
      <div className="pt-2 sm:pt-4 pb-3 sm:pb-4 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary">
          {t('title', 'Profile & Account Settings')}
        </h1>
      </div>

      {/* Main Responsive Layout: Automatically stacks to 1 column with side-by-side hero/scorecard when drawer is open (< 960px) */}
      <div className="grid grid-cols-1 @[960px]:grid-cols-12 gap-6 @[960px]:gap-8 items-stretch flex-1 min-h-0 overflow-y-auto @[960px]:overflow-hidden no-scrollbar">
        {/* Left Column: Hero Card & Security Scorecard (Independent Scroll on Desktop @[960px]) */}
        <div className="@[960px]:col-span-5 @[1140px]:col-span-4 space-y-6 @[960px]:h-full @[960px]:overflow-y-auto no-scrollbar pb-6 shrink-0">
          <div className="grid grid-cols-1 @[540px]:grid-cols-2 @[960px]:grid-cols-1 gap-4 @[960px]:gap-6">
            <ProfileHeroCard
              user={user}
              onEditProfile={() => openDrawer('profile-edit')}
              onChangeAvatar={() => openDrawer('profile-edit')}
              onVerifyEmail={() => openDrawer('profile-change-email')}
            />

            <ProfileSecurityScoreCard
              metric={securityMetric}
              onOpenCheckDrawer={(drawerKey) => openDrawer(drawerKey)}
            />
          </div>
        </div>

        {/* Right Column: Settings Groups (Independent Scroll on Desktop @[960px]) */}
        <div className="@[960px]:col-span-7 @[1140px]:col-span-8 space-y-6 @[960px]:h-full @[960px]:overflow-y-auto no-scrollbar pb-12 flex-1">
          {/* 1. Account Access & Security (Unified Section) */}
          <ProfileOptionGroup title={t('groupAccessSecurity', 'Account Access & Security')}>
            <ProfileOptionRow
              icon={<UserCheckIcon className="w-4 h-4 theme-accent" />}
              title={t('accountSwitcherTitle', 'Switch or Add Account')}
              subtitle={t('accountSwitcherSubtitle', 'Manage saved accounts and active session switches')}
              isActive={activeDrawerKey === 'profile-accounts'}
              onClick={() => openDrawer('profile-accounts')}
            />

            <ProfileOptionRow
              icon={<SmartphoneIcon className="w-4 h-4 theme-accent" />}
              title={t('qrSyncTitle', 'Scan QR to Login Elsewhere')}
              subtitle={t('qrSyncSubtitle', 'Instantly authorize login on another workstation or mobile device')}
              isActive={activeDrawerKey === 'profile-qr'}
              onClick={() => openDrawer('profile-qr')}
            />

            <ProfileOptionRow
              icon={<MailIcon className="w-4 h-4 theme-accent" />}
              title={t('changeEmailTitle', 'Change Email Address')}
              subtitle={
                user?.email
                  ? `${user.email} • ${user.is_email_verified ? t('statusVerified', 'Verified') : t('statusUnverified', 'Unverified')}`
                  : t('changeEmailSubtitle', 'Update and securely verify your account email address')
              }
              badgeText={user?.email && !user?.is_email_verified ? t('statusUnverified', 'Unverified') : undefined}
              badgeVariant={user?.email && !user?.is_email_verified ? 'warning' : undefined}
              isActive={activeDrawerKey === 'profile-change-email'}
              onClick={() => openDrawer('profile-change-email')}
            />
          </ProfileOptionGroup>

          {/* 2. Security & Device Management */}
          {isSectionEnabled('settings_security') && (
            <ProfileOptionGroup title={t('groupSecurityManagement', 'Security & Device Management')}>
              <ProfileOptionRow
                icon={<LockIcon className="w-4 h-4 theme-accent" />}
                title={t('changePasswordTitle', 'Change Password')}
                subtitle={t('changePasswordSubtitle', 'Update your account login password credentials')}
                isActive={activeDrawerKey === 'profile-password'}
                onClick={() => openDrawer('profile-password')}
              />

              <ProfileOptionRow
                icon={<LockIcon className="w-4 h-4 theme-accent" />}
                title={t('twoFactorTitle', 'Two-Factor Authentication (2FA)')}
                subtitle={t('twoFactorSubtitle', 'Safeguard sign-ins with TOTP Authenticator apps')}
                isActive={activeDrawerKey === 'profile-2fa'}
                onClick={() => openDrawer('profile-2fa')}
              />

              <ProfileOptionRow
                icon={<PasskeyIcon className="w-4 h-4 theme-accent" />}
                title={t('passkeysTitle', 'Passkeys & Biometrics')}
                subtitle={t('passkeysSubtitle', 'Passwordless authentication using Touch ID, Face ID, or Windows Hello')}
                isActive={activeDrawerKey === 'profile-passkeys'}
                onClick={() => openDrawer('profile-passkeys')}
              />

              <ProfileOptionRow
                icon={<SmartphoneIcon className="w-4 h-4 theme-accent" />}
                title={t('activeDevicesAndLogsTitle', 'Active Devices & Security Logs')}
                subtitle={t('activeDevicesAndLogsSubtitle', 'Review connected sessions, authorized devices, and security audit logs')}
                isActive={activeDrawerKey === 'profile-sessions' || activeDrawerKey === 'profile-logs'}
                onClick={() => openDrawer('profile-sessions')}
              />

              {isSectionEnabled('settings_backup') && (
                <ProfileOptionRow
                  icon={<DownloadIcon className="w-4 h-4 theme-accent" />}
                  title={t('exportDataTitle', 'Export Personal Account Data')}
                  subtitle={t('exportDataSubtitle', 'Download a full JSON archive of your personal profile and preferences')}
                  onClick={handleExportData}
                />
              )}
            </ProfileOptionGroup>
          )}

          {/* 4. Danger Zone & System Actions */}
          <ProfileOptionGroup title={t('groupDangerZone', 'Danger Zone & System Actions')}>
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

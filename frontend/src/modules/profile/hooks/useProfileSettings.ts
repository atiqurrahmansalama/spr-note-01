import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth, logoutUser } from '../../../utils/authService';
import { auth as authStore, multiAccount } from '../../../utils/localStore';
import { useTranslation } from '../../../i18n';
import type { UserProfile, SecurityScoreMetric } from '../types';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
}

export function useProfileSettings() {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(false);
  const [passkeysCount, setPasskeysCount] = useState<number>(0);
  const [savedAccountsCount, setSavedAccountsCount] = useState<number>(1);

  // Reusable confirmation dialog state for critical actions
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    confirmVariant: 'primary',
    onConfirm: () => {},
  });

  const loadUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      let res = await fetchWithAuth('/api/v1/auth/profile/');
      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/user/profile/');
      }

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIs2FAEnabled(!!data.is_2fa_enabled);
        setPasskeysCount(data.passkeys_count || 0);
      } else {
        const localUser = authStore.getUser() || {};
        setUser(localUser);
      }

      const saved = multiAccount.getAccounts() || [];
      setSavedAccountsCount(Math.max(1, saved.length));
    } catch {
      const localUser = authStore.getUser() || {};
      setUser(localUser);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();

    const handleAuthUpdate = () => {
      loadUserProfile();
    };
    window.addEventListener('spr_auth_updated', handleAuthUpdate);
    return () => window.removeEventListener('spr_auth_updated', handleAuthUpdate);
  }, [loadUserProfile]);

  // Compute Enterprise Security Health Metric
  const securityMetric = useMemo<SecurityScoreMetric>(() => {
    let score = 40; // Base verified account score
    const checks = [
      {
        id: 'pwd',
        label: t('securityCheckPassword', 'Strong Credential Protection'),
        passed: true,
        drawerKey: 'profile-password',
      },
      {
        id: '2fa',
        label: t('twoFactorTitle', 'Two-Factor Authentication (2FA)'),
        passed: is2FAEnabled,
        recommendation: is2FAEnabled ? undefined : t('securityRec2fa', 'Enable 2FA with an authenticator app.'),
        drawerKey: 'profile-2fa',
      },
      {
        id: 'passkeys',
        label: t('passkeysTitle', 'Passkeys & Biometrics'),
        passed: passkeysCount > 0,
        recommendation: passkeysCount > 0 ? undefined : t('securityRecPasskey', 'Add a biometric passkey for passwordless sign-in.'),
        drawerKey: 'profile-passkeys',
      },
      {
        id: 'sessions',
        label: t('activeSessionsTitle', 'Active Devices & Sessions'),
        passed: true,
        drawerKey: 'profile-sessions',
      },
    ];

    if (is2FAEnabled) score += 35;
    if (passkeysCount > 0) score += 25;

    let level: SecurityScoreMetric['level'] = 'critical';
    let label = t('securityCritical', 'Action Recommended');
    let summary = t('securitySummaryCritical', 'Your account security can be improved. Enable 2FA for better safety.');

    if (score >= 95) {
      level = 'optimal';
      label = t('securityOptimal', 'Optimal Security');
      summary = t('securitySummaryOptimal', 'Enterprise-grade protection is active across all verification factors.');
    } else if (score >= 70) {
      level = 'strong';
      label = t('securityStrong', 'Strong Security');
      summary = t('securitySummaryStrong', 'Account is well protected with multi-layered authentication.');
    } else if (score >= 50) {
      level = 'moderate';
      label = t('securityModerate', 'Moderate Security');
      summary = t('securitySummaryModerate', 'Account has basic security. Register a passkey or 2FA.');
    }

    return { score, level, label, summary, checks };
  }, [is2FAEnabled, passkeysCount, t]);

  const handleExportData = useCallback(() => {
    const archiveData = {
      export_date: new Date().toISOString(),
      user: user || {},
      settings_version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `profile_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(t('toastExportSuccess', 'Exported personal profile archive to JSON!'), 'success');
  }, [user, showToast, t]);

  const requestSignOut = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: t('confirmSignOutTitle', 'Sign Out Confirmation'),
      description: t('confirmSignOutDesc', 'Are you sure you want to sign out of your account?'),
      confirmText: t('confirmSignOutAction', 'Sign Out'),
      confirmVariant: 'danger',
      onConfirm: () => {
        logoutUser();
        window.location.reload();
      },
    });
  }, [t]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    user,
    setUser,
    loading,
    is2FAEnabled,
    setIs2FAEnabled,
    passkeysCount,
    setPasskeysCount,
    savedAccountsCount,
    setSavedAccountsCount,
    securityMetric,
    handleExportData,
    requestSignOut,
    confirmDialog,
    closeConfirmDialog,
    loadUserProfile,
  };
}

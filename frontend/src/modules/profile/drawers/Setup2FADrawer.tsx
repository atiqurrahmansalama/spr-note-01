import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import {
  LockIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  InfoIcon,
} from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';
import CustomButton from '../../../components/ui/CustomButton';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { useTranslation } from '../../../i18n';

interface Setup2FADrawerProps {
  is2FAEnabled: boolean;
  onStatusChanged?: (enabled: boolean) => void;
  onClose: () => void;
}

export const Setup2FADrawer: React.FC<Setup2FADrawerProps> = ({
  is2FAEnabled,
  onStatusChanged,
  onClose,
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [secret, setSecret] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [hasAcknowledgedBackup, setHasAcknowledgedBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disableMethod, setDisableMethod] = useState<'code' | 'password'>('code');
  const [disableValue, setDisableValue] = useState('');

  const initiateSetup = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/2fa/setup/', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSecret(data.secret || '');
        setQrCodeBase64(data.qr_code_base64 || '');
      } else {
        showToast(t('2faSetupFailed', 'Failed setting up 2FA.'), 'error');
      }
    } catch {
      showToast(t('serverOffline', 'Server offline for 2FA setup.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    setStep(1);
    setPinCode('');
    setBackupCodes([]);
    setHasAcknowledgedBackup(false);
    setDisableValue('');
    if (!is2FAEnabled) {
      initiateSetup();
    }
  }, [is2FAEnabled, initiateSetup]);

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinCode.replace(/\s+/g, '');
    if (!cleanPin || cleanPin.length < 6) {
      showToast(t('enter6DigitPin', 'Please enter a valid 6-digit PIN code.'), 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/2fa/enable/', {
        method: 'POST',
        body: JSON.stringify({ code: cleanPin }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(t('2faEnabledSuccess', 'Two-Factor Authentication enabled!'), 'success');
        setBackupCodes(data.backup_codes || []);
        setStep(3);
        if (onStatusChanged) onStatusChanged(true);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('invalid2faCode', 'Invalid verification code.'), 'error');
      }
    } catch {
      showToast(t('serverOffline', 'Server connection error.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!disableValue.trim()) {
      showToast(
        disableMethod === 'code'
          ? t('enter6DigitPin', 'Please enter your 6-digit authenticator code.')
          : t('enterCurrentPassword', 'Please enter your account password.'),
        'warning'
      );
      return;
    }

    setDisabling(true);
    try {
      const payload =
        disableMethod === 'code'
          ? { code: disableValue.trim() }
          : { current_password: disableValue.trim() };

      const res = await fetchWithAuth('/api/v1/auth/2fa/disable/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(t('2faDisabledSuccess', 'Two-Factor Authentication has been disabled.'), 'info');
        if (onStatusChanged) onStatusChanged(false);
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('invalid2faCode', 'Invalid verification code or password.'), 'error');
      }
    } catch {
      showToast(t('serverOffline', 'Server connection error.'), 'error');
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    showToast(t('secretCopied', 'Secret key copied to clipboard!'), 'info');
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setHasAcknowledgedBackup(true);
    showToast(t('backupCodesCopied', 'Backup recovery codes copied!'), 'info');
  };

  const downloadBackupCodes = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const content = [
      '==================================================',
      'SPR Note Suite — Emergency Backup Recovery Codes',
      `Generated: ${timestamp}`,
      '==================================================',
      '',
      'Keep these single-use recovery codes in a secure offline location.',
      'Each code can be used exactly once to regain account access.',
      '',
      ...backupCodes.map((c, i) => `[${i + 1}]  ${c}`),
      '',
      '==================================================',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spr-note-backup-codes-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setHasAcknowledgedBackup(true);
    showToast(t('toastBackupCodesDownloaded', 'Backup codes file downloaded!'), 'success');
  };

  // Normalize QR base64 image string
  const resolvedQrSrc = qrCodeBase64.startsWith('data:')
    ? qrCodeBase64
    : `data:image/png;base64,${qrCodeBase64}`;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container space-y-6 pt-2 pb-6 px-1">
        {is2FAEnabled ? (
          /* ============================================================== */
          /* ACTIVE 2FA ENTERPRISE MANAGEMENT VIEW                          */
          /* ============================================================== */
          <div className="space-y-6">
            {/* Status Card */}
            <div className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl theme-bg-success-soft border theme-border-success flex items-center justify-center shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 theme-text-success" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold theme-text-primary">
                    {t('twoFactorActiveHeader', 'Two-Factor Authentication is Active')}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium theme-text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('badgeEnabled', 'Active & Enforcing')}
                  </span>
                </div>
              </div>

              <p className="text-xs theme-text-secondary leading-relaxed">
                {t(
                  'twoFactorActiveDesc',
                  'Your account is protected with TOTP-based two-factor authentication. An authenticator app code is required at sign-in.'
                )}
              </p>

              <div className="pt-2 border-t theme-border flex items-center justify-between text-xs theme-text-secondary">
                <span className="flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5" />
                  {t('standardTOTP', 'RFC 6238 Standard (30-second rotation)')}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md theme-bg-sub border theme-border font-bold">
                  SHA-1 / 6 Digits
                </span>
              </div>
            </div>

            {/* Emergency Recovery Codes Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <LockIcon className="w-4 h-4 theme-accent" />
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  {t('backupCodesHeader', 'Emergency Backup Recovery Codes')}
                </h4>
              </div>

              <div className="p-3.5 rounded-xl theme-bg-sub/60 border theme-border text-xs theme-text-secondary space-y-2">
                <p className="leading-relaxed">
                  {t(
                    'backupCodesDesc',
                    'Store these 8 emergency recovery codes safely. Each code can be used once if you lose your authenticator device.'
                  )}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded theme-bg-surface border theme-border theme-text-primary font-bold">
                    8 {t('codesIssued', 'Codes Generated')}
                  </span>
                </div>
              </div>
            </div>

            {/* Disable 2FA Section (Enterprise Guarded) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <AlertCircleIcon className="w-4 h-4 theme-danger" />
                <h4 className="text-xs font-bold uppercase tracking-wider theme-danger">
                  {t('disable2FA', 'Disable 2FA Protection')}
                </h4>
              </div>

              <form onSubmit={handleDisable2FA} className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-4">
                <p className="text-xs theme-text-secondary leading-relaxed">
                  {t(
                    'confirmDisable2FAPrompt',
                    'Enter your 6-digit code or account password to disable 2FA protection:'
                  )}
                </p>

                {/* Method Switcher */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDisableMethod('code');
                      setDisableValue('');
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                      disableMethod === 'code'
                        ? 'theme-bg-accent-soft theme-accent border-transparent'
                        : 'theme-bg-sub theme-text-secondary border theme-border'
                    }`}
                  >
                    {t('authenticatorCode', '6-Digit Code')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisableMethod('password');
                      setDisableValue('');
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                      disableMethod === 'password'
                        ? 'theme-bg-accent-soft theme-accent border-transparent'
                        : 'theme-bg-sub theme-text-secondary border theme-border'
                    }`}
                  >
                    {t('accountPassword', 'Password')}
                  </button>
                </div>

                <CustomInput
                  type={disableMethod === 'password' ? 'password' : 'text'}
                  label={
                    disableMethod === 'code'
                      ? t('authenticatorCode', '6-Digit Security Code')
                      : t('currentPassword', 'Account Password')
                  }
                  value={disableValue}
                  onChange={(e: any) => setDisableValue(typeof e === 'string' ? e : e.target.value)}
                  placeholder={disableMethod === 'code' ? '000000' : '••••••••'}
                  maxLength={disableMethod === 'code' ? 6 : undefined}
                />

                <div className="flex items-center justify-end gap-3 pt-1">
                  <CustomButton variant="sub" onClick={onClose} disabled={disabling}>
                    {t('cancel', 'Cancel')}
                  </CustomButton>
                  <CustomButton variant="danger" type="submit" loading={disabling}>
                    {t('disable2FA', 'Disable 2FA')}
                  </CustomButton>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* INACTIVE 2FA ENROLLMENT WIZARD (3-STEP ENTERPRISE FLOW)         */
          /* ============================================================== */
          <div className="space-y-6">
            {/* Step Stepper Header */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { s: 1, label: t('step1Short', '1. Scan') },
                { s: 2, label: t('step2Short', '2. Verify') },
                { s: 3, label: t('step3Short', '3. Backup') },
              ].map((item) => (
                <div
                  key={item.s}
                  className={`text-center py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                    step === item.s
                      ? 'theme-bg-accent-soft theme-accent border theme-border'
                      : step > item.s
                      ? 'theme-bg-success-soft theme-text-success border theme-border-success'
                      : 'theme-bg-sub theme-text-secondary border theme-border opacity-60'
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>

            {/* STEP 1: Scan QR Code */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold theme-text-primary">
                    {t('step1Header', 'Step 1: Scan QR Code with Authenticator App')}
                  </h3>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {t(
                      'step1Desc',
                      'Open your preferred authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password) and scan the QR code below:'
                    )}
                  </p>
                </div>

                {/* QR Code Container */}
                {loading ? (
                  <div className="w-52 h-52 mx-auto rounded-2xl theme-bg-surface border theme-border flex items-center justify-center animate-pulse">
                    <span className="text-xs theme-text-secondary">{t('loading', 'Loading...')}</span>
                  </div>
                ) : qrCodeBase64 ? (
                  <div className="w-52 h-52 mx-auto p-3.5 bg-white rounded-2xl shadow-sm border theme-border flex items-center justify-center">
                    <img
                      src={resolvedQrSrc}
                      alt="2FA QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : null}

                {/* Manual Secret Key Card */}
                {secret && (
                  <div className="p-3.5 rounded-xl theme-bg-surface border theme-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
                        {t('manualEntryKey', 'Manual Entry Secret')}
                      </span>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="inline-flex items-center gap-1 text-xs theme-accent hover:underline cursor-pointer"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>{t('copyCodes', 'Copy Key')}</span>
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold theme-text-primary tracking-widest break-all select-all p-2 rounded-lg theme-bg-sub border theme-border text-center">
                      {secret}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <CustomButton variant="sub" onClick={onClose}>
                    {t('cancel', 'Cancel')}
                  </CustomButton>
                  <CustomButton variant="primary" onClick={() => setStep(2)}>
                    {t('nextVerifyCode', 'Next: Verify Code')}
                  </CustomButton>
                </div>
              </div>
            )}

            {/* STEP 2: Verify 6-digit PIN */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold theme-text-primary">
                    {t('step2Header', 'Step 2: Verify 6-Digit Authenticator Code')}
                  </h3>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {t(
                      'step2Desc',
                      'Enter the temporary 6-digit verification code generated by your app to verify synchronization:'
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-3">
                  <CustomInput
                    label={t('authenticatorCode', '6-Digit Verification Code')}
                    value={pinCode}
                    onChange={(e: any) => setPinCode(typeof e === 'string' ? e : e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-[11px] theme-text-secondary flex items-center gap-1.5">
                    <InfoIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('codeRefreshes30s', 'Codes refresh every 30 seconds.')}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <CustomButton variant="sub" onClick={() => setStep(1)} disabled={loading}>
                    {t('back', 'Back')}
                  </CustomButton>
                  <CustomButton variant="primary" type="submit" loading={loading}>
                    {t('verifyAndEnable', 'Verify & Activate')}
                  </CustomButton>
                </div>
              </form>
            )}

            {/* STEP 3: Emergency Backup Recovery Codes */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl theme-bg-success-soft border theme-border-success space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5 theme-text-success" />
                    <h3 className="text-sm font-bold theme-text-primary">
                      {t('step3Header', 'Step 3: Save Emergency Recovery Codes')}
                    </h3>
                  </div>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {t(
                      'step3Desc',
                      'Keep these single-use recovery codes in a secure location. You cannot view them again after leaving this screen.'
                    )}
                  </p>
                </div>

                {/* Backup Codes Grid */}
                {backupCodes.length > 0 && (
                  <div className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b theme-border">
                      <span className="text-xs font-bold theme-text-primary uppercase tracking-wider">
                        {t('backupCodesHeader', 'Single-Use Recovery Codes')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copyBackupCodes}
                          className="inline-flex items-center gap-1 text-xs theme-accent hover:underline cursor-pointer"
                        >
                          <CopyIcon className="w-3.5 h-3.5" />
                          <span>{t('copyCodes', 'Copy')}</span>
                        </button>
                        <span className="theme-text-secondary">•</span>
                        <button
                          type="button"
                          onClick={downloadBackupCodes}
                          className="inline-flex items-center gap-1 text-xs theme-accent hover:underline cursor-pointer"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" />
                          <span>{t('downloadCodes', 'Download .txt')}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs text-center py-1">
                      {backupCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="py-2 px-3 rounded-xl theme-bg-sub border theme-border font-bold tracking-wider theme-text-primary select-all"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acknowledgment Checkbox */}
                <div className="p-3.5 rounded-xl theme-bg-sub/60 border theme-border">
                  <CustomCheckbox
                    checked={hasAcknowledgedBackup}
                    onChange={(checked: boolean) => setHasAcknowledgedBackup(checked)}
                    label={t(
                      'ackBackupSaved',
                      'I have securely copied or downloaded my emergency recovery codes.'
                    )}
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <CustomButton
                    variant="primary"
                    disabled={!hasAcknowledgedBackup}
                    onClick={onClose}
                  >
                    {t('done', 'Complete Setup')}
                  </CustomButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!is2FAEnabled && step !== 3 && (
        <DrawerFooter onCancel={onClose} cancelLabel={t('close', 'Close')} />
      )}
    </DrawerContainer>
  );
};

export default Setup2FADrawer;

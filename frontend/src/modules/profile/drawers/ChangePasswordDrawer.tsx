import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithAuth } from '../../../utils/authService';
import { 
  AlertCircleIcon, 
  CheckIcon, 
  KeyIcon, 
  LockIcon, 
  MailIcon, 
  RefreshIcon,
  ShieldCheckIcon 
} from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';
import CustomButton from '../../../components/ui/CustomButton';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { useTranslation } from '../../../i18n';

interface ChangePasswordDrawerProps {
  hasPassword?: boolean;
  hasGoogleLinked?: boolean;
  onPasswordSet?: () => void;
  onClose: () => void;
}

export const ChangePasswordDrawer: React.FC<ChangePasswordDrawerProps> = ({
  hasPassword = true,
  hasGoogleLinked = false,
  onPasswordSet,
  onClose,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth() as any;
  const { t } = useTranslation('profile');

  // Mode: standard password entry OR forgot password OTP flow
  const [mode, setMode] = useState<'password' | 'forgot'>('password');

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
    otp: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Email OTP verification state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState(() => {
    const email = user?.email || '';
    if (!email || !email.includes('@')) return email;
    const parts = email.split('@');
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***@${parts[1]}` : email;
  });

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Password strength meter evaluation
  const newPass = form.new_password;
  const hasMinLength = newPass.length >= 6;
  const hasUpper = /[A-Z]/.test(newPass);
  const hasNumber = /[0-9]/.test(newPass);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPass);

  const score = [hasMinLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (!newPass) return { text: t('strengthEmpty', 'Too Short'), color: 'theme-text-secondary', width: 'w-0' };
    if (score === 1) return { text: t('strengthWeak', 'Weak'), color: 'theme-danger', width: 'w-1/4' };
    if (score === 2) return { text: t('strengthFair', 'Fair'), color: 'text-amber-500', width: 'w-2/4' };
    if (score === 3) return { text: t('strengthGood', 'Good'), color: 'theme-accent', width: 'w-3/4' };
    return { text: t('strengthStrong', 'Very Strong'), color: 'theme-accent', width: 'w-full' };
  };

  const strength = getStrengthLabel();

  const extractErrorMessage = (errData: any): string => {
    if (!errData) return t('pwdUpdateFailed', 'Failed to update password.');
    if (typeof errData === 'string') return errData;
    if (errData.detail) return typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
    if (errData.error) return typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
    if (errData.otp) return Array.isArray(errData.otp) ? errData.otp[0] : String(errData.otp);
    if (errData.old_password) return Array.isArray(errData.old_password) ? errData.old_password[0] : String(errData.old_password);
    if (errData.new_password) return Array.isArray(errData.new_password) ? errData.new_password[0] : String(errData.new_password);
    if (errData.non_field_errors) return Array.isArray(errData.non_field_errors) ? errData.non_field_errors[0] : String(errData.non_field_errors);
    return t('pwdUpdateFailed', 'Failed to update password.');
  };

  const handleSendOtp = async () => {
    setErrorMsg('');
    setSendingOtp(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/send-password-otp/', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.masked_email) {
          setMaskedEmail(data.masked_email);
        }
        setCountdown(60);
        showToast(
          data.message || t('otpSentSuccess', 'Verification code dispatched to your email!'),
          'success'
        );
      } else {
        setErrorMsg(data.error || t('otpSendFailed', 'Failed to dispatch verification code.'));
      }
    } catch {
      setErrorMsg(t('serverOfflineError', 'Server unreachable. Please check connection.'));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg('');
    if (!form.otp || form.otp.length < 6) {
      setErrorMsg(t('enterValidOtp', 'Please enter the complete 6-digit verification code.'));
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetchWithAuth('/api/v1/auth/verify-password-otp/', {
        method: 'POST',
        body: JSON.stringify({ otp: form.otp }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.verified) {
        setIsOtpVerified(true);
        showToast(
          t('codeVerifiedSuccess', 'Code verified successfully! Enter your new password below.'),
          'success'
        );
      } else {
        setErrorMsg(data.error || t('otpVerifyFailed', 'Verification code is invalid or expired.'));
      }
    } catch {
      setErrorMsg(t('serverOfflineError', 'Server unreachable. Please check connection.'));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // If in forgot mode and OTP is not yet verified, clicking submit verifies OTP first
    if (mode === 'forgot' && !isOtpVerified) {
      await handleVerifyOtp();
      return;
    }

    if (mode === 'password' && hasPassword && !form.old_password) {
      setErrorMsg(t('enterCurrentPassword', 'Please enter your current password.'));
      return;
    }

    if (!form.new_password || form.new_password.length < 6) {
      setErrorMsg(t('newPasswordMinLength', 'New password must be at least 6 characters.'));
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setErrorMsg(t('passwordsDoNotMatch', 'Passwords do not match.'));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        new_password: form.new_password,
      };

      if (mode === 'forgot') {
        payload.otp = form.otp;
      } else if (hasPassword && form.old_password) {
        payload.old_password = form.old_password;
      }

      const res = await fetchWithAuth('/api/v1/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (!hasPassword) {
          showToast(t('pwdSetSuccess', 'Account password set successfully!'), 'success');
          onPasswordSet?.();
        } else if (data.email_notification_sent) {
          showToast(t('pwdUpdatedWithEmailAlert', 'Password updated! A security alert was dispatched to your email.'), 'success');
        } else {
          showToast(t('pwdUpdatedSuccess', 'Password changed successfully!'), 'success');
        }
        setForm({ old_password: '', new_password: '', confirm_password: '', otp: '' });
        onClose();
      } else {
        setErrorMsg(extractErrorMessage(data));
      }
    } catch {
      setErrorMsg(t('serverOfflineError', 'Server unreachable. Please check connection.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer
      padding="none"
      spacing="normal"
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          saveLabel={
            mode === 'forgot' && !isOtpVerified
              ? t('verifyCode', 'Verify Code')
              : hasPassword
              ? t('changePasswordTitle', 'Change Password')
              : t('saveSetPasswordLabel', 'Set Password')
          }
          cancelLabel={t('cancel', 'Cancel')}
          isSubmitting={saving || verifyingOtp}
        />
      }
    >
      <form onSubmit={handleSubmit} className="@container space-y-5 pt-2 pb-6 px-1">
        {/* Streamlined Section Header */}
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          {hasPassword ? (
            <LockIcon className="w-4 h-4 theme-accent shrink-0" />
          ) : (
            <KeyIcon className="w-4 h-4 theme-accent shrink-0" />
          )}
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary truncate">
              {hasPassword
                ? t('drawerPasswordTitle', 'Update Account Password')
                : t('drawerSetPasswordTitle', 'Set Account Password')}
            </h4>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl theme-bg-danger-soft theme-danger border-0 text-xs flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Linked Informative Banner for Social SSO Accounts */}
        {!hasPassword && (
          <div className="p-4 rounded-2xl theme-bg-app border-0 shadow-xs flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 shadow-xs">
              <KeyIcon className="w-4 h-4" />
            </div>
            <p className="text-xs theme-text-secondary leading-relaxed">
              {t(
                'googleLinkedNotice',
                'Your account is linked to Google sign-in. Creating an account password will allow you to sign in using your email and password as well.'
              )}
            </p>
          </div>
        )}

        {/* Standard Flow: Current Password with Forgot Password link right below it */}
        {mode === 'password' && hasPassword && (
          <div className="space-y-1.5">
            <CustomInput
              type="password"
              label={t('currentPassword', 'Current Password')}
              value={form.old_password}
              onChange={(val: any) =>
                setForm((prev) => ({
                  ...prev,
                  old_password: typeof val === 'string' ? val : val?.target?.value || '',
                }))
              }
              placeholder={t('enterCurrentPassword', 'Enter current password')}
              autoFocus
            />

            {/* Clean Forgot Password Action directly below Current Password */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setIsOtpVerified(false);
                  setErrorMsg('');
                  if (user?.email) {
                    handleSendOtp();
                  }
                }}
                className="text-xs font-medium theme-accent hover:underline cursor-pointer border-0 ring-0 bg-transparent p-0 flex items-center gap-1"
              >
                <span>{t('forgotPassword', 'Forgot password?')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Forgot Password OTP Verification Flow */}
        {mode === 'forgot' && (
          <div className="space-y-4 animate-fade-in">
            {/* Email OTP Notice Banner */}
            <div className="p-4 rounded-2xl theme-bg-app border-0 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 shadow-xs">
                  <MailIcon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs min-w-0 flex-1">
                  <div className="font-bold theme-text-primary">
                    {t('otpModeTitle', 'Email Verification Code')}
                  </div>
                  <div className="text-[11px] theme-text-secondary leading-relaxed">
                    {t('enterOtpToProceed', 'A 6-digit verification code has been dispatched to your email.')}
                  </div>
                  {maskedEmail && (
                    <div className="text-xs font-mono font-bold theme-accent pt-0.5">
                      {maskedEmail}
                    </div>
                  )}
                </div>
              </div>

              {!isOtpVerified && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] theme-text-secondary">
                    {countdown > 0 ? (
                      <span>{t('resendIn', `Resend code in ${countdown}s`, { seconds: countdown })}</span>
                    ) : (
                      <span>{t('didNotReceiveCode', "Didn't receive the email?")}</span>
                    )}
                  </span>

                  <CustomButton
                    type="button"
                    variant="sub"
                    size="xs"
                    icon={RefreshIcon}
                    onClick={handleSendOtp}
                    disabled={sendingOtp || countdown > 0 || !user?.email}
                    isLoading={sendingOtp}
                    className="rounded-xl px-3"
                  >
                    {t('resendCode', 'Resend Code')}
                  </CustomButton>
                </div>
              )}
            </div>

            {/* OTP Code Input or Verified Badge */}
            {!isOtpVerified ? (
              <div className="space-y-3">
                <CustomInput
                  type="text"
                  label={t('otpCodeLabel', '6-Digit Verification Code')}
                  value={form.otp}
                  onChange={(val: any) => {
                    const raw = typeof val === 'string' ? val : val?.target?.value || '';
                    const cleaned = raw.replace(/\D/g, '').slice(0, 6);
                    setForm((prev) => ({ ...prev, otp: cleaned }));
                  }}
                  placeholder={t('otpCodePlaceholder', 'Enter 6-digit OTP')}
                  maxLength={6}
                  className="text-center font-mono text-base tracking-widest font-bold"
                  autoFocus
                />

                <CustomButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || form.otp.length < 6}
                  isLoading={verifyingOtp}
                  className="w-full rounded-2xl py-2.5 font-bold"
                >
                  {t('verifyCode', 'Verify Code')}
                </CustomButton>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('password');
                      setIsOtpVerified(false);
                      setErrorMsg('');
                    }}
                    className="text-xs theme-text-secondary hover:theme-text-primary underline cursor-pointer border-0 ring-0 bg-transparent p-0"
                  >
                    {t('rememberPasswordPrompt', 'Remember your password?')} {t('switchToPasswordMode', 'Use Current Password')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 flex items-center justify-between text-xs font-semibold animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                  <span>{t('codeVerifiedSuccess', 'Code verified successfully! Enter your new password below.')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('password');
                    setIsOtpVerified(false);
                    setErrorMsg('');
                  }}
                  className="text-[11px] theme-text-secondary hover:underline cursor-pointer bg-transparent border-0 p-0 ml-2 shrink-0"
                >
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gate: New Password & Confirm Password are ONLY shown when:
            1. !hasPassword (Google linked account setting password for first time)
            2. mode === 'password' (standard password change with current password)
            3. mode === 'forgot' AND isOtpVerified === true (OTP verified successfully)
        */}
        {(!hasPassword || mode === 'password' || (mode === 'forgot' && isOtpVerified)) && (
          <div className="space-y-4 animate-fade-in">
            {/* New Password */}
            <CustomInput
              type="password"
              label={t('newPassword', 'New Password')}
              value={form.new_password}
              onChange={(val: any) =>
                setForm((prev) => ({
                  ...prev,
                  new_password: typeof val === 'string' ? val : val?.target?.value || '',
                }))
              }
              placeholder={t('enterNewPassword', 'Minimum 6 characters')}
              autoFocus={!hasPassword || (mode === 'forgot' && isOtpVerified)}
            />

            {/* Strength Meter Bar */}
            {form.new_password && (
              <div className="space-y-1.5 p-3.5 rounded-2xl theme-bg-app border-0 shadow-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="theme-text-secondary">{t('passwordStrength', 'Password Strength')}:</span>
                  <span className={`font-semibold ${strength.color}`}>{strength.text}</span>
                </div>
                <div className="h-1.5 w-full theme-bg-sub rounded-full overflow-hidden border-0">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      score <= 1
                        ? 'theme-bg-danger'
                        : score === 2
                        ? 'bg-amber-500'
                        : 'theme-bg-accent'
                    } ${strength.width}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] theme-text-secondary pt-1">
                  <span className={hasMinLength ? 'theme-accent flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckIcon className="w-3 h-3" /> {t('rule6Chars', '6+ characters')}
                  </span>
                  <span className={hasUpper ? 'theme-accent flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckIcon className="w-3 h-3" /> {t('ruleUppercase', 'Uppercase letter')}
                  </span>
                  <span className={hasNumber ? 'theme-accent flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckIcon className="w-3 h-3" /> {t('ruleNumber', 'Number (0-9)')}
                  </span>
                  <span className={hasSpecial ? 'theme-accent flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckIcon className="w-3 h-3" /> {t('ruleSymbol', 'Special symbol')}
                  </span>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <CustomInput
              type="password"
              label={t('confirmPassword', 'Confirm New Password')}
              value={form.confirm_password}
              onChange={(val: any) =>
                setForm((prev) => ({
                  ...prev,
                  confirm_password: typeof val === 'string' ? val : val?.target?.value || '',
                }))
              }
              placeholder={t('retypeNewPassword', 'Retype new password')}
            />
          </div>
        )}
      </form>
    </DrawerContainer>
  );
};

export default ChangePasswordDrawer;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { auth as authStore } from '../../../utils/localStore';
import {
  AlertCircleIcon,
  CheckIcon,
  MailIcon,
  RefreshIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { useTranslation } from '../../../i18n';

export interface ChangeEmailDrawerProps {
  initialMode?: 'change' | 'verify';
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangeEmailDrawer: React.FC<ChangeEmailDrawerProps> = ({
  initialMode = 'change',
  onClose,
  onSuccess,
}) => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  // Determine mode: if user explicitly opened in 'verify' mode or has an unverified email with no initialMode override
  const [mode, setMode] = useState<'change' | 'verify'>(
    initialMode === 'verify' || (user?.email && !user?.is_email_verified && initialMode !== 'change')
      ? 'verify'
      : 'change'
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  // Step 1: Dispatch verification OTP
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (mode === 'change') {
      const cleanEmail = newEmail.trim().toLowerCase();
      if (!cleanEmail) {
        setErrorMsg(t('enterNewEmailError', 'Please enter a valid new email address.'));
        return;
      }
      if (!isValidEmail(cleanEmail)) {
        setErrorMsg(t('invalidEmailFormat', 'Please provide a valid email format (e.g. name@domain.com).'));
        return;
      }
      if (user?.email && cleanEmail === user.email.toLowerCase()) {
        setErrorMsg(t('sameEmailError', 'The new email address cannot be identical to your current email.'));
        return;
      }

      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/auth/request-email-change/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_email: cleanEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || data.detail || t('failedToSendCode', 'Failed to send verification code.'));
          return;
        }

        showToast(
          data.message || t('emailVerificationCodeSent', 'Verification code sent to your email address.'),
          'success'
        );
        setStep(2);
        setResendCooldown(60);
      } catch (err: any) {
        setErrorMsg(err.message || t('networkError', 'Network error. Please try again.'));
      } finally {
        setLoading(false);
      }
    } else {
      // mode === 'verify' (verifying existing email)
      if (!user?.email) {
        setErrorMsg(t('noEmailToVerify', 'No email address registered to verify. Please set one first.'));
        return;
      }

      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/auth/send-verification-otp/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || data.detail || t('failedToSendCode', 'Failed to send verification code.'));
          return;
        }

        showToast(
          data.message || t('emailVerificationCodeSent', 'Verification code sent to your email address.'),
          'success'
        );
        setStep(2);
        setResendCooldown(60);
      } catch (err: any) {
        setErrorMsg(err.message || t('networkError', 'Network error. Please try again.'));
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 2: Confirm OTP code
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMsg(t('enterValidOtp', 'Please enter the complete 6-digit verification code.'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'change') {
        const res = await fetchWithAuth('/api/v1/auth/confirm-email-change/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp: cleanOtp }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || data.detail || t('otpVerifyFailed', 'Verification code is invalid or expired.'));
          return;
        }

        const updatedUser = {
          ...user,
          email: newEmail.trim().toLowerCase(),
          is_email_verified: true,
        };
        setUser(updatedUser);
        authStore.saveUserProfile(updatedUser);
        window.dispatchEvent(new CustomEvent('spr_auth_updated'));

        showToast(
          data.message || t('emailUpdatedSuccess', 'Email address updated and verified successfully!'),
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        // mode === 'verify'
        const res = await fetchWithAuth('/api/v1/auth/verify-email-code/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp: cleanOtp }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || data.detail || t('otpVerifyFailed', 'Verification code is invalid or expired.'));
          return;
        }

        const updatedUser = {
          ...user,
          is_email_verified: true,
        };
        setUser(updatedUser);
        authStore.saveUserProfile(updatedUser);
        window.dispatchEvent(new CustomEvent('spr_auth_updated'));

        showToast(
          data.message || t('emailVerifiedSuccess', 'Email address verified successfully!'),
          'success'
        );
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('networkError', 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const targetRecipient = mode === 'change' ? newEmail.trim() : user?.email || '';

  const fullName =
    user?.first_name || user?.last_name
      ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
      : (user as any)?.name || (user as any)?.display_name || user?.username || t('userFallback', 'User Profile');

  const avatarInitial = fullName.charAt(0).toUpperCase();
  const avatarUrl = user?.avatar_url || (user as any)?.avatar;

  return (
    <DrawerContainer
      padding="none"
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={step === 1 ? handleRequestCode : handleVerifyOtp}
          saveLabel={
            step === 1
              ? t('sendVerificationCode', 'Send Verification Code')
              : mode === 'change'
              ? t('verifyAndUpdate', 'Verify & Update Email')
              : t('verifyCurrentEmail', 'Verify Email Address')
          }
          cancelLabel={t('cancel', 'Cancel')}
          isSubmitting={loading}
        />
      }
    >
      <div className="space-y-6 pt-2">
        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl border theme-bg-danger-soft border-rose-500/25 theme-danger flex items-start gap-2.5 text-xs animate-fade-in">
            <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Current Email Status Card */}
        <div className="p-4 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b theme-border">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              {t('currentEmailLabel', 'Current Account Email')}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                user?.is_email_verified
                  ? 'theme-bg-accent-soft theme-accent'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}
            >
              {user?.is_email_verified ? (
                <>
                  <CheckIcon className="w-3 h-3" />
                  <span>{t('statusVerified', 'Verified')}</span>
                </>
              ) : (
                <>
                  <AlertCircleIcon className="w-3 h-3" />
                  <span>{t('statusUnverified', 'Unverified')}</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-bg-sub flex items-center justify-center shrink-0 border theme-border">
              <MailIcon className="w-4 h-4 theme-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold theme-text-primary truncate">
                {user?.email || t('noEmailConfigured', 'No email configured')}
              </p>
              <p className="text-xs theme-text-secondary">
                {user?.is_email_verified
                  ? t('emailVerifiedDesc', 'Secured for account recovery & authentication notifications')
                  : t('emailUnverifiedDesc', 'Unverified: Needs email confirmation for recovery alerts')}
              </p>
            </div>
          </div>

          {/* Mode Switcher Toggle if user has unverified email */}
          {user?.email && !user?.is_email_verified && (
            <div className="pt-2 flex items-center gap-2 border-t theme-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'verify' ? 'change' : 'verify');
                  setStep(1);
                  setOtp('');
                  setErrorMsg('');
                }}
                className="text-xs font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>
                  {mode === 'verify'
                    ? t('switchToChangeEmail', 'Want to use a different email? Change Email')
                    : t('switchToVerifyEmail', 'Want to verify current email? Verify Now')}
                </span>
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* STEP 1: Enter Email or Trigger Verification */}
        {step === 1 && (
          <DrawerSection
            title={
              mode === 'change'
                ? t('changeEmailTitle', 'Change Email Address')
                : t('verifyEmailTitle', 'Verify Email Address')
            }
            icon={mode === 'change' ? MailIcon : ShieldCheckIcon}
          >
            <div className="space-y-4">
              {mode === 'change' ? (
                <div className="space-y-3">
                  <CustomInput
                    type="email"
                    label={t('newEmailLabel', 'New Email Address')}
                    value={newEmail}
                    onChange={(e: any) => setNewEmail(typeof e === 'string' ? e : e.target.value)}
                    placeholder={t('newEmailPlaceholder', 'Enter your new email address')}
                    autoFocus
                  />
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {t(
                      'emailChangeNotice',
                      'A 6-digit confirmation code will be dispatched to this new address. Your account credentials will only update after you confirm the code.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border theme-border theme-bg-sub/50 space-y-2">
                  <p className="text-xs font-medium theme-text-primary">
                    {t('verifyEmailActionHeading', 'Send Verification Code to Current Email')}
                  </p>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {t(
                      'verifyEmailActionDesc',
                      'Click below to receive a secure 6-digit code at your current email address to complete verification.'
                    )}
                  </p>
                </div>
              )}
            </div>
          </DrawerSection>
        )}

        {/* STEP 2: Enter 6-Digit OTP */}
        {step === 2 && (
          <DrawerSection
            title={t('enterOtpPrompt', 'Enter 6-Digit Verification Code')}
            icon={ShieldCheckIcon}
          >
            <div className="space-y-4">
              {/* Account Identity & Recipient Card with Avatar & Name */}
              <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border theme-border overflow-hidden theme-bg-sub shrink-0 flex items-center justify-center shadow-2xs">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold theme-text-primary">{avatarInitial}</span>
                    )}
                  </div>
                  <div className="min-w-0 pr-1 space-y-0.5">
                    <span className="font-semibold text-xs theme-text-primary block truncate">
                      {fullName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary flex-wrap">
                      <span className="truncate">{t('codeDispatchedTo', 'Code sent to:')}</span>
                      <span className="font-semibold font-mono theme-accent truncate">
                        {targetRecipient}
                      </span>
                    </div>
                  </div>
                </div>
                {mode === 'change' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp('');
                      setErrorMsg('');
                    }}
                    className="text-xs font-semibold theme-accent hover:underline shrink-0 cursor-pointer px-2 py-1 rounded-lg hover:theme-bg-sub transition-colors"
                  >
                    {t('editEmail', 'Change')}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold theme-text-secondary">
                  {t('verificationCodeLabel', '6-Digit Verification Code')}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoFocus
                  className="w-full text-center text-2xl font-mono font-bold tracking-[0.4em] py-3 px-4 rounded-xl border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:border-[var(--accent-main)] transition shadow-xs"
                />
              </div>

              {/* Resend Cooldown Counter */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="theme-text-secondary">
                  {resendCooldown > 0
                    ? t('resendIn', 'Resend code in {{seconds}}s', { seconds: resendCooldown })
                    : t('didNotReceiveCode', "Didn't receive the email?")}
                </span>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleRequestCode}
                  className="font-semibold theme-accent hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('resendCode', 'Resend Code')}</span>
                </button>
              </div>
            </div>
          </DrawerSection>
        )}
      </div>
    </DrawerContainer>
  );
};

export default ChangeEmailDrawer;

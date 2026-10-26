import React, { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { AlertCircleIcon, CheckIcon, LockIcon } from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';
import { DrawerContainer, DrawerFooter, DrawerSection } from '../../../components/layout';
import { useTranslation } from '../../../i18n';

interface ChangePasswordDrawerProps {
  onClose: () => void;
}

export const ChangePasswordDrawer: React.FC<ChangePasswordDrawerProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    if (errData.old_password) return Array.isArray(errData.old_password) ? errData.old_password[0] : String(errData.old_password);
    if (errData.new_password) return Array.isArray(errData.new_password) ? errData.new_password[0] : String(errData.new_password);
    if (errData.non_field_errors) return Array.isArray(errData.non_field_errors) ? errData.non_field_errors[0] : String(errData.non_field_errors);
    return t('pwdUpdateFailed', 'Failed to update password.');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!form.old_password) {
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
      const res = await fetchWithAuth('/api/v1/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          old_password: form.old_password,
          new_password: form.new_password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.email_notification_sent) {
          showToast(t('pwdUpdatedWithEmailAlert', 'Password updated! A security alert was dispatched to your email.'), 'success');
        } else {
          showToast(t('pwdUpdatedSuccess', 'Password changed successfully!'), 'success');
        }
        setForm({ old_password: '', new_password: '', confirm_password: '' });
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
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-5 pt-2 pb-6 px-1">
        <DrawerSection
          title={t('drawerPasswordTitle', 'Update Account Password')}
          subtitle={t('drawerPasswordSubtitle', 'Choose a strong password to safeguard account access.')}
          icon={LockIcon}
          className="pt-0 first:pt-0"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl theme-bg-danger-soft border border-rose-500/20 theme-danger text-xs flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Password */}
          <CustomInput
            type="password"
            label={t('currentPassword', 'Current Password')}
            value={form.old_password}
            onChange={(val: any) =>
              setForm((prev) => ({ ...prev, old_password: typeof val === 'string' ? val : val?.target?.value || '' }))
            }
            placeholder={t('enterCurrentPassword', 'Enter current password')}
            autoFocus
          />

          {/* New Password */}
          <CustomInput
            type="password"
            label={t('newPassword', 'New Password')}
            value={form.new_password}
            onChange={(val: any) =>
              setForm((prev) => ({ ...prev, new_password: typeof val === 'string' ? val : val?.target?.value || '' }))
            }
            placeholder={t('enterNewPassword', 'Minimum 6 characters')}
          />

          {/* Strength Meter Bar */}
          {form.new_password && (
            <div className="space-y-1.5 p-3.5 rounded-xl theme-bg-sub/50 border theme-border">
              <div className="flex items-center justify-between text-[11px]">
                <span className="theme-text-secondary">{t('passwordStrength', 'Password Strength')}:</span>
                <span className={`font-semibold ${strength.color}`}>{strength.text}</span>
              </div>
              <div className="h-1.5 w-full theme-bg-sub rounded-full overflow-hidden border theme-border">
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
              setForm((prev) => ({ ...prev, confirm_password: typeof val === 'string' ? val : val?.target?.value || '' }))
            }
            placeholder={t('retypeNewPassword', 'Retype new password')}
          />
        </DrawerSection>
      </form>

      <DrawerFooter
        onCancel={onClose}
        onSubmit={handleSubmit}
        saveLabel={t('changePasswordTitle', 'Change Password')}
        cancelLabel={t('cancel', 'Cancel')}
        isSubmitting={saving}
      />
    </DrawerContainer>
  );
};

export default ChangePasswordDrawer;

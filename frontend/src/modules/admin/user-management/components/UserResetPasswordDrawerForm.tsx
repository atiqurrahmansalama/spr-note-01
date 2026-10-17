import React, { useState } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useUserTranslation } from '../hooks/useUserTranslation';
import { KeyIcon, LockIcon, SaveIcon } from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import { DrawerContainer, DrawerFooter } from '../../../../components/layout';
import { UserRecord } from '../types';

export interface UserResetPasswordDrawerFormProps {
  user: UserRecord | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export const UserResetPasswordDrawerForm: React.FC<UserResetPasswordDrawerFormProps> = ({
  user,
  onSaved,
  onCancel,
}) => {
  const { showToast } = useToast();
  const { t } = useUserTranslation();
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const displayName =
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.name || user?.email || 'User';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast(t('toasts.passwordMinLength', 'Password must be at least 8 characters long.'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('toasts.passwordsDoNotMatch', 'Passwords do not match.'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (!user?.id) throw new Error('User identifier not found.');

      // Try dedicated reset-password action endpoint first
      let res = await fetchWithAuth(`/api/v1/users/${user.id}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword, password: newPassword }),
      });

      // Fallback to PATCH /api/v1/users/{id}/ with password
      if (!res.ok) {
        res = await fetchWithAuth(`/api/v1/users/${user.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword }),
        });
      }

      if (res.ok) {
        showToast(
          t('toasts.passwordReset', `Password successfully reset for ${displayName}!`, {
            name: displayName,
          }),
          'success'
        );
        onSaved?.();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || 'Failed to reset password.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2 text-left">
        {/* User Identity Info Card */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border theme-border font-bold text-sm">
            {(user?.first_name?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold theme-text-primary truncate">{displayName}</h4>
            <p className="text-xs theme-text-secondary font-mono truncate">
              {user?.email || user?.phone_number || '—'}
            </p>
          </div>
        </div>

        {/* Password Reset Section (Streamlined Header - Zero Boxed Cards) */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <LockIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('drawers.securitySection', 'Security Credentials')}
            </h3>
          </div>

          <div className="space-y-3.5">
            <CustomInput
              label={t('fields.newPassword', 'New Password')}
              type="password"
              placeholder={t('fields.passwordPlaceholder', 'Minimum 8 characters')}
              icon={KeyIcon}
              value={newPassword}
              onChange={(val) => setNewPassword(val)}
              required={true}
              helperText={t('toasts.passwordMinLength', 'Must contain at least 8 alphanumeric characters.')}
            />

            <CustomInput
              label={t('fields.confirmPassword', 'Confirm New Password')}
              type="password"
              placeholder={t('fields.confirmPassword', 'Re-type new password')}
              icon={KeyIcon}
              value={confirmPassword}
              onChange={(val) => setConfirmPassword(val)}
              required={true}
            />
          </div>
        </div>

        {/* Action Footer */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isDisabled={!newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
          saveLabel={t('resetPassword', 'Update Password')}
          saveIcon={SaveIcon}
        />
      </form>
    </DrawerContainer>
  );
};

export default UserResetPasswordDrawerForm;

import React, { useEffect, useState } from 'react';
import { CustomButton, CustomCheckbox, CustomInput, useToast } from '@repo/ui';
import type { UniverseMemberItem } from '../../../types';
import { useAdminTranslation } from '../locales';
import { CheckIcon, LockClosedIcon, MailIcon, UsersIcon } from '../../../components/icons/UniverseIcons';

interface RecipientAccessTabProps {
  members: UniverseMemberItem[];
  onSaveRecipient: (payload: {
    email: string;
    display_name: string;
    password?: string;
    is_active: boolean;
  }) => Promise<unknown>;
}

export const RecipientAccessTab: React.FC<RecipientAccessTabProps> = ({
  members,
  onSaveRecipient,
}) => {
  const { t, formatDate } = useAdminTranslation();
  const { showToast } = useToast();

  const existingRecipient = members.find((m) => m.role === 'RECIPIENT');

  const [email, setEmail] = useState(existingRecipient?.email || '');
  const [displayName, setDisplayName] = useState(existingRecipient?.display_name || '');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(existingRecipient ? existingRecipient.is_active : true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingRecipient) {
      setEmail(existingRecipient.email || '');
      setDisplayName(existingRecipient.display_name || '');
      setIsActive(existingRecipient.is_active);
    }
  }, [existingRecipient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveRecipient({
        email: email.trim(),
        display_name: displayName.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        is_active: isActive,
      });
      setPassword('');
      showToast(t('recipient.saved', 'Recipient credentials & membership updated.'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update recipient.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="@container space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl theme-bg-surface p-6 space-y-5 shadow-xs border-0"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-base font-bold theme-text-primary">
              {t('recipient.title', 'Private Recipient Provisioning')}
            </h3>
          </div>
          <p className="text-xs theme-text-secondary">
            {t(
              'recipient.subtitle',
              'Create or update the single private Recipient account. Public registration remains disabled.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          <CustomInput
            type="email"
            variant="app"
            icon={MailIcon}
            label={t('recipient.email', 'Recipient Login Email')}
            value={email}
            onChange={(val: string) => setEmail(val)}
            required
          />
          <CustomInput
            variant="app"
            label={t('recipient.displayName', 'Recipient Name')}
            value={displayName}
            onChange={(val: string) => setDisplayName(val)}
            required
          />
        </div>

        <CustomInput
          type="password"
          variant="app"
          icon={LockClosedIcon}
          label={t('recipient.password', 'Set / Reset Password')}
          placeholder={t('recipient.passwordPlaceholder', 'Required when creating, optional on update')}
          value={password}
          onChange={(val: string) => setPassword(val)}
        />

        <div className="p-4 rounded-2xl theme-bg-app">
          <CustomCheckbox
            checked={isActive}
            onChange={(checked: boolean) => setIsActive(checked)}
            label={t('recipient.isActive', 'Private Access Active')}
          />
        </div>

        <div className="flex justify-end">
          <CustomButton
            type="submit"
            variant="primary"
            loading={saving}
            requireAll={[email.trim(), displayName.trim()]}
            icon={CheckIcon}
          >
            {t('recipient.saveRecipient', 'Save Recipient Account')}
          </CustomButton>
        </div>
      </form>

      {/* Active Members Summary */}
      <div className="rounded-3xl theme-bg-surface p-6 space-y-3 shadow-xs border-0">
        {members.map((m) => (
          <div
            key={m.id}
            className="p-4 rounded-2xl theme-bg-app flex flex-col @[480px]:flex-row @[480px]:items-center justify-between gap-2"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold theme-text-primary">
                  {m.display_name || m.email}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                  {m.role}
                </span>
              </div>
              <div className="text-xs theme-text-secondary mt-0.5">
                {m.email}
                {m.last_entered_at ? ` • Last active: ${formatDate(m.last_entered_at)}` : ''}
              </div>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full self-start @[480px]:self-auto ${
                m.is_active ? 'theme-bg-success-soft theme-success' : 'theme-bg-danger-soft theme-danger'
              }`}
            >
              {m.is_active ? 'Active' : 'Revoked'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

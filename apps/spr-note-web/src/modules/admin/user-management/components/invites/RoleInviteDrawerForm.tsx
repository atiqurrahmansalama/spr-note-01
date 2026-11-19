import React, { useState } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import {
  KeyIcon,
  SparklesIcon,
  SaveIcon,
  ClockIcon,
} from '../../../../../components/ui/Icons';
import CustomInput from '../../../../../components/ui/CustomInput';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../../components/layout';
import { RoleInviteFormData, UserRole } from '../../types';
import { useRoleInvites } from '../../hooks/useRoleInvites';
import { useUserTranslation } from '../../hooks/useUserTranslation';

export interface RoleInviteDrawerFormProps {
  roles: UserRole[];
  onSaved?: () => void;
  onCancel?: () => void;
}

export const RoleInviteDrawerForm: React.FC<RoleInviteDrawerFormProps> = ({
  roles = [],
  onSaved,
  onCancel,
}) => {
  const { showToast } = useToast();
  const { t } = useUserTranslation();
  const { submitting, createInvite } = useRoleInvites(onSaved);

  const [formData, setFormData] = useState<RoleInviteFormData>({
    title: '',
    target_role: roles.length > 0 ? (roles[0].id || '') : '',
    max_uses: 1,
    expiryPreset: '24h',
  });

  const roleOptions = roles.map((r) => ({
    value: String(r.id),
    label: `${r.name} (${r.code})`,
    desc: `Assigns ${r.name} permissions on onboarding`,
  }));

  const expiryOptions = [
    { value: '1h', label: t('invites.expiry1h', '1 Hour Duration') },
    { value: '24h', label: t('invites.expiry24h', '24 Hours (1 Day)') },
    { value: '7d', label: t('invites.expiry7d', '7 Days (1 Week)') },
    { value: '30d', label: t('invites.expiry30d', '30 Days (1 Month)') },
    { value: 'never', label: t('invites.expiryNever', 'Never Expires (Permanent)') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast(t('toasts.validationError', 'Please fill in all required fields.'), 'warning');
      return;
    }
    if (!formData.target_role) {
      showToast(t('toasts.validationError', 'Please select a target role.'), 'warning');
      return;
    }

    const ok = await createInvite(formData);
    if (ok) {
      onSaved?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <DrawerContainer padding="none" spacing="normal">
        <div className="@container space-y-6 pt-2 text-left">
          {/* Section 1: Overview & Role Specification */}
          <DrawerSection
            title={t('invites.drawerSectionConfig', 'Invite Configuration')}
            icon={KeyIcon}
          >
            <div className="space-y-4">
              <CustomInput
                label={t('invites.batchTitle', 'Title / Batch Label')}
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('invites.batchTitlePlaceholder', 'e.g. Hifz Teachers Batch 2026')}
              />

              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                <CustomSelect
                  label={t('invites.targetRole', 'Target Assigned Role')}
                  value={String(formData.target_role)}
                  options={roleOptions}
                  onChange={(val) => setFormData({ ...formData, target_role: val })}
                />

                <CustomInput
                  label={t('invites.maxUses', 'Max Allowed Usages')}
                  type="number"
                  min={0}
                  value={String(formData.max_uses)}
                  onChange={(e) =>
                    setFormData({ ...formData, max_uses: parseInt(e.target.value, 10) || 0 })
                  }
                  helperText={t('invites.maxUsesHelp', 'Enter 0 for unlimited registrations')}
                  className="font-mono"
                />
              </div>
            </div>
          </DrawerSection>

          {/* Section 2: Expiration & Security Settings */}
          <DrawerSection
            title={t('invites.drawerSectionSecurity', 'Expiration & Security')}
            icon={ClockIcon}
          >
            <div className="space-y-3">
              <CustomSelect
                label={t('invites.validityPeriod', 'Token Validity Period')}
                value={formData.expiryPreset || '24h'}
                options={expiryOptions}
                onChange={(val) => setFormData({ ...formData, expiryPreset: val })}
              />

              <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-start gap-3">
                <div className="p-2 rounded-xl theme-bg-surface theme-accent border theme-border shrink-0 mt-0.5">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  {t(
                    'invites.drawerHelpInfo',
                    'Once generated, users scanning the QR code or opening the join link will automatically be onboarded into your academy with the specified authority role.'
                  )}
                </p>
              </div>
            </div>
          </DrawerSection>
        </div>
      </DrawerContainer>

      <DrawerFooter
        onCancel={onCancel}
        cancelText={t('cancel', 'Discard')}
        confirmText={submitting ? t('saving', 'Generating...') : t('invites.generateInvite', 'Generate Invite & QR')}
        confirmIcon={SaveIcon}
        confirmDisabled={submitting}
        confirmLoading={submitting}
      />
    </form>
  );
};

export default RoleInviteDrawerForm;

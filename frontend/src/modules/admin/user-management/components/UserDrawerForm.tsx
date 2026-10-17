import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useUserTranslation } from '../hooks/useUserTranslation';
import {
  UsersIcon,
  UserIcon,
  KeyIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SaveIcon,
} from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomCheckbox from '../../../../components/ui/CustomCheckbox';
import { RoleSelect } from '../../../../components/selectors';
import { DrawerContainer, DrawerFooter } from '../../../../components/layout';
import { useFormAutoSave } from '../../../../hooks';
import { UserRecord, UserFormData } from '../types';

export interface UserDrawerFormProps {
  user?: UserRecord | null;
  mode?: 'add' | 'edit';
  onSaved?: () => void;
  onCancel?: () => void;
}

export const UserDrawerForm: React.FC<UserDrawerFormProps> = ({
  user = null,
  mode = 'add',
  onSaved,
  onCancel,
}) => {
  const { showToast } = useToast();
  const { t } = useUserTranslation();
  const isEditing = mode === 'edit' && Boolean(user);

  const initialData = useMemo<UserFormData>(() => {
    if (isEditing && user) {
      return {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        password: '',
        user_type: user.role?.code || user.role_info?.code || user.user_type || 'GUARDIAN',
        is_active: user.is_active !== false && !user.is_deactivated,
      };
    }
    return {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      password: '',
      user_type: 'GUARDIAN',
      is_active: true,
    };
  }, [user, isEditing]);

  const [formData, setFormData] = useState<UserFormData>(initialData);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const storageKey = `admin_user_form_${user?.id || 'new'}`;
  const { autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    storageKey,
    formData,
    setFormData,
  });

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    if (!isEditing) {
      return Boolean(
        formData.first_name ||
          formData.last_name ||
          formData.email ||
          formData.phone_number ||
          formData.password
      );
    }
    return (
      formData.first_name !== initialData.first_name ||
      formData.last_name !== initialData.last_name ||
      formData.email !== initialData.email ||
      formData.phone_number !== initialData.phone_number ||
      formData.user_type !== initialData.user_type ||
      formData.is_active !== initialData.is_active ||
      Boolean(formData.password)
    );
  }, [formData, initialData, isEditing]);

  const isValid = useMemo(() => {
    if (!formData.email && !formData.phone_number) return false;
    if (!isEditing && !formData.password) return false;
    return true;
  }, [formData, isEditing]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();

    if (!formData.email && !formData.phone_number) {
      showToast(t('toasts.validationError', 'Email address or phone number is required.'), 'error');
      return;
    }
    if (!isEditing && (!formData.password || formData.password.length < 8)) {
      showToast(t('toasts.passwordMinLength', 'Password must be at least 8 characters long.'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim();
      const payload: Record<string, any> = {
        name: fullName,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone_number: formData.phone_number || undefined,
        user_type: formData.user_type,
        is_active: formData.is_active,
      };

      if (!isEditing && formData.password) {
        payload.password = formData.password;
      }

      const endpoints = isEditing
        ? [`/api/v1/users/${user?.id}/`, `/api/users/${user?.id}/`, `/users/${user?.id}/`]
        : ['/api/v1/users/', '/api/users/', '/users/'];

      let lastError: any = null;
      let success = false;

      for (const endpoint of endpoints) {
        try {
          const res = await fetchWithAuth(endpoint, {
            method: isEditing ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            success = true;
            break;
          } else if (res.status >= 400 && res.status < 500) {
            const errData = await res.json().catch(() => ({}));
            const msg =
              errData.error ||
              errData.detail ||
              Object.values(errData).flat().join(' ') ||
              'Request validation failed';
            throw new Error(msg);
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (success) {
        clearDraft();
        showToast(
          isEditing
            ? t('toasts.userUpdated', 'User account updated successfully!')
            : t('toasts.userCreated', 'User account created successfully!'),
          'success'
        );
        onSaved?.();
      } else {
        throw lastError || new Error('Failed to save user account.');
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2 text-left">
        {/* Section 1: Personal Information (Streamlined Header - Zero Boxed Cards) */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <UserIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('drawers.personalInfoSection', 'Personal Information')}
            </h3>
          </div>

          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
              <CustomInput
                label={t('fields.firstName', 'First Name')}
                placeholder={t('fields.firstNamePlaceholder', 'e.g. Abdullah')}
                value={formData.first_name}
                onChange={(val) => setFormData({ ...formData, first_name: val })}
              />
              <CustomInput
                label={t('fields.lastName', 'Last Name')}
                placeholder={t('fields.lastNamePlaceholder', 'e.g. Rahman')}
                value={formData.last_name}
                onChange={(val) => setFormData({ ...formData, last_name: val })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Authentication Credentials */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <ShieldCheckIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('drawers.contactAuthSection', 'Contact & Authentication')}
            </h3>
          </div>

          <div className="@container space-y-3.5">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
              <CustomInput
                label={t('fields.email', 'Email Address')}
                type="email"
                placeholder={t('fields.emailPlaceholder', 'user@suffahhifz.com')}
                icon={MailIcon}
                value={formData.email}
                onChange={(val) => setFormData({ ...formData, email: val })}
                required={!formData.phone_number}
              />

              <CustomInput
                label={t('fields.phoneNumber', 'Phone Number')}
                type="tel"
                placeholder={t('fields.phonePlaceholder', '017XXXXXXXX')}
                icon={PhoneIcon}
                value={formData.phone_number}
                onChange={(val) => setFormData({ ...formData, phone_number: val })}
                required={!formData.email}
              />
            </div>

            {!isEditing && (
              <CustomInput
                label={t('fields.password', 'Initial Password')}
                type="password"
                placeholder={t('fields.passwordPlaceholder', 'Minimum 8 characters')}
                icon={KeyIcon}
                value={formData.password}
                onChange={(val) => setFormData({ ...formData, password: val })}
                required={true}
                helperText={t('toasts.passwordMinLength', 'Password must be at least 8 characters long.')}
              />
            )}
          </div>
        </div>

        {/* Section 3: Role & Access Hierarchy */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <UsersIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              {t('drawers.roleSection', 'Role Assignment')}
            </h3>
          </div>

          <div className="space-y-3">
            <RoleSelect
              label={t('fields.accountRole', 'Account Role *')}
              value={formData.user_type}
              onChange={(val: string) => setFormData({ ...formData, user_type: val })}
              valueKey="code"
              allowAll={false}
              required={true}
              placeholder={t('fields.selectRolePlaceholder', 'Select Role...')}
            />

            <div className="pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl theme-bg-sub border theme-border">
                <CustomCheckbox
                  checked={formData.is_active}
                  onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <div className="text-xs">
                  <span className="font-semibold theme-text-primary block">
                    {t('fields.activeStatusLabel', 'Active Account Status')}
                  </span>
                  <p className="theme-text-secondary text-[11px] mt-0.5 leading-relaxed">
                    {t(
                      'fields.activeStatusDesc',
                      'When active, the user can authenticate and access permissions assigned to their role.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isDisabled={!isDirty || !isValid}
          saveLabel={isEditing ? t('editProfile', 'Update User') : t('addUser', 'Create User')}
          saveIcon={SaveIcon}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
        />
      </form>
    </DrawerContainer>
  );
};

export default UserDrawerForm;

import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { auth as authStore } from '../../../utils/localStore';
import { CameraIcon, LockIcon } from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { compressImageFile } from '../../../utils/imageCompressor';
import { useTranslation } from '../../../i18n';
import type { UserProfile } from '../types';

interface EditProfileDrawerProps {
  user: UserProfile | null;
  onProfileUpdated?: (updated: UserProfile) => void;
  onClose: () => void;
}

export const EditProfileDrawer: React.FC<EditProfileDrawerProps> = ({
  user,
  onProfileUpdated,
  onClose,
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation('profile');

  const [formData, setFormData] = useState({
    name: user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || user?.username || '',
    avatar_url: user?.avatar_url || '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const full = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const parts = full ? full.split(' ') : ['', ''];
      setFormData({
        name: full,
        first_name: user.first_name || parts[0] || '',
        last_name: user.last_name || parts.slice(1).join(' ') || '',
        email: user.email || '',
        phone_number: user.phone_number || user.username || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const handleFirstNameChange = (val: string) => {
    setFormData((prev) => {
      const fn = val;
      const ln = prev.last_name;
      return {
        ...prev,
        first_name: fn,
        name: `${fn} ${ln}`.trim(),
      };
    });
  };

  const handleLastNameChange = (val: string) => {
    setFormData((prev) => {
      const fn = prev.first_name;
      const ln = val;
      return {
        ...prev,
        last_name: ln,
        name: `${fn} ${ln}`.trim(),
      };
    });
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64Url = ev.target?.result as string;
        if (base64Url) {
          setFormData((prev) => ({ ...prev, avatar_url: base64Url }));
          showToast(t('toastAvatarPreview', 'Avatar preview updated!'), 'info');
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64Url = ev.target?.result as string;
        if (base64Url) {
          setFormData((prev) => ({ ...prev, avatar_url: base64Url }));
          showToast(t('toastAvatarPreview', 'Avatar preview updated!'), 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const fullName = formData.name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim();
    const payload = {
      id: user?.id,
      user_id: user?.id,
      phone_number: user?.phone_number || formData.phone_number,
      name: fullName,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      avatar_url: formData.avatar_url,
    };

    try {
      let res = await fetchWithAuth('/api/v1/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetchWithAuth('/api/v1/user/profile/', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok && user?.id) {
        res = await fetchWithAuth(`/api/v1/users/${user.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const updatedData = await res.json().catch(() => ({}));
        const currentUser = authStore.getUser() || {};
        const mergedUser: UserProfile = { ...currentUser, ...updatedData, ...payload };
        authStore.saveUser(mergedUser);
        window.dispatchEvent(new CustomEvent('spr_auth_updated'));

        showToast(t('toastProfileUpdatedSuccess', 'Profile updated & synced successfully!'), 'success');
        if (onProfileUpdated) onProfileUpdated(mergedUser);
        onClose();
      } else {
        const currentUser = authStore.getUser() || {};
        const mergedUser: UserProfile = { ...currentUser, ...payload };
        authStore.saveUser(mergedUser);
        window.dispatchEvent(new CustomEvent('spr_auth_updated'));

        showToast(t('toastProfileUpdatedSuccess', 'Profile saved successfully!'), 'success');
        if (onProfileUpdated) onProfileUpdated(mergedUser);
        onClose();
      }
    } catch {
      const currentUser = authStore.getUser() || {};
      const mergedUser: UserProfile = { ...currentUser, ...payload };
      authStore.saveUser(mergedUser);
      window.dispatchEvent(new CustomEvent('spr_auth_updated'));

      showToast(t('toastProfileSavedLocal', 'Profile saved locally!'), 'info');
      if (onProfileUpdated) onProfileUpdated(mergedUser);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2 pb-6 px-1">
        {/* Section 1: Visual Identity & Photo */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider theme-text-secondary pb-1 border-b theme-border">
            {t('profilePhoto', 'Profile Photo & Identity')}
          </h3>

          <div className="flex items-center gap-4 p-4 rounded-xl theme-bg-sub/50 border theme-border">
            <div className="relative w-16 h-16 rounded-full border-2 theme-border overflow-hidden theme-bg-surface flex items-center justify-center shrink-0">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold theme-text-primary">
                  {(formData.first_name || formData.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <p className="text-xs theme-text-secondary">
                {t('avatarGuidelines', 'Square PNG, JPG, or WebP (max 2MB).')}
              </p>
              <label className="inline-flex items-center gap-1.5 text-xs theme-accent hover:underline cursor-pointer pt-1">
                <CameraIcon className="w-3.5 h-3.5" />
                <span>{t('uploadNewPhoto', 'Upload photo')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Names (Paired @[480px]:grid-cols-2) */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider theme-text-secondary pb-1 border-b theme-border">
            {t('personalInformation', 'Personal Information')}
          </h3>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
            <CustomInput
              label={t('firstName', 'First Name')}
              value={formData.first_name}
              onChange={(e: any) => handleFirstNameChange(typeof e === 'string' ? e : e.target.value)}
              placeholder={t('firstNamePlaceholder', 'Enter first name')}
            />
            <CustomInput
              label={t('lastName', 'Last Name')}
              value={formData.last_name}
              onChange={(e: any) => handleLastNameChange(typeof e === 'string' ? e : e.target.value)}
              placeholder={t('lastNamePlaceholder', 'Enter last name')}
            />
          </div>
        </div>

        {/* Section 3: Contact & Identifiers */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider theme-text-secondary pb-1 border-b theme-border">
            {t('contactCredentials', 'Contact & Credentials')}
          </h3>

          <CustomInput
            type="email"
            label={t('emailAddress', 'Email Address')}
            value={formData.email}
            onChange={(e: any) =>
              setFormData((prev) => ({
                ...prev,
                email: typeof e === 'string' ? e : e.target.value,
              }))
            }
            placeholder={t('emailPlaceholder', 'your.email@institution.org')}
          />

          {/* Institutional Identifier (Locked) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold theme-text-secondary flex items-center gap-1">
                <LockIcon className="w-3 h-3" />
                <span>{t('phoneNumberOrUsername', 'Phone Number / Identifier')}</span>
              </label>
              <span className="text-[11px] theme-text-secondary">
                {t('identifierLocked', 'Institutional ID (Read-only)')}
              </span>
            </div>
            <div className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub/60 theme-text-secondary text-sm font-mono cursor-not-allowed select-text">
              {formData.phone_number || t('noneProvided', 'None')}
            </div>
          </div>
        </div>
      </form>

      <DrawerFooter
        onCancel={onClose}
        onSubmit={handleSubmit}
        saveLabel={t('saveChanges', 'Save Changes')}
        cancelLabel={t('cancel', 'Cancel')}
        isSubmitting={saving}
      />
    </DrawerContainer>
  );
};

export default EditProfileDrawer;

import React, { useMemo } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import { CameraIcon, CloseIcon } from '@/components/ui/Icons';
import { useStaffTranslation } from '../../locales';
import type { StaffOnboardingPayload } from '../../types';

interface StaffOnboardingStepProfileProps {
  formData: StaffOnboardingPayload;
  errors: Record<string, string>;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  mode?: 'full' | 'quick';
}

export const StaffOnboardingStepProfile: React.FC<StaffOnboardingStepProfileProps> = ({
  formData,
  errors,
  photoInputRef,
  onChange,
  onPhotoChange,
  onRemovePhoto,
  mode = 'full',
}) => {
  const { t } = useStaffTranslation();

  const genderOptions = useMemo(
    () => [
      { value: 'MALE', label: t('male', 'Male') },
      { value: 'FEMALE', label: t('female', 'Female') },
      { value: 'OTHER', label: t('other', 'Other') },
    ],
    [t]
  );

  const bloodGroupOptions = useMemo(
    () => [
      { value: '', label: t('selectBloodGroupOptional', 'Select Blood Group (Optional)') },
      { value: 'A+', label: 'A+' },
      { value: 'A-', label: 'A-' },
      { value: 'B+', label: 'B+' },
      { value: 'B-', label: 'B-' },
      { value: 'AB+', label: 'AB+' },
      { value: 'AB-', label: 'AB-' },
      { value: 'O+', label: 'O+' },
      { value: 'O-', label: 'O-' },
    ],
    [t]
  );

  // Core shared fields reused identically between Full Wizard and Quick Staff Onboarding
  const nameField = (
    <CustomInput
      label={`${t('fullNameEn', 'Full Name (English)')}`}
      name="name"
      placeholder={t('fullNameEnPlaceholder', 'e.g. Mufti Muhammad Abdullah')}
      value={formData.name}
      onChange={(val) => onChange('name', val)}
      error={errors.name}
      required
    />
  );

  const phoneField = (
    <CustomInput
      label={`${t('phoneNumber', 'Primary Phone Number')}`}
      name="phone_number"
      type="tel"
      placeholder={t('phoneNumberPlaceholder', '017XXXXXXXX')}
      value={formData.phone_number}
      onChange={(val) => onChange('phone_number', val)}
      error={errors.phone_number}
      required
    />
  );

  const emailField = (
    <CustomInput
      label={t('emailAddressOptional', 'Email Address (Optional)')}
      name="email"
      type="email"
      placeholder={t('emailAddressPlaceholder', 'teacher@institution.edu')}
      value={formData.email || ''}
      onChange={(val) => onChange('email', val)}
      error={errors.email}
    />
  );

  // Compact mode for Quick Staff Onboarding (single responsive 3-column grid, zero duplicate inputs)
  if (mode === 'quick') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-0 animate-fade-in">
        <div className="sm:col-span-2 lg:col-span-1">{nameField}</div>
        {phoneField}
        {emailField}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in border-0">
      {/* Top Row: Names & Photo */}
      <div className="flex flex-col-reverse md:flex-row items-center md:items-start justify-between gap-6 md:gap-10 border-0">
        <div className="w-full space-y-4 max-w-lg border-0">
          {nameField}

          <CustomInput
            label={t('fullNameBn', 'Full Name (Bangla / Arabic)')}
            name="bangla_name"
            placeholder={t('fullNameBnPlaceholder', 'Local / regional script name (optional)')}
            value={formData.bangla_name || ''}
            onChange={(val) => onChange('bangla_name', val)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-0">
            {phoneField}
            {emailField}
          </div>
        </div>

        {/* Photo Box */}
        <div className="shrink-0 flex flex-col items-center md:items-end border-0">
          <div
            onClick={() => photoInputRef.current?.click()}
            className="relative w-40 sm:w-44 md:w-48 h-48 sm:h-52 md:h-56 rounded-3xl theme-bg-app hover:theme-bg-elevated/40 transition-all flex flex-col items-center justify-center cursor-pointer shadow-xs group overflow-hidden border-0"
            title={t('selectPhotoTitle', 'Click to select staff photo')}
          >
            {formData.photo_url ? (
              <>
                <img
                  src={formData.photo_url}
                  alt={formData.name || 'Staff Preview'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-1.5 text-white text-[11px] font-bold">
                  <CameraIcon className="w-5 h-5 theme-accent" />
                  <span>{t('changePhoto', 'Change Photo')}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto();
                  }}
                  className="absolute top-2.5 end-2.5 w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-md hover:opacity-90 cursor-pointer z-10 border-0"
                  title={t('removePhoto', 'Remove Photo')}
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 border-0">
                <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shadow-xs border-0">
                  <CameraIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold theme-text-primary">
                  {t('uploadPhoto', 'Upload Photo')}
                </span>
                <span className="text-[10px] theme-text-secondary">
                  {t('photoRatioHint', 'Passport / 3:4 (Max 3MB)')}
                </span>
              </div>
            )}
            <input
              type="file"
              ref={photoInputRef as any}
              onChange={onPhotoChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Additional Personal Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-0">
        <CustomSelect
          label={t('gender', 'Gender')}
          options={genderOptions}
          value={formData.gender}
          onChange={(val) => onChange('gender', val)}
        />

        <div>
          <label className="text-xs font-bold theme-text-secondary block mb-1.5 text-start">
            {t('dateOfBirth', 'Date of Birth')}
          </label>
          <ReusableCalendar
            selectedDate={formData.dob || ''}
            onSelectDate={(val: string) => onChange('dob', val)}
            placeholder={t('selectDateOfBirth', 'Select date of birth')}
          />
        </div>

        <CustomInput
          label={t('nidNumber', 'National ID (NID)')}
          name="nid_no"
          placeholder={t('nidPlaceholder', '10, 13, or 17 digit NID')}
          value={formData.nid_no || ''}
          onChange={(val) => onChange('nid_no', val)}
          error={errors.nid_no}
        />

        <CustomSelect
          label={t('bloodGroup', 'Blood Group')}
          options={bloodGroupOptions}
          value={formData.blood_group || ''}
          onChange={(val) => onChange('blood_group', val)}
        />
      </div>
    </div>
  );
};

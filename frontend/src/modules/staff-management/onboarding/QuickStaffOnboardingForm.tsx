import React, { useState, useEffect, useMemo } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { hasAnyLanguageContent } from '@/i18n/localizedEntity';
import { getDepartments } from '@/api/academy';
import { useStaffCategories } from '../hooks';
import { useStaffOnboardingForm } from './hooks/useStaffOnboardingForm';
import { useStaffTranslation } from '../locales';
import type { StaffOnboardingPayload } from '../types';

export interface QuickStaffOnboardingFormProps {
  initialData?: Partial<StaffOnboardingPayload> | Record<string, any>;
  tokenMeta?: any;
  isPublic?: boolean;
  onFormDataChange?: (data: StaffOnboardingPayload) => void;
  onCompleted?: (result: any) => void;
  onCancel?: () => void;
}

/**
 * Quick Staff Onboarding Form
 * Composes `useStaffOnboardingForm`, `useStaffRanks`, and `useStaffCategories`
 * in a unified 2-column container-responsive grid (every input, including multilang Full Name).
 */
export const QuickStaffOnboardingForm: React.FC<QuickStaffOnboardingFormProps> = ({
  initialData,
  tokenMeta,
  isPublic,
  onFormDataChange,
  onCompleted,
  onCancel,
}) => {
  const { t } = useStaffTranslation();

  const {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleQuickSubmit,
  } = useStaffOnboardingForm({
    initialData,
    tokenMeta,
    isPublic,
    onFormDataChange,
    onCompleted,
  });

  const { categoryOptions } = useStaffCategories({ currentValue: formData.staff_type });

  const filteredCategoryOptions = useMemo(() => {
    if (
      tokenMeta?.allowed_staff_types &&
      Array.isArray(tokenMeta.allowed_staff_types) &&
      tokenMeta.allowed_staff_types.length > 0
    ) {
      const allowedSet = new Set(
        tokenMeta.allowed_staff_types.map((st: string) => String(st).trim().toUpperCase())
      );
      return categoryOptions.filter((opt) => allowedSet.has(opt.value.toUpperCase()));
    }
    return categoryOptions;
  }, [categoryOptions, tokenMeta?.allowed_staff_types]);

  useEffect(() => {
    if (filteredCategoryOptions.length > 0) {
      const isCurrentValid = filteredCategoryOptions.some((opt) => opt.value === formData.staff_type);
      if (!isCurrentValid) {
        handleChange('staff_type', filteredCategoryOptions[0].value);
      }
    }
  }, [filteredCategoryOptions, formData.staff_type]);

  const [departmentsList, setDepartmentsList] = useState<any[]>(() => {
    if (tokenMeta?.departments && Array.isArray(tokenMeta.departments)) {
      return tokenMeta.departments;
    }
    return [];
  });

  useEffect(() => {
    if (tokenMeta?.departments && Array.isArray(tokenMeta.departments)) {
      setDepartmentsList(tokenMeta.departments);
      return;
    }
    if (!isPublic) {
      let isMounted = true;
      getDepartments({ page_size: 500, all: true })
        .then((data: any) => {
          if (isMounted) {
            const list = Array.isArray(data) ? data : data?.results || [];
            setDepartmentsList(list);
          }
        })
        .catch((err) => console.warn('Failed to load departments in quick onboarding form:', err));
      return () => {
        isMounted = false;
      };
    }
  }, [tokenMeta?.departments, isPublic]);

  const departmentOptions = useMemo(() => {
    let list = departmentsList;
    if (
      tokenMeta?.allowed_departments &&
      Array.isArray(tokenMeta.allowed_departments) &&
      tokenMeta.allowed_departments.length > 0
    ) {
      const allowedSet = new Set(tokenMeta.allowed_departments.map((d: any) => String(d).trim()));
      list = list.filter((dept) => allowedSet.has(String(dept.id)));
    }
    return list.map((dept: any) => ({
      value: String(dept.id),
      label: dept.name,
      badge: dept.code || undefined,
    }));
  }, [departmentsList, tokenMeta?.allowed_departments]);

  useEffect(() => {
    if (departmentOptions.length === 1 && (!formData.department || formData.department !== departmentOptions[0].value)) {
      handleChange('department', departmentOptions[0].value);
    }
  }, [departmentOptions, formData.department]);

  const nameFieldValue =
    formData.name_i18n && hasAnyLanguageContent(formData.name_i18n)
      ? formData.name_i18n
      : formData.name;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleQuickSubmit();
  };

  return (
    <div className="w-full max-w-5xl mx-auto @container animate-fade-in text-start font-sans border-0">
      <form
        method="POST"
        noValidate
        onSubmit={handleSubmit}
        className="theme-bg-surface rounded-3xl p-4 @[480px]:p-6 @[760px]:p-8 shadow-xs border-0 space-y-5"
      >
        {/* Unified Form Header */}
        <div className="flex items-start gap-3 @[480px]:gap-3.5 min-w-0 pb-4 border-b theme-border">
          <div className="w-10 h-10 @[480px]:w-11 @[480px]:h-11 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 shadow-xs border-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base @[640px]:text-lg font-bold theme-text-primary tracking-tight">
              {t('quickOnboardingTitle', 'Quick Staff Onboarding')}
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              {t(
                'quickOnboardingSubtitle',
                'Fast-track registration with core identity, contact, and institutional rank fields'
              )}
            </p>
          </div>
        </div>

        {/* Server Level General Error Banner */}
        {(errors.error || errors.non_field_errors) && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl theme-bg-danger-soft text-[var(--danger-text)] border-0 text-xs flex items-center gap-2.5 animate-fade-in"
          >
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-start leading-relaxed">
              {errors.error || errors.non_field_errors}
            </span>
          </div>
        )}

        {/* Unified 2-Column Grid for All Inputs (Including Multilang Full Name) */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4 items-start border-0">
          <CustomInput
            label={t('fullName', 'Full Name')}
            name="name"
            multiLanguage={true}
            placeholder={t('fullNameEnPlaceholder', 'e.g. Mufti Muhammad Abdullah')}
            value={nameFieldValue}
            onChange={(val) => handleChange('name', val)}
            error={errors.name}
          />

          <CustomInput
            label={t('phoneNumber', 'Primary Phone Number')}
            name="phone_number"
            type="tel"
            placeholder={t('phoneNumberPlaceholder', '017XXXXXXXX')}
            value={formData.phone_number}
            onChange={(val) => handleChange('phone_number', val)}
            error={errors.phone_number}
          />

          <CustomInput
            label={t('emailAddress', 'Email Address')}
            name="email"
            type="email"
            placeholder={t('emailAddressPlaceholder', 'teacher@institution.edu')}
            value={formData.email || ''}
            onChange={(val) => handleChange('email', val)}
            error={errors.email}
          />

          <CustomSelect
            label={t('staffType', 'Staff Category')}
            options={filteredCategoryOptions}
            value={formData.staff_type}
            onChange={(val) => handleChange('staff_type', val)}
          />

          <CustomSelect
            label={t('department', 'Department')}
            options={departmentOptions}
            value={formData.department}
            onChange={(val) => handleChange('department', val)}
            placeholder={t('selectDepartment', 'Select Department')}
            searchable={false}
            error={errors.department}
          />

          <div>
            <label className="text-xs font-bold theme-text-secondary block mb-1.5 text-start">
              {t('joiningDate', 'Joining Date')}
            </label>
            <ReusableCalendar
              selectedDate={formData.joining_date}
              onSelectDate={(val: string) => handleChange('joining_date', val)}
              placeholder={t('joiningDatePlaceholder', 'Official joining date')}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse @[540px]:flex-row items-center justify-between gap-3 pt-5 border-t theme-border">
          <div className="w-full @[540px]:w-auto">
            {onCancel && (
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full @[540px]:w-auto"
              >
                {t('cancel', 'Cancel')}
              </CustomButton>
            )}
          </div>

          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            loadingText={
              tokenMeta?.auto_approve === false
                ? t('submittingApplication', 'Submitting Application...')
                : t('submitting', 'Submitting Registration...')
            }
            icon={CheckCircleIcon}
            className="w-full @[540px]:w-auto"
          >
            {tokenMeta?.auto_approve === false
              ? t('submitApplication', 'Submit Application')
              : t('quickSubmitOnboarding', 'Complete Quick Onboarding')}
          </CustomButton>
        </div>
      </form>
    </div>
  );
};

export default QuickStaffOnboardingForm;

import React from 'react';
import CustomButton from '@/components/ui/CustomButton';
import {
  CheckCircleIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import {
  StaffOnboardingStepProfile,
  StaffOnboardingStepRole,
} from './components';
import { useStaffOnboardingForm } from './hooks/useStaffOnboardingForm';
import { useStaffTranslation } from '../locales';
import type { StaffOnboardingPayload } from '../types';

export interface QuickStaffOnboardingFormProps {
  initialData?: Partial<StaffOnboardingPayload> | Record<string, any>;
  onFormDataChange?: (data: StaffOnboardingPayload) => void;
  onCompleted?: (result: any) => void;
  onCancel?: () => void;
}

/**
 * Quick Staff Onboarding Form
 * Zero standalone form engine: imports and composes the canonical `useStaffOnboardingForm` hook
 * together with `StaffOnboardingStepProfile` (`mode="quick"`) and `StaffOnboardingStepRole` (`mode="quick"`)
 * inside a unified borderless surface without inner section banners.
 */
export const QuickStaffOnboardingForm: React.FC<QuickStaffOnboardingFormProps> = ({
  initialData,
  onFormDataChange,
  onCompleted,
  onCancel,
}) => {
  const { t } = useStaffTranslation();

  const {
    ranksList,
    formData,
    errors,
    isSubmitting,
    photoInputRef,
    handleChange,
    handlePhotoChange,
    handleRemovePhoto,
    handleQuickSubmit,
  } = useStaffOnboardingForm({
    initialData,
    onFormDataChange,
    onCompleted,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleQuickSubmit();
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in text-start font-sans border-0">
      <form
        method="POST"
        noValidate
        onSubmit={handleSubmit}
        className="theme-bg-surface rounded-3xl p-6 sm:p-8 shadow-xs border-0 space-y-5"
      >
        {/* Unified Form Header */}
        <div className="flex items-start gap-3.5 min-w-0 pb-1 border-0">
          <div className="w-11 h-11 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 shadow-xs border-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
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

        {/* Unified Quick Form Fields (Zero Redundant Section Headers) */}
        <div className="space-y-4 border-0">
          <StaffOnboardingStepProfile
            mode="quick"
            formData={formData}
            errors={errors}
            photoInputRef={photoInputRef}
            onChange={handleChange}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={handleRemovePhoto}
          />

          <StaffOnboardingStepRole
            mode="quick"
            formData={formData}
            ranksList={ranksList}
            errors={errors}
            onChange={handleChange}
            showIntroBanner={false}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-0">
          <div>
            {onCancel && (
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancel}
                disabled={isSubmitting}
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
            loadingText={t('submitting', 'Submitting Registration...')}
            icon={CheckCircleIcon}
            className="w-full sm:w-auto"
          >
            {t('quickSubmitOnboarding', 'Complete Quick Onboarding')}
          </CustomButton>
        </div>
      </form>
    </div>
  );
};

export default QuickStaffOnboardingForm;


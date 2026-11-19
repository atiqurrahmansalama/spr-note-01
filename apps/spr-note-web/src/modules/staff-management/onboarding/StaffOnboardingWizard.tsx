import React from 'react';
import Stepper from '@/components/ui/Stepper';
import { AlertCircleIcon } from '@/components/ui/Icons';
import {
  StaffOnboardingStepProfile,
  StaffOnboardingStepRole,
  StaffOnboardingStepDocs,
  StaffOnboardingStepPayroll,
  StaffOnboardingStepReview,
} from './components';
import { useStaffOnboardingForm } from './hooks/useStaffOnboardingForm';
import { useStaffTranslation } from '../locales';
import type { StaffOnboardingPayload } from '../types';

interface StaffOnboardingWizardProps {
  initialData?: any;
  tokenMeta?: any;
  isPublic?: boolean;
  onFormDataChange?: (data: StaffOnboardingPayload) => void;
  onCompleted?: (result: any) => void;
  onCancel?: () => void;
}

export const StaffOnboardingWizard: React.FC<StaffOnboardingWizardProps> = ({
  initialData,
  tokenMeta,
  isPublic,
  onFormDataChange,
  onCompleted,
  onCancel,
}) => {
  const { t } = useStaffTranslation();

  const {
    wizardSteps,
    currentStep,
    setCurrentStep,
    ranksList,
    formData,
    errors,
    isSubmitting,
    sameAsPresent,
    setSameAsPresent,
    photoInputRef,
    handleChange,
    handlePhotoChange,
    handleRemovePhoto,
    handleNextStep,
    handlePrevStep,
    handleSubmit,
    showPayroll,
  } = useStaffOnboardingForm({
    initialData,
    tokenMeta,
    isPublic,
    onFormDataChange,
    onCompleted,
  });

  return (
    <div className="w-full select-none text-start space-y-6">
      {/* 1. Stepper Progress Bar */}
      <div className="pb-2">
        <Stepper
          steps={wizardSteps}
          currentStep={currentStep}
          onStepClick={(stepNum) => {
            if (stepNum < currentStep) {
              setCurrentStep(stepNum);
            }
          }}
          clickable={true}
          size="md"
        />
      </div>

      {/* 2. Step Container Surface (Borderless & Soft-Toned) */}
      <div className="p-6 sm:p-8 rounded-3xl theme-bg-surface shadow-xs border-0 space-y-6">
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
        {currentStep === 1 && (
          <StaffOnboardingStepProfile
            formData={formData}
            errors={errors}
            photoInputRef={photoInputRef}
            onChange={handleChange}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={handleRemovePhoto}
          />
        )}

        {currentStep === 2 && (
          <StaffOnboardingStepRole
            formData={formData}
            ranksList={ranksList}
            errors={errors}
            onChange={handleChange}
            tokenMeta={tokenMeta}
            allowedDesignations={tokenMeta?.allowed_designations}
          />
        )}

        {currentStep === 3 && (
          <StaffOnboardingStepDocs
            formData={formData}
            onChange={handleChange}
          />
        )}

        {currentStep === 4 && (
          <StaffOnboardingStepPayroll
            formData={formData}
            sameAsPresent={sameAsPresent}
            showPayroll={showPayroll}
            errors={errors}
            onSameAsPresentChange={setSameAsPresent}
            onChange={handleChange}
          />
        )}

        {currentStep === 5 && (
          <StaffOnboardingStepReview
            formData={formData}
            showPayroll={showPayroll}
          />
        )}

        {/* 3. Stepper Navigation Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0 shadow-xs active:scale-98"
              >
                {t('prevStep', 'Previous Step')}
              </button>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
              >
                {t('cancel', 'Cancel')}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < wizardSteps.length ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition cursor-pointer shadow-xs active:scale-98 border-0"
              >
                {t('nextStep', 'Next Step')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-7 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition cursor-pointer shadow-xs active:scale-98 border-0 disabled:opacity-50"
              >
                {isSubmitting
                  ? (tokenMeta?.auto_approve === false
                      ? t('submittingApplication', 'Submitting Application...')
                      : t('submitting', 'Submitting Registration...'))
                  : (tokenMeta?.auto_approve === false
                      ? t('submitApplication', 'Submit Application')
                      : t('submitOnboarding', 'Complete Onboarding'))}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffOnboardingWizard;

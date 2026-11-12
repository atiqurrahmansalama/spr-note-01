import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import { useStaffRanks } from '../../hooks';
import { validateBDPhone, validateEmail, validateNID } from '@/utils/inputValidators';
import { compressImageFile } from '@/utils/imageCompressor';
import { submitStaffOnboarding } from '@/api/staffOnboarding';
import {
  getLocalizedValue,
  hasAnyLanguageContent,
  normalizeLocalizedValue,
} from '@/i18n/localizedEntity';
import { useStaffTranslation } from '../../locales';
import { buildInitialStaffPayload, normalizeStaffDate } from '../utils/candidateIdentity';
import type { StaffOnboardingPayload } from '../../types';

export { buildInitialStaffPayload };

interface UseStaffOnboardingFormProps {
  initialData?: Partial<StaffOnboardingPayload> | Record<string, any>;
  tokenMeta?: any;
  isPublic?: boolean;
  onCompleted?: (result: any) => void;
  onFormDataChange?: (data: StaffOnboardingPayload) => void;
}

export function useStaffOnboardingForm({
  initialData = {},
  tokenMeta = null,
  isPublic = false,
  onCompleted,
  onFormDataChange,
}: UseStaffOnboardingFormProps) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { t } = useStaffTranslation();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const showPayroll = !isPublic || Boolean(tokenMeta?.include_payroll);

  const wizardSteps = useMemo(
    () => [
      { id: 1, label: t('stepPersonal', 'Profile & Identity') },
      { id: 2, label: t('stepRole', 'Role & Hierarchy') },
      { id: 3, label: t('stepQualifications', 'Qualifications & Docs') },
      {
        id: 4,
        label: showPayroll
          ? t('stepPayroll', 'Address & Payroll')
          : t('stepAddressContact', 'Address & Contact'),
      },
      { id: 5, label: t('stepReview', 'Summary & Review') },
    ],
    [showPayroll, t]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const { ranksList } = useStaffRanks(activeTenantId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<StaffOnboardingPayload>(() =>
    buildInitialStaffPayload(initialData, tokenMeta)
  );

  // Notify parent container (e.g. shared draft across Quick & Full Wizard tabs) cleanly after commit
  useEffect(() => {
    onFormDataChange?.(formData);
  }, [formData, onFormDataChange]);

  // Sync authenticated candidate metadata (e.g., from Google OAuth) into blank profile fields without overwriting edits
  useEffect(() => {
    if (!initialData || typeof initialData !== 'object') return;
    setFormData((prev) => {
      const next = { ...prev };
      let changed = false;

      if (initialData.user_id && !prev.user_id) {
        next.user_id = initialData.user_id;
        changed = true;
      }
      if (initialData.name && !prev.name) {
        next.name = initialData.name;
        next.name_en = prev.name_en || initialData.name;
        next.name_i18n = {
          ...(prev.name_i18n || {}),
          en: prev.name_i18n?.en || initialData.name,
        };
        changed = true;
      }
      if (initialData.email && !prev.email) {
        next.email = initialData.email;
        changed = true;
      }
      if (initialData.phone_number && !prev.phone_number) {
        next.phone_number = initialData.phone_number;
        changed = true;
      }
      if (initialData.photo_url && !prev.photo_url) {
        next.photo_url = initialData.photo_url;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    initialData?.user_id,
    initialData?.name,
    initialData?.email,
    initialData?.phone_number,
    initialData?.photo_url,
  ]);

  // Field-level Validation
  const validateField = useCallback(
    (field: string, value: any): string => {
      let err = '';
      if (field === 'name') {
        const resolved =
          typeof value === 'object' && value !== null
            ? getLocalizedValue(value, 'en')
            : String(value || '');
        if (!resolved || !resolved.trim()) {
          err = t('validationNameRequired', 'Candidate full name is required');
        } else if (resolved.trim().length < 2) {
          err = t('validationNameMin', 'Name must be at least 2 characters');
        }
      } else if (field === 'phone_number') {
        if (!value || !String(value).trim()) {
          err = t('validationPhoneRequired', 'Primary mobile phone number is required');
        } else if (!validateBDPhone(value)) {
          err = t('validationPhoneInvalid', 'Invalid mobile number (e.g. 017XXXXXXXX)');
        }
      } else if (field === 'email') {
        if (!value || !String(value).trim()) {
          err = t('validationEmailRequired', 'Email address is required');
        } else if (!validateEmail(value)) {
          err = t('validationEmailInvalid', 'Invalid email address format');
        }
      } else if (field === 'nid_no') {
        if (value && String(value).trim() && !validateNID(value)) {
          err = t('validationNidInvalid', 'NID must be 10, 13, or 17 digits');
        }
      } else if (field === 'emergency_contact') {
        if (value && String(value).trim() && !validateBDPhone(value)) {
          err = t('validationEmergencyPhone', 'Invalid emergency phone number');
        }
      } else if (field === 'mobile_banking_no') {
        if (value && String(value).trim() && !validateBDPhone(value)) {
          err = t('validationMobileBanking', 'Invalid mobile banking number');
        }
      } else if (field === 'designation') {
        if (!value || !String(value).trim()) {
          err = t('validationDesignationRequired', 'Position or designation is required');
        }
      }
      return err;
    },
    [t]
  );

  const handleChange = (field: keyof StaffOnboardingPayload, valOrEvent: any) => {
    const value =
      typeof valOrEvent === 'object' &&
      valOrEvent !== null &&
      'target' in valOrEvent &&
      !(typeof valOrEvent.en === 'string' || typeof valOrEvent.bn === 'string' || typeof valOrEvent.ar === 'string' || typeof valOrEvent.ur === 'string')
        ? valOrEvent.target.value
        : valOrEvent;

    if (field === 'name') {
      const localizedMap = normalizeLocalizedValue(value);
      const primaryName =
        getLocalizedValue(localizedMap, 'en') ||
        (typeof value === 'string' ? value : '') ||
        '';
      const bnName = typeof localizedMap.bn === 'string' ? localizedMap.bn : '';

      setFormData((prev) => ({
        ...prev,
        name: primaryName,
        name_en: primaryName,
        bangla_name: bnName,
        name_i18n: localizedMap,
      }));

      const fieldErr = validateField('name', hasAnyLanguageContent(localizedMap) ? localizedMap : primaryName);
      setErrors((prev) => ({ ...prev, name: fieldErr }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    const fieldErr = validateField(field as string, value);
    setErrors((prev) => ({ ...prev, [field]: fieldErr }));
  };

  // Photo Upload Handler
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      });
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo_url: String(reader.result) }));
        showToast(t('photoUploadedToast', 'Photo uploaded successfully'), 'success');
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo_url: String(reader.result) }));
        showToast(t('photoUploadedToast', 'Photo uploaded successfully'), 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photo_url: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Shared multi-step validation helper reused by both Full Wizard and Quick Onboarding
  const validateSteps = useCallback(
    (stepsToCheck: number[]): boolean => {
      const newErrors: Record<string, string> = {};

      if (stepsToCheck.includes(1)) {
        const nameErr = validateField(
          'name',
          formData.name_i18n && hasAnyLanguageContent(formData.name_i18n) ? formData.name_i18n : formData.name
        );
        if (nameErr) newErrors.name = nameErr;

        const phoneErr = validateField('phone_number', formData.phone_number);
        if (phoneErr) newErrors.phone_number = phoneErr;

        const emailErr = validateField('email', formData.email);
        if (emailErr) newErrors.email = emailErr;
      }

      if (stepsToCheck.includes(2)) {
        const desigErr = validateField('designation', formData.designation);
        if (desigErr) newErrors.designation = desigErr;
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        showToast(
          t('fixHighlightedFieldsToast', 'Please correct the highlighted fields before proceeding'),
          'error'
        );
        return false;
      }
      return true;
    },
    [formData, showToast, t, validateField]
  );

  const handleNextStep = () => {
    if (validateSteps([currentStep])) {
      setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Unified submission engine used by both Full Wizard & Quick Staff Onboarding
  const submitSteps = useCallback(
    async (stepsToValidate: number[]) => {
      if (!validateSteps(stepsToValidate)) return;

      setIsSubmitting(true);
      try {
        const localizedMap = normalizeLocalizedValue(formData.name_i18n || formData.name);
        const primaryName = (
          getLocalizedValue(localizedMap, 'en') ||
          formData.name ||
          ''
        ).trim();
        const bnName = String(localizedMap.bn || formData.bangla_name || '').trim();

        const payload = {
          ...formData,
          name: primaryName,
          name_en: primaryName,
          bangla_name: bnName,
          name_i18n: {
            ...localizedMap,
            ...(primaryName && !localizedMap.en ? { en: primaryName } : {}),
            ...(bnName ? { bn: bnName } : {}),
          },
          email: String(formData.email || '').trim(),
          user_id: formData.user_id || null,
          department: formData.department ? String(formData.department) : null,
          dob: normalizeStaffDate(formData.dob),
          joining_date:
            normalizeStaffDate(formData.joining_date) || new Date().toISOString().split('T')[0],
          permanent_address: sameAsPresent ? formData.address : formData.permanent_address,
          permanent_division: sameAsPresent ? formData.division : formData.permanent_division,
          permanent_district: sameAsPresent ? formData.district : formData.permanent_district,
          permanent_upazila_thana: sameAsPresent
            ? formData.upazila_thana
            : formData.permanent_upazila_thana,
        };

        const result = await submitStaffOnboarding(payload);
        showToast(
          t('onboardingCompletedToast', 'Staff profile onboarded successfully!'),
          'success'
        );

        if (onCompleted) {
          onCompleted(result);
        }
      } catch (err: any) {
        console.error('Failed to submit staff onboarding:', err);
        showToast(
          err?.message || t('onboardingFailedToast', 'Failed to complete staff onboarding'),
          'error'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onCompleted, sameAsPresent, showToast, t, validateSteps]
  );

  const handleSubmit = () => submitSteps([currentStep]);
  const handleQuickSubmit = () => submitSteps([1, 2]);

  const resetForm = useCallback(() => {
    setFormData(buildInitialStaffPayload({}, tokenMeta));
    setErrors({});
    setCurrentStep(1);
  }, [tokenMeta]);

  return {
    wizardSteps,
    currentStep,
    setCurrentStep,
    ranksList,
    formData,
    setFormData,
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
    handleQuickSubmit,
    resetForm,
    showPayroll,
  };
}

import { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import { staffRanksStore, staffRecruitmentRequirementsStore } from '@/utils/localStore';
import { validateBDPhone, validateNID, validateEmail } from '@/utils/inputValidators';
import { compressImageFile } from '@/utils/imageCompressor';
import { submitStaffOnboarding } from '@/api/staffOnboarding';
import type { StaffOnboardingPayload } from '../../types';

interface UseStaffOnboardingFormProps {
  initialData?: any;
  tokenMeta?: any;
  isPublic?: boolean;
  onCompleted?: (result: any) => void;
}

export function useStaffOnboardingForm({
  initialData = {},
  tokenMeta = null,
  isPublic = false,
  onCompleted,
}: UseStaffOnboardingFormProps) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const showPayroll = !isPublic || Boolean(tokenMeta?.include_payroll);

  const wizardSteps = useMemo(
    () => [
      { id: 1, label: 'Profile & Identity' },
      { id: 2, label: 'Role & Hierarchy' },
      { id: 3, label: 'Qualifications & Docs' },
      { id: 4, label: showPayroll ? 'Address & Payroll' : 'Address & Contact' },
      { id: 5, label: 'Summary & Review' },
    ],
    [showPayroll]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [ranksList, setRanksList] = useState(() => staffRanksStore.getRanks(activeTenantId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<StaffOnboardingPayload>({
    token: tokenMeta?.token || initialData.token || '',
    user_id: initialData.user_id || '',
    name: initialData.name || '',
    name_en: initialData.name_en || initialData.name || '',
    bangla_name: initialData.bangla_name || '',
    email: initialData.email || '',
    phone_number: initialData.phone_number || '',
    gender: initialData.gender || 'MALE',
    dob: initialData.dob || '',
    nid_no: initialData.nid_no || '',
    blood_group: initialData.blood_group || '',
    emergency_contact: initialData.emergency_contact || '',
    photo_url: initialData.photo_url || '',

    // Role & Hierarchy
    staff_type: tokenMeta?.staff_type || initialData.staff_type || 'TEACHING',
    designation: tokenMeta?.designation || initialData.designation || '',
    rank_order: tokenMeta?.rank_order || initialData.rank_order || 99,
    employment_status: initialData.employment_status || 'PERMANENT',
    joining_date: initialData.joining_date || new Date().toISOString().split('T')[0],

    // Academic & Qualifications
    highest_degree: initialData.highest_degree || '',
    specialization: initialData.specialization || '',
    experience_details: initialData.experience_details || '',
    max_daily_periods: initialData.max_daily_periods || 4,

    // Documents
    cv_url: initialData.cv_url || '',
    cv_name: initialData.cv_name || '',
    cv_size: initialData.cv_size || '',
    documents: initialData.documents || initialData.certificates || [],

    // Address
    address: initialData.address || '',
    division: initialData.division || '',
    district: initialData.district || '',
    upazila_thana: initialData.upazila_thana || '',
    postal_code: initialData.postal_code || '',
    permanent_address: initialData.permanent_address || '',
    permanent_division: initialData.permanent_division || '',
    permanent_district: initialData.permanent_district || '',
    permanent_upazila_thana: initialData.permanent_upazila_thana || '',

    // Payroll & Banking
    salary_type: initialData.salary_type || 'MONTHLY_FIXED',
    base_salary: initialData.base_salary || 0,
    medical_allowance: initialData.medical_allowance || 0,
    house_rent: initialData.house_rent || 0,
    bank_name: initialData.bank_name || '',
    bank_account_no: initialData.bank_account_no || '',
    mobile_banking_no: initialData.mobile_banking_no || '',
    shift_type: initialData.shift_type || 'MORNING',
  });

  // Listen for live rank updates from Developer Tools
  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

  // Validation
  const validateField = (field: string, value: any): string => {
    let err = '';
    if (field === 'name') {
      if (!value || !String(value).trim()) err = 'Candidate full name is required';
      else if (String(value).trim().length < 2) err = 'Name must be at least 2 characters';
    } else if (field === 'phone_number') {
      if (!value || !String(value).trim()) err = 'Primary mobile phone number is required';
      else if (!validateBDPhone(value)) err = 'Invalid Bangladesh mobile number (e.g. 017XXXXXXXX)';
    } else if (field === 'email') {
      if (value && String(value).trim() && !validateEmail(value)) err = 'Invalid email address format';
    } else if (field === 'nid_no') {
      if (value && String(value).trim() && !validateNID(value)) err = 'NID must be 10, 13, or 17 digits';
    } else if (field === 'emergency_contact') {
      if (value && String(value).trim() && !validateBDPhone(value)) err = 'Invalid emergency phone number';
    } else if (field === 'mobile_banking_no') {
      if (value && String(value).trim() && !validateBDPhone(value)) err = 'Invalid mobile banking number';
    } else if (field === 'designation') {
      if (!value || !String(value).trim()) err = 'Position or designation is required';
    }
    return err;
  };

  const handleChange = (field: keyof StaffOnboardingPayload, valOrEvent: any) => {
    const value =
      typeof valOrEvent === 'object' && valOrEvent !== null && 'target' in valOrEvent
        ? valOrEvent.target.value
        : valOrEvent;

    setFormData((prev) => ({ ...prev, [field]: value }));

    const fieldErr = validateField(field as string, value);
    setErrors((prev) => ({ ...prev, [field]: fieldErr }));
  };

  // Photo Upload Handler
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo_url: String(reader.result) }));
        showToast('Photo uploaded successfully', 'success');
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo_url: String(reader.result) }));
        showToast('Photo uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photo_url: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Step Validation Before Advancing
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      const nameErr = validateField('name', formData.name);
      if (nameErr) newErrors.name = nameErr;

      const phoneErr = validateField('phone_number', formData.phone_number);
      if (phoneErr) newErrors.phone_number = phoneErr;

      if (formData.email) {
        const emailErr = validateField('email', formData.email);
        if (emailErr) newErrors.email = emailErr;
      }
    } else if (currentStep === 2) {
      const desigErr = validateField('designation', formData.designation);
      if (desigErr) newErrors.designation = desigErr;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast('Please correct the highlighted fields before proceeding', 'error');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        permanent_address: sameAsPresent ? formData.address : formData.permanent_address,
        permanent_division: sameAsPresent ? formData.division : formData.permanent_division,
        permanent_district: sameAsPresent ? formData.district : formData.permanent_district,
        permanent_upazila_thana: sameAsPresent ? formData.upazila_thana : formData.permanent_upazila_thana,
      };

      const result = await submitStaffOnboarding(payload);
      showToast('Staff profile onboarded successfully!', 'success');

      if (onCompleted) {
        onCompleted(result);
      }
    } catch (err: any) {
      console.error('Failed to submit staff onboarding:', err);
      showToast(err.message || 'Failed to complete staff onboarding', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    showPayroll,
  };
}


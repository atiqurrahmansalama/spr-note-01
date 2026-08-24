import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import Stepper from '../../../components/ui/Stepper';
import AddressPickerInput from '../../../components/ui/AddressPickerInput';
import DocumentFilePicker from '../../../components/ui/DocumentFilePicker';
import MultiDocumentManager from '../../../components/ui/MultiDocumentManager';
import {
  CameraIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '../../../components/ui/Icons';
import {
  validateBDPhone,
  validateNID,
  validateEmail,
} from '../../../utils/inputValidators';
import { staffRanksStore, STAFF_CATEGORY_OPTIONS, staffRecruitmentRequirementsStore } from '../../../utils/localStore';
import { fetchWithAuth } from '../../../utils/authService';
import { submitStaffOnboarding } from '../../../api/staffOnboarding';
import { compressImageFile } from '../../../utils/imageCompressor';

const calculateAge = (dobString) => {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} yrs` : '';
};

export default function StaffOnboardingWizard({
  initialData = {},
  tokenMeta = null,
  isPublic = false,
  onCompleted,
  onCancel,
}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const photoInputRef = useRef(null);

  // Determine whether payroll / salary info is requested
  const showPayroll = !isPublic || Boolean(tokenMeta?.include_payroll);

  const wizardSteps = useMemo(() => [
    { id: 1, label: 'Profile & Photo' },
    { id: 2, label: 'Qualifications & Documents' },
    { id: 3, label: 'Address & Contact' },
    { id: 4, label: showPayroll ? 'Payroll & Review' : 'Summary & Review' },
  ], [showPayroll]);

  const [currentStep, setCurrentStep] = useState(1);
  const [usersList, setUsersList] = useState([]);
  const [ranksList, setRanksList] = useState(() => staffRanksStore.getRanks(activeTenantId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(true);
  const [errors, setErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    token: tokenMeta?.token || initialData.token || '',
    user_id: initialData.user_id || '',
    name: initialData.name || '',
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

    // Academic, Qualifications & Experience
    highest_degree: initialData.highest_degree || '',
    specialization: initialData.specialization || '',
    experience_details: initialData.experience_details || '',
    max_daily_periods: initialData.max_daily_periods || 4,

    // CV and Document Attachments
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
    perm_address: initialData.perm_address || '',
    perm_division: initialData.perm_division || '',
    perm_district: initialData.perm_district || '',
    perm_upazila: initialData.perm_upazila || '',
    perm_postal_code: initialData.perm_postal_code || '',

    // Payroll & Banking
    salary_type: initialData.salary_type || 'MONTHLY_FIXED',
    base_salary: initialData.base_salary || 0,
    bank_name: initialData.bank_name || '',
    bank_account_no: initialData.bank_account_no || '',
    mobile_banking_no: initialData.mobile_banking_no || '',
  });

  // Listen for live rank updates from Developer Tools
  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

  // Dynamic staff recruitment document requirements synchronization
  useEffect(() => {
    const requiredTitles = staffRecruitmentRequirementsStore.getRequiredDocsForStaff(
      activeTenantId,
      formData.staff_type
    );

    setFormData((prev) => {
      const existing = Array.isArray(prev.documents) ? prev.documents : [];

      // Build required docs preserving existing uploaded files
      const requiredDocs = requiredTitles.map((title, idx) => {
        const found = existing.find((d) => d.title === title);
        if (found) {
          return { ...found, is_required: true };
        }
        return {
          id: `doc_staff_req_${idx}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)}`,
          title,
          is_required: true,
          file_url: '',
          file_name: '',
          file_size: '',
        };
      });

      // Keep user-added custom optional documents that are not in the mandatory list
      const customDocs = existing.filter((d) => !requiredTitles.includes(d.title) && !d.is_required);

      return {
        ...prev,
        documents: [...requiredDocs, ...customDocs],
      };
    });
  }, [activeTenantId, formData.staff_type]);

  // Fetch candidate users (for authenticated admin view)
  useEffect(() => {
    const fetchLookups = async () => {
      if (isPublic) return;
      try {
        const userRes = await fetchWithAuth('/api/v1/users/?limit=100');
        if (userRes.ok) {
          const userData = await userRes.json();
          setUsersList(Array.isArray(userData) ? userData : userData.results || []);
        }
      } catch (err) {
        console.warn('Error fetching users for staff onboarding:', err);
      }
    };

    fetchLookups();
  }, [activeTenantId, isPublic]);

  // Pure validation check for single field
  const validateField = (field, value) => {
    let err = '';
    if (field === 'name') {
      if (!value || !String(value).trim()) err = 'Candidate full name in English is required';
      else if (String(value).trim().length < 2) err = 'Name must be at least 2 characters';
    } else if (field === 'phone_number') {
      if (!value || !String(value).trim()) err = 'Primary mobile phone number is required';
      else if (!validateBDPhone(value)) err = 'Invalid Bangladesh mobile number (e.g. 017XXXXXXXX)';
    } else if (field === 'email') {
      if (value && String(value).trim() && !validateEmail(value)) err = 'Invalid email address format';
    } else if (field === 'nid_no') {
      if (value && String(value).trim() && !validateNID(value)) err = 'NID must be 10, 13, or 17 digits';
    } else if (field === 'emergency_contact') {
      if (value && String(value).trim() && !validateBDPhone(value)) err = 'Invalid emergency phone number (01XXXXXXXXX)';
    } else if (field === 'mobile_banking_no') {
      if (value && String(value).trim() && !validateBDPhone(value)) err = 'Invalid mobile banking number (01XXXXXXXXX)';
    } else if (field === 'designation') {
      if (!value || !String(value).trim()) err = 'Position or designation is required';
    }
    return err;
  };

  const handleChange = (field, valOrEvent) => {
    const value =
      typeof valOrEvent === 'object' && valOrEvent !== null && 'target' in valOrEvent
        ? valOrEvent.target.value
        : valOrEvent;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Instant validation feedback
    const fieldErr = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: fieldErr }));
  };

  // Photo Upload Handler
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo_url: reader.result }));
        showToast('Photo uploaded successfully', 'success');
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, photo_url: reader.result }));
        showToast('Photo uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photo_url: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const rankOptions = useMemo(() => {
    return [
      ...ranksList.map((r) => ({
        label: `${r.name_bn ? `${r.name_bn} (${r.name})` : r.name} — [Rank ${r.order}]`,
        value: r.name,
        rank_order: r.order,
        staff_type: r.type,
      })),
      { label: '+ Custom / Other Designation...', value: '__CUSTOM__' },
    ];
  }, [ranksList]);

  const staffTypeOptions = STAFF_CATEGORY_OPTIONS;

  const statusOptions = [
    { label: 'Permanent', value: 'PERMANENT' },
    { label: 'Probationary', value: 'PROBATION' },
    { label: 'Contractual / Temporary', value: 'CONTRACT' },
    { label: 'Part-Time / Visiting', value: 'PART_TIME' },
    { label: 'Guest / Honorary', value: 'GUEST' },
  ];

  const salaryTypeOptions = [
    { label: 'Monthly Fixed Salary', value: 'MONTHLY_FIXED' },
    { label: 'Hourly Rate', value: 'HOURLY' },
    { label: 'Per Period / Class Honorarium', value: 'PER_PERIOD' },
    { label: 'Honorary / Volunteer Service', value: 'VOLUNTEER' },
  ];

  // Comprehensive Step Validator
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      const nameErr = validateField('name', formData.name);
      if (nameErr) newErrors.name = nameErr;

      const phoneErr = validateField('phone_number', formData.phone_number);
      if (phoneErr) newErrors.phone_number = phoneErr;

      if (formData.email) {
        const emailErr = validateField('email', formData.email);
        if (emailErr) newErrors.email = emailErr;
      }

      if (formData.nid_no) {
        const nidErr = validateField('nid_no', formData.nid_no);
        if (nidErr) newErrors.nid_no = nidErr;
      }

      if (formData.emergency_contact) {
        const emErr = validateField('emergency_contact', formData.emergency_contact);
        if (emErr) newErrors.emergency_contact = emErr;
      }
    } else if (step === 2) {
      const desigErr = validateField('designation', formData.designation);
      if (desigErr) newErrors.designation = desigErr;

      if (!formData.joining_date) {
        newErrors.joining_date = 'Joining date is required';
      }
    } else if (step === 4 && showPayroll) {
      if (formData.mobile_banking_no) {
        const mbErr = validateField('mobile_banking_no', formData.mobile_banking_no);
        if (mbErr) newErrors.mobile_banking_no = mbErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validation before advancing step
  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      const firstError = Object.values(errors)[0] || 'Please complete the required fields before proceeding';
      showToast(firstError, 'error');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) {
      showToast('Please review required personal & qualification information', 'error');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        department: null,
        user_id: formData.user_id || null,
        perm_address: sameAsPresent ? formData.address : formData.perm_address,
        perm_division: sameAsPresent ? formData.division : formData.perm_division,
        perm_district: sameAsPresent ? formData.district : formData.perm_district,
        perm_upazila: sameAsPresent ? formData.upazila_thana : formData.perm_upazila,
        perm_postal_code: sameAsPresent ? formData.postal_code : formData.perm_postal_code,
      };

      const result = await submitStaffOnboarding(payload);
      showToast('Staff profile onboarded successfully!', 'success');

      if (onCompleted) {
        onCompleted(result);
      }
    } catch (err) {
      console.error('Failed to submit staff onboarding:', err);
      showToast(err.message || 'Failed to complete staff onboarding', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full select-none text-left space-y-6">
      {/* Modern Minimal Stepper Progress Bar */}
      <div className="pb-1 sm:pb-2">
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

      {/* Step Body */}
      <div className="w-full">
        {/* STEP 1: PERSONAL PROFILE & PHOTO */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Row: Names (Left) + Large Photo Box (Far Right) */}
            <div className="flex flex-col-reverse md:flex-row items-center md:items-end justify-between gap-6 md:gap-10 lg:gap-12">
              <div className="w-full space-y-4 sm:space-y-4.5 max-w-md">
                <div>
                  <CustomInput
                    label="Full Name (English)"
                    name="name"
                    placeholder="e.g. Mufti Muhammad Abdullah"
                    value={formData.name}
                    onChange={(val) => handleChange('name', val)}
                    error={errors.name}
                    required
                  />
                </div>

                <div>
                  <CustomInput
                    label="Full Name (Bangla / Arabic)"
                    name="bangla_name"
                    placeholder="যেমন: মুফতী মুহাম্মদ আব্দুল্লাহ"
                    value={formData.bangla_name}
                    onChange={(val) => handleChange('bangla_name', val)}
                  />
                </div>
              </div>

              {/* Photo Upload Box */}
              <div className="shrink-0 flex flex-col items-center md:items-end">
                <div
                  onClick={() => photoInputRef.current && photoInputRef.current.click()}
                  className="relative w-40 sm:w-44 md:w-48 h-48 sm:h-52 md:h-56 rounded-2xl border-2 border-dashed theme-border overflow-hidden theme-bg-sub hover:border-[var(--accent-main)] transition-all duration-200 flex flex-col items-center justify-center cursor-pointer shadow-xs group"
                  title="Click to select staff photo"
                >
                  {formData.photo_url ? (
                    <>
                      <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-1.5 text-white text-[11px] font-bold">
                        <CameraIcon className="w-5 h-5 theme-accent" />
                        <span>Change Photo</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto();
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full theme-bg-danger-soft theme-danger border theme-border text-xs font-bold flex items-center justify-center shadow-md hover:opacity-80 cursor-pointer z-10"
                        title="Remove Photo"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-11 h-11 rounded-2xl theme-bg-accent-soft theme-accent border theme-border flex items-center justify-center shadow-inner">
                        <CameraIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold theme-text-primary">Upload Photo</span>
                      <span className="text-[10px] theme-text-secondary">Passport / 3:4 (Max 3MB)</span>
                    </div>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Gender, Date of Birth, Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 border-t theme-border pt-5">
              <div>
                <CustomSelect
                  label="Gender"
                  options={[
                    { label: 'Male', value: 'MALE' },
                    { label: 'Female', value: 'FEMALE' },
                  ]}
                  value={formData.gender || 'MALE'}
                  onChange={(val) => handleChange('gender', val)}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider select-none">
                    Date of Birth
                  </label>
                  {formData.dob && (
                    <span className="text-[10px] font-bold theme-bg-accent-soft theme-accent px-2 py-0.5 rounded-lg border theme-border">
                      Age: {calculateAge(formData.dob)}
                    </span>
                  )}
                </div>
                <ReusableCalendar
                  selectedDate={formData.dob || ''}
                  onSelectDate={(val) => handleChange('dob', val)}
                  placeholder="Select Date of Birth"
                />
              </div>

              <div>
                <CustomSelect
                  label="Blood Group"
                  options={[
                    { label: 'Unknown', value: '' },
                    { label: 'A+ (Positive)', value: 'A+' },
                    { label: 'A- (Negative)', value: 'A-' },
                    { label: 'B+ (Positive)', value: 'B+' },
                    { label: 'B- (Negative)', value: 'B-' },
                    { label: 'O+ (Positive)', value: 'O+' },
                    { label: 'O- (Negative)', value: 'O-' },
                    { label: 'AB+', value: 'AB+' },
                    { label: 'AB-', value: 'AB-' },
                  ]}
                  value={formData.blood_group || ''}
                  onChange={(val) => handleChange('blood_group', val)}
                />
              </div>
            </div>

            {/* Primary Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t theme-border pt-5">
              <div>
                <CustomInput
                  type="phone"
                  label="Primary Mobile Phone"
                  name="phone_number"
                  placeholder="017XXXXXXXX"
                  value={formData.phone_number}
                  onChange={(val) => handleChange('phone_number', val)}
                  error={errors.phone_number}
                  required
                />
              </div>

              <div>
                <CustomInput
                  type="email"
                  label="Email Address"
                  name="email"
                  placeholder="staff@institution.edu"
                  value={formData.email}
                  onChange={(val) => handleChange('email', val)}
                  error={errors.email}
                />
              </div>
            </div>

            {/* NID & Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <CustomInput
                  type="nid"
                  label="National ID (NID) Number"
                  name="nid_no"
                  placeholder="NID / Smart Card Number"
                  value={formData.nid_no}
                  onChange={(val) => handleChange('nid_no', val)}
                  error={errors.nid_no}
                />
              </div>

              <div>
                <CustomInput
                  type="phone"
                  label="Emergency Contact Phone"
                  name="emergency_contact"
                  placeholder="01XXXXXXXXX"
                  value={formData.emergency_contact}
                  onChange={(val) => handleChange('emergency_contact', val)}
                  error={errors.emergency_contact}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: QUALIFICATIONS, CV & DOCUMENTS */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Position & Role Configuration */}
            {isPublic ? (
              /* Public Candidate Role Details */
              <div className="space-y-4">
                {tokenMeta?.designation ? (
                  <div className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between">
                    <div>
                      <span className="text-[11px] theme-text-secondary uppercase tracking-wider font-bold block">
                        Applying For Position
                      </span>
                      <span className="text-base font-extrabold theme-accent">
                        {tokenMeta.designation}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-xl theme-bg-accent-soft theme-accent text-xs font-bold border theme-border">
                      {tokenMeta.staff_type === 'TEACHING' ? 'Teaching Faculty' : 'Personnel'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <CustomSelect
                        label="Applied Staff Category"
                        value={formData.staff_type}
                        onChange={(val) => handleChange('staff_type', val)}
                        options={staffTypeOptions}
                        required
                      />
                    </div>
                    <div>
                      <CustomInput
                        label="Applied Position / Title"
                        name="designation"
                        placeholder="e.g. Senior Arabic Lecturer, Hafiz, Caretaker"
                        value={formData.designation}
                        onChange={(val) => handleChange('designation', val)}
                        error={errors.designation}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Internal Admin Role Configuration */
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <CustomSelect
                      label="Staff Category / Role"
                      value={formData.staff_type}
                      onChange={(val) => handleChange('staff_type', val)}
                      options={staffTypeOptions}
                      required
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Institutional Rank & Designation"
                      value={formData.designation}
                      onChange={(val) => {
                        if (val === '__CUSTOM__') {
                          setFormData((prev) => ({ ...prev, designation: '' }));
                          return;
                        }
                        const matched = ranksList.find((r) => r.name === val);
                        setFormData((prev) => ({
                          ...prev,
                          designation: val,
                          rank_order: matched ? matched.order : 99,
                          staff_type: matched && matched.type ? matched.type : prev.staff_type,
                        }));
                        setErrors((prev) => ({ ...prev, designation: '' }));
                      }}
                      options={rankOptions}
                      placeholder="Select Pre-Configured Rank & Designation"
                      required
                      searchable={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <CustomInput
                      label="Custom Designation Title (If applicable)"
                      name="designation"
                      value={formData.designation}
                      onChange={(val) => handleChange('designation', val)}
                      placeholder="e.g. Assistant Professor, Resident Caretaker"
                      error={errors.designation}
                      required
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Employment Status"
                      value={formData.employment_status}
                      onChange={(val) => handleChange('employment_status', val)}
                      options={statusOptions}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Academic Credentials & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 border-t theme-border pt-5">
              <div>
                <div className="mb-2">
                  <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider select-none">
                    {isPublic ? 'Earliest Joining Date' : 'Official Joining Date'}
                  </label>
                </div>
                <ReusableCalendar
                  selectedDate={formData.joining_date || ''}
                  onSelectDate={(val) => handleChange('joining_date', val)}
                  placeholder="Select Joining Date"
                />
                {errors.joining_date && (
                  <span className="text-[11px] font-medium text-rose-400 mt-1 block">
                    {errors.joining_date}
                  </span>
                )}
              </div>

              <div>
                <CustomInput
                  label="Highest Academic Degree"
                  name="highest_degree"
                  placeholder="e.g. Dawra-e-Hadith, Kamil, M.A."
                  value={formData.highest_degree}
                  onChange={(val) => handleChange('highest_degree', val)}
                />
              </div>

              <div>
                <CustomInput
                  label="Subject Specialization"
                  name="specialization"
                  placeholder="e.g. Hadith, Fiqh, Mathematics"
                  value={formData.specialization}
                  onChange={(val) => handleChange('specialization', val)}
                />
              </div>
            </div>

            <div>
              <CustomInput
                label="Prior Teaching / Professional Experience"
                name="experience_details"
                placeholder="e.g. 3 years as Head Ustadh at Jamia Islamia, Sylhet"
                value={formData.experience_details}
                onChange={(val) => handleChange('experience_details', val)}
              />
            </div>

            {/* Reusable Curriculum Vitae (CV) / Resume File Picker */}
            <div className="border-t theme-border pt-5 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  Curriculum Vitae (CV) / Resume
                </h4>
                <p className="text-[11px] theme-text-secondary mt-0.5">
                  Attach your updated CV or Bio-Data document (PDF / Image / DOCX, Max 5MB)
                </p>
              </div>

              <DocumentFilePicker
                label="Click to Upload Curriculum Vitae (CV)"
                subLabel="PDF, DOC, DOCX, PNG, JPG (Max 5MB)"
                fileUrl={formData.cv_url}
                fileName={formData.cv_name}
                fileSize={formData.cv_size}
                onChange={(fileData) =>
                  setFormData((prev) => ({
                    ...prev,
                    cv_url: fileData.url,
                    cv_name: fileData.name,
                    cv_size: fileData.size,
                  }))
                }
                onRemove={() =>
                  setFormData((prev) => ({
                    ...prev,
                    cv_url: '',
                    cv_name: '',
                    cv_size: '',
                  }))
                }
              />
            </div>

            {/* Reusable Multi-Document List Manager */}
            <div className="border-t theme-border pt-5">
              <MultiDocumentManager
                title="EDUCATIONAL & PROFESSIONAL DOCUMENTS"
                subTitle="Add your Sanad, academic certificates, or credentials one by one"
                addButtonLabel="+ Add Document"
                itemLabelPrefix="DOCUMENT"
                documents={formData.documents || []}
                onChange={(docs) => setFormData((prev) => ({ ...prev, documents: docs }))}
              />
            </div>
          </div>
        )}

        {/* STEP 3: RESIDENTIAL & PERMANENT ADDRESS */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <AddressPickerInput
                title="Present Residential Address"
                subTitle="Division, district, upazila, and street address"
                division={formData.division}
                district={formData.district}
                thana={formData.upazila_thana}
                postCode={formData.postal_code}
                streetAddress={formData.address}
                onDivisionChange={(val) => handleChange('division', val)}
                onDistrictChange={(val) => handleChange('district', val)}
                onThanaChange={(val) => handleChange('upazila_thana', val)}
                onPostCodeChange={(val) => handleChange('postal_code', val)}
                onStreetAddressChange={(val) => handleChange('address', val)}
              />
            </div>

            <div className="pt-2 border-t theme-border">
              <CustomCheckbox
                label="Permanent Address is same as Present Address"
                checked={sameAsPresent}
                onChange={(checked) => setSameAsPresent(checked)}
              />
            </div>

            {!sameAsPresent && (
              <div className="pt-2 animate-fade-in">
                <AddressPickerInput
                  title="Permanent Home Address"
                  subTitle="Division, district, upazila, and street address"
                  division={formData.perm_division}
                  district={formData.perm_district}
                  thana={formData.perm_upazila}
                  postCode={formData.perm_postal_code}
                  streetAddress={formData.perm_address}
                  onDivisionChange={(val) => handleChange('perm_division', val)}
                  onDistrictChange={(val) => handleChange('perm_district', val)}
                  onThanaChange={(val) => handleChange('perm_upazila', val)}
                  onPostCodeChange={(val) => handleChange('perm_postal_code', val)}
                  onStreetAddressChange={(val) => handleChange('perm_address', val)}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: PAYROLL / FINAL SUMMARY & REVIEW */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            {/* If Payroll is enabled */}
            {showPayroll && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <CustomSelect
                      label="Salary Remuneration Type"
                      value={formData.salary_type}
                      onChange={(val) => handleChange('salary_type', val)}
                      options={salaryTypeOptions}
                    />
                  </div>

                  <div>
                    <CustomInput
                      type="number"
                      min={0}
                      label="Base Salary / Remuneration (BDT)"
                      name="base_salary"
                      value={formData.base_salary}
                      onChange={(val) => handleChange('base_salary', val)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t theme-border pt-5">
                  <div>
                    <CustomInput
                      label="Bank Name"
                      name="bank_name"
                      placeholder="e.g. Islami Bank, City Bank"
                      value={formData.bank_name}
                      onChange={(val) => handleChange('bank_name', val)}
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="Bank Account Number"
                      name="bank_account_no"
                      placeholder="e.g. 2050XXXXXXXXXXXXX"
                      value={formData.bank_account_no}
                      onChange={(val) => handleChange('bank_account_no', val)}
                    />
                  </div>

                  <div>
                    <CustomInput
                      type="phone"
                      label="bKash / Nagad / Rocket"
                      name="mobile_banking_no"
                      placeholder="01XXXXXXXXX"
                      value={formData.mobile_banking_no}
                      onChange={(val) => handleChange('mobile_banking_no', val)}
                      error={errors.mobile_banking_no}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Application Summary Review Card */}
            <div className="p-5 sm:p-6 rounded-2xl theme-bg-sub border theme-border space-y-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 theme-accent" />
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  Profile Onboarding Summary Preview
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* 1. Candidate Info */}
                <div className="p-3.5 rounded-xl theme-bg-surface border theme-border space-y-1">
                  <span className="text-[11px] theme-text-secondary block font-medium">Candidate Identity</span>
                  <div className="font-bold theme-text-primary text-sm">{formData.name || '—'}</div>
                  {formData.bangla_name && (
                    <div className="text-xs theme-text-secondary">{formData.bangla_name}</div>
                  )}
                  <div className="text-[11px] theme-text-secondary pt-1">
                    Phone: <span className="font-semibold theme-text-primary">{formData.phone_number || '—'}</span>
                  </div>
                </div>

                {/* 2. Position & Qualifications */}
                <div className="p-3.5 rounded-xl theme-bg-surface border theme-border space-y-1">
                  <span className="text-[11px] theme-text-secondary block font-medium">Position &amp; Education</span>
                  <div className="font-bold theme-accent text-sm">
                    {formData.designation || 'Faculty Member'}
                  </div>
                  <div className="text-xs theme-text-secondary">
                    {formData.highest_degree || 'Academic Degree'}
                    {formData.specialization ? ` (${formData.specialization})` : ''}
                  </div>
                  <div className="text-[11px] theme-text-secondary pt-1">
                    Joining: <span className="font-semibold theme-text-primary">{formData.joining_date || '—'}</span>
                  </div>
                </div>

                {/* 3. Uploaded Documents Status */}
                <div className="p-3.5 rounded-xl theme-bg-surface border theme-border space-y-1">
                  <span className="text-[11px] theme-text-secondary block font-medium">Credentials &amp; Files</span>
                  <div className="text-xs font-semibold theme-text-primary flex items-center gap-1">
                    <span>CV:</span>
                    <span className={formData.cv_url ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                      {formData.cv_url ? '✓ Attached' : 'Not attached'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold theme-text-primary flex items-center gap-1">
                    <span>Documents:</span>
                    <span className="font-bold theme-accent">
                      {(formData.documents || []).length} file(s)
                    </span>
                  </div>
                  <div className="text-[11px] theme-text-secondary truncate pt-1">
                    Location: {formData.district ? `${formData.upazila_thana || ''}, ${formData.district}` : 'Specified'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Wizard Actions Footer */}
      <div className="flex items-center justify-between pt-6 border-t theme-border">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub text-xs font-bold theme-text-primary transition cursor-pointer"
            >
              Back
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-2xl border theme-border hover:theme-bg-sub text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <div />
          )}
        </div>

        <div>
          {currentStep < wizardSteps.length ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>Next</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-7 py-3 rounded-2xl theme-bg-accent font-bold text-xs theme-text-on-accent hover:opacity-90 transition cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                  <span>Submitting Profile...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Submit Profile</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

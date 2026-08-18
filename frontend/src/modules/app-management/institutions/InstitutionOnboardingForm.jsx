import React, { useState } from 'react';
import {
  CheckCircleIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  UsersIcon,
  LocationIcon,
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import FileUploadZone from '../../../components/ui/FileUploadZone';
import { registerInstitution } from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_BY_DIVISION,
  BD_GEO_DATA,
} from '../../../utils/bangladeshGeoData';

const INSTITUTION_TYPES = [
  { value: 'MADRASA', label: 'Madrasa / Maktab', desc: 'Islamic academic institution with Hifz / Qawmi / Alia curriculum' },
  { value: 'SCHOOL', label: 'General School', desc: 'Primary & secondary general education standard curriculum' },
  { value: 'COLLEGE', label: 'College / Higher Secondary', desc: 'Higher secondary & undergraduate college' },
  { value: 'COACHING', label: 'Coaching / Academy', desc: 'Specialized academic coaching & training center' },
  { value: 'OTHER', label: 'Other Educational Institution', desc: 'General educational or vocational institute' },
];

export default function InstitutionOnboardingForm({ onSuccess, onCancel }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    // Step 1: Basic details (No district here!)
    name: '',
    bangla_name: '',
    institution_type: 'MADRASA',
    eiin_or_reg_no: '',
    phone: '',
    email: '',

    // Step 2: Branding & Structured Address
    slug: '',
    logo_data: '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila_thana: 'Uttara',
    post_code: '',
    street_address: '',

    // Step 3: Admin & Presets
    admin_name: '',
    admin_phone: '',
    admin_email: '',
    admin_password: '',
    preset_type: 'BOTH',
  });

  const generateSlug = (name) => {
    const clean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return clean || `inst-${Date.now().toString().slice(-6)}`;
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.name) ? generateSlug(val) : prev.slug,
    }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
  };

  // Cascading Address Handlers
  const handleDivisionChange = (newDivision) => {
    const districtsForDiv = BANGLADESH_DISTRICTS_BY_DIVISION[newDivision] || [];
    const firstDistrict = districtsForDiv[0] || '';
    const thanasForDist = (BD_GEO_DATA[newDivision] && BD_GEO_DATA[newDivision][firstDistrict]) || [];
    setFormData((prev) => ({
      ...prev,
      division: newDivision,
      district: firstDistrict,
      upazila_thana: thanasForDist[0] || '',
    }));
  };

  const handleDistrictChange = (newDistrict) => {
    const thanasForDist = (BD_GEO_DATA[formData.division] && BD_GEO_DATA[formData.division][newDistrict]) || [];
    setFormData((prev) => ({
      ...prev,
      district: newDistrict,
      upazila_thana: thanasForDist[0] || '',
    }));
  };

  const validateStep = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.name.trim()) errs.name = 'Institution name in English is required.';
      if (!formData.phone.trim()) errs.phone = 'Official contact phone is required.';
    } else if (currentStep === 2) {
      if (!formData.slug.trim()) errs.slug = 'URL slug identifier is required.';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errs.email = 'Please provide a valid email address.';
      }
      if (!formData.division) errs.division = 'Division selection is required.';
      if (!formData.district) errs.district = 'District selection is required.';
    } else if (currentStep === 3) {
      if (!formData.admin_name.trim()) errs.admin_name = 'Administrator full name is required.';
      if (!formData.admin_phone.trim()) errs.admin_phone = 'Admin phone number is required.';
      if (!formData.admin_password || formData.admin_password.length < 6) {
        errs.admin_password = 'Password must be at least 6 characters.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(3, prev + 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateStep(3)) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      // Format combined address for full compatibility
      const fullAddressParts = [
        formData.street_address,
        formData.upazila_thana,
        formData.district,
        formData.division,
      ].filter(Boolean);
      const combinedAddress = fullAddressParts.join(', ');

      const payload = {
        ...formData,
        address: combinedAddress,
      };

      const response = await registerInstitution(payload);
      showToast('Institution onboarded successfully!', 'success');
      if (onSuccess) onSuccess(response);
    } catch (err) {
      console.error('[Onboarding Error]:', err);
      const serverErrors = err.response?.data || (typeof err.data === 'object' ? err.data : {});
      if (typeof serverErrors === 'object' && Object.keys(serverErrors).length > 0) {
        const mappedErrors = {};
        Object.entries(serverErrors).forEach(([key, val]) => {
          mappedErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(mappedErrors);

        // Auto-navigate to the step that has validation errors
        if (mappedErrors.name || mappedErrors.phone || mappedErrors.institution_type || mappedErrors.eiin_or_reg_no) {
          setStep(1);
        } else if (mappedErrors.slug || mappedErrors.division || mappedErrors.district || mappedErrors.upazila_thana || mappedErrors.street_address || mappedErrors.logo_data || mappedErrors.logo_url) {
          setStep(2);
        } else if (mappedErrors.admin_name || mappedErrors.admin_phone || mappedErrors.admin_email || mappedErrors.admin_password || mappedErrors.preset_type) {
          setStep(3);
        }

        const firstKey = Object.keys(mappedErrors)[0];
        const readableMsg = mappedErrors.non_field_errors || mappedErrors.error || mappedErrors.detail || `${firstKey ? firstKey.replace(/_/g, ' ') + ': ' : ''}${mappedErrors[firstKey]}`;
        showToast(readableMsg, 'error');
      } else {
        showToast(err.message || 'Server error during onboarding. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableDistricts = BANGLADESH_DISTRICTS_BY_DIVISION[formData.division] || [];
  const availableThanas = (BD_GEO_DATA[formData.division] && BD_GEO_DATA[formData.division][formData.district]) || [];

  return (
    <div className="flex flex-col h-full w-full theme-text-primary select-none font-sans min-h-[660px]">
      {/* Stepper Progress Bar */}
      <div className="p-4 sm:p-5 border-b theme-border theme-bg-sub/60 shrink-0">
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
          {[
            { num: 1, title: 'Identity & Info', desc: 'Basic Details' },
            { num: 2, title: 'Location & Brand', desc: 'Address & Logo' },
            { num: 3, title: 'Admin & Presets', desc: 'Access & Setup' },
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : isActive
                      ? 'theme-bg-accent theme-accent-text ring-2 ring-[var(--accent-main)]/30 shadow-md'
                      : 'theme-bg-elevated theme-text-secondary border theme-border'
                  }`}
                >
                  {isCompleted ? <CheckCircleIcon className="w-4 h-4" /> : s.num}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-xs font-bold ${isActive ? 'theme-text-primary' : 'theme-text-secondary'}`}>
                    {s.title}
                  </div>
                  <div className="text-[10px] theme-text-secondary opacity-70 leading-tight">
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Body with generous vertical height, extra bottom padding (pb-36) and locked width */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 pb-36 w-full">
        {/* STEP 1: Basic Identity (No District) */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto min-h-[480px]">
            {/* Institution English Name */}
            <div>
              <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Institution Name (English) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Darul Ulum Islamic Academy"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border ${
                    errors.name ? 'border-rose-500' : 'theme-border'
                  } text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all`}
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.name}</p>
              )}
            </div>

            {/* Native / Regional Title */}
            <div>
              <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Native / Regional Name (Optional)
              </label>
              <input
                type="text"
                value={formData.bangla_name}
                onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
                placeholder="e.g. দারুল উলুম একাডেমি"
                className="w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border theme-border text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
              />
            </div>

            {/* Institution Type (CustomSelect) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <CustomSelect
                  label="Institution Type"
                  value={formData.institution_type}
                  onChange={(val) => setFormData({ ...formData, institution_type: val })}
                  options={INSTITUTION_TYPES}
                  icon={BuildingOfficeIcon}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  EIIN / Govt. Reg. No.
                </label>
                <input
                  type="text"
                  value={formData.eiin_or_reg_no}
                  onChange={(e) => setFormData({ ...formData, eiin_or_reg_no: e.target.value })}
                  placeholder="e.g. 132456"
                  className="w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border theme-border text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                />
              </div>
            </div>

            {/* Contact Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Official Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                    }}
                    placeholder="e.g. 01712345678"
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border ${
                      errors.phone ? 'border-rose-500' : 'theme-border'
                    } text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. info@institution.edu"
                  className="w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border theme-border text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Branding & Structured Address */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto min-h-[480px]">
            {/* Slug Identifier */}
            <div>
              <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Unique Tenant Slug (Web Identifier) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-4 py-3 sm:py-3.5 rounded-l-2xl theme-bg-elevated border border-r-0 theme-border theme-text-secondary text-sm font-mono font-bold">
                  app/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                    if (errors.slug) setErrors((prev) => ({ ...prev, slug: null }));
                  }}
                  placeholder="e.g. darul-ulum"
                  className={`flex-1 px-4 py-3 sm:py-3.5 rounded-r-2xl theme-bg-sub border ${
                    errors.slug ? 'border-rose-500' : 'theme-border'
                  } text-sm sm:text-base font-mono font-bold text-sky-400 focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all`}
                />
              </div>
              {errors.slug && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.slug}</p>
              )}
              <p className="mt-1.5 text-xs theme-text-secondary">
                Unique URL identifier used for isolated tenant routing and multi-branch isolation.
              </p>
            </div>

            {/* Logo File Upload Zone (With Prominent Large Preview at Top) */}
            <div>
              <FileUploadZone
                label="Institution Logo / Emblem"
                value={formData.logo_data}
                onChange={(dataUrl) => setFormData({ ...formData, logo_data: dataUrl })}
                onRemove={() => setFormData({ ...formData, logo_data: '' })}
              />
            </div>

            {/* Address Group Header */}
            <div className="pt-3 border-t theme-border space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <LocationIcon className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider theme-text-primary">
                  Campus Address & Geographic Location
                </h4>
              </div>

              {/* Division & District Cascading Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <CustomSelect
                    label="Division / বিভাগ"
                    value={formData.division}
                    onChange={handleDivisionChange}
                    options={BANGLADESH_DIVISIONS}
                    placeholder="Select Division"
                    required
                  />
                  {errors.division && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{errors.division}</p>
                  )}
                </div>

                <div>
                  <CustomSelect
                    label="District / জেলা"
                    value={formData.district}
                    onChange={handleDistrictChange}
                    options={availableDistricts}
                    placeholder="Select District"
                    searchable
                    required
                  />
                  {errors.district && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{errors.district}</p>
                  )}
                </div>
              </div>

              {/* Thana/Upazila & Post Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  {availableThanas.length > 0 ? (
                    <CustomSelect
                      label="Upazila / Thana / থানা"
                      value={formData.upazila_thana}
                      onChange={(val) => setFormData({ ...formData, upazila_thana: val })}
                      options={availableThanas}
                      placeholder="Select Thana"
                      searchable
                      direction="auto"
                    />
                  ) : (
                    <div>
                      <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                        Upazila / Thana / থানা
                      </label>
                      <input
                        type="text"
                        value={formData.upazila_thana}
                        onChange={(e) => setFormData({ ...formData, upazila_thana: e.target.value })}
                        placeholder="e.g. Sadar"
                        className="w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border theme-border text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                    Post Code / Area Code
                  </label>
                  <input
                    type="text"
                    value={formData.post_code}
                    onChange={(e) => setFormData({ ...formData, post_code: e.target.value })}
                    placeholder="e.g. 1230"
                    className="w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border theme-border text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                  />
                </div>
              </div>

              {/* Detailed Street / Village Address */}
              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Street / Village / Holding Details
                </label>
                <textarea
                  rows={2}
                  value={formData.street_address}
                  onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                  placeholder="e.g. House #12, Road #4, Sector #7"
                  className="w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border theme-border text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Admin & Presets */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto min-h-[480px]">
            <div className="p-4 rounded-3xl theme-bg-sub border theme-border text-xs theme-text-primary flex items-start gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm theme-text-primary">Root Institutional Admin Credentials</p>
                <p className="text-[11px] theme-text-secondary mt-0.5 leading-relaxed">
                  This user account will have root permissions to manage academic departments, staff rosters, and financial permissions for this tenant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Admin Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.admin_name}
                  onChange={(e) => {
                    setFormData({ ...formData, admin_name: e.target.value });
                    if (errors.admin_name) setErrors((prev) => ({ ...prev, admin_name: null }));
                  }}
                  placeholder="e.g. Maulana Shamsul Haque"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border ${
                    errors.admin_name ? 'border-rose-500' : 'theme-border'
                  } text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_name && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.admin_name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Admin Phone (Login User ID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.admin_phone}
                  onChange={(e) => {
                    setFormData({ ...formData, admin_phone: e.target.value });
                    if (errors.admin_phone) setErrors((prev) => ({ ...prev, admin_phone: null }));
                  }}
                  placeholder="e.g. 01812345678"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border ${
                    errors.admin_phone ? 'border-rose-500' : 'theme-border'
                  } text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_phone && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.admin_phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Admin Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => {
                    setFormData({ ...formData, admin_email: e.target.value });
                    if (errors.admin_email) setErrors((prev) => ({ ...prev, admin_email: null }));
                  }}
                  placeholder="admin@institution.edu"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border ${
                    errors.admin_email ? 'border-rose-500' : 'theme-border'
                  } text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_email && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.admin_email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Admin Login Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => {
                    setFormData({ ...formData, admin_password: e.target.value });
                    if (errors.admin_password) setErrors((prev) => ({ ...prev, admin_password: null }));
                  }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl theme-bg-sub border ${
                    errors.admin_password ? 'border-rose-500' : 'theme-border'
                  } text-sm sm:text-base font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_password && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.admin_password}</p>
                )}
              </div>
            </div>

            {/* Department Starter Presets with flexible and stable layout */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-3">
                Academic Department Starter Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'HIFZ',
                    title: 'Hifz Focus',
                    desc: 'Pre-configures 30-Juz Quran Tracker, Hifz & Nazera divisions.',
                    icon: BookOpenIcon,
                  },
                  {
                    id: 'GENERAL',
                    title: 'General School',
                    desc: 'Standard grading curriculum, exams, and subject mark sheets.',
                    icon: AcademicCapIcon,
                  },
                  {
                    id: 'BOTH',
                    title: 'Dual Curriculum',
                    desc: 'Combined 30-Juz Hifz tracker + General academic divisions.',
                    icon: BuildingOfficeIcon,
                  },
                ].map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = formData.preset_type === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, preset_type: preset.id })}
                      className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[var(--accent-main)]/15 border-[var(--accent-main)] text-[var(--accent-main)] ring-2 ring-[var(--accent-main)]/20 shadow-md'
                          : 'theme-bg-sub theme-border hover:theme-bg-elevated theme-text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-2xl ${isSelected ? 'bg-[var(--accent-main)]/20 text-[var(--accent-main)]' : 'theme-bg-app theme-text-secondary'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs theme-text-primary">{preset.title}</div>
                        <div className="text-[11px] theme-text-secondary mt-1 leading-relaxed">{preset.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="p-4 sm:p-5 border-t theme-border theme-bg-sub/60 shrink-0 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={step === 1 ? onCancel : handleBack}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-2xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
          >
            <span>Continue</span>
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-7 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Institution...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Complete Institutional Onboarding</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

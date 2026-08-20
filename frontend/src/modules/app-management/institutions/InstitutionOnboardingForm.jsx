import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  UsersIcon,
  LocationIcon,
  CompassIcon,
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import FileUploadZone from '../../../components/ui/FileUploadZone';
import AddressMapModal from '../../../components/common/AddressMapModal';
import AddressPickerInput from '../../../components/ui/AddressPickerInput';
import { registerInstitution, getInstitutionCategories } from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_BY_DIVISION,
  BD_GEO_DATA,
} from '../../../utils/bangladeshGeoData';

const FALLBACK_INSTITUTION_TYPES = [
  { value: 'MADRASA', label: 'Madrasa / Maktab' },
  { value: 'SCHOOL', label: 'General School' },
  { value: 'COLLEGE', label: 'College / Higher Secondary' },
  { value: 'COACHING', label: 'Coaching / Academy' },
  { value: 'OTHER', label: 'Other Educational Institution' },
];

export default function InstitutionOnboardingForm({ onSuccess, onCancel }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadCats() {
      try {
        const data = await getInstitutionCategories();
        if (data && data.length > 0) {
          setCategories(data.map((c) => ({ value: c.code, label: c.name })));
        }
      } catch (err) {
        console.warn('Could not load categories in InstitutionOnboardingForm:', err);
      }
    }
    loadCats();
  }, []);

  const [formData, setFormData] = useState({
    // Step 1: Basic details
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

  // Google Maps / GPS Address Auto-fill Callback
  const handleMapLocationConfirm = (mapData) => {
    if (!mapData) return;
    setFormData((prev) => ({
      ...prev,
      division: mapData.division || prev.division,
      district: mapData.district || prev.district,
      upazila_thana: mapData.upazila_thana || prev.upazila_thana,
      post_code: mapData.postal_code || mapData.post_code || prev.post_code,
      street_address: mapData.street_address || mapData.address || prev.street_address,
    }));
    showToast('Campus address coordinates applied from map!', 'success');
  };

  const validateStep = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.name.trim()) errs.name = 'Academy name in English is required.';
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
      showToast('Academy onboarded successfully!', 'success');
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
    <div className="flex flex-col h-full w-full theme-text-primary select-none font-sans min-h-[660px] text-left">
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
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isCompleted
                      ? 'theme-bg-accent theme-accent-text shadow-xs'
                      : isActive
                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 ring-2 ring-[var(--accent-main)]/15 shadow-xs'
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

      {/* Form Body with uniform heights and locked max-width */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 pb-36 w-full">
        {/* STEP 1: Basic Identity */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto min-h-[440px]">
            {/* Academy English Name */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Academy Name (English) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g. Darul Ulum Islamic Academy"
                className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                  errors.name ? 'border-rose-500' : 'theme-border'
                } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.name}</p>}
            </div>

            {/* Native / Regional Title */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Regional Name
              </label>
              <input
                type="text"
                value={formData.bangla_name}
                onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
                placeholder="e.g. Darul Uloom Academy"
                className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
              />
            </div>

            {/* Academy Type & EIIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <CustomSelect
                  label="Academy Type"
                  value={formData.institution_type}
                  onChange={(val) => setFormData({ ...formData, institution_type: val })}
                  options={categories.length > 0 ? categories : FALLBACK_INSTITUTION_TYPES}
                  icon={BuildingOfficeIcon}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Govt. Reg. No.
                </label>
                <input
                  type="text"
                  value={formData.eiin_or_reg_no}
                  onChange={(e) => setFormData({ ...formData, eiin_or_reg_no: e.target.value })}
                  placeholder="e.g. 132456"
                  className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
                />
              </div>
            </div>

            {/* Contact Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Official Phone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  placeholder="e.g. 01712345678"
                  className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                    errors.phone ? 'border-rose-500' : 'theme-border'
                  } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all`}
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Official Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. info@academy.edu"
                  className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Branding & Structured Address */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto min-h-[440px]">
            {/* Slug Identifier */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Unique Tenant Slug <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3.5 py-2 h-10 rounded-l-xl theme-bg-elevated border border-r-0 theme-border theme-text-secondary text-xs font-mono font-bold flex items-center">
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
                  className={`flex-1 h-10 px-3.5 py-2 rounded-r-xl theme-bg-sub border ${
                    errors.slug ? 'border-rose-500' : 'theme-border'
                  } text-xs font-mono font-bold theme-accent focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all`}
                />
              </div>
              {errors.slug && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.slug}</p>}
            </div>

            {/* Logo File Upload */}
            <div>
              <FileUploadZone
                label="Academy Logo"
                value={formData.logo_data}
                onChange={(dataUrl) => setFormData({ ...formData, logo_data: dataUrl })}
                onRemove={() => setFormData({ ...formData, logo_data: '' })}
              />
            </div>

            {/* Campus Address & Google Maps Location Picker */}
            <div className="pt-3 border-t theme-border">
              <AddressPickerInput
                value={{
                  division: formData.division,
                  district: formData.district,
                  upazila: formData.upazila_thana,
                  post_code: formData.post_code,
                  street_address: formData.street_address,
                  coordinates: formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : '',
                }}
                onChange={(addr) => {
                  setFormData((prev) => ({
                    ...prev,
                    division: addr.division,
                    district: addr.district,
                    upazila_thana: addr.upazila || addr.upazila_thana || '',
                    post_code: addr.post_code || '',
                    street_address: addr.street_address || '',
                  }));
                }}
                title="Campus Location"
                required
              />
            </div>
          </div>
        )}

        {/* STEP 3: Admin & Presets */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto min-h-[440px]">
            <div className="p-4 rounded-2xl theme-bg-sub border theme-border text-xs theme-text-primary flex items-start gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <UsersIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-bold text-xs theme-text-primary">Root Institutional Admin Credentials</p>
                <p className="text-[11px] theme-text-secondary mt-0.5 leading-relaxed">
                  This user account will have root permissions to manage academic departments, staff rosters and permissions for this tenant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
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
                  className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                    errors.admin_name ? 'border-rose-500' : 'theme-border'
                  } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_name && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.admin_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Admin Phone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.admin_phone}
                  onChange={(e) => {
                    setFormData({ ...formData, admin_phone: e.target.value });
                    if (errors.admin_phone) setErrors((prev) => ({ ...prev, admin_phone: null }));
                  }}
                  placeholder="e.g. 01812345678"
                  className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                    errors.admin_phone ? 'border-rose-500' : 'theme-border'
                  } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_phone && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.admin_phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Admin Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => {
                    setFormData({ ...formData, admin_email: e.target.value });
                    if (errors.admin_email) setErrors((prev) => ({ ...prev, admin_email: null }));
                  }}
                  placeholder="admin@academy.edu"
                  className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                    errors.admin_email ? 'border-rose-500' : 'theme-border'
                  } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_email && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.admin_email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
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
                  className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                    errors.admin_password ? 'border-rose-500' : 'theme-border'
                  } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]`}
                />
                {errors.admin_password && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.admin_password}</p>}
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
          className="px-4 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
          >
            <span>Continue</span>
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Academy...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Complete Academy Onboarding</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Google Maps / GPS Location Picker Modal */}
      {isMapModalOpen && (
        <AddressMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          initialLocation={{
            address: formData.street_address,
            division: formData.division,
            district: formData.district,
            upazila_thana: formData.upazila_thana,
            postal_code: formData.post_code,
          }}
          onConfirm={handleMapLocationConfirm}
        />
      )}
    </div>
  );
}

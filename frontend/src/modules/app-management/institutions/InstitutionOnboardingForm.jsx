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
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import Stepper from '../../../components/ui/Stepper';
import FileUploadZone from '../../../components/ui/FileUploadZone';
import AddressMapModal from '../../../components/common/AddressMapModal';
import AddressPickerInput from '../../../components/ui/AddressPickerInput';
import { registerInstitution, getInstitutionCategories } from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';
import { DrawerContainer } from '../../../components/layout';
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
    <DrawerContainer padding="normal" spacing="normal">
      {/* Stepper Progress Bar */}
      <div className="p-3 sm:p-4 border-b theme-border shrink-0 max-w-2xl mx-auto w-full">
        <Stepper
          steps={[
            { id: 1, label: 'Identity & Info', description: 'Basic Details' },
            { id: 2, label: 'Location & Brand', description: 'Address & Logo' },
            { id: 3, label: 'Admin & Presets', description: 'Access & Setup' },
          ]}
          currentStep={step}
          onStepClick={(stepNum) => {
            if (stepNum < step) setStep(stepNum);
          }}
          clickable={true}
        />
      </div>

      {/* Form Body with standard spacing */}
      <div className="flex-1 space-y-4 sm:space-y-5 w-full">
        {/* STEP 1: Basic Identity */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
            {/* Academy English Name */}
            <div>
              <CustomInput
                label="Academy Name (English)"
                required
                value={formData.name}
                onChange={(val) => handleNameChange({ target: { value: val } })}
                placeholder="e.g. Darul Ulum Islamic Academy"
                error={errors.name}
              />
            </div>

            {/* Native / Regional Title */}
            <div>
              <CustomInput
                label="Regional Name"
                optional
                value={formData.bangla_name}
                onChange={(val) => setFormData({ ...formData, bangla_name: val })}
                placeholder="e.g. Darul Uloom Academy"
              />
            </div>

            {/* Academy Type & EIIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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
                <CustomInput
                  label="Govt. Reg. No."
                  optional
                  value={formData.eiin_or_reg_no}
                  onChange={(val) => setFormData({ ...formData, eiin_or_reg_no: val })}
                  placeholder="e.g. 132456"
                />
              </div>
            </div>

            {/* Contact Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <CustomInput
                  type="phone"
                  label="Official Phone"
                  required
                  value={formData.phone}
                  onChange={(val) => {
                    setFormData({ ...formData, phone: val });
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  placeholder="e.g. 01712345678"
                  error={errors.phone}
                />
              </div>

              <div>
                <CustomInput
                  type="email"
                  label="Official Email"
                  optional
                  value={formData.email}
                  onChange={(val) => setFormData({ ...formData, email: val })}
                  placeholder="e.g. info@academy.edu"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Branding & Structured Address */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
            {/* Slug Identifier */}
            <div>
              <CustomInput
                label="Unique Tenant Slug"
                required
                prefix="app/"
                value={formData.slug}
                onChange={(val) => {
                  setFormData({ ...formData, slug: val.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                  if (errors.slug) setErrors((prev) => ({ ...prev, slug: null }));
                }}
                placeholder="e.g. darul-ulum"
                error={errors.slug}
              />
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
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
            <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-xs theme-text-primary flex items-start gap-3 shadow-2xs">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <CustomInput
                  label="Admin Full Name"
                  required
                  value={formData.admin_name}
                  onChange={(val) => {
                    setFormData({ ...formData, admin_name: val });
                    if (errors.admin_name) setErrors((prev) => ({ ...prev, admin_name: null }));
                  }}
                  placeholder="e.g. Maulana Shamsul Haque"
                  error={errors.admin_name}
                />
              </div>

              <div>
                <CustomInput
                  type="phone"
                  label="Admin Phone"
                  required
                  value={formData.admin_phone}
                  onChange={(val) => {
                    setFormData({ ...formData, admin_phone: val });
                    if (errors.admin_phone) setErrors((prev) => ({ ...prev, admin_phone: null }));
                  }}
                  placeholder="e.g. 01812345678"
                  error={errors.admin_phone}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <CustomInput
                  type="email"
                  label="Admin Email"
                  required
                  value={formData.admin_email}
                  onChange={(val) => {
                    setFormData({ ...formData, admin_email: val });
                    if (errors.admin_email) setErrors((prev) => ({ ...prev, admin_email: null }));
                  }}
                  placeholder="admin@academy.edu"
                  error={errors.admin_email}
                />
              </div>

              <div>
                <CustomInput
                  type="password"
                  label="Admin Login Password"
                  required
                  value={formData.admin_password}
                  onChange={(val) => {
                    setFormData({ ...formData, admin_password: val });
                    if (errors.admin_password) setErrors((prev) => ({ ...prev, admin_password: null }));
                  }}
                  placeholder="••••••••"
                  error={errors.admin_password}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between gap-2.5 pt-4 border-t theme-border select-none">
        <button
          type="button"
          onClick={step === 1 ? onCancel : handleBack}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all cursor-pointer disabled:opacity-50"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span>Continue</span>
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
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
    </DrawerContainer>
  );
}

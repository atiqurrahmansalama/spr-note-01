import React, { useState } from 'react';
import {
  DepartmentIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CloseIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  UsersIcon,
  LockClosedIcon,
} from '../../../components/ui/Icons';
import { registerInstitution } from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';

export default function InstitutionOnboardingModal({ isOpen, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    // Step 1: Basic details
    name: '',
    bangla_name: '',
    institution_type: 'MADRASA',
    eiin_or_reg_no: '',
    phone: '',
    district: 'Dhaka',

    // Step 2: Branding & Address
    slug: '',
    logo_url: '',
    email: '',
    address: '',

    // Step 3: Admin & Presets
    admin_name: '',
    admin_phone: '',
    admin_email: '',
    admin_password: '',
    preset_type: 'BOTH',
  });

  if (!isOpen) return null;

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
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

  const validateStep = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.name.trim()) errs.name = 'Institution name in English is required.';
      if (!formData.phone.trim()) errs.phone = 'Official contact phone is required.';
    } else if (currentStep === 2) {
      if (!formData.slug.trim()) errs.slug = 'Unique web identifier (slug) is required.';
      else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        errs.slug = 'Slug must only contain lowercase letters, numbers, and hyphens.';
      }
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
    e.preventDefault();
    if (!validateStep(3)) return;

    try {
      setIsSubmitting(true);
      setErrors({});
      const response = await registerInstitution(formData);
      showToast('Institution onboarded successfully!', 'success');
      if (onSuccess) onSuccess(response);
      onClose();
    } catch (err) {
      console.error('[Onboarding Error]:', err);
      const serverErrors = err.response?.data || {};
      if (typeof serverErrors === 'object') {
        const mappedErrors = {};
        Object.entries(serverErrors).forEach(([key, val]) => {
          mappedErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(mappedErrors);
        showToast(mappedErrors.non_field_errors || mappedErrors.error || 'Failed to onboard institution. Check the errors below.', 'error');
      } else {
        showToast('Server error during onboarding. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl theme-bg-elevated border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b theme-border bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <DepartmentIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                Onboard New Academic Institution
              </h3>
              <p className="text-xs theme-text-secondary">
                Set up an isolated multi-tenant academic institution hierarchy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 border-b theme-border theme-bg-sub flex items-center justify-between text-xs">
          {[
            { num: 1, label: 'Institution Profile' },
            { num: 2, label: 'Branding & Slug' },
            { num: 3, label: 'Admin & Presets' },
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {isCompleted ? <CheckCircleIcon className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`font-medium ${
                    isActive ? 'theme-text-primary font-bold' : 'theme-text-secondary'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: Basic Profile */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Institution Name (English) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g. Darul Ulum Islamic Academy"
                    className={`w-full px-3 py-2 rounded-xl theme-bg-app border ${
                      errors.name ? 'border-rose-500' : 'theme-border'
                    } text-xs theme-text-primary focus:outline-none focus:border-sky-500`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Native / Regional Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.bangla_name}
                    onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
                    placeholder="e.g. Local or native script title"
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Institution Type
                  </label>
                  <select
                    value={formData.institution_type}
                    onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  >
                    <option value="MADRASA">Madrasa / Maktab</option>
                    <option value="SCHOOL">General School</option>
                    <option value="COLLEGE">College / Higher Ed</option>
                    <option value="COACHING">Coaching / Academy</option>
                    <option value="OTHER">Other Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    EIIN / Govt. Reg. No.
                  </label>
                  <input
                    type="text"
                    value={formData.eiin_or_reg_no}
                    onChange={(e) => setFormData({ ...formData, eiin_or_reg_no: e.target.value })}
                    placeholder="e.g. 132456"
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    District / Region
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. Dhaka"
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Official Phone Number *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  placeholder="e.g. 01712345678"
                  className={`w-full px-3 py-2 rounded-xl theme-bg-app border ${
                    errors.phone ? 'border-rose-500' : 'theme-border'
                  } text-xs theme-text-primary focus:outline-none focus:border-sky-500`}
                />
                {errors.phone && (
                  <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Web Identifier & Branding */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Unique Tenant Web Identifier (Slug) *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 rounded-l-xl bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-400 text-xs font-mono">
                    app.sprnote.com/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                      if (errors.slug) setErrors((prev) => ({ ...prev, slug: null }));
                    }}
                    placeholder="e.g. darul-ulum"
                    className={`flex-1 px-3 py-2 rounded-r-xl theme-bg-app border ${
                      errors.slug ? 'border-rose-500' : 'theme-border'
                    } text-xs font-mono text-sky-400 focus:outline-none focus:border-sky-500`}
                  />
                </div>
                {errors.slug && (
                  <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.slug}</p>
                )}
                <p className="mt-1 text-[10px] theme-text-secondary">
                  Used for tenant identification and custom branding links.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. info@institution.edu"
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-1">
                  Campus Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. House #12, Road #4, Sector #7, Uttara, Dhaka"
                  className="w-full px-3 py-2 rounded-xl theme-bg-app border theme-border text-xs theme-text-primary focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Admin & Presets */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs theme-text-primary flex items-start gap-2.5">
                <UsersIcon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Head Administrator Account</p>
                  <p className="text-[11px] theme-text-secondary">
                    This account will have full institutional administrative privileges for this tenant.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.admin_name}
                    onChange={(e) => {
                      setFormData({ ...formData, admin_name: e.target.value });
                      if (errors.admin_name) setErrors((prev) => ({ ...prev, admin_name: null }));
                    }}
                    placeholder="e.g. Maulana Shamsul Haque"
                    className={`w-full px-3 py-2 rounded-xl theme-bg-app border ${
                      errors.admin_name ? 'border-rose-500' : 'theme-border'
                    } text-xs theme-text-primary focus:outline-none focus:border-sky-500`}
                  />
                  {errors.admin_name && (
                    <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.admin_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Admin Phone (Login User ID) *
                  </label>
                  <input
                    type="text"
                    value={formData.admin_phone}
                    onChange={(e) => {
                      setFormData({ ...formData, admin_phone: e.target.value });
                      if (errors.admin_phone) setErrors((prev) => ({ ...prev, admin_phone: null }));
                    }}
                    placeholder="e.g. 01812345678"
                    className={`w-full px-3 py-2 rounded-xl theme-bg-app border ${
                      errors.admin_phone ? 'border-rose-500' : 'theme-border'
                    } text-xs theme-text-primary focus:outline-none focus:border-sky-500`}
                  />
                  {errors.admin_phone && (
                    <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.admin_phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
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
                    className={`w-full px-3 py-2 rounded-xl theme-bg-app border ${
                      errors.admin_email ? 'border-rose-500' : 'theme-border'
                    } text-xs theme-text-primary focus:outline-none focus:border-sky-500`}
                  />
                  {errors.admin_email && (
                    <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.admin_email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-secondary mb-1">
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => {
                      setFormData({ ...formData, admin_password: e.target.value });
                      if (errors.admin_password) setErrors((prev) => ({ ...prev, admin_password: null }));
                    }}
                    placeholder="••••••••"
                    className={`w-full px-3 py-2 rounded-xl theme-bg-app border ${
                      errors.admin_password ? 'border-rose-500' : 'theme-border'
                    } text-xs theme-text-primary focus:outline-none focus:border-sky-500`}
                  />
                  {errors.admin_password && (
                    <p className="mt-1 text-[10px] text-rose-400 font-medium">{errors.admin_password}</p>
                  )}
                </div>
              </div>

              {/* Department Presets */}
              <div>
                <label className="block text-xs font-bold theme-text-secondary mb-2">
                  Academic Department Starter Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      desc: 'Standard classes with grading curriculum and subject marks.',
                      icon: AcademicCapIcon,
                    },
                    {
                      id: 'BOTH',
                      title: 'Dual Curriculum',
                      desc: 'Combined Hifz tracker + General academic divisions.',
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
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 text-sky-300 ring-2 ring-sky-500/20'
                            : 'theme-bg-app theme-border hover:theme-bg-sub text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-zinc-400'}`} />
                          {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs theme-text-primary">{preset.title}</div>
                          <div className="text-[10px] theme-text-secondary mt-0.5 leading-tight">{preset.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t theme-border flex items-center justify-between">
            <button
              type="button"
              onClick={step === 1 ? onClose : handleBack}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-sky-500/20 transition cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Institution...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Complete Onboarding</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

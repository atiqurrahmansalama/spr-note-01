import React, { useState, useEffect, useMemo } from 'react';
import {
  BuildingOfficeIcon,
  SleekCheckIcon,
} from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../../components/ui/CustomCheckbox';
import DocumentFilePicker from '../../../../components/ui/DocumentFilePicker';
import { CampusStructureQuotaGroup } from './InstitutionOnboardingForm';
import AddressPickerInput from '../../../../components/ui/AddressPickerInput';
import { updateInstitution, getInstitutionCategories } from '../../../../api/institutions';
import { useToast } from '../../../../context/ToastContext';

const FALLBACK_INSTITUTION_TYPES = [
  { value: 'MADRASA', label: 'Madrasa / Maktab' },
  { value: 'SCHOOL', label: 'General School' },
  { value: 'COLLEGE', label: 'College / Higher Secondary' },
  { value: 'COACHING', label: 'Coaching / Academy' },
  { value: 'OTHER', label: 'Other Educational Institution' },
];

export default function InstitutionEditForm({ institution, onSuccess, onCancel, showStructureQuotas = false }) {
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    bangla_name: '',
    phone: '',
    email: '',
    eiin_or_reg_no: '',
    institution_type: 'MADRASA',
    is_active: true,
    logo_data: '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila_thana: '',
    post_code: '',
    street_address: '',
    address: '',
    max_institutions: 1,
    max_branches: 1,
    max_departments: 1,
  });

  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    async function loadCats() {
      try {
        const data = await getInstitutionCategories();
        if (data && data.length > 0) {
          setCategories(data.map((c) => ({ value: c.code, label: c.name })));
        }
      } catch (err) {
        console.warn('Could not load categories in InstitutionEditForm:', err);
      }
    }
    loadCats();
  }, []);

  useEffect(() => {
    if (institution) {
      const snap = {
        name: institution.name || '',
        bangla_name: institution.bangla_name || '',
        phone: institution.phone || '',
        email: institution.email || '',
        eiin_or_reg_no: institution.eiin_or_reg_no || '',
        institution_type: institution.institution_type || 'MADRASA',
        is_active: institution.is_active ?? true,
        logo_data: institution.logo_data || institution.logo_url || '',
        division: institution.division || 'Dhaka',
        district: institution.district || 'Dhaka',
        upazila_thana: institution.upazila_thana || '',
        post_code: institution.post_code || '',
        street_address: institution.street_address || '',
        address: institution.address || '',
        max_institutions: institution.max_institutions ?? 1,
        max_branches: institution.max_branches ?? 1,
        max_departments: institution.max_departments ?? 1,
      };
      setFormData(snap);
      setInitialData(snap);
    }
  }, [institution]);

  // Dirty Checker: Save button disabled until user modifies any field
  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      formData.name !== initialData.name ||
      formData.bangla_name !== initialData.bangla_name ||
      formData.phone !== initialData.phone ||
      formData.email !== initialData.email ||
      formData.eiin_or_reg_no !== initialData.eiin_or_reg_no ||
      formData.institution_type !== initialData.institution_type ||
      formData.is_active !== initialData.is_active ||
      formData.logo_data !== initialData.logo_data ||
      formData.division !== initialData.division ||
      formData.district !== initialData.district ||
      formData.upazila_thana !== initialData.upazila_thana ||
      formData.post_code !== initialData.post_code ||
      formData.street_address !== initialData.street_address ||
      formData.max_institutions !== initialData.max_institutions ||
      formData.max_branches !== initialData.max_branches ||
      formData.max_departments !== initialData.max_departments
    );
  }, [formData, initialData]);

  const validate = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Academy name in English is required.';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!formData.division) errs.division = 'Division selection is required.';
    if (!formData.district) errs.district = 'District selection is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validate()) return;

    try {
      setIsUpdating(true);
      setErrors({});

      // Format combined address
      const fullAddressParts = [
        formData.street_address,
        formData.upazila_thana,
        formData.district,
        formData.division,
      ].filter(Boolean);
      const combinedAddress = fullAddressParts.join(', ');

      const payload = {
        ...formData,
        address: combinedAddress || formData.address,
      };

      const res = await updateInstitution(institution.id, payload);
      showToast('Academy profile updated successfully!', 'success');
      if (onSuccess) onSuccess(res);
    } catch (err) {
      console.error('[Update Academy Error]:', err);
      const serverErrors = err.response?.data || (typeof err.data === 'object' ? err.data : {});
      if (typeof serverErrors === 'object' && Object.keys(serverErrors).length > 0) {
        const mappedErrors = {};
        Object.entries(serverErrors).forEach(([key, val]) => {
          mappedErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const readableMsg = mappedErrors.non_field_errors || mappedErrors.error || mappedErrors.detail || `${firstKey ? firstKey.replace(/_/g, ' ') + ': ' : ''}${mappedErrors[firstKey]}`;
        showToast(readableMsg, 'error');
      } else {
        showToast(err.message || 'Failed to update academy details. Please try again.', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const isSaveDisabled = !isDirty || isUpdating;

  return (
    <div className="flex flex-col h-full theme-bg-app select-none">
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
          {/* Academy English Title */}
          <div>
            <CustomInput
              label="Academy Name (English)"
              required
              value={formData.name}
              onChange={(val) => {
                setFormData({ ...formData, name: val });
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="e.g. Darul Ulum Islamic Academy"
              error={errors.name}
            />
          </div>

          {/* Regional Native Title */}
          <div>
            <CustomInput
              label="Regional Name"
              optional
              value={formData.bangla_name}
              onChange={(val) => setFormData({ ...formData, bangla_name: val })}
              placeholder="e.g. Darul Uloom Academy"
            />
          </div>

          {/* Type & EIIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <CustomSelect
                label="Academy Category / Type"
                value={formData.institution_type}
                onChange={(val) => setFormData({ ...formData, institution_type: val })}
                options={categories.length > 0 ? categories : FALLBACK_INSTITUTION_TYPES}
                icon={BuildingOfficeIcon}
                required
              />
            </div>

            <div>
              <CustomInput
                label="EIIN / Govt. Reg No."
                optional
                value={formData.eiin_or_reg_no}
                onChange={(val) => setFormData({ ...formData, eiin_or_reg_no: val })}
                placeholder="e.g. 132456"
              />
            </div>
          </div>

          {/* Institutional Quota & Multi-Campus Access Allocation (Super Admin Only) */}
          {showStructureQuotas && (
            <CampusStructureQuotaGroup
              values={formData}
              onChange={(key, val) => setFormData((prev) => ({ ...prev, [key]: val }))}
              title="Campus Structure & Quotas"
              subtitle="Control allowed academies, branch campuses, and department allocations"
            />
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <CustomInput
                type="phone"
                label="Official Contact Phone"
                value={formData.phone}
                onChange={(val) => setFormData({ ...formData, phone: val })}
                placeholder="e.g. 01712345678"
              />
            </div>

            <div>
              <CustomInput
                type="email"
                label="Official Email Address"
                value={formData.email}
                onChange={(val) => {
                  setFormData({ ...formData, email: val });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="e.g. info@academy.edu"
                error={errors.email}
              />
            </div>
          </div>

          {/* Logo File Upload */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
              Academy Logo / Emblem
            </label>
            <DocumentFilePicker
              label="Click to Upload Academy Logo"
              subLabel="SVG, PNG, JPG, WebP (Max 5MB)"
              accept="image/*,.svg"
              fileUrl={formData.logo_data || formData.logo_url}
              fileName={formData.logo_name || (formData.logo_data ? "Academy Logo" : "")}
              fileSize={formData.logo_size}
              onChange={(fileData) =>
                setFormData((prev) => ({
                  ...prev,
                  logo_data: fileData.url,
                  logo_name: fileData.name,
                  logo_size: fileData.size,
                }))
              }
              onRemove={() =>
                setFormData((prev) => ({
                  ...prev,
                  logo_data: '',
                  logo_name: '',
                  logo_size: '',
                }))
              }
            />
          </div>

          {/* Geographic Location / Structured Address */}
          <div className="pt-3 border-t theme-border">
            <AddressPickerInput
              value={{
                division: formData.division,
                district: formData.district,
                upazila: formData.upazila_thana,
                post_code: formData.post_code,
                street_address: formData.street_address || formData.address,
              }}
              onChange={(addr) => {
                setFormData((prev) => ({
                  ...prev,
                  division: addr.division,
                  district: addr.district,
                  upazila_thana: addr.upazila || addr.upazila_thana || '',
                  post_code: addr.post_code || '',
                  street_address: addr.street_address || '',
                  address: addr.street_address || '',
                }));
                if (errors.division) setErrors((prev) => ({ ...prev, division: null }));
                if (errors.district) setErrors((prev) => ({ ...prev, district: null }));
              }}
              title="Campus Geographic Address"
              subTitle="Division, district, upazila, postal code & map geolocation"
              required
            />
          </div>
        </form>
      </div>

      {/* Footer Bar with Dirty-Checked Save Button */}
      <div className="p-4 sm:p-5 border-t theme-border theme-bg-sub/60 shrink-0 flex items-center justify-between gap-3">
        <div className="text-[11px] theme-text-secondary font-medium">
          {!isDirty ? (
            <span>No unsaved changes</span>
          ) : (
            <span className="theme-accent font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] animate-pulse"></span>
              Unsaved changes pending
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
              isSaveDisabled
                ? 'opacity-40 cursor-not-allowed theme-bg-sub border theme-border theme-text-secondary'
                : 'theme-bg-accent theme-accent-text hover:opacity-90 cursor-pointer shadow-md'
            }`}
          >
            <SleekCheckIcon className="w-4 h-4" />
            <span>{isUpdating ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  SleekCheckIcon,
  BuildingOfficeIcon,
  LocationIcon,
  CompassIcon,
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import FileUploadZone from '../../../components/ui/FileUploadZone';
import AddressMapModal from '../../../components/common/AddressMapModal';
import { updateInstitution, getInstitutionCategories } from '../../../api/institutions';
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

export default function InstitutionEditForm({ institution, onSuccess, onCancel }) {
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
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
      formData.address !== initialData.address
    );
  }, [formData, initialData]);

  if (!institution) return null;

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
      address: mapData.address || prev.address,
    }));
    showToast('Campus address coordinates applied from map!', 'success');
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Academy name in English is required.';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!formData.division) errs.division = 'Division is required.';
    if (!formData.district) errs.district = 'District is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    setIsUpdating(true);
    try {
      // Re-compose address for full backward compatibility
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

      await updateInstitution(institution.id, payload);
      showToast('Academy profile updated successfully!', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('[Edit Institution Error]:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to update academy', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableDistricts = BANGLADESH_DISTRICTS_BY_DIVISION[formData.division] || [];
  const availableThanas = (BD_GEO_DATA[formData.division] && BD_GEO_DATA[formData.division][formData.district]) || [];
  const isSaveDisabled = isUpdating || !isDirty || !formData.name.trim();

  return (
    <div className="flex flex-col h-full w-full theme-text-primary select-none font-sans min-h-[660px] text-left">
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 pb-36 w-full">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          {/* Identity Names */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Academy Name (English) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                placeholder="e.g. Darul Ulum Islamic Academy"
                className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                  errors.name ? 'border-rose-500' : 'theme-border'
                } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Native / Regional Name (Optional)
              </label>
              <input
                type="text"
                value={formData.bangla_name}
                onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
                placeholder="e.g. Darul Uloom Academy"
                className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
              />
            </div>
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
                EIIN / Govt. Reg No.
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

          {/* Operating Status using Reusable CustomCheckbox */}
          <div className="p-4 rounded-2xl theme-bg-sub border theme-border shadow-xs">
            <CustomCheckbox
              id="academy_is_active_toggle"
              checked={formData.is_active}
              onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              label={
                <span className="flex items-center gap-2">
                  <span>Academy Operating Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      formData.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}
                  >
                    {formData.is_active ? 'Active & Accessible' : 'Inactive / Suspended'}
                  </span>
                </span>
              }
              description="When active, this academy is operational, selectable in workspace switchers, and included in student registries."
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Official Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 01712345678"
                className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Official Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="e.g. info@academy.edu"
                className={`w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border ${
                  errors.email ? 'border-rose-500' : 'theme-border'
                } text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/15 transition-all`}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email}</p>}
            </div>
          </div>

          {/* Logo File Upload */}
          <div>
            <FileUploadZone
              label="Academy Logo / Emblem"
              value={formData.logo_data}
              onChange={(dataUrl) => setFormData({ ...formData, logo_data: dataUrl })}
              onRemove={() => setFormData({ ...formData, logo_data: '' })}
            />
          </div>

          {/* Geographic Location / Structured Address */}
          <div className="pt-3 border-t theme-border space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  Campus Geographic Address
                </h4>
              </div>

              {/* Google Maps / GPS Location Picker Trigger */}
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-bold theme-accent transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Pick exact location from Google Maps or GPS"
              >
                <CompassIcon className="w-3.5 h-3.5" />
                <span>Pick from Map / GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <CustomSelect
                  label="Division"
                  value={formData.division}
                  onChange={handleDivisionChange}
                  options={BANGLADESH_DIVISIONS}
                  placeholder="Select Division"
                  required
                />
                {errors.division && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.division}</p>}
              </div>

              <div>
                <CustomSelect
                  label="District"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  options={availableDistricts}
                  placeholder="Select District"
                  searchable
                  required
                />
                {errors.district && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.district}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {availableThanas.length > 0 ? (
                  <CustomSelect
                    label="Upazila / Thana"
                    value={formData.upazila_thana}
                    onChange={(val) => setFormData({ ...formData, upazila_thana: val })}
                    options={availableThanas}
                    placeholder="Select Thana"
                    searchable
                    direction="auto"
                  />
                ) : (
                  <div>
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                      Upazila / Thana
                    </label>
                    <input
                      type="text"
                      value={formData.upazila_thana}
                      onChange={(e) => setFormData({ ...formData, upazila_thana: e.target.value })}
                      placeholder="e.g. Sadar"
                      className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                  Post Code / Area Code
                </label>
                <input
                  type="text"
                  value={formData.post_code}
                  onChange={(e) => setFormData({ ...formData, post_code: e.target.value })}
                  placeholder="e.g. 1230"
                  className="w-full h-10 px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Street / Holding / Campus Details
              </label>
              <textarea
                rows={2}
                value={formData.street_address}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                placeholder="e.g. House #12, Road #4, Sector #7"
                className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] resize-none transition-all"
              />
            </div>
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

      {/* Google Maps / GPS Picker Modal */}
      {isMapModalOpen && (
        <AddressMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          initialLocation={{
            address: formData.street_address || formData.address,
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

import React, { useState, useEffect } from 'react';
import {
  SleekCheckIcon,
  BuildingOfficeIcon,
  LocationIcon,
} from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';
import FileUploadZone from '../../../components/ui/FileUploadZone';
import { updateInstitution } from '../../../api/institutions';
import { useToast } from '../../../context/ToastContext';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_BY_DIVISION,
  MAJOR_THANAS_BY_DISTRICT,
} from '../../../utils/bangladeshGeoData';

const INSTITUTION_TYPES = [
  { value: 'MADRASA', label: 'Madrasa / Maktab', desc: 'Islamic academic institution with Hifz / Qawmi / Alia curriculum' },
  { value: 'SCHOOL', label: 'General School', desc: 'Primary & secondary general education standard curriculum' },
  { value: 'COLLEGE', label: 'College / Higher Secondary', desc: 'Higher secondary & undergraduate college' },
  { value: 'COACHING', label: 'Coaching / Academy', desc: 'Specialized academic coaching & training center' },
  { value: 'OTHER', label: 'Other Educational Institution', desc: 'General educational or vocational institute' },
];

export default function InstitutionEditForm({ institution, onSuccess, onCancel }) {
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bangla_name: '',
    phone: '',
    email: '',
    eiin_or_reg_no: '',
    institution_type: 'MADRASA',
    logo_data: '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila_thana: '',
    post_code: '',
    street_address: '',
    address: '',
  });

  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        bangla_name: institution.bangla_name || '',
        phone: institution.phone || '',
        email: institution.email || '',
        eiin_or_reg_no: institution.eiin_or_reg_no || '',
        institution_type: institution.institution_type || 'MADRASA',
        logo_data: institution.logo_data || institution.logo_url || '',
        division: institution.division || 'Dhaka',
        district: institution.district || 'Dhaka',
        upazila_thana: institution.upazila_thana || '',
        post_code: institution.post_code || '',
        street_address: institution.street_address || '',
        address: institution.address || '',
      });
    }
  }, [institution]);

  if (!institution) return null;

  const handleDivisionChange = (newDivision) => {
    const districtsForDiv = BANGLADESH_DISTRICTS_BY_DIVISION[newDivision] || [];
    const firstDistrict = districtsForDiv[0] || '';
    const thanasForDist = MAJOR_THANAS_BY_DISTRICT[firstDistrict] || [];
    setFormData((prev) => ({
      ...prev,
      division: newDivision,
      district: firstDistrict,
      upazila_thana: thanasForDist[0] || '',
    }));
  };

  const handleDistrictChange = (newDistrict) => {
    const thanasForDist = MAJOR_THANAS_BY_DISTRICT[newDistrict] || [];
    setFormData((prev) => ({
      ...prev,
      district: newDistrict,
      upazila_thana: thanasForDist[0] || '',
    }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Institution name is required.', 'error');
      return;
    }

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
      showToast('Institution profile updated successfully!', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('[Edit Institution Error]:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to update institution', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableDistricts = BANGLADESH_DISTRICTS_BY_DIVISION[formData.division] || [];
  const availableThanas = MAJOR_THANAS_BY_DISTRICT[formData.district] || [];

  return (
    <div className="flex flex-col h-full theme-text-primary select-none font-sans min-h-[580px]">
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
          {/* Identity Names */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Institution Name (English) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Native / Regional Name
              </label>
              <input
                type="text"
                value={formData.bangla_name}
                onChange={(e) => setFormData({ ...formData, bangla_name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20"
              />
            </div>
          </div>

          {/* Type & EIIN */}
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
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                EIIN / Govt. Reg No.
              </label>
              <input
                type="text"
                value={formData.eiin_or_reg_no}
                onChange={(e) => setFormData({ ...formData, eiin_or_reg_no: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Official Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Official Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
              />
            </div>
          </div>

          {/* Logo File Upload */}
          <div>
            <FileUploadZone
              label="Institution Logo / Emblem"
              value={formData.logo_data}
              onChange={(dataUrl) => setFormData({ ...formData, logo_data: dataUrl })}
              onRemove={() => setFormData({ ...formData, logo_data: '' })}
            />
          </div>

          {/* Geographic Location / Structured Address */}
          <div className="pt-3 border-t theme-border space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <LocationIcon className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Campus Geographic Address
              </h4>
            </div>

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
              </div>
            </div>

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
                  />
                ) : (
                  <div>
                    <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                      Upazila / Thana / থানা
                    </label>
                    <input
                      type="text"
                      value={formData.upazila_thana}
                      onChange={(e) => setFormData({ ...formData, upazila_thana: e.target.value })}
                      placeholder="e.g. Sadar"
                      className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
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
                  className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
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
                className="w-full px-4 py-3 rounded-2xl theme-bg-sub border theme-border text-xs font-medium theme-text-primary focus:outline-none focus:border-[var(--accent-main)] resize-none"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Footer Bar */}
      <div className="p-4 sm:p-5 border-t theme-border theme-bg-sub/60 shrink-0 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isUpdating}
          className="px-5 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUpdating}
          className="px-6 py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2"
        >
          <SleekCheckIcon className="w-4 h-4" />
          <span>{isUpdating ? 'Saving Changes...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}

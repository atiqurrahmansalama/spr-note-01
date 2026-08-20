import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import {
  BuildingOfficeIcon,
  SleekCheckIcon,
  LocationIcon,
  TeacherIcon,
  PhoneIcon,
  MailIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomCheckbox from '../../components/ui/CustomCheckbox';
import AddressPickerInput from '../../components/ui/AddressPickerInput';
import {
  BANGLADESH_DIVISIONS,
  BD_GEO_DATA,
} from '../../utils/bangladeshGeoData';
import { createBranch, updateBranch } from '../../api/academy';

const BRANCH_TYPES = [
  { label: 'Main Campus', value: 'MAIN_CAMPUS' },
  { label: 'Sub Branch', value: 'SUB_BRANCH' },
  { label: 'Female Branch / Mahila Branch', value: 'FEMALE_BRANCH' },
  { label: 'Residential Campus', value: 'RESIDENTIAL_CAMPUS' },
];

export default function BranchForm({ branch = null, onSaved, onCancel }) {
  const { showToast } = useToast();
  const isEdit = Boolean(branch?.id);

  const initialValues = useMemo(() => {
    if (branch) {
      return {
        branch_name: branch.branch_name || '',
        branch_code: branch.branch_code || '',
        branch_type: branch.branch_type || 'MAIN_CAMPUS',
        in_charge_staff: branch.in_charge_staff || '',
        contact_phone: branch.contact_phone || '',
        contact_email: branch.contact_email || '',
        address: branch.address || '',
        district: branch.district || '',
        division: branch.division || '',
        maps_location_query: branch.address ? `${branch.address}, ${branch.district || ''}` : '',
        is_active: branch.is_active ?? true,
      };
    }
    return {
      branch_name: '',
      branch_code: '',
      branch_type: 'MAIN_CAMPUS',
      in_charge_staff: '',
      contact_phone: '',
      contact_email: '',
      address: '',
      district: '',
      division: '',
      maps_location_query: '',
      is_active: true,
    };
  }, [branch]);

  const [formData, setFormData] = useState(initialValues);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetchWithAuth('/api/v1/staff/');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setStaffList(list.filter((s) => !s.is_deleted && s.is_active));
      }
    } catch {
      // Fallback
    } finally {
      setLoadingStaff(false);
    }
  };

  // Determine if form has been modified by the user
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some((key) => formData[key] !== initialValues[key]);
  }, [formData, initialValues]);

  const isFormValid = formData.branch_name.trim().length > 0;
  const canSave = isDirty && isFormValid && !submitting;

  const handleDivisionChange = (div) => {
    setFormData((prev) => ({
      ...prev,
      division: div,
      district: '',
    }));
  };

  const availableDistricts = formData.division && BD_GEO_DATA[formData.division]
    ? Object.keys(BD_GEO_DATA[formData.division])
    : [];

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.branch_name.trim()) {
      showToast('Branch Name is required.', 'warning');
      return;
    }

    setSubmitting(true);
    const payload = {
      branch_name: formData.branch_name.trim(),
      branch_code: formData.branch_code.trim().toUpperCase(),
      branch_type: formData.branch_type,
      in_charge_staff: formData.in_charge_staff || null,
      contact_phone: formData.contact_phone.trim(),
      contact_email: formData.contact_email.trim(),
      address: formData.address.trim(),
      district: formData.district || '',
      division: formData.division || '',
      is_active: formData.is_active,
    };

    try {
      if (isEdit) {
        await updateBranch(branch.id, payload);
        showToast('Academic Branch updated successfully!', 'success');
      } else {
        await createBranch(payload);
        showToast('Academic Branch registered successfully!', 'success');
      }
      onSaved?.();
    } catch (err) {
      showToast(err.message || 'Failed to save branch.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const staffOptions = staffList.map((s) => ({
    label: `${s.user_name || s.employee_id || 'Staff'} - ${s.designation || 'Faculty'}`,
    value: s.id,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full overflow-y-auto theme-text-primary font-sans">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Basic Campus Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">Campus Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Branch / Campus Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Uttara Main Campus, Mirpur Sub-Branch"
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-sm font-medium theme-text-primary placeholder:text-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Branch Code
              </label>
              <input
                type="text"
                placeholder="e.g. UTT-01"
                value={formData.branch_code}
                onChange={(e) => setFormData({ ...formData, branch_code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-sm font-mono theme-text-primary placeholder:text-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Campus Category
              </label>
              <CustomSelect
                options={BRANCH_TYPES}
                value={formData.branch_type}
                onChange={(val) => setFormData({ ...formData, branch_type: val })}
                placeholder="Select Campus Type"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Geo Location & Google Maps Intelligence */}
        <AddressPickerInput
          value={{
            division: formData.division,
            district: formData.district,
            street_address: formData.address,
            coordinates: formData.maps_location_query,
          }}
          onChange={(addr) => {
            setFormData((prev) => ({
              ...prev,
              division: addr.division,
              district: addr.district,
              address: addr.street_address || addr.address || '',
              maps_location_query: addr.coordinates || addr.maps_location_query || '',
            }));
          }}
          title="Campus Location & Google Map"
          subTitle="Pick exact campus pin on Google Map or select division, district and address"
          showUpazila={true}
          showPostCode={true}
        />

        {/* Section 3: Campus Leadership & Contacts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <TeacherIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary">Leadership & Contact</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Campus In-Charge / Principal</span>
                {loadingStaff && <span className="text-[10px] theme-accent font-normal">Loading staff...</span>}
              </label>
              <CustomSelect
                options={staffOptions}
                value={formData.in_charge_staff}
                onChange={(val) => setFormData({ ...formData, in_charge_staff: val })}
                placeholder="Assign Staff In-Charge"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <PhoneIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50 theme-text-secondary" />
                <input
                  type="text"
                  placeholder="e.g. +880 1711-223344"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-sm theme-text-primary placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Contact Email
              </label>
              <div className="relative">
                <MailIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50 theme-text-secondary" />
                <input
                  type="email"
                  placeholder="e.g. campus@institution.edu"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-sm theme-text-primary placeholder:text-zinc-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Operational Status Checkbox */}
        <div className="pt-2">
          <CustomCheckbox
            checked={formData.is_active}
            onChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            label="Branch Active & Operational"
            description="Enable this branch for class section allocations, scheduling and reporting rollups"
            size="md"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3.5 py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <SleekCheckIcon className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Branch'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

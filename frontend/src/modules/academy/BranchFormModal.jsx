import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  MailIcon,
  LocationIcon,
  TeacherIcon,
} from '../../components/ui/Icons';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomCheckbox from '../../components/ui/CustomCheckbox';
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

export default function BranchFormModal({
  isOpen,
  onClose,
  editingBranch,
  onSuccess,
}) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    branch_type: 'MAIN_CAMPUS',
    in_charge_staff: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    district: '',
    division: '',
    is_active: true,
  });

  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      if (editingBranch) {
        setFormData({
          branch_name: editingBranch.branch_name || '',
          branch_code: editingBranch.branch_code || '',
          branch_type: editingBranch.branch_type || 'MAIN_CAMPUS',
          in_charge_staff: editingBranch.in_charge_staff || '',
          contact_phone: editingBranch.contact_phone || '',
          contact_email: editingBranch.contact_email || '',
          address: editingBranch.address || '',
          district: editingBranch.district || '',
          division: editingBranch.division || '',
          is_active: editingBranch.is_active ?? true,
        });
      } else {
        setFormData({
          branch_name: '',
          branch_code: '',
          branch_type: 'MAIN_CAMPUS',
          in_charge_staff: '',
          contact_phone: '',
          contact_email: '',
          address: '',
          district: '',
          division: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, editingBranch]);

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

  const handleDivisionChange = (div) => {
    setFormData((prev) => ({
      ...prev,
      division: div,
      district: '', // reset district if division changes
    }));
  };

  // Compute available districts for selected division
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
      branch_code: formData.branch_code.trim(),
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
      if (editingBranch) {
        await updateBranch(editingBranch.id, payload);
        showToast('Branch updated successfully.', 'success');
      } else {
        await createBranch(payload);
        showToast('Branch registered successfully.', 'success');
      }
      onSuccess?.();
      onClose();
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

  const divisionOptions = BANGLADESH_DIVISIONS.map((d) => ({ label: d, value: d }));

  const districtOptions = availableDistricts.map((dst) => ({ label: dst, value: dst }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBranch ? 'Edit Academic Branch' : 'Register Academic Branch'}
      subtitle="Configure campus details, location, and branch in-charge."
      icon={BuildingOfficeIcon}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Branch / Campus Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Uttara Main Campus, Mirpur Branch"
              value={formData.branch_name}
              onChange={(e) =>
                setFormData({ ...formData, branch_name: e.target.value })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Branch Code
            </label>
            <input
              type="text"
              placeholder="e.g. UTT-01, MIR-02"
              value={formData.branch_code}
              onChange={(e) =>
                setFormData({ ...formData, branch_code: e.target.value.toUpperCase() })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Campus Category
            </label>
            <CustomSelect
              options={BRANCH_TYPES}
              value={formData.branch_type}
              onChange={(val) =>
                setFormData({ ...formData, branch_type: val })
              }
              placeholder="Select Campus Type"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Campus In-Charge Staff / Principal</span>
              {loadingStaff && (
                <span className="text-xs text-sky-400 font-normal">Loading staff...</span>
              )}
            </label>
            <CustomSelect
              options={staffOptions}
              value={formData.in_charge_staff}
              onChange={(val) =>
                setFormData({ ...formData, in_charge_staff: val })
              }
              placeholder="Assign Staff In-Charge"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Division
            </label>
            <CustomSelect
              options={divisionOptions}
              value={formData.division}
              onChange={handleDivisionChange}
              placeholder="Select Division"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              District
            </label>
            <CustomSelect
              options={districtOptions}
              value={formData.district}
              onChange={(val) =>
                setFormData({ ...formData, district: val })
              }
              placeholder={formData.division ? "Select District" : "Select Division first"}
              disabled={!formData.division}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Contact Phone
            </label>
            <input
              type="text"
              placeholder="e.g. +880 1711-223344"
              value={formData.contact_phone}
              onChange={(e) =>
                setFormData({ ...formData, contact_phone: e.target.value })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Contact Email
            </label>
            <input
              type="email"
              placeholder="e.g. campus@institution.edu"
              value={formData.contact_email}
              onChange={(e) =>
                setFormData({ ...formData, contact_email: e.target.value })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Street / Full Address
            </label>
            <textarea
              rows={2}
              placeholder="e.g. House 14, Road 5, Sector 4, Uttara, Dhaka-1230"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none resize-none"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <CustomCheckbox
            id="branch-is-active"
            checked={formData.is_active}
            onChange={(checked) =>
              setFormData({ ...formData, is_active: checked })
            }
            label="Active Campus"
            description="Branch is currently operational for student admissions and classes."
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {editingBranch ? 'Save Changes' : 'Register Branch'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

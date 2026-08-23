import React, { useState, useEffect } from 'react';
import {
  TeacherIcon,
  PlusIcon,
  SparklesIcon,
  BuildingOfficeIcon,
} from '../../components/ui/Icons';
import { createStaff, updateStaff } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';
import CustomSelect from '../../components/ui/CustomSelect';
import AddressLocationPicker from '../../components/common/AddressLocationPicker';

export default function StaffDrawerForm({ staffData, onSaved, onCancel }) {
  const { showToast } = useToast();
  const isEditing = Boolean(staffData);

  const [activeTab, setActiveTab] = useState('core'); // 'core' | 'academic_operational' | 'payroll'
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    user_id: '',
    staff_type: 'TEACHING',
    designation: '',
    department: '',
    employment_status: 'PERMANENT',
    joining_date: new Date().toISOString().split('T')[0],
    emergency_contact: '',
    nid_no: '',
    blood_group: '',
    address: '',
    division: '',
    district: '',
    upazila_thana: '',
    postal_code: '',
    latitude: null,
    longitude: null,
    map_place_id: '',

    // Teaching profile fields
    teacher_detail: {
      highest_degree: '',
      specialization: '',
      max_daily_periods: 4,
      can_review_reports: false,
    },

    // Support profile fields
    general_detail: {
      assigned_zone: '',
      shift_type: 'MORNING',
      reporting_to: null,
    },

    // Payroll fields
    salary_type: 'MONTHLY_FIXED',
    base_salary: 0,
    bank_name: '',
    bank_account_no: '',
    mobile_banking_no: '',
  });

  // Fetch departments and candidate users
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [deptRes, userRes] = await Promise.all([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/users/?limit=100'),
        ]);

        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(Array.isArray(deptData) ? deptData : deptData.results || []);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUsersList(Array.isArray(userData) ? userData : userData.results || []);
        }
      } catch (err) {
        console.warn('Error fetching lookups for staff drawer:', err);
      }
    };

    fetchLookups();
  }, []);

  // Populate form if editing
  useEffect(() => {
    if (staffData) {
      setFormData({
        user_id: staffData.user || '',
        staff_type: staffData.staff_type || 'TEACHING',
        designation: staffData.designation || '',
        department: staffData.department || '',
        employment_status: staffData.employment_status || 'PERMANENT',
        joining_date: staffData.joining_date || new Date().toISOString().split('T')[0],
        emergency_contact: staffData.emergency_contact || '',
        nid_no: staffData.nid_no || '',
        blood_group: staffData.blood_group || '',
        address: staffData.address || '',
        division: staffData.division || '',
        district: staffData.district || '',
        upazila_thana: staffData.upazila_thana || '',
        postal_code: staffData.postal_code || '',
        latitude: staffData.latitude || null,
        longitude: staffData.longitude || null,
        map_place_id: staffData.map_place_id || '',

        teacher_detail: {
          highest_degree: staffData.teacher_detail?.highest_degree || '',
          specialization: staffData.teacher_detail?.specialization || '',
          max_daily_periods: staffData.teacher_detail?.max_daily_periods || 4,
          can_review_reports: staffData.teacher_detail?.can_review_reports || false,
        },

        general_detail: {
          assigned_zone: staffData.general_detail?.assigned_zone || '',
          shift_type: staffData.general_detail?.shift_type || 'MORNING',
          reporting_to: staffData.general_detail?.reporting_to || null,
        },

        salary_type: staffData.salary_type || 'MONTHLY_FIXED',
        base_salary: staffData.base_salary || 0,
        bank_name: staffData.bank_name || '',
        bank_account_no: staffData.bank_account_no || '',
        mobile_banking_no: staffData.mobile_banking_no || '',
      });
    }
  }, [staffData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing && !formData.user_id) {
      showToast('Please select a system user account.', 'error');
      return;
    }

    if (!formData.designation.trim()) {
      showToast('Please provide a designation/title.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        department: formData.department ? Number(formData.department) : null,
      };

      if (isEditing) {
        await updateStaff(staffData.id, payload);
        showToast('Staff profile updated successfully.', 'success');
      } else {
        await createStaff(payload);
        showToast('Staff member onboarded successfully.', 'success');
      }

      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error saving staff profile:', err);
      showToast(err.message || 'Failed to save staff profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userOptions = [
    { value: '', label: 'Select Existing User...' },
    ...usersList.map((u) => ({
      value: String(u.id),
      label: `${u.name || u.name_en || u.username} (${u.phone_number || u.email || 'No contact'})`,
    })),
  ];

  const departmentOptions = [
    { value: '', label: 'None / General Administration' },
    ...departments.map((d) => ({
      value: String(d.id),
      label: `${d.name} (${d.code || 'Dept'})`,
    })),
  ];

  const staffTypeOptions = [
    { value: 'TEACHING', label: 'Teaching Faculty (Teacher / Ustad)' },
    { value: 'SUPPORT', label: 'Support & Residential Staff' },
    { value: 'ADMIN', label: 'Administrative Officer' },
    { value: 'MANAGEMENT', label: 'Management Executive' },
  ];

  const statusOptions = [
    { value: 'PERMANENT', label: 'Permanent Full-Time' },
    { value: 'PROBATION', label: 'Probationary Period' },
    { value: 'CONTRACT', label: 'Contractual Basis' },
    { value: 'PART_TIME', label: 'Part-Time Faculty' },
  ];

  return (
    <div className="p-4 sm:p-5 space-y-5 h-full overflow-y-auto theme-text-primary text-left">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl theme-bg-sub border theme-border shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('core')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'core'
              ? 'theme-bg-surface theme-accent shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          1. Core Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('academic_operational')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'academic_operational'
              ? 'theme-bg-surface theme-accent shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          2. Academic / Duty
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'theme-bg-surface theme-accent shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          3. Payroll
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* TAB 1: Core Profile */}
        {activeTab === 'core' && (
          <div className="space-y-4 animate-fade-in">
            {/* User Account Picker (Only for new staff) */}
            {!isEditing && (
              <div>
                <CustomSelect
                  label="System User Account"
                  options={userOptions}
                  value={formData.user_id}
                  onChange={(val) => setFormData({ ...formData, user_id: val })}
                  placeholder="Select User..."
                  searchable={true}
                />
                <p className="text-[11px] theme-text-secondary mt-1">
                  Connects this staff profile to login credentials and auth roles.
                </p>
              </div>
            )}

            {/* Staff Role & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <CustomSelect
                  label="Staff Role / Type"
                  options={staffTypeOptions}
                  value={formData.staff_type}
                  onChange={(val) => setFormData({ ...formData, staff_type: val })}
                  placeholder="Select Role"
                />
              </div>

              <div>
                <CustomSelect
                  label="Department"
                  options={departmentOptions}
                  value={formData.department}
                  onChange={(val) => setFormData({ ...formData, department: val })}
                  placeholder="Select Department"
                />
              </div>
            </div>

            {/* Designation & Employment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Designation / Title <span className="theme-accent font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Hifz Teacher, Admin Officer"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-medium theme-text-primary"
                />
              </div>

              <div>
                <CustomSelect
                  label="Employment Status"
                  options={statusOptions}
                  value={formData.employment_status}
                  onChange={(val) => setFormData({ ...formData, employment_status: val })}
                  placeholder="Select Status"
                />
              </div>
            </div>

            {/* Joining Date & Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-medium theme-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Emergency Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 017XXXXXXXX"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-medium theme-text-primary font-mono"
                />
              </div>
            </div>

            {/* NID & Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  National ID (NID)
                </label>
                <input
                  type="text"
                  placeholder="NID number"
                  value={formData.nid_no}
                  onChange={(e) => setFormData({ ...formData, nid_no: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-medium theme-text-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Blood Group
                </label>
                <input
                  type="text"
                  placeholder="e.g. A+, B+, O+, AB+"
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-medium theme-text-primary"
                />
              </div>
            </div>

            {/* Address Location Picker */}
            <div className="pt-2 border-t theme-border">
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-2">
                Residential Address & Geographic Location
              </label>
              <AddressLocationPicker
                value={{
                  address: formData.address,
                  division: formData.division,
                  district: formData.district,
                  upazila_thana: formData.upazila_thana,
                  postal_code: formData.postal_code,
                  latitude: formData.latitude,
                  longitude: formData.longitude,
                  map_place_id: formData.map_place_id,
                }}
                onChange={(loc) => setFormData((prev) => ({ ...prev, ...loc }))}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Academic / Operational Profile */}
        {activeTab === 'academic_operational' && (
          <div className="space-y-4 animate-fade-in">
            {formData.staff_type === 'TEACHING' ? (
              <div className="space-y-3.5 p-4 rounded-2xl theme-bg-sub border theme-border">
                <div className="flex items-center gap-2 mb-2">
                  <TeacherIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Teaching & Faculty Profile
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                    Highest Educational Degree
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dawra-e-Hadith, Kamil, B.A. in Islamic Studies"
                    value={formData.teacher_detail.highest_degree}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teacher_detail: {
                          ...formData.teacher_detail,
                          highest_degree: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                    Academic Specialization / Subject
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tajweed, Fiqh, Arabic Grammar, Mathematics"
                    value={formData.teacher_detail.specialization}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teacher_detail: {
                          ...formData.teacher_detail,
                          specialization: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                    Max Recommended Daily Teaching Periods
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formData.teacher_detail.max_daily_periods}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        teacher_detail: {
                          ...formData.teacher_detail,
                          max_daily_periods: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 p-4 rounded-2xl theme-bg-sub border theme-border">
                <div className="flex items-center gap-2 mb-2">
                  <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Operational & Support Profile
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                    Assigned Campus Zone / Building
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dormitory Block A, Main Dining Hall, Campus Gate 1"
                    value={formData.general_detail.assigned_zone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general_detail: {
                          ...formData.general_detail,
                          assigned_zone: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                    Operational Shift
                  </label>
                  <select
                    value={formData.general_detail.shift_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general_detail: {
                          ...formData.general_detail,
                          shift_type: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
                  >
                    <option value="MORNING">Morning Shift (06:00 - 14:00)</option>
                    <option value="EVENING">Evening Shift (14:00 - 22:00)</option>
                    <option value="NIGHT">Night Dormitory Shift (22:00 - 06:00)</option>
                    <option value="ROTATING">Rotating 24/7 Shift</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Payroll Profile */}
        {activeTab === 'payroll' && (
          <div className="space-y-4 animate-fade-in p-4 rounded-2xl theme-bg-sub border theme-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Salary Type
                </label>
                <select
                  value={formData.salary_type}
                  onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
                >
                  <option value="MONTHLY_FIXED">Monthly Fixed Remuneration</option>
                  <option value="PER_PERIOD">Hourly / Per-Period Honorarium</option>
                  <option value="VOLUNTARY">Honorary / Voluntary Service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Base Salary / Honorarium (BDT)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Bank Name &amp; Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. Islami Bank, Dhanmondi Branch"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="Account Number"
                  value={formData.bank_account_no}
                  onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Mobile Banking (bKash / Nagad / Rocket)
              </label>
              <input
                type="text"
                placeholder="01XXXXXXXXX"
                value={formData.mobile_banking_no}
                onChange={(e) => setFormData({ ...formData, mobile_banking_no: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary font-mono"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Staff Profile' : 'Onboard Staff'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

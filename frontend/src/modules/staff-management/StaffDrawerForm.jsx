import React, { useState, useEffect, useMemo } from 'react';
import {
  TeacherIcon,
  PlusIcon,
  SparklesIcon,
  BuildingOfficeIcon,
} from '../../components/ui/Icons';
import { createStaff, updateStaff } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { fetchWithAuth } from '../../utils/authService';
import { staffRanksStore, STAFF_CATEGORY_OPTIONS } from '../../utils/localStore';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import AddressLocationPicker from '../../components/common/AddressLocationPicker';
import { DrawerContainer, DrawerFooter } from '../../components/layout';

export default function StaffDrawerForm({ staffData, onSaved, onCancel }) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const isEditing = Boolean(staffData);

  const [activeTab, setActiveTab] = useState('core'); // 'core' | 'academic_operational' | 'payroll'
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [ranksList, setRanksList] = useState(() => staffRanksStore.getRanks(activeTenantId));
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    user_id: '',
    staff_type: 'TEACHING',
    designation: '',
    rank_order: 99,
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

  // Listen for live rank updates from Developer Tools
  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

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
      const isCustom = Boolean(staffData.designation && !ranksList.some(r => r.name === staffData.designation));
      setIsCustomDesignation(isCustom);
      setFormData({
        user_id: staffData.user || '',
        staff_type: staffData.staff_type || 'TEACHING',
        designation: staffData.designation || '',
        rank_order: staffData.rank_order !== undefined ? staffData.rank_order : 99,
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
  }, [staffData, ranksList]);

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

  const rankOptions = useMemo(() => {
    const list = ranksList.map((r) => ({
      value: r.name,
      label: `${r.name_bn ? `${r.name_bn} (${r.name})` : r.name} — [Rank ${r.order}]`,
      rank_order: r.order,
      type: r.type,
    }));
    return [
      ...list,
      { value: '__CUSTOM__', label: '+ Enter Custom Designation / Title...' },
    ];
  }, [ranksList]);

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

  const staffTypeOptions = STAFF_CATEGORY_OPTIONS;

  const statusOptions = [
    { value: 'PERMANENT', label: 'Permanent Full-Time' },
    { value: 'PROBATION', label: 'Probationary Period' },
    { value: 'CONTRACT', label: 'Contractual Appointment' },
    { value: 'TERMINATED', label: 'Terminated / Released' },
  ];

  return (
    <DrawerContainer padding="normal" spacing="normal">
      {/* Tab Navigation Header */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl theme-bg-sub border theme-border mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('core')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'core'
              ? 'theme-bg-accent theme-accent-text shadow-sm'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          1. Core Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('academic_operational')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'academic_operational'
              ? 'theme-bg-accent theme-accent-text shadow-sm'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          2. {formData.staff_type === 'TEACHING' ? 'Academic' : 'Operations'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'theme-bg-accent theme-accent-text shadow-sm'
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

            {/* Designation / Institutional Rank & Employment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                {!isCustomDesignation ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
                        Rank &amp; Designation <span className="theme-danger">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomDesignation(true)}
                        className="text-[11px] theme-accent font-semibold hover:underline cursor-pointer"
                      >
                        Custom Title
                      </button>
                    </div>
                    <CustomSelect
                      options={rankOptions}
                      value={formData.designation}
                      onChange={(val) => {
                        if (val === '__CUSTOM__') {
                          setIsCustomDesignation(true);
                          return;
                        }
                        const matched = ranksList.find((r) => r.name === val);
                        setFormData((prev) => ({
                          ...prev,
                          designation: val,
                          rank_order: matched ? matched.order : 99,
                          staff_type: matched && matched.type ? matched.type : prev.staff_type,
                        }));
                      }}
                      placeholder="Select Institutional Rank..."
                      required
                      searchable={true}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider">
                        Custom Designation <span className="theme-danger">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomDesignation(false)}
                        className="text-[11px] theme-accent font-semibold hover:underline cursor-pointer"
                      >
                        Select from Ranks
                      </button>
                    </div>
                    <CustomInput
                      required
                      placeholder="e.g. Special Advisor, Guest Scholar"
                      value={formData.designation}
                      onChange={(val) => setFormData({ ...formData, designation: val })}
                    />
                  </div>
                )}
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
                <CustomInput
                  type="date"
                  label="Joining Date"
                  value={formData.joining_date}
                  onChange={(val) => setFormData({ ...formData, joining_date: val })}
                />
              </div>

              <div>
                <CustomInput
                  type="phone"
                  label="Emergency Contact Phone"
                  optional
                  placeholder="e.g. 017XXXXXXXX"
                  value={formData.emergency_contact}
                  onChange={(val) => setFormData({ ...formData, emergency_contact: val })}
                />
              </div>
            </div>

            {/* NID & Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <CustomInput
                  type="nid"
                  label="National ID (NID)"
                  optional
                  placeholder="NID number"
                  value={formData.nid_no}
                  onChange={(val) => setFormData({ ...formData, nid_no: val })}
                />
              </div>

              <div>
                <CustomInput
                  label="Blood Group"
                  optional
                  placeholder="e.g. A+, B+, O+, AB+"
                  value={formData.blood_group}
                  onChange={(val) => setFormData({ ...formData, blood_group: val })}
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
                  <CustomInput
                    label="Highest Educational Degree"
                    optional
                    placeholder="e.g. Dawra-e-Hadith, Kamil, B.A. in Islamic Studies"
                    value={formData.teacher_detail.highest_degree}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        teacher_detail: {
                          ...formData.teacher_detail,
                          highest_degree: val,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <CustomInput
                    label="Academic Specialization / Subject"
                    optional
                    placeholder="e.g. Tajweed, Fiqh, Arabic Grammar, Mathematics"
                    value={formData.teacher_detail.specialization}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        teacher_detail: {
                          ...formData.teacher_detail,
                          specialization: val,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <CustomInput
                    type="number"
                    label="Max Recommended Daily Teaching Periods"
                    min={1}
                    max={12}
                    value={formData.teacher_detail.max_daily_periods}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        teacher_detail: {
                          ...formData.teacher_detail,
                          max_daily_periods: Number(val),
                        },
                      })
                    }
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
                  <CustomInput
                    label="Assigned Campus Zone / Building"
                    optional
                    placeholder="e.g. Dormitory Block A, Main Dining Hall, Campus Gate 1"
                    value={formData.general_detail.assigned_zone}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        general_detail: {
                          ...formData.general_detail,
                          assigned_zone: val,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Operational Shift"
                    value={formData.general_detail.shift_type}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        general_detail: {
                          ...formData.general_detail,
                          shift_type: val,
                        },
                      })
                    }
                    options={[
                      { value: 'MORNING', label: 'Morning Shift (06:00 - 14:00)' },
                      { value: 'EVENING', label: 'Evening Shift (14:00 - 22:00)' },
                      { value: 'NIGHT', label: 'Night Dormitory Shift (22:00 - 06:00)' },
                      { value: 'ROTATING', label: 'Rotating 24/7 Shift' },
                    ]}
                  />
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
                <CustomSelect
                  label="Salary Type"
                  value={formData.salary_type}
                  onChange={(val) => setFormData({ ...formData, salary_type: val })}
                  options={[
                    { value: 'MONTHLY_FIXED', label: 'Monthly Fixed Remuneration' },
                    { value: 'PER_PERIOD', label: 'Hourly / Per-Period Honorarium' },
                    { value: 'VOLUNTARY', label: 'Honorary / Voluntary Service' },
                  ]}
                />
              </div>

              <div>
                <CustomInput
                  type="number"
                  label="Base Salary / Honorarium (BDT)"
                  optional
                  min={0}
                  step={100}
                  value={formData.base_salary}
                  onChange={(val) => setFormData({ ...formData, base_salary: Number(val) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <CustomInput
                  label="Bank Name & Branch"
                  optional
                  placeholder="e.g. Islami Bank, Dhanmondi Branch"
                  value={formData.bank_name}
                  onChange={(val) => setFormData({ ...formData, bank_name: val })}
                />
              </div>

              <div>
                <CustomInput
                  label="Bank Account Number"
                  optional
                  placeholder="Account Number"
                  value={formData.bank_account_no}
                  onChange={(val) => setFormData({ ...formData, bank_account_no: val })}
                />
              </div>
            </div>

            <div>
              <CustomInput
                type="phone"
                label="Mobile Banking (bKash / Nagad / Rocket)"
                optional
                placeholder="01XXXXXXXXX"
                value={formData.mobile_banking_no}
                onChange={(val) => setFormData({ ...formData, mobile_banking_no: val })}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          saveLabel={isEditing ? 'Update Staff Profile' : 'Onboard Staff'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}

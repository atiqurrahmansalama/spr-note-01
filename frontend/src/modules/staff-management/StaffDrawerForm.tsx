import React, { useState, useEffect, useMemo } from 'react';
import {
  TeacherIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  BankIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  DutyIcon,
  UsersIcon,
  CheckIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import { createStaff, updateStaff } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { fetchWithAuth } from '../../utils/authService';
import { staffRanksStore, STAFF_CATEGORY_OPTIONS } from '../../utils/localStore';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import CustomCheckbox from '../../components/ui/CustomCheckbox';
import Stepper from '../../components/ui/Stepper';
import AddressLocationPicker from '../../components/common/AddressLocationPicker';
import ReusableCalendar from '../../components/common/ReusableCalendar';
import DepartmentSelect from '../../components/selectors/DepartmentSelect';
import { DrawerContainer, DrawerFooter } from '../../components/layout';
import { useFormAutoSave } from '../../hooks';
import type {
  StaffMember,
  StaffFormValues,
  StaffType,
  EmploymentStatus,
  SalaryType,
  StaffRankItem,
} from '../../types/staff';

interface StaffDrawerFormProps {
  staffData?: StaffMember | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface UserOptionItem {
  id: string | number;
  name?: string;
  name_en?: string;
  name_bn?: string;
  username?: string;
  phone_number?: string;
  email?: string;
}

interface DepartmentOptionItem {
  id: string | number;
  name: string;
  code?: string;
}

interface SeniorStaffOptionItem {
  id: string | number;
  name?: string;
  user_name?: string;
  employee_id?: string;
  designation?: string;
}

const BLOOD_GROUP_OPTIONS = [
  { value: '', label: 'Select Blood Group (Optional)' },
  { value: 'A+', label: 'A+ (A Positive)' },
  { value: 'A-', label: 'A- (A Negative)' },
  { value: 'B+', label: 'B+ (B Positive)' },
  { value: 'B-', label: 'B- (B Negative)' },
  { value: 'AB+', label: 'AB+ (AB Positive)' },
  { value: 'AB-', label: 'AB- (AB Negative)' },
  { value: 'O+', label: 'O+ (O Positive)' },
  { value: 'O-', label: 'O- (O Negative)' },
];

const SALARY_TYPE_OPTIONS = [
  { value: 'MONTHLY_FIXED', label: 'Monthly Fixed (Standard)' },
  { value: 'MONTHLY', label: 'Monthly Fixed Salary' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'FIXED', label: 'Fixed Contract / Project' },
  { value: 'COMMISSION', label: 'Commission / Incentive' },
  { value: 'PER_PERIOD', label: 'Per Class / Lecture Period' },
  { value: 'VOLUNTEER', label: 'Honorary / Volunteer' },
];

const SHIFT_TYPE_OPTIONS = [
  { value: 'MORNING', label: 'Morning Shift (06:00 AM – 02:00 PM)' },
  { value: 'EVENING', label: 'Evening Shift (02:00 PM – 10:00 PM)' },
  { value: 'NIGHT', label: 'Night Dormitory Shift (10:00 PM – 06:00 AM)' },
  { value: 'ROTATING', label: 'Rotating 24/7 Shift' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'PROBATION', label: 'Probationary Period' },
  { value: 'CONTRACT', label: 'Contractual Appointment' },
  { value: 'VISITING', label: 'Visiting / Guest Faculty' },
  { value: 'TEMPORARY', label: 'Temporary / Ad-Hoc' },
  { value: 'VOLUNTEER', label: 'Honorary / Volunteer' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'TERMINATED', label: 'Terminated / Released' },
];

export const StaffDrawerForm: React.FC<StaffDrawerFormProps> = ({
  staffData,
  onSaved,
  onCancel,
}) => {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const isEditing = Boolean(staffData && staffData.id);

  type TabType = 'core' | 'academic_operational' | 'payroll' | 'account';
  const STEP_TABS: TabType[] = ['core', 'academic_operational', 'payroll', 'account'];

  const [activeTab, setActiveTab] = useState<TabType>('core');
  const [departments, setDepartments] = useState<DepartmentOptionItem[]>([]);
  const [usersList, setUsersList] = useState<UserOptionItem[]>([]);
  const [seniorStaffList, setSeniorStaffList] = useState<SeniorStaffOptionItem[]>([]);
  const [ranksList, setRanksList] = useState<StaffRankItem[]>(() =>
    staffRanksStore.getRanks(activeTenantId)
  );
  const [isCustomDesignation, setIsCustomDesignation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Comprehensive Form State
  const [formData, setFormData] = useState<StaffFormValues>({
    user_id: '',
    name: '',
    name_en: '',
    bangla_name: '',
    phone_number: '',
    email: '',
    employee_id: '',
    is_active: true,

    // Hierarchy & Role
    staff_type: 'TEACHING',
    designation: '',
    rank_order: 99,
    department: '',
    employment_status: 'PERMANENT',
    joining_date: new Date().toISOString().split('T')[0],

    // Emergency & Identification
    emergency_contact: '',
    nid_no: '',
    blood_group: '',

    // Residential & Address
    address: '',
    division: '',
    district: '',
    upazila_thana: '',
    postal_code: '',
    latitude: null,
    longitude: null,
    map_place_id: '',

    // Teaching Profile
    teacher_detail: {
      highest_degree: '',
      specialization: '',
      max_daily_periods: 4,
      can_review_reports: true,
    },

    // Support Profile
    general_detail: {
      assigned_zone: '',
      shift_type: 'MORNING',
      reporting_to: null,
      duty_scope: '',
    },

    // Payroll Fields
    salary_type: 'MONTHLY_FIXED',
    base_salary: 0,
    bank_name: '',
    bank_account_no: '',
    mobile_banking_no: '',
  });

  // Auto-Save Draft Storage Key
  const storageKey = isEditing
    ? `staff_edit_${staffData?.id}`
    : `staff_create_${activeTenantId || 'default'}`;

  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: true,
  });

  const currentStepNumber = STEP_TABS.indexOf(activeTab) + 1;

  const stepperSteps = useMemo(
    () => [
      {
        id: 1,
        label: 'Core Identity',
        description: 'Personal & Contact',
      },
      {
        id: 2,
        label: formData.staff_type === 'TEACHING' ? 'Academic Details' : 'Duties & Shift',
        description: formData.staff_type === 'TEACHING' ? 'Sanad & Allocation' : 'Duty Scope & Area',
      },
      {
        id: 3,
        label: 'Payroll & Bank',
        description: 'Compensation & MFS',
      },
      {
        id: 4,
        label: 'Access & Status',
        description: 'Badge & Account',
      },
    ],
    [formData.staff_type]
  );

  const handleStepChange = (stepNum: number) => {
    const targetTab = STEP_TABS[stepNum - 1];
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  // Listen for live rank updates from Developer Tools
  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

  // Fetch departments, users, and staff list for lookups
  useEffect(() => {
    let isMounted = true;
    const fetchLookups = async () => {
      try {
        const [deptRes, userRes, staffRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/users/?limit=100'),
          fetchWithAuth('/api/v1/staff-profiles/?limit=100'),
        ]);

        if (!isMounted) return;

        if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
          const deptData = await deptRes.value.json();
          setDepartments(Array.isArray(deptData) ? deptData : deptData.results || []);
        }

        if (userRes.status === 'fulfilled' && userRes.value.ok) {
          const userData = await userRes.value.json();
          setUsersList(Array.isArray(userData) ? userData : userData.results || []);
        }

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          const list = Array.isArray(sData) ? sData : sData.results || [];
          setSeniorStaffList(list);
        }
      } catch (err) {
        console.warn('Error fetching lookups for staff drawer:', err);
      }
    };

    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  // Populate form if editing
  useEffect(() => {
    if (staffData) {
      const isCustom = Boolean(
        staffData.designation && !ranksList.some((r) => r.name === staffData.designation)
      );
      setIsCustomDesignation(isCustom);
      setFormData({
        user_id: staffData.user ? String(staffData.user) : '',
        name: staffData.name_en || staffData.user_name || '',
        name_en: staffData.name_en || staffData.user_name || '',
        bangla_name: staffData.bangla_name || '',
        phone_number: staffData.phone_number || '',
        email: staffData.email || '',
        employee_id: staffData.employee_id || '',
        is_active: staffData.is_active !== undefined ? Boolean(staffData.is_active) : true,

        staff_type: staffData.staff_type || 'TEACHING',
        designation: staffData.designation || '',
        rank_order: staffData.rank_order !== undefined ? staffData.rank_order : 99,
        department: staffData.department ? String(staffData.department) : '',
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
        latitude: staffData.latitude ?? null,
        longitude: staffData.longitude ?? null,
        map_place_id: staffData.map_place_id || '',

        teacher_detail: {
          highest_degree: staffData.teacher_detail?.highest_degree || '',
          specialization: staffData.teacher_detail?.specialization || '',
          max_daily_periods: staffData.teacher_detail?.max_daily_periods || 4,
          can_review_reports: staffData.teacher_detail?.can_review_reports ?? true,
        },

        general_detail: {
          assigned_zone: staffData.general_detail?.assigned_zone || '',
          shift_type: staffData.general_detail?.shift_type || 'MORNING',
          reporting_to: staffData.general_detail?.reporting_to ?? null,
          duty_scope: staffData.general_detail?.duty_scope || '',
        },

        salary_type: (staffData.salary_type as SalaryType) || 'MONTHLY_FIXED',
        base_salary: staffData.base_salary || 0,
        bank_name: staffData.bank_name || '',
        bank_account_no: staffData.bank_account_no || '',
        mobile_banking_no: staffData.mobile_banking_no || '',
      });
    }
  }, [staffData, ranksList]);

  // When a user is selected from dropdown in new mode, auto-fill identity fields
  const handleSelectUser = (userId: string) => {
    const selected = usersList.find((u) => String(u.id) === String(userId));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        user_id: String(selected.id),
        name: selected.name || selected.name_en || prev.name,
        name_en: selected.name_en || selected.name || prev.name_en,
        bangla_name: selected.name_bn || prev.bangla_name,
        phone_number: selected.phone_number || prev.phone_number,
        email: selected.email || prev.email,
      }));
    } else {
      setFormData((prev) => ({ ...prev, user_id: userId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !formData.user_id) {
      showToast('Please select a system user account or fill identity details.', 'error');
      return;
    }

    if (!formData.designation.trim()) {
      showToast('Please provide an official designation / title.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim() || formData.name_en.trim(),
        name_en: formData.name_en.trim() || formData.name.trim(),
        name_bn: formData.bangla_name.trim(),
        phone_number: formData.phone_number.trim(),
        email: formData.email.trim(),
        department: formData.department ? Number(formData.department) : null,
      };

      if (isEditing && staffData?.id) {
        await updateStaff(staffData.id, payload);
        showToast('Full staff profile updated successfully.', 'success');
      } else {
        await createStaff(payload);
        showToast('Staff member onboarded successfully.', 'success');
      }

      clearDraft();
      if (onSaved) onSaved();
    } catch (err: any) {
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
    { value: '', label: 'Select Existing System User...' },
    ...usersList.map((u) => ({
      value: String(u.id),
      label: `${u.name || u.name_en || u.username} (${u.phone_number || u.email || 'No phone'})`,
    })),
  ];

  const departmentOptions = [
    { value: '', label: 'None / General Administration' },
    ...departments.map((d) => ({
      value: String(d.id),
      label: `${d.name} (${d.code || 'Dept'})`,
    })),
  ];

  const seniorStaffOptions = [
    { value: '', label: 'None (Self-Directed / Reports to Principal)' },
    ...seniorStaffList
      .filter((s) => !staffData || String(s.id) !== String(staffData.id))
      .map((s) => ({
        value: String(s.id),
        label: `${s.user_name || s.name || s.employee_id} — ${s.designation || 'Staff'}`,
      })),
  ];

  const staffTypeOptions = STAFF_CATEGORY_OPTIONS;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container p-4 space-y-6">
        {/* Top Stepper Progress Bar (Clean, transparent, enterprise-grade) */}
        <div className="w-full pb-3 border-b theme-border">
          <Stepper
            steps={stepperSteps}
            currentStep={currentStepNumber}
            onStepClick={(stepNum) => handleStepChange(stepNum)}
            clickable={true}
            allowFutureClick={true}
            size="sm"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: Core Profile & Identity */}
          {activeTab === 'core' && (
            <div className="space-y-6 animate-fade-in">
              {/* 1. Personal Identity Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <UsersIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Personal &amp; Contact Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      label="Full Name (English)"
                      required
                      placeholder="e.g. Mufti Abdullah Al-Mansur"
                      value={formData.name || formData.name_en}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, name: val, name_en: val }))
                      }
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="Full Name (Native)"
                      placeholder="e.g. মুফতী আব্দুল্লাহ আল-মনসুর"
                      value={formData.bangla_name}
                      onChange={(val) => setFormData((prev) => ({ ...prev, bangla_name: val }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      type="phone"
                      label="Primary Phone Number"
                      required
                      placeholder="e.g. 01712345678"
                      value={formData.phone_number}
                      onChange={(val) => setFormData((prev) => ({ ...prev, phone_number: val }))}
                    />
                  </div>

                  <div>
                    <CustomInput
                      type="email"
                      label="Email Address"
                      placeholder="e.g. staff@institution.edu"
                      value={formData.email}
                      onChange={(val) => setFormData((prev) => ({ ...prev, email: val }))}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Institutional Role & Hierarchy Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <SparklesIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Institutional Role &amp; Hierarchy
                  </h4>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomSelect
                      label="Staff Role / Category"
                      options={staffTypeOptions}
                      value={formData.staff_type}
                      onChange={(val) => setFormData((prev) => ({ ...prev, staff_type: val as StaffType }))}
                      placeholder="Select Category"
                      required
                    />
                  </div>

                  <div>
                    <DepartmentSelect
                      label="Assigned Department"
                      value={formData.department}
                      onChange={(val) => setFormData((prev) => ({ ...prev, department: val }))}
                      placeholder="Select Department (Optional)"
                      allowAll={true}
                      allLabel="None / Institution-Wide"
                      allValue=""
                      optional={true}
                      searchable={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
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
                              staff_type: matched && matched.type ? (matched.type as StaffType) : prev.staff_type,
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
                          placeholder="e.g. Special Advisor, Visiting Scholar"
                          value={formData.designation}
                          onChange={(val) => setFormData((prev) => ({ ...prev, designation: val }))}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <CustomSelect
                      label="Employment Status"
                      options={EMPLOYMENT_STATUS_OPTIONS}
                      value={formData.employment_status}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, employment_status: val as EmploymentStatus }))
                      }
                      placeholder="Select Status"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <ReusableCalendar
                      label="Official Joining Date"
                      selectedDate={formData.joining_date}
                      onSelectDate={(val: string) => setFormData((prev) => ({ ...prev, joining_date: val }))}
                      required={true}
                      clearable={true}
                      placeholder="Select Joining Date"
                    />
                  </div>

                  <div>
                    <CustomInput
                      type="phone"
                      label="Emergency Contact Phone"
                      optional
                      placeholder="e.g. 017XXXXXXXX (Brother/Father)"
                      value={formData.emergency_contact}
                      onChange={(val) => setFormData((prev) => ({ ...prev, emergency_contact: val }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      label="National ID (NID)"
                      optional
                      placeholder="NID card number"
                      value={formData.nid_no}
                      onChange={(val) => setFormData((prev) => ({ ...prev, nid_no: val }))}
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Blood Group"
                      options={BLOOD_GROUP_OPTIONS}
                      value={formData.blood_group}
                      onChange={(val) => setFormData((prev) => ({ ...prev, blood_group: val }))}
                      placeholder="Select Blood Group"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Geographic Location & Residential Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Residential Address &amp; Location
                  </h4>
                </div>
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
                  onChange={(loc: any) => setFormData((prev) => ({ ...prev, ...loc }))}
                />
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-end pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('academic_operational')}
                  className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Next: {formData.staff_type === 'TEACHING' ? 'Academic Details' : 'Duties & Shift'}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Academic / Operational Profile */}
          {activeTab === 'academic_operational' && (
            <div className="space-y-6 animate-fade-in">
              {formData.staff_type === 'TEACHING' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b theme-border">
                    <TeacherIcon className="w-4 h-4 theme-accent" />
                    <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                      Faculty &amp; Teaching Qualifications
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                    <div>
                      <CustomInput
                        label="Highest Educational Degree / Sanad"
                        optional
                        placeholder="e.g. Dawra-e-Hadith, Kamil, M.A. in Arabic"
                        value={formData.teacher_detail.highest_degree}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            teacher_detail: {
                              ...prev.teacher_detail,
                              highest_degree: val,
                            },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <CustomInput
                        label="Specialization / Primary Subject"
                        optional
                        placeholder="e.g. Tajweed, Hifz, Fiqh, Mathematics"
                        value={formData.teacher_detail.specialization}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            teacher_detail: {
                              ...prev.teacher_detail,
                              specialization: val,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4 items-center">
                    <div>
                      <CustomInput
                        type="number"
                        label="Max Recommended Daily Periods"
                        min={1}
                        max={12}
                        value={formData.teacher_detail.max_daily_periods}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            teacher_detail: {
                              ...prev.teacher_detail,
                              max_daily_periods: Number(val),
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="pt-5">
                      <CustomCheckbox
                        checked={formData.teacher_detail.can_review_reports}
                        onChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            teacher_detail: {
                              ...prev.teacher_detail,
                              can_review_reports: checked,
                            },
                          }))
                        }
                        label="Can Review & Approve Gradebooks"
                        subLabel="Permits final grade verification and student progress report signing."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b theme-border">
                    <DutyIcon className="w-4 h-4 theme-accent" />
                    <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                      Operational &amp; Support Duties
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                    <div>
                      <CustomInput
                        label="Assigned Campus Zone / Building"
                        optional
                        placeholder="e.g. Dormitory Block A, Main Dining Hall"
                        value={formData.general_detail.assigned_zone}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            general_detail: {
                              ...prev.general_detail,
                              assigned_zone: val,
                            },
                          }))
                        }
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Operational Duty Shift"
                        value={formData.general_detail.shift_type}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            general_detail: {
                              ...prev.general_detail,
                              shift_type: val,
                            },
                          }))
                        }
                        options={SHIFT_TYPE_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                    <div>
                      <CustomSelect
                        label="Direct Reporting Supervisor / Manager"
                        value={String(formData.general_detail.reporting_to || '')}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            general_detail: {
                              ...prev.general_detail,
                              reporting_to: val || null,
                            },
                          }))
                        }
                        options={seniorStaffOptions}
                        searchable={true}
                      />
                    </div>

                    <div>
                      <CustomInput
                        label="Duty Scope & Responsibilities"
                        optional
                        placeholder="e.g. Dormitory discipline, kitchen inventory"
                        value={formData.general_detail.duty_scope}
                        onChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            general_detail: {
                              ...prev.general_detail,
                              duty_scope: val,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('core')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub theme-text-primary hover:theme-bg-sub/80 border theme-border transition-all cursor-pointer"
                >
                  ← Back to Identity
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Next: Payroll &amp; Bank</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Payroll & Banking Profile */}
          {activeTab === 'payroll' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <BankIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Remuneration &amp; Banking Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomSelect
                      label="Salary Type / Remuneration Structure"
                      value={formData.salary_type}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, salary_type: val as SalaryType }))
                      }
                      options={SALARY_TYPE_OPTIONS}
                    />
                  </div>

                  <div>
                    <CustomInput
                      type="number"
                      label="Base Monthly Salary / Rate (BDT)"
                      optional
                      min={0}
                      step={100}
                      value={formData.base_salary}
                      onChange={(val) => setFormData((prev) => ({ ...prev, base_salary: Number(val) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      label="Bank Name &amp; Branch"
                      optional
                      placeholder="e.g. Islami Bank, Dhanmondi Branch"
                      value={formData.bank_name}
                      onChange={(val) => setFormData((prev) => ({ ...prev, bank_name: val }))}
                    />
                  </div>

                  <div>
                    <CustomInput
                      label="Bank Account Number"
                      optional
                      placeholder="e.g. 2050XXXXXXXXXXXXX"
                      value={formData.bank_account_no}
                      onChange={(val) => setFormData((prev) => ({ ...prev, bank_account_no: val }))}
                    />
                  </div>
                </div>

                <div>
                  <CustomInput
                    type="phone"
                    label="Mobile Financial Services (bKash / Nagad / Rocket)"
                    optional
                    placeholder="01XXXXXXXXX"
                    value={formData.mobile_banking_no}
                    onChange={(val) => setFormData((prev) => ({ ...prev, mobile_banking_no: val }))}
                  />
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('academic_operational')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub theme-text-primary hover:theme-bg-sub/80 border theme-border transition-all cursor-pointer"
                >
                  ← Back to {formData.staff_type === 'TEACHING' ? 'Academic' : 'Duties'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Next: Access &amp; Status</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Account, Access & Status */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b theme-border">
                  <TeacherIcon className="w-4 h-4 theme-accent" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Badge ID &amp; System Authentication
                  </h4>
                </div>

                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      label="Employee / Badge ID"
                      placeholder="e.g. TCH-2026-001"
                      value={formData.employee_id}
                      onChange={(val) => setFormData((prev) => ({ ...prev, employee_id: val }))}
                      optional={!isEditing}
                      helperText={
                        !formData.employee_id
                          ? 'Leave blank to automatically auto-generate based on category.'
                          : undefined
                      }
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Linked System User Account"
                      options={userOptions}
                      value={formData.user_id}
                      onChange={(val) => handleSelectUser(val)}
                      placeholder="Select User..."
                      searchable={true}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t theme-border">
                  <CustomCheckbox
                    checked={formData.is_active}
                    onChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                    label="Active Institutional Service Status"
                    subLabel="Active staff members appear in rosters, biometric registers, and payroll disbursements."
                  />
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-start pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl theme-bg-sub theme-text-primary hover:theme-bg-sub/80 border theme-border transition-all cursor-pointer"
                >
                  ← Back to Payroll &amp; Bank
                </button>
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <DrawerFooter
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            autoSaveStatus={autoSaveStatus}
            lastSavedAt={lastSavedAt}
            saveLabel={isEditing ? 'Update Full Profile' : 'Onboard Staff Member'}
            onSubmit={true}
          />
        </form>
      </div>
    </DrawerContainer>
  );
};

export default StaffDrawerForm;

import React, { useState, useEffect } from 'react';
import {
  TeacherIcon,
  CloseIcon,
  PlusIcon,
  BankIcon,
  SparklesIcon,
  BuildingOfficeIcon,
} from '../../components/ui/Icons';
import { createStaff, updateStaff } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';

export default function StaffFormModal({ isOpen, onClose, staffData, onSaved }) {
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
    if (!isOpen) return;

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
        console.warn('Error fetching lookups for staff modal:', err);
      }
    };

    fetchLookups();
  }, [isOpen]);

  // Populate form if editing
  useEffect(() => {
    if (staffData) {
      setFormData({
        user_id: staffData.user || '',
        staff_type: staffData.staff_type || 'TEACHING',
        designation: staffData.designation || '',
        department: staffData.department || '',
        employment_status: staffData.employment_status || 'PERMANENT',
        joining_date: staffData.joining_date || '',
        emergency_contact: staffData.emergency_contact || '',
        nid_no: staffData.nid_no || '',
        blood_group: staffData.blood_group || '',
        teacher_detail: {
          highest_degree: staffData.teacher_detail?.highest_degree || '',
          specialization: staffData.teacher_detail?.specialization || '',
          max_daily_periods: staffData.teacher_detail?.max_daily_periods ?? 4,
          can_review_reports: staffData.teacher_detail?.can_review_reports ?? false,
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
    } else {
      setFormData({
        user_id: '',
        staff_type: 'TEACHING',
        designation: '',
        department: '',
        employment_status: 'PERMANENT',
        joining_date: new Date().toISOString().split('T')[0],
        emergency_contact: '',
        nid_no: '',
        blood_group: '',
        teacher_detail: {
          highest_degree: '',
          specialization: '',
          max_daily_periods: 4,
          can_review_reports: false,
        },
        general_detail: {
          assigned_zone: '',
          shift_type: 'MORNING',
          reporting_to: null,
        },
        salary_type: 'MONTHLY_FIXED',
        base_salary: 0,
        bank_name: '',
        bank_account_no: '',
        mobile_banking_no: '',
      });
    }
  }, [staffData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTeacherChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      teacher_detail: {
        ...prev.teacher_detail,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      general_detail: {
        ...prev.general_detail,
        [name]: value === '' ? null : value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing && !formData.user_id) {
      showToast('Please select a system user account for this staff profile.', 'error');
      return;
    }

    if (!formData.designation.trim()) {
      showToast('Designation / Job Title is required.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        staff_type: formData.staff_type,
        designation: formData.designation.trim(),
        department: formData.department ? String(formData.department) : null,
        employment_status: formData.employment_status,
        joining_date: formData.joining_date || null,
        emergency_contact: formData.emergency_contact.trim(),
        nid_no: formData.nid_no.trim(),
        blood_group: formData.blood_group,
        salary_type: formData.salary_type || 'MONTHLY',
        base_salary: formData.base_salary ? Number(formData.base_salary) : 0,
        bank_name: formData.bank_name.trim(),
        bank_account_no: formData.bank_account_no.trim(),
        mobile_banking_no: formData.mobile_banking_no.trim(),
      };

      if (!isEditing) {
        payload.user = Number(formData.user_id);
        payload.user_id = Number(formData.user_id);
      }

      if (formData.staff_type === 'TEACHING') {
        payload.teacher_detail = formData.teacher_detail;
      } else {
        payload.general_detail = formData.general_detail;
      }

      if (isEditing) {
        await updateStaff(staffData.id, payload);
      } else {
        await createStaff(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving staff profile:', err);
      showToast(err.message || 'Failed to save staff profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-2xl rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TeacherIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">
                {isEditing ? 'Edit Staff Profile' : 'Onboard New Staff Member'}
              </h2>
              <p className="text-xs theme-text-secondary">
                {isEditing
                  ? `Updating profile for ${staffData.user_name || staffData.employee_id}`
                  : 'Create academic faculty or support staff profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Step / Tab Navigator */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b theme-border theme-bg-sub text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('core')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'core'
                ? 'border-[var(--accent-main)] theme-accent font-bold'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            1. Core Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academic_operational')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'academic_operational'
                ? 'border-[var(--accent-main)] theme-accent font-bold'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            2. {formData.staff_type === 'TEACHING' ? 'Teaching Faculty' : 'Operational Scope'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'payroll'
                ? 'border-[var(--accent-main)] theme-accent font-bold'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            3. Payroll & Banking
          </button>
        </div>

        {/* 3. Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'core' && (
            <div className="space-y-4">
              {/* User Selection (Creation only) */}
              {!isEditing && (
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    System User Account <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  >
                    <option value="">-- Choose User to Attach Staff Profile --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email || u.phone_number || 'No Email'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Staff Type Selector */}
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Staff Category <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      formData.staff_type === 'TEACHING'
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/50'
                        : 'theme-bg-sub theme-border theme-text-secondary hover:theme-bg-elevated'
                    }`}
                  >
                    <input
                      type="radio"
                      name="staff_type"
                      value="TEACHING"
                      checked={formData.staff_type === 'TEACHING'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <SparklesIcon className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-bold theme-text-primary">Teaching Faculty</div>
                      <div className="text-[10px] theme-text-secondary">Class & Student Groups</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      formData.staff_type === 'SUPPORT'
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/50'
                        : 'theme-bg-sub theme-border theme-text-secondary hover:theme-bg-elevated'
                    }`}
                  >
                    <input
                      type="radio"
                      name="staff_type"
                      value="SUPPORT"
                      checked={formData.staff_type === 'SUPPORT'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <BuildingOfficeIcon className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-bold theme-text-primary">General / Operations</div>
                      <div className="text-[10px] theme-text-secondary">Admin & Campus Support</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Designation / Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Senior Arabic Teacher"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  >
                    <option value="">-- Unassigned / General --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code || 'Dept'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employment Status & Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Employment Status
                  </label>
                  <select
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="PROBATION">Probation</option>
                    <option value="CONTRACT">Contractual</option>
                    <option value="PART_TIME">Part-Time</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  />
                </div>
              </div>

              {/* Emergency Contact & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    placeholder="e.g. +8801700000000"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  >
                    <option value="">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic_operational' && (
            <div className="space-y-4">
              {formData.staff_type === 'TEACHING' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold theme-text-secondary mb-1">
                        Highest Qualification / Degree
                      </label>
                      <input
                        type="text"
                        name="highest_degree"
                        placeholder="e.g. Dawra-e-Hadith / Masters in Islamic Studies"
                        value={formData.teacher_detail.highest_degree}
                        onChange={handleTeacherChange}
                        className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold theme-text-secondary mb-1">
                        Teaching Specialization / Focus
                      </label>
                      <input
                        type="text"
                        name="specialization"
                        placeholder="e.g. Hifz Murabbi, Fiqh, Tajweed"
                        value={formData.teacher_detail.specialization}
                        onChange={handleTeacherChange}
                        className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold theme-text-secondary mb-1">
                        Max Daily Lecture Periods
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        name="max_daily_periods"
                        value={formData.teacher_detail.max_daily_periods}
                        onChange={handleTeacherChange}
                        className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="can_review_reports"
                        name="can_review_reports"
                        checked={formData.teacher_detail.can_review_reports}
                        onChange={handleTeacherChange}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 theme-bg-sub theme-border"
                      />
                      <label htmlFor="can_review_reports" className="text-xs theme-text-primary cursor-pointer font-medium">
                        Authorized to Review & Sign Student Progress Reports
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold theme-text-secondary mb-1">
                        Assigned Campus Zone / Building
                      </label>
                      <input
                        type="text"
                        name="assigned_zone"
                        placeholder="e.g. Main Hostel, Library, Gate 1"
                        value={formData.general_detail.assigned_zone}
                        onChange={handleGeneralChange}
                        className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold theme-text-secondary mb-1">
                        Operational Shift Schedule
                      </label>
                      <select
                        name="shift_type"
                        value={formData.general_detail.shift_type}
                        onChange={handleGeneralChange}
                        className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                      >
                        <option value="MORNING">Morning Shift</option>
                        <option value="EVENING">Evening Shift</option>
                        <option value="NIGHT">Night Shift</option>
                        <option value="ROTATING">Rotating Shift</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Compensation Type
                  </label>
                  <select
                    name="salary_type"
                    value={formData.salary_type}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  >
                    <option value="MONTHLY_FIXED">Monthly Fixed</option>
                    <option value="PER_PERIOD">Per Class / Lecture Period</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="VOLUNTEER">Honorary / Volunteer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Base Salary Amount (৳ BDT)
                  </label>
                  <input
                    type="number"
                    step="100"
                    name="base_salary"
                    placeholder="0.00"
                    value={formData.base_salary}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Disbursement Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    placeholder="e.g. Islami Bank Bangladesh"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    name="bank_account_no"
                    placeholder="e.g. 2050XXXXXXXXXXXXX"
                    value={formData.bank_account_no}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 font-mono placeholder:theme-text-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Mobile Financial Account (bKash / Nagad / Rocket)
                </label>
                <input
                  type="text"
                  name="mobile_banking_no"
                  placeholder="e.g. 017XXXXXXXX (Personal)"
                  value={formData.mobile_banking_no}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 font-mono placeholder:theme-text-secondary"
                />
              </div>
            </div>
          )}

          {/* 4. Action Buttons */}
          <div className="pt-4 border-t theme-border flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'payroll' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'core' ? 'academic_operational' : 'payroll')}
                  className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border text-xs font-semibold theme-text-primary transition-colors cursor-pointer"
                >
                  Next Step →
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving Profile...' : isEditing ? 'Update Profile' : 'Complete Onboarding'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

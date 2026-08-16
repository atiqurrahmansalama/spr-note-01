import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon, TeacherIcon, BuildingOfficeIcon, BankIcon } from '../../components/ui/Icons';
import { fetchWithAuth } from '../../utils/authService';

export default function StaffFormModal({ isOpen, onClose, staffData, onSaved }) {
  const isEdit = Boolean(staffData && staffData.id);

  const [departments, setDepartments] = useState([]);
  const [generalSupervisors, setGeneralSupervisors] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'role_details' | 'payroll'

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    employee_id: '',
    staff_type: 'TEACHING',
    designation: '',
    department: '',
    employment_status: 'PERMANENT',
    joining_date: new Date().toISOString().split('T')[0],
    nid_no: '',
    emergency_contact: '',
    blood_group: '',
    salary_type: 'MONTHLY',
    base_salary: '0',
    bank_name: '',
    bank_account_no: '',
    mobile_banking_no: '',
    is_active: true,
    // Teacher specifics
    highest_degree: '',
    specialization: '',
    max_daily_periods: 4,
    can_review_reports: true,
    // General specifics
    assigned_zone: '',
    shift_type: 'MORNING',
    reporting_to: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    // Load department options
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [deptRes, staffRes] = await Promise.all([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/staff/?is_active=true'),
        ]);

        if (deptRes.ok) {
          const depts = await deptRes.json();
          setDepartments(Array.isArray(depts) ? depts : depts.results || []);
        }

        if (staffRes.ok) {
          const staffList = await staffRes.json();
          const allStaff = Array.isArray(staffList) ? staffList : staffList.results || [];
          setGeneralSupervisors(allStaff.filter((s) => s.id !== staffData?.id));
        }
      } catch (err) {
        console.warn('Failed to load lookups in StaffFormModal:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();

    if (staffData) {
      setFormData({
        name: staffData.user_name || '',
        phone_number: staffData.user_phone || '',
        email: staffData.user_email || '',
        employee_id: staffData.employee_id || '',
        staff_type: staffData.staff_type || 'TEACHING',
        designation: staffData.designation || '',
        department: staffData.department || '',
        employment_status: staffData.employment_status || 'PERMANENT',
        joining_date: staffData.joining_date || new Date().toISOString().split('T')[0],
        nid_no: staffData.nid_no || '',
        emergency_contact: staffData.emergency_contact || '',
        blood_group: staffData.blood_group || '',
        salary_type: staffData.salary_type || 'MONTHLY',
        base_salary: staffData.base_salary || '0',
        bank_name: staffData.bank_name || '',
        bank_account_no: staffData.bank_account_no || '',
        mobile_banking_no: staffData.mobile_banking_no || '',
        is_active: staffData.is_active !== undefined ? staffData.is_active : true,
        highest_degree: staffData.teacher_detail?.highest_degree || '',
        specialization: staffData.teacher_detail?.specialization || '',
        max_daily_periods: staffData.teacher_detail?.max_daily_periods || 4,
        can_review_reports: staffData.teacher_detail?.can_review_reports ?? true,
        assigned_zone: staffData.general_detail?.assigned_zone || '',
        shift_type: staffData.general_detail?.shift_type || 'MORNING',
        reporting_to: staffData.general_detail?.reporting_to || '',
      });
    } else {
      setFormData({
        name: '',
        phone_number: '',
        email: '',
        employee_id: '',
        staff_type: 'TEACHING',
        designation: '',
        department: '',
        employment_status: 'PERMANENT',
        joining_date: new Date().toISOString().split('T')[0],
        nid_no: '',
        emergency_contact: '',
        blood_group: '',
        salary_type: 'MONTHLY',
        base_salary: '0',
        bank_name: '',
        bank_account_no: '',
        mobile_banking_no: '',
        is_active: true,
        highest_degree: '',
        specialization: '',
        max_daily_periods: 4,
        can_review_reports: true,
        assigned_zone: '',
        shift_type: 'MORNING',
        reporting_to: '',
      });
    }
    setErrorMsg('');
    setActiveTab('basic');
  }, [isOpen, staffData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.designation.trim()) {
      setErrorMsg('Please specify a designation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        employee_id: formData.employee_id.trim() || undefined,
        staff_type: formData.staff_type,
        designation: formData.designation.trim(),
        department: formData.department || null,
        employment_status: formData.employment_status,
        joining_date: formData.joining_date || null,
        nid_no: formData.nid_no.trim(),
        emergency_contact: formData.emergency_contact.trim(),
        blood_group: formData.blood_group,
        salary_type: formData.salary_type,
        base_salary: parseFloat(formData.base_salary) || 0,
        bank_name: formData.bank_name.trim(),
        bank_account_no: formData.bank_account_no.trim(),
        mobile_banking_no: formData.mobile_banking_no.trim(),
        is_active: formData.is_active,
      };

      if (formData.staff_type === 'TEACHING') {
        payload.teacher_detail = {
          highest_degree: formData.highest_degree.trim(),
          specialization: formData.specialization.trim(),
          max_daily_periods: parseInt(formData.max_daily_periods, 10) || 4,
          can_review_reports: Boolean(formData.can_review_reports),
        };
      } else {
        payload.general_detail = {
          assigned_zone: formData.assigned_zone.trim(),
          shift_type: formData.shift_type,
          reporting_to: formData.reporting_to || null,
        };
      }

      let url = '/api/v1/staff/';
      let method = 'POST';

      if (isEdit) {
        url = `/api/v1/staff/${staffData.id}/`;
        method = 'PATCH';
      }

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || errData.error || (typeof errData === 'object' ? Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ') : 'Operation failed');
        throw new Error(msg);
      }

      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving staff record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TeacherIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                {isEdit ? 'Edit Staff Profile' : 'Add New Staff Member'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isEdit ? `Updating profile for ${formData.name || formData.employee_id}` : 'Configure employee credentials, academic role, and payroll'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 transition-colors rounded-xl hover:bg-zinc-800 hover:text-zinc-200"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-900/30">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'basic'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. Core Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('role_details')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'role_details'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. {formData.staff_type === 'TEACHING' ? 'Teaching Faculty Info' : 'Operational Scope'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'payroll'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3. Payroll & Banking
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff Type */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Staff Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    name="staff_type"
                    value={formData.staff_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="TEACHING">Teaching Faculty (Teacher/Murabbi)</option>
                    <option value="MANAGEMENT">Academic Management / Principal</option>
                    <option value="ADMINISTRATIVE">Administrative / Accounts</option>
                    <option value="SUPPORT">General Support / Warden</option>
                    <option value="SECURITY">Security & Maintenance</option>
                  </select>
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Employee ID (Auto if blank)
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    placeholder="e.g. TEA-2026-104"
                    value={formData.employee_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Designation <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Senior Hifz Murabbi"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Unassigned / General --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employment Status */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Employment Status
                  </label>
                  <select
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="PROBATION">Probation</option>
                    <option value="CONTRACT">Contractual</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* NID / Passport */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    NID / Passport No
                  </label>
                  <input
                    type="text"
                    name="nid_no"
                    placeholder="National Identification No"
                    value={formData.nid_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    placeholder="e.g. 01700000000"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
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

                {/* Active Status */}
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-zinc-700 text-sky-500 bg-zinc-950 focus:ring-sky-500"
                    />
                    <span className="font-medium">Active Staff Member</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Role Details (Polymorphic) */}
          {activeTab === 'role_details' && (
            <div className="space-y-4">
              {formData.staff_type === 'TEACHING' ? (
                <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/30 space-y-4">
                  <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                    <TeacherIcon className="w-4 h-4" />
                    <span>Academic Teaching Faculty Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Highest Academic Degree
                      </label>
                      <input
                        type="text"
                        name="highest_degree"
                        placeholder="e.g. Dawra-e-Hadith / Kamil"
                        value={formData.highest_degree}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Teaching Specialization
                      </label>
                      <input
                        type="text"
                        name="specialization"
                        placeholder="e.g. Tajweed, Hifz, Qiraat"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Max Daily Teaching Periods
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        name="max_daily_periods"
                        value={formData.max_daily_periods}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          name="can_review_reports"
                          checked={formData.can_review_reports}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-zinc-700 text-sky-500 bg-zinc-950 focus:ring-sky-500"
                        />
                        <span className="text-xs font-medium">Permitted to Review & Approve Student Daily Reports</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <span>Non-Academic Operational Assignment</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Assigned Campus Zone
                      </label>
                      <input
                        type="text"
                        name="assigned_zone"
                        placeholder="e.g. Hostel Wing B / Admin Building"
                        value={formData.assigned_zone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Shift Schedule
                      </label>
                      <select
                        name="shift_type"
                        value={formData.shift_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="MORNING">Morning Shift (06:00 - 14:00)</option>
                        <option value="EVENING">Evening Shift (14:00 - 22:00)</option>
                        <option value="NIGHT">Night Shift (22:00 - 06:00)</option>
                        <option value="ROTATIONAL">Rotational</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Direct Supervisor / Reporting To
                      </label>
                      <select
                        name="reporting_to"
                        value={formData.reporting_to}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- No Direct Supervisor --</option>
                        {generalSupervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.user_name || s.employee_id} ({s.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Payroll & Banking */}
          {activeTab === 'payroll' && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <BankIcon className="w-4 h-4" />
                <span>Salary & Disbursement Channels</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Salary Compensation Type
                  </label>
                  <select
                    name="salary_type"
                    value={formData.salary_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MONTHLY">Monthly Fixed Salary</option>
                    <option value="HOURLY">Hourly / Per-Period Rate</option>
                    <option value="FIXED">Contractual Lump-Sum</option>
                    <option value="COMMISSION">Honorarium / Stipend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Base Salary / Amount (BDT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    name="base_salary"
                    value={formData.base_salary}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    placeholder="e.g. Islami Bank Bangladesh PLC"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Bank Account No
                  </label>
                  <input
                    type="text"
                    name="bank_account_no"
                    placeholder="e.g. 2050XXXXXXXXXXXXX"
                    value={formData.bank_account_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Mobile Banking No (bKash / Nagad / Rocket)
                  </label>
                  <input
                    type="text"
                    name="mobile_banking_no"
                    placeholder="e.g. 017XXXXXXXX (Personal)"
                    value={formData.mobile_banking_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div className="flex gap-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'payroll' ? 'role_details' : 'basic')}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  ← Back
                </button>
              )}
              {activeTab !== 'payroll' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'basic' ? 'role_details' : 'payroll')}
                  className="px-4 py-2 text-xs font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl transition-colors"
                >
                  Next Step →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl shadow-lg shadow-sky-600/20 transition-all"
              >
                <SaveIcon className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Profile' : 'Save Staff Member'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

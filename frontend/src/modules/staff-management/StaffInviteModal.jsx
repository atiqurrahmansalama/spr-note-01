import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CloseIcon, QrCodeIcon, CopyIcon, SleekCheckIcon, WhatsAppIcon, MailIcon, TeacherIcon } from '../../components/ui/Icons';
import { inviteStaff } from '../../api/staff';
import { fetchWithAuth } from '../../utils/authService';

export default function StaffInviteModal({ isOpen, onClose, onInvited }) {
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    staff_type: 'TEACHING',
    designation: '',
    department_id: '',
    role_id: '',
    highest_degree: '',
    specialization: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    setInviteResult(null);
    setCopied(false);
    setErrorMsg('');
    setFormData({
      name: '',
      phone_number: '',
      email: '',
      staff_type: 'TEACHING',
      designation: '',
      department_id: '',
      role_id: '',
      highest_degree: '',
      specialization: '',
    });

    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/roles/'),
        ]);

        if (deptRes.ok) {
          const depts = await deptRes.json();
          setDepartments(Array.isArray(depts) ? depts : depts.results || []);
        }

        if (roleRes.ok) {
          const roleList = await roleRes.json();
          setRoles(Array.isArray(roleList) ? roleList : roleList.results || []);
        }
      } catch (err) {
        console.warn('Failed to load lookups in StaffInviteModal:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    loadLookups();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.phone_number.trim() || !formData.designation.trim()) {
      setErrorMsg('Please provide staff name, phone number, and designation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone_number: formData.phone_number.trim(),
        email: formData.email.trim() || undefined,
        staff_type: formData.staff_type,
        designation: formData.designation.trim(),
        department_id: formData.department_id || undefined,
        role_id: formData.role_id ? parseInt(formData.role_id, 10) : undefined,
        highest_degree: formData.highest_degree.trim(),
        specialization: formData.specialization.trim(),
      };

      const result = await inviteStaff(payload);
      setInviteResult(result);
      if (onInvited) onInvited(result);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullInviteUrl = () => {
    if (!inviteResult?.invite_token) return '';
    const origin = window.location.origin;
    return `${origin}/join?token=${inviteResult.invite_token}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getFullInviteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const url = getFullInviteUrl();
    const text = encodeURIComponent(
      `Assalamu Alaikum ${formData.name},\nYou have been invited to join as ${formData.designation} on SPR Portal.\nClick to activate your account: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                Invite Staff Member
              </h3>
              <p className="text-xs text-zinc-400">
                Generate secure onboarding credentials and instant QR token
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

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {!inviteResult ? (
            /* Form Mode */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Staff Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Ustadh Abu Bakr"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone_number"
                    placeholder="e.g. 017XXXXXXXX"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="teacher@institution.edu"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Staff Type */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Staff Type
                  </label>
                  <select
                    name="staff_type"
                    value={formData.staff_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="TEACHING">Teaching Faculty</option>
                    <option value="MANAGEMENT">Academic Management</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="SUPPORT">General Support</option>
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Designation <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Hifz Murabbi / Teacher"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Department
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* System RBAC Role */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    System RBAC Role
                  </label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Default by Staff Type --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.staff_type === 'TEACHING' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Highest Degree
                      </label>
                      <input
                        type="text"
                        name="highest_degree"
                        placeholder="e.g. Kamil / Masters"
                        value={formData.highest_degree}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Specialization
                      </label>
                      <input
                        type="text"
                        name="specialization"
                        placeholder="e.g. 30 Juz Hifz"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating...' : 'Create & Generate QR Token'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Generated Token & QR Success Display */
            <div className="space-y-6 text-center animate-fade-in">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <SleekCheckIcon className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-semibold text-zinc-100">
                  Invitation Created Successfully!
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Employee ID: <span className="font-mono text-zinc-200 font-bold">{inviteResult.employee_id}</span>
                </p>
              </div>

              {/* QR Code Card */}
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-inner max-w-xs mx-auto">
                <div className="p-3 bg-white rounded-xl shadow-md">
                  <QRCodeSVG
                    value={getFullInviteUrl()}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[11px] font-medium text-zinc-400 mt-3">
                  Scan to claim staff account & setup password
                </span>
              </div>

              {/* Copy Token & Link Bar */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-medium text-zinc-400">
                  Direct Onboarding Link (Valid for 7 Days)
                </label>
                <div className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={getFullInviteUrl()}
                    className="flex-1 bg-transparent text-xs text-zinc-200 font-mono focus:outline-none px-2 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    {copied ? (
                      <>
                        <SleekCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCodeIcon,
  CloseIcon,
  SparklesIcon,
  BuildingOfficeIcon,
} from '../../components/ui/Icons';
import { inviteStaff } from '../../api/staff';
import { useToast } from '../../context/ToastContext';

export default function StaffInviteModal({ isOpen, onClose, onInvited }) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    staff_type: 'TEACHING',
    role: 'STAFF_TEACHER',
    designation: 'Faculty Member',
    email: '',
    phone_number: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // { employee_id, invite_url, invite_token }
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleStaffTypeToggle = (type) => {
    setForm((prev) => ({
      ...prev,
      staff_type: type,
      role: type === 'TEACHING' ? 'STAFF_TEACHER' : 'STAFF_GENERAL',
      designation: type === 'TEACHING' ? 'Faculty Member' : 'General Support Staff',
    }));
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        staff_type: form.staff_type,
        role: form.role,
        designation: form.designation.trim() || undefined,
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
      };

      const res = await inviteStaff(payload);
      setInviteResult(res);
      showToast('Staff invitation token generated!', 'success');
      if (onInvited) onInvited(res);
    } catch (err) {
      console.error('Error creating staff invite:', err);
      showToast(err.message || 'Failed to generate invitation token', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteResult?.invite_url) return;
    navigator.clipboard.writeText(inviteResult.invite_url);
    setCopied(true);
    showToast('Invitation link copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!inviteResult?.invite_url) return;
    const text = encodeURIComponent(
      `Assalamu Alaikum, you have been invited to join the SPR Educational Management System as ${form.designation}. Please complete your profile onboarding here: ${inviteResult.invite_url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">Invite Staff Member</h2>
              <p className="text-xs theme-text-secondary">Generate instant onboarding token & QR code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {!inviteResult ? (
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                  Staff Category
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleStaffTypeToggle('TEACHING')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                      form.staff_type === 'TEACHING'
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/50 font-bold'
                        : 'theme-bg-sub theme-border theme-text-secondary hover:theme-bg-elevated'
                    }`}
                  >
                    <SparklesIcon className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold theme-text-primary">Teaching Faculty</div>
                      <div className="text-[10px] theme-text-secondary">Ustad / Murabbi</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStaffTypeToggle('SUPPORT')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                      form.staff_type === 'SUPPORT'
                        ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/50 font-bold'
                        : 'theme-bg-sub theme-border theme-text-secondary hover:theme-bg-elevated'
                    }`}
                  >
                    <BuildingOfficeIcon className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold theme-text-primary">General Support</div>
                      <div className="text-[10px] theme-text-secondary">Admin & Ops</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1">
                  Expected Designation / Role
                </label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Senior Tajweed Teacher"
                  className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                />
              </div>

              {/* Optional Email & Phone for automatic notification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="teacher@institution.edu"
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="+8801700000000"
                    className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  {isLoading ? 'Generating...' : 'Generate Invite Token'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl theme-bg-sub border theme-border">
                <div className="p-3.5 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={inviteResult.invite_url}
                    size={170}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="mt-3 text-xs font-mono theme-text-secondary">
                  Employee ID Assigned: <span className="theme-text-primary font-bold">{inviteResult.employee_id}</span>
                </div>
              </div>

              {/* Copyable Link */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-semibold theme-text-secondary">
                  Direct Onboarding Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.invite_url}
                    className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs font-mono theme-text-primary focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shrink-0 shadow transition-colors cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  Share via WhatsApp
                </button>
                <button
                  onClick={() => setInviteResult(null)}
                  className="py-2 px-3 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition-all cursor-pointer"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

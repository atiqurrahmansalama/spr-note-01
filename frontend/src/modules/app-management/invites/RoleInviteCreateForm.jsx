import React, { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { fetchWithAuth } from '../../../utils/authService';
import { SparklesIcon, KeyIcon } from '../../../components/ui/Icons';
import CustomSelect from '../../../components/ui/CustomSelect';

export default function RoleInviteCreateForm({ roles = [], onSaved, onCancel }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [targetRole, setTargetRole] = useState(roles.length > 0 ? String(roles[0].id) : '');
  const [maxUses, setMaxUses] = useState(1);
  const [expiryPreset, setExpiryPreset] = useState('24h');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter an invite batch title.', 'warning');
      return;
    }
    if (!targetRole) {
      showToast('Please select a target role.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      let expires_at = null;
      if (expiryPreset !== 'never') {
        const now = new Date();
        if (expiryPreset === '1h') now.setHours(now.getHours() + 1);
        else if (expiryPreset === '24h') now.setDate(now.getDate() + 1);
        else if (expiryPreset === '7d') now.setDate(now.getDate() + 7);
        else if (expiryPreset === '30d') now.setDate(now.getDate() + 30);
        expires_at = now.toISOString();
      }

      const payload = {
        title: title.trim(),
        target_role: parseInt(targetRole, 10),
        max_uses: parseInt(maxUses, 10) || 0,
        expires_at,
        is_active: true,
      };

      const res = await fetchWithAuth('/api/v1/admin/invites/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Invite token and QR generated successfully!', 'success');
        onSaved?.();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || errData.detail || 'Failed to generate invite.', 'error');
      }
    } catch {
      showToast('Network connection error.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = roles.map((r) => ({
    value: String(r.id),
    label: `${r.name} (${r.code})`,
    desc: `Assigns ${r.name} permissions on onboarding`,
  }));

  const expiryOptions = [
    { value: '1h', label: '1 Hour Duration' },
    { value: '24h', label: '24 Hours (1 Day)' },
    { value: '7d', label: '7 Days (1 Week)' },
    { value: '30d', label: '30 Days (1 Month)' },
    { value: 'never', label: 'Never Expires (Permanent)' },
  ];

  return (
    <div className="flex flex-col h-full w-full theme-text-primary select-none font-sans min-h-[520px]">
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 pb-28 w-full">
        <form onSubmit={handleCreateInvite} className="space-y-6 max-w-xl mx-auto">
          {/* Info Banner */}
          <div className="p-4 rounded-3xl theme-bg-sub border theme-border flex items-start gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl theme-bg-elevated border theme-border flex items-center justify-center text-[var(--accent-main)] shrink-0 mt-0.5">
              <KeyIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs theme-text-primary">Role Onboarding Automation</h4>
              <p className="text-[11px] theme-text-secondary mt-0.5 leading-relaxed">
                Generate a dynamic self-registration link and printable QR code that automatically assigns the configured role upon user join.
              </p>
            </div>
          </div>

          {/* Title / Batch Label */}
          <div>
            <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
              Title / Batch Label <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Hifz Faculty Induction 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 text-xs font-medium theme-text-primary"
              required
            />
          </div>

          {/* Target Role Dropdown */}
          <div>
            <CustomSelect
              label="Target Assigned Role"
              value={targetRole}
              onChange={(val) => setTargetRole(val)}
              options={roleOptions}
              required
            />
          </div>

          {/* Max Uses & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Max Allowed Usages
              </label>
              <input
                type="number"
                min="0"
                placeholder="0 for unlimited uses"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 rounded-2xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)] text-xs font-medium theme-text-primary"
              />
              <p className="text-[10px] theme-text-secondary mt-1">
                Enter 0 for unlimited multi-person onboarding.
              </p>
            </div>

            <div>
              <CustomSelect
                label="Token Expiration"
                value={expiryPreset}
                onChange={(val) => setExpiryPreset(val)}
                options={expiryOptions}
                direction="auto"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Footer Navigation Bar */}
      <div className="p-4 sm:p-5 border-t theme-border theme-bg-sub/60 shrink-0 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-5 py-2.5 rounded-2xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreateInvite}
          disabled={submitting || !title.trim()}
          className="px-6 py-2.5 rounded-2xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? (
            <span>Generating...</span>
          ) : (
            <>
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Generate Role Invite &amp; QR</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

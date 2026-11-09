import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import { QrCodeIcon, CloseIcon } from '@/components/ui/Icons';
import { createStaffOnboardingToken, updateStaffOnboardingToken } from '@/api/staffOnboarding';
import { staffRanksStore, STAFF_CATEGORY_OPTIONS } from '@/utils/localStore';

interface StaffInviteModalProps {
  isOpen: boolean;
  tokenData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const StaffInviteModal: React.FC<StaffInviteModalProps> = ({
  isOpen,
  tokenData = null,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const isEditing = Boolean(tokenData && tokenData.id);

  const [ranksList, setRanksList] = useState(() => staffRanksStore.getRanks(activeTenantId));
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: tokenData?.title || '',
    staff_type: tokenData?.staff_type || 'TEACHING',
    designation: tokenData?.designation || '',
    rank_order: tokenData?.rank_order || 99,
    max_applications: tokenData?.max_applications || 0,
    expires_at: tokenData?.expires_at ? tokenData.expires_at.split('T')[0] : '',
    auto_approve: tokenData?.auto_approve !== undefined ? tokenData.auto_approve : true,
    is_active: tokenData?.is_active !== undefined ? tokenData.is_active : true,
    include_payroll: tokenData?.include_payroll !== undefined ? tokenData.include_payroll : false,
  });

  useEffect(() => {
    if (tokenData) {
      setFormData({
        title: tokenData.title || '',
        staff_type: tokenData.staff_type || 'TEACHING',
        designation: tokenData.designation || '',
        rank_order: tokenData.rank_order || 99,
        max_applications: tokenData.max_applications || 0,
        expires_at: tokenData.expires_at ? tokenData.expires_at.split('T')[0] : '',
        auto_approve: tokenData.auto_approve !== undefined ? tokenData.auto_approve : true,
        is_active: tokenData.is_active !== undefined ? tokenData.is_active : true,
        include_payroll: tokenData.include_payroll !== undefined ? tokenData.include_payroll : false,
      });
    }
  }, [tokenData]);

  useEffect(() => {
    const handleRanksUpdated = () => {
      setRanksList(staffRanksStore.getRanks(activeTenantId));
    };
    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    return () => window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
  }, [activeTenantId]);

  const rankOptions = useMemo(() => {
    return [
      { label: 'All / Applicant Choice', value: '' },
      ...ranksList.map((r) => ({
        label: `[Rank ${r.order}] ${r.name_bn ? `${r.name_bn} (${r.name})` : r.name}`,
        value: r.name,
      })),
    ];
  }, [ranksList]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !String(formData.title).trim()) {
      showToast('Please enter an onboarding campaign title', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: String(formData.title).trim(),
        staff_type: formData.staff_type,
        designation: formData.designation || '',
        rank_order: parseInt(String(formData.rank_order), 10) || 99,
        max_applications: parseInt(String(formData.max_applications), 10) || 0,
        expires_at: formData.expires_at ? `${formData.expires_at}T23:59:59Z` : null,
        auto_approve: formData.auto_approve,
        is_active: formData.is_active,
        include_payroll: Boolean(formData.include_payroll),
      };

      if (isEditing) {
        await updateStaffOnboardingToken(tokenData.id, payload);
        showToast('Staff onboarding campaign updated successfully', 'success');
      } else {
        await createStaffOnboardingToken(payload);
        showToast('Staff onboarding link & QR created successfully!', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save staff onboarding campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg theme-bg-surface rounded-3xl p-6 shadow-2xl space-y-5 border-0 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                {isEditing ? 'Edit Recruitment Campaign' : 'Generate Staff Onboarding Link & QR'}
              </h3>
              <p className="text-xs theme-text-secondary">
                Configure invitation parameters and role presets for candidates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label="Campaign Title *"
            type="text"
            placeholder="e.g., Faculty Recruitment — Academic Year 2026-2027"
            value={formData.title}
            onChange={(val) => setFormData((prev) => ({ ...prev, title: val }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect
              label="Staff Category"
              options={STAFF_CATEGORY_OPTIONS}
              value={formData.staff_type}
              onChange={(val) => setFormData((prev) => ({ ...prev, staff_type: val }))}
            />

            <CustomSelect
              label="Preset Hierarchy Rank"
              options={rankOptions}
              value={formData.designation}
              onChange={(val) => setFormData((prev) => ({ ...prev, designation: val }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomInput
              label="Max Applications (0 = Unlimited)"
              type="number"
              placeholder="0"
              value={String(formData.max_applications)}
              onChange={(val) => setFormData((prev) => ({ ...prev, max_applications: Number(val) || 0 }))}
            />

            <div>
              <label className="text-xs font-bold theme-text-secondary block mb-1.5">Expiration Date</label>
              <ReusableCalendar
                selectedDate={formData.expires_at}
                onSelectDate={(val: string) => setFormData((prev) => ({ ...prev, expires_at: val }))}
                placeholder="Select expiration date"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-app space-y-2 border-0">
            <CustomCheckbox
              label="Include Payroll / Salary Step in Applicant Form"
              checked={formData.include_payroll}
              onChange={(checked) => setFormData((prev) => ({ ...prev, include_payroll: checked }))}
            />
            <CustomCheckbox
              label="Auto-Approve Applications into Staff Roster"
              checked={formData.auto_approve}
              onChange={(checked) => setFormData((prev) => ({ ...prev, auto_approve: checked }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition cursor-pointer shadow-xs border-0 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Campaign' : 'Generate Link & QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


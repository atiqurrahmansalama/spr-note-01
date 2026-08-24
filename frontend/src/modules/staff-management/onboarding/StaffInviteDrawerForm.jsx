import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { createStaffOnboardingToken, updateStaffOnboardingToken } from '../../../api/staffOnboarding';
import { staffRanksStore, STAFF_CATEGORY_OPTIONS } from '../../../utils/localStore';

export default function StaffInviteDrawerForm({ tokenData = null, onSuccess, onCancel }) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { closeDrawer, closeRightSidebar } = useRightSidebar();
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

  // Listen for rank updates from Developer Tools
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
        rank_order: r.order,
        staff_type: r.type,
      })),
    ];
  }, [ranksList]);

  const staffTypeOptions = STAFF_CATEGORY_OPTIONS;

  const handleChange = (field, valOrEvent) => {
    const value =
      typeof valOrEvent === 'object' && valOrEvent !== null && 'target' in valOrEvent
        ? valOrEvent.target.value
        : valOrEvent;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = onCancel || closeDrawer || closeRightSidebar;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
        rank_order: parseInt(formData.rank_order, 10) || 99,
        max_applications: parseInt(formData.max_applications, 10) || 0,
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
        showToast('New staff onboarding QR & link generated!', 'success');
      }
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Failed to save staff onboarding campaign:', err);
      showToast(err.message || 'Failed to save staff onboarding campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer
      title={isEditing ? 'Edit Staff Recruitment Link' : 'New Staff Recruitment QR Link'}
      onClose={handleClose}
      width="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <CustomInput
            label="Recruitment Campaign Title"
            name="title"
            value={formData.title}
            onChange={(val) => handleChange('title', val)}
            placeholder="e.g. Senior Faculty Recruitment 2026"
            required
            autoFocus
          />

          <CustomSelect
            label="Staff Category / Role"
            value={formData.staff_type}
            onChange={(val) => handleChange('staff_type', val)}
            options={staffTypeOptions}
            required
          />

          <CustomSelect
            label="Target Designation & Rank"
            value={formData.designation}
            onChange={(val) => {
              const matched = ranksList.find((r) => r.name === val);
              setFormData((prev) => ({
                ...prev,
                designation: val,
                rank_order: matched ? matched.order : 99,
                staff_type: matched && matched.type ? matched.type : prev.staff_type,
              }));
            }}
            options={rankOptions}
            placeholder="Select Pre-Configured Designation (Optional)"
            searchable={true}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomInput
              type="number"
              min={0}
              label="Max Applications Allowed"
              name="max_applications"
              value={formData.max_applications}
              onChange={(val) => handleChange('max_applications', val)}
              placeholder="0 = Unlimited"
              helperText="Set 0 for unlimited online applications"
            />

            <div>
              <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
                Link Expiration Date
              </label>
              <ReusableCalendar
                selectedDate={formData.expires_at || ''}
                onSelectDate={(val) => handleChange('expires_at', val)}
                placeholder="Select Expiry (Optional)"
              />
            </div>
          </div>
        </div>

        {/* Status & Feature Toggles */}
        <div className="pt-2 border-t theme-border space-y-3">
          <CustomCheckbox
            checked={formData.include_payroll}
            onChange={(checked) => handleChange('include_payroll', checked)}
            label="Request Salary & Banking Information on Public Form"
            description="Enable if candidates should provide expected salary and bank details during public recruitment submission"
          />

          <CustomCheckbox
            checked={formData.auto_approve}
            onChange={(checked) => handleChange('auto_approve', checked)}
            label="Auto-Create Active Staff Profile Upon Submission"
            description="If enabled, candidates will immediately be enrolled as active personnel with employee IDs"
          />

          <CustomCheckbox
            checked={formData.is_active}
            onChange={(checked) => handleChange('is_active', checked)}
            label="Invitation Link & QR Code Active"
            description="Disable to temporarily block new submissions through this link"
          />
        </div>

        <DrawerFooter
          onCancel={handleClose}
          onSubmit={handleSubmit}
          submitText={isEditing ? 'Save Changes' : 'Generate Link & QR'}
          isLoading={submitting}
        />
      </form>
    </DrawerContainer>
  );
}

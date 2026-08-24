import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar } from '../../../context/RightSidebarContext';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import { createAdmissionToken, updateAdmissionToken } from '../../../api/admissions';
import { fetchWithAuth } from '../../../utils/authService';

export default function AdmissionInviteDrawerForm({ tokenData = null, onSuccess, onCancel }) {
  const { showToast } = useToast();
  const { closeDrawer } = useRightSidebar();
  const isEditing = Boolean(tokenData && tokenData.id);

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: tokenData?.title || '',
    session_year: tokenData?.session_year || '2026-2027',
    target_class: tokenData?.target_class || '',
    max_applications: tokenData?.max_applications || 0,
    expires_at: tokenData?.expires_at ? tokenData.expires_at.split('T')[0] : '',
    auto_enroll: tokenData?.auto_enroll !== undefined ? tokenData.auto_enroll : true,
    is_active: tokenData?.is_active !== undefined ? tokenData.is_active : true,
  });

  useEffect(() => {
    const loadClasses = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/v1/classes/');
        if (res.ok) {
          const data = await res.json();
          const list = data.results || data || [];
          setClasses(list.map((c) => ({ label: c.name, value: c.id })));
        }
      } catch (err) {
        console.error('Failed to load classes for admission drawer', err);
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  const handleChange = (field, valOrEvent) => {
    const value =
      typeof valOrEvent === 'object' && valOrEvent !== null && 'target' in valOrEvent
        ? valOrEvent.target.value
        : valOrEvent;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = onCancel || closeDrawer;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title || !String(formData.title).trim()) {
      showToast('Please enter an admission title', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: String(formData.title).trim(),
        session_year: String(formData.session_year).trim() || '2026-2027',
        target_class: formData.target_class || null,
        max_applications: parseInt(formData.max_applications, 10) || 0,
        expires_at: formData.expires_at ? `${formData.expires_at}T23:59:59Z` : null,
        auto_enroll: formData.auto_enroll,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await updateAdmissionToken(tokenData.id, payload);
        showToast('Admission campaign updated successfully', 'success');
      } else {
        await createAdmissionToken(payload);
        showToast('New admission link & QR code generated!', 'success');
      }

      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to save admission link', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <CustomInput
          label="Admission Campaign Title *"
          name="title"
          value={formData.title}
          onChange={(val) => handleChange('title', val)}
          placeholder="e.g. Hifz Section Admission 2026-2027"
          required
        />

        {/* Academic Session */}
        <CustomInput
          label="Academic Session Year *"
          name="session_year"
          value={formData.session_year}
          onChange={(val) => handleChange('session_year', val)}
          placeholder="2026-2027"
          required
        />

        {/* Target Class (Optional) */}
        <CustomSelect
          label="Target Class (Optional)"
          value={formData.target_class}
          onChange={(val) => handleChange('target_class', val)}
          options={[
            { label: 'All Classes (Applicant chooses in form)', value: '' },
            ...classes,
          ]}
          disabled={loading}
          placeholder="Select specific class or allow applicant choice"
        />

        {/* Max Applications Limit */}
        <CustomInput
          label="Max Application Capacity (0 for Unlimited)"
          name="max_applications"
          type="number"
          min={0}
          value={formData.max_applications}
          onChange={(val) => handleChange('max_applications', val)}
          placeholder="0"
        />

        {/* Standard Theme-Aware Expiration Date Picker */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider select-none">
            Admission Deadline / Expiry (Optional)
          </label>
          <ReusableCalendar
            selectedDate={formData.expires_at}
            onSelectDate={(d) => handleChange('expires_at', d)}
            placeholder="Select Expiry Date..."
          />
        </div>

        {/* Enrollment Mode Toggle */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border space-y-2">
          <CustomCheckbox
            label="Direct Auto-Enrollment"
            checked={formData.auto_enroll}
            onChange={(checked) => handleChange('auto_enroll', checked)}
          />
          <p className="text-xs theme-text-secondary pl-7">
            When enabled, submitted applications automatically enroll the student with an active status and assign a student roll.
          </p>
        </div>

        {/* Clean Standard Drawer Footer with No Unwanted Background */}
        <DrawerFooter
          onCancel={handleClose}
          isSubmitting={submitting}
          saveLabel={isEditing ? 'Update Campaign' : 'Generate Link & QR'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}


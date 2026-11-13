import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import CustomButton from '@/components/ui/CustomButton';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import { DrawerContainer, DrawerSection } from '@/components/layout';
import {
  SparklesIcon,
  TeacherIcon,
  CheckIcon,
  ClockIcon,
  SaveIcon,
  ShieldCheckIcon,
  DepartmentIcon,
} from '@/components/ui/Icons';
import { createStaffOnboardingToken, updateStaffOnboardingToken } from '@/api/staffOnboarding';
import { getDepartments } from '@/api/academy';
import { useStaffCategories } from '../../hooks';
import { useStaffTranslation } from '../../locales';

export type StaffInviteOnboardingMode = 'QUICK' | 'FULL';

export interface StaffInviteDrawerFormProps {
  tokenData?: any;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const resolveInitialStaffTypes = (tokenData?: any): string[] => {
  if (Array.isArray(tokenData?.allowed_staff_types) && tokenData.allowed_staff_types.length > 0) {
    return tokenData.allowed_staff_types.map((st: any) => String(st).trim()).filter(Boolean);
  }
  if (tokenData?.staff_type && String(tokenData.staff_type).trim()) {
    return [String(tokenData.staff_type).trim()];
  }
  return ['TEACHING'];
};

const resolveInitialDepartments = (tokenData?: any): string[] => {
  if (Array.isArray(tokenData?.allowed_departments) && tokenData.allowed_departments.length > 0) {
    return tokenData.allowed_departments.map((d: any) => String(d).trim()).filter(Boolean);
  }
  if (tokenData?.department && String(tokenData.department).trim()) {
    return [String(tokenData.department).trim()];
  }
  if (tokenData?.department_id && String(tokenData.department_id).trim()) {
    return [String(tokenData.department_id).trim()];
  }
  return [];
};

const buildDefaultFormState = (tokenData?: any) => ({
  title: tokenData?.title || '',
  subtitle: tokenData?.subtitle || '',
  onboarding_mode: (tokenData?.onboarding_mode === 'QUICK' ? 'QUICK' : 'FULL') as StaffInviteOnboardingMode,
  staff_type: tokenData?.staff_type || 'TEACHING',
  allowed_staff_types: resolveInitialStaffTypes(tokenData),
  allowed_departments: resolveInitialDepartments(tokenData),
  rank_order: tokenData?.rank_order || 99,
  max_applications: tokenData?.max_applications || 0,
  expires_at: tokenData?.expires_at ? String(tokenData.expires_at).split('T')[0] : '',
  auto_approve: tokenData?.auto_approve !== undefined ? Boolean(tokenData.auto_approve) : true,
  is_active: tokenData?.is_active !== undefined ? Boolean(tokenData.is_active) : true,
  include_payroll: tokenData?.include_payroll !== undefined ? Boolean(tokenData.include_payroll) : false,
});

export const StaffInviteDrawerForm: React.FC<StaffInviteDrawerFormProps> = ({
  tokenData = null,
  onCancel,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { t } = useStaffTranslation();
  const isEditing = Boolean(tokenData && tokenData.id);

  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string>('');
  const [formData, setFormData] = useState(() => buildDefaultFormState(tokenData));
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  const { categoryOptions } = useStaffCategories({ currentValue: formData.staff_type });

  useEffect(() => {
    let isMounted = true;
    getDepartments({ page_size: 500, all: true })
      .then((data: any) => {
        if (isMounted) {
          const list = Array.isArray(data) ? data : data?.results || [];
          setDepartmentsList(list);
        }
      })
      .catch((err) => console.warn('Failed to load departments in invite drawer:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const departmentOptions = useMemo(() => {
    return departmentsList.map((d: any) => ({
      label: d.name,
      value: String(d.id),
      badge: d.code || undefined,
    }));
  }, [departmentsList]);

  useEffect(() => {
    setFormData(buildDefaultFormState(tokenData));
    setTitleError('');
  }, [tokenData]);

  const modeOptions: Array<{
    value: StaffInviteOnboardingMode;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = useMemo(
    () => [
      {
        value: 'QUICK',
        title: t('quickModeBadge', 'Quick Onboarding'),
        description: t(
          'quickOnboardingDesc',
          'Fast-track essentials: Name, contact, role & joining date'
        ),
        icon: SparklesIcon,
      },
      {
        value: 'FULL',
        title: t('fullModeBadge', 'Full Onboarding Wizard'),
        description: t(
          'fullWizardDesc',
          'Complete 5-step application with docs, address & payroll'
        ),
        icon: TeacherIcon,
      },
    ],
    [t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !String(formData.title).trim()) {
      const msg = t('campaignTitleRequired', 'Please enter an onboarding campaign title');
      setTitleError(msg);
      showToast(msg, 'warning');
      return;
    }

    setTitleError('');
    const selectedStaffTypes =
      Array.isArray(formData.allowed_staff_types) && formData.allowed_staff_types.length > 0
        ? formData.allowed_staff_types
        : [formData.staff_type || 'TEACHING'];
    const primaryStaffType = selectedStaffTypes[0] || 'TEACHING';

    const selectedDepartments = Array.isArray(formData.allowed_departments)
      ? formData.allowed_departments.map((d) => String(d).trim()).filter(Boolean)
      : [];
    const primaryDepartment = selectedDepartments.length === 1 ? selectedDepartments[0] : null;

    setSubmitting(true);
    try {
      const payload = {
        title: String(formData.title).trim(),
        subtitle: String(formData.subtitle || '').trim(),
        onboarding_mode: formData.onboarding_mode,
        staff_type: primaryStaffType,
        allowed_staff_types: selectedStaffTypes,
        designation: '',
        allowed_designations: [],
        rank_order: parseInt(String(formData.rank_order), 10) || 99,
        department: primaryDepartment,
        allowed_departments: selectedDepartments,
        max_applications: parseInt(String(formData.max_applications), 10) || 0,
        expires_at: formData.expires_at ? `${formData.expires_at}T23:59:59Z` : null,
        auto_approve: formData.auto_approve,
        is_active: formData.is_active,
        include_payroll:
          formData.onboarding_mode === 'FULL' ? Boolean(formData.include_payroll) : false,
      };

      if (isEditing) {
        await updateStaffOnboardingToken(tokenData.id, payload);
        showToast(
          t('campaignUpdatedToast', 'Staff onboarding campaign updated successfully'),
          'success'
        );
      } else {
        await createStaffOnboardingToken(payload);
        showToast(
          t('campaignCreatedToast', 'Staff onboarding link & QR created successfully!'),
          'success'
        );
      }

      onSuccess?.();
    } catch (err: any) {
      showToast(
        err?.message || t('campaignSaveFailedToast', 'Failed to save staff onboarding campaign'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} noValidate className="space-y-6 pt-2 pb-6 @container text-start">
        {/* 1. Onboarding Flow & Campaign Title */}
        <DrawerSection
          icon={SparklesIcon}
          title={t('drawerSectionFlow', 'Onboarding Flow & Campaign')}
        >
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5">
            {modeOptions.map((opt) => {
              const isSelected = formData.onboarding_mode === opt.value;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      onboarding_mode: opt.value,
                    }))
                  }
                  className={`p-3.5 rounded-2xl border-0 ring-0 text-start transition cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[var(--accent-main)]/15 dark:bg-[var(--accent-main)]/25'
                      : 'theme-bg-surface hover:theme-bg-elevated/40 shadow-xs'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'theme-bg-accent theme-accent-text shadow-xs'
                        : 'theme-bg-app theme-text-secondary'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold theme-text-primary truncate">
                        {opt.title}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0">
                          <CheckIcon className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] theme-text-secondary leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
            <CustomInput
              label={t('labelName', 'Campaign Title')}
              type="text"
              placeholder="e.g. Faculty Recruitment — Academic Year 2026-2027"
              value={formData.title}
              onChange={(val) => {
                if (titleError) setTitleError('');
                setFormData((prev) => ({ ...prev, title: val }));
              }}
              error={titleError}
            />

            <CustomInput
              label={t('labelSubtitle', 'Campaign Subtitle (Optional)')}
              type="text"
              placeholder="e.g. Personnel registration and academic onboarding"
              value={formData.subtitle}
              onChange={(val) => setFormData((prev) => ({ ...prev, subtitle: val }))}
            />
          </div>
        </DrawerSection>

        {/* 2. Recruitment Scope & Permitted Departments */}
        <DrawerSection
          icon={DepartmentIcon}
          title={t('drawerSectionRoles', 'Recruitment Scope & Departments')}
        >
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
            <CustomSelect
              label={t('allowedStaffCategories', 'Allowed Staff Categories')}
              multiple={true}
              options={categoryOptions}
              value={formData.allowed_staff_types}
              onChange={(vals: any) => {
                const list = Array.isArray(vals) ? vals : (vals ? [vals] : []);
                setFormData((prev) => ({
                  ...prev,
                  allowed_staff_types: list,
                  staff_type: list[0] || prev.staff_type,
                }));
              }}
              placeholder={t('selectStaffCategories', 'Select allowed categories...')}
            />

            <CustomSelect
              label={t('allowedDepartmentsLabel', 'Allowed Departments')}
              multiple={true}
              searchable={true}
              showBadge={true}
              showDescription={false}
              options={departmentOptions}
              value={formData.allowed_departments}
              onChange={(vals: any) =>
                setFormData((prev) => ({
                  ...prev,
                  allowed_departments: Array.isArray(vals) ? vals : [],
                }))
              }
              placeholder={t('allDepartmentsOpen', 'All Departments (Open Application)')}
            />
          </div>
        </DrawerSection>

        {/* 3. Quota, Expiration & Policies */}
        <DrawerSection
          icon={ClockIcon}
          title={t('drawerSectionAccess', 'Quota, Expiry & Policies')}
        >
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
            <CustomInput
              label="Max Applications (0 = Unlimited)"
              type="number"
              placeholder="0"
              value={String(formData.max_applications)}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, max_applications: Number(val) || 0 }))
              }
            />

            <div>
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider block mb-2">
                {t('expiresLabel', 'Expiration Date')}
              </label>
              <ReusableCalendar
                selectedDate={formData.expires_at}
                onSelectDate={(val: string) =>
                  setFormData((prev) => ({ ...prev, expires_at: val }))
                }
                placeholder={t('noExpiry', 'No Expiry')}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl theme-bg-surface shadow-xs space-y-2.5 border-0">
            <div className="flex items-center gap-2 pb-1">
              <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
              <span className="text-xs font-bold theme-text-primary">
                Workflow &amp; Access Controls
              </span>
            </div>

            {formData.onboarding_mode === 'FULL' && (
              <CustomCheckbox
                label={t('includePayrollLabel', 'Include Payroll / Salary Step in Applicant Form')}
                checked={formData.include_payroll}
                onChange={(checked) =>
                  setFormData((prev) => ({ ...prev, include_payroll: checked }))
                }
              />
            )}

            <CustomCheckbox
              label={t('autoApproveLabel', 'Auto-Approve Applications into Staff Roster')}
              checked={formData.auto_approve}
              onChange={(checked) =>
                setFormData((prev) => ({ ...prev, auto_approve: checked }))
              }
            />

            {isEditing && (
              <CustomCheckbox
                label={t('campaignActiveLabel', 'Link is Active & Accepting Applications')}
                checked={formData.is_active}
                onChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            )}
          </div>
        </DrawerSection>

        {/* Footer Actions */}
        <div className="pt-3 border-0 flex items-center justify-end gap-2.5">
          {onCancel && (
            <CustomButton
              type="button"
              variant="surface"
              size="md"
              onClick={onCancel}
              disabled={submitting}
            >
              {t('cancel', 'Cancel')}
            </CustomButton>
          )}
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            icon={SaveIcon}
            loading={submitting}
            loadingText={t('submitting', 'Saving...')}
            className="flex-1"
          >
            {isEditing
              ? t('updateCampaignBtn', 'Update Campaign')
              : t('createCampaignBtn', 'Generate Link & QR')}
          </CustomButton>
        </div>
      </form>
    </DrawerContainer>
  );
};

export default StaffInviteDrawerForm;

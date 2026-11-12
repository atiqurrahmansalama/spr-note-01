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
} from '@/components/ui/Icons';
import { createStaffOnboardingToken, updateStaffOnboardingToken } from '@/api/staffOnboarding';
import { useStaffRanks, useStaffCategories } from '../../hooks';
import { useStaffTranslation } from '../../locales';

export type StaffInviteOnboardingMode = 'QUICK' | 'FULL';

export interface StaffInviteDrawerFormProps {
  tokenData?: any;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const resolveInitialDesignations = (tokenData?: any): string[] => {
  if (Array.isArray(tokenData?.allowed_designations) && tokenData.allowed_designations.length > 0) {
    return tokenData.allowed_designations.map((d: any) => String(d).trim()).filter(Boolean);
  }
  if (tokenData?.designation && String(tokenData.designation).trim()) {
    return [String(tokenData.designation).trim()];
  }
  return [];
};

const buildDefaultFormState = (tokenData?: any) => ({
  title: tokenData?.title || '',
  onboarding_mode: (tokenData?.onboarding_mode === 'QUICK' ? 'QUICK' : 'FULL') as StaffInviteOnboardingMode,
  staff_type: tokenData?.staff_type || 'TEACHING',
  allowed_designations: resolveInitialDesignations(tokenData),
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

  const { rankOptions: rawRankOptions, getRankByName } = useStaffRanks();
  const { categoryOptions } = useStaffCategories({ currentValue: formData.staff_type });

  // Clean option labels for multi-select permitted posts in drawer (Name + #Rank badge)
  const rankOptions = useMemo(
    () =>
      rawRankOptions.map((r) => ({
        label: r.value,
        value: r.value,
        badge: r.badge,
        rank_order: r.rank_order,
      })),
    [rawRankOptions]
  );

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
    const selectedPosts = Array.isArray(formData.allowed_designations)
      ? formData.allowed_designations.map((d) => String(d).trim()).filter(Boolean)
      : [];
    const primaryDesignation = selectedPosts.length === 1 ? selectedPosts[0] : '';
    const firstMatchedRank = getRankByName(selectedPosts[0]);

    setSubmitting(true);
    try {
      const payload = {
        title: String(formData.title).trim(),
        onboarding_mode: formData.onboarding_mode,
        staff_type: formData.staff_type,
        designation: primaryDesignation,
        allowed_designations: selectedPosts,
        rank_order: firstMatchedRank?.order ?? (parseInt(String(formData.rank_order), 10) || 99),
        department: null,
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
        </DrawerSection>

        {/* 2. Eligible Roles & Permitted Posts */}
        <DrawerSection
          icon={TeacherIcon}
          title={t('drawerSectionRoles', 'Eligible Roles')}
        >
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
            <CustomSelect
              label={t('staffType', 'Staff Category')}
              options={categoryOptions}
              value={formData.staff_type}
              onChange={(val) => setFormData((prev) => ({ ...prev, staff_type: val }))}
            />

            <CustomSelect
              label={t('allowedPostsLabel', 'Permitted Posts / Official Ranks')}
              multiple={true}
              searchable={true}
              showBadge={true}
              showDescription={false}
              options={rankOptions}
              value={formData.allowed_designations}
              onChange={(vals: any) =>
                setFormData((prev) => ({
                  ...prev,
                  allowed_designations: Array.isArray(vals) ? vals : [],
                }))
              }
              placeholder={t('allowedPostsPlaceholder', 'All Ranks (Open Application)')}
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

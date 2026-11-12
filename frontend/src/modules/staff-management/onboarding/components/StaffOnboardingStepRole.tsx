import React, { useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import DepartmentSelect from '@/components/selectors/DepartmentSelect';
import { useStaffRanks, useStaffCategories } from '../../hooks';
import { useStaffTranslation } from '../../locales';
import type { StaffOnboardingPayload, StaffRankItem } from '../../types';

interface StaffOnboardingStepRoleProps {
  formData: StaffOnboardingPayload;
  ranksList?: StaffRankItem[];
  errors: Record<string, string>;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
  showIntroBanner?: boolean;
  mode?: 'full' | 'quick';
  allowedDesignations?: string[];
}

export const StaffOnboardingStepRole: React.FC<StaffOnboardingStepRoleProps> = ({
  formData,
  errors,
  onChange,
  showIntroBanner = true,
  mode = 'full',
  allowedDesignations,
}) => {
  const { t } = useStaffTranslation();

  const { categoryOptions } = useStaffCategories({ currentValue: formData.staff_type });
  const { rankOptions, getRankByName } = useStaffRanks({
    allowedDesignations,
  });

  const employmentStatusOptions = useMemo(
    () => [
      { value: 'PERMANENT', label: t('empPermanent', 'Permanent Full-Time') },
      { value: 'PROBATION', label: t('empProbation', 'Probationary') },
      { value: 'CONTRACT', label: t('empContract', 'Contractual') },
      { value: 'PART_TIME', label: t('empPartTime', 'Part-Time') },
      { value: 'VISITING', label: t('empVisiting', 'Visiting / Honorary Faculty') },
    ],
    [t]
  );

  const handleRankSelect = (selectedName: string) => {
    const matched = getRankByName(selectedName);
    onChange('designation', selectedName);
    if (matched) {
      onChange('rank_order', matched.order);
      if (matched.type && matched.type !== formData.staff_type) {
        onChange('staff_type', matched.type);
      }
    }
  };

  const staffTypeField = (
    <CustomSelect
      label={t('staffType', 'Staff Category')}
      options={categoryOptions}
      value={formData.staff_type}
      onChange={(val) => onChange('staff_type', val)}
    />
  );

  const designationField = (
    <CustomSelect
      label={t('designation', 'Designation / Official Rank')}
      options={rankOptions}
      value={formData.designation}
      onChange={(val) => handleRankSelect(val)}
      placeholder={t('selectInstitutionalRank', 'Select Institutional Rank')}
      searchable={true}
      error={errors.designation}
    />
  );

  const joiningDateField = (
    <div>
      <label className="text-xs font-bold theme-text-secondary block mb-1.5 text-start">
        {t('joiningDate', 'JOINING DATE')}
      </label>
      <ReusableCalendar
        selectedDate={formData.joining_date}
        onSelectDate={(val: string) => onChange('joining_date', val)}
        placeholder={t('joiningDatePlaceholder', 'Official joining date')}
      />
    </div>
  );

  // Compact Quick Onboarding mode: container-responsive 2 column grid
  if (mode === 'quick') {
    return (
      <div className="@container border-0">
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4 items-start animate-fade-in border-0">
          {staffTypeField}
          {designationField}
          <div className="@[480px]:col-span-2">{joiningDateField}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container space-y-6 animate-fade-in border-0">
      {showIntroBanner && (
        <div className="p-4 rounded-2xl theme-bg-app border-0 text-start">
          <h4 className="text-xs font-bold theme-text-primary">
            {t('roleSectionTitle', 'Institutional Hierarchy & Designation')}
          </h4>
          <p className="text-[11px] theme-text-secondary mt-0.5">
            {t(
              'roleSectionSubtitle',
              'Select the official faculty rank, institutional department, and employment status.'
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-4 border-0">
        {staffTypeField}
        {designationField}
      </div>

      <div className="grid grid-cols-1 @[540px]:grid-cols-2 @[820px]:grid-cols-3 gap-4 border-0">
        <div>
          <label className="text-xs font-bold theme-text-secondary block mb-1.5 text-start">
            {t('department', 'Department')}
          </label>
          <DepartmentSelect
            value={formData.department}
            onChange={(val: any) => onChange('department', val)}
            placeholder={t('selectDepartment', 'Select Department')}
          />
        </div>

        <CustomSelect
          label={t('employmentStatus', 'Employment Status')}
          options={employmentStatusOptions}
          value={formData.employment_status}
          onChange={(val) => onChange('employment_status', val)}
        />

        <div className="@[540px]:col-span-2 @[820px]:col-span-1">
          {joiningDateField}
        </div>
      </div>
    </div>
  );
};

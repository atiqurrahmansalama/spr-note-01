import React, { useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import DepartmentSelect from '@/components/selectors/DepartmentSelect';
import { STAFF_CATEGORY_OPTIONS } from '@/utils/localStore';
import { useStaffTranslation } from '../../locales';
import type { StaffOnboardingPayload, StaffRankItem } from '../../types';

interface StaffOnboardingStepRoleProps {
  formData: StaffOnboardingPayload;
  ranksList: StaffRankItem[];
  errors: Record<string, string>;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
  showIntroBanner?: boolean;
}

export const StaffOnboardingStepRole: React.FC<StaffOnboardingStepRoleProps> = ({
  formData,
  ranksList,
  errors,
  onChange,
  showIntroBanner = true,
}) => {
  const { t, formatNumber } = useStaffTranslation();

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

  const rankOptions = useMemo(() => {
    return ranksList.map((r) => ({
      label: `${r.name_bn ? `${r.name_bn} (${r.name})` : r.name} — [${formatNumber(r.order)}]`,
      value: r.name,
      rank_order: r.order,
      staff_type: r.type,
    }));
  }, [ranksList, formatNumber]);

  const handleRankSelect = (selectedName: string) => {
    const matched = ranksList.find((r) => r.name === selectedName);
    onChange('designation', selectedName);
    if (matched) {
      onChange('rank_order', matched.order);
      if (matched.type && matched.type !== formData.staff_type) {
        onChange('staff_type', matched.type);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in border-0">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-0">
        <CustomSelect
          label={`${t('staffType', 'Staff Category')} *`}
          options={STAFF_CATEGORY_OPTIONS}
          value={formData.staff_type}
          onChange={(val) => onChange('staff_type', val)}
        />

        <CustomSelect
          label={`${t('designation', 'Designation / Official Rank')} *`}
          options={rankOptions}
          value={formData.designation}
          onChange={(val) => handleRankSelect(val)}
          placeholder={t('selectInstitutionalRank', 'Select Institutional Rank')}
          searchable={true}
          error={errors.designation}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-0">
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

        <div className="sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-bold theme-text-secondary block mb-1.5 text-start">
            {t('joiningDate', 'Joining Date')}
          </label>
          <ReusableCalendar
            selectedDate={formData.joining_date}
            onSelectDate={(val: string) => onChange('joining_date', val)}
            placeholder={t('joiningDatePlaceholder', 'Official joining date')}
          />
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import { getDepartments } from '@/api/academy';
import { useStaffCategories } from '../../hooks';
import { useStaffTranslation } from '../../locales';
import type { StaffOnboardingPayload, StaffRankItem } from '../../types';

interface StaffOnboardingStepRoleProps {
  formData: StaffOnboardingPayload;
  ranksList?: StaffRankItem[];
  errors: Record<string, string>;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
  showIntroBanner?: boolean;
  mode?: 'full' | 'quick';
  tokenMeta?: any;
  allowedDesignations?: string[];
  allowedStaffTypes?: string[];
  allowedDepartments?: string[];
}

export const StaffOnboardingStepRole: React.FC<StaffOnboardingStepRoleProps> = ({
  formData,
  errors,
  onChange,
  showIntroBanner = true,
  mode = 'full',
  tokenMeta,
  allowedStaffTypes,
  allowedDepartments,
}) => {
  const { t } = useStaffTranslation();

  const { categoryOptions } = useStaffCategories({ currentValue: formData.staff_type });

  const permittedStaffTypes = tokenMeta?.allowed_staff_types || allowedStaffTypes;
  const filteredCategoryOptions = useMemo(() => {
    if (Array.isArray(permittedStaffTypes) && permittedStaffTypes.length > 0) {
      const allowedSet = new Set(
        permittedStaffTypes.map((st: string) => String(st).trim().toUpperCase())
      );
      return categoryOptions.filter((opt) => allowedSet.has(opt.value.toUpperCase()));
    }
    return categoryOptions;
  }, [categoryOptions, permittedStaffTypes]);

  useEffect(() => {
    if (filteredCategoryOptions.length > 0) {
      const isCurrentValid = filteredCategoryOptions.some((opt) => opt.value === formData.staff_type);
      if (!isCurrentValid) {
        onChange('staff_type', filteredCategoryOptions[0].value);
      }
    }
  }, [filteredCategoryOptions, formData.staff_type, onChange]);

  const [departmentsList, setDepartmentsList] = useState<any[]>(() => {
    if (tokenMeta?.departments && Array.isArray(tokenMeta.departments)) {
      return tokenMeta.departments;
    }
    return [];
  });

  useEffect(() => {
    if (tokenMeta?.departments && Array.isArray(tokenMeta.departments)) {
      setDepartmentsList(tokenMeta.departments);
      return;
    }
    if (!tokenMeta) {
      let isMounted = true;
      getDepartments({ page_size: 500, all: true })
        .then((data: any) => {
          if (isMounted) {
            const list = Array.isArray(data) ? data : data?.results || [];
            setDepartmentsList(list);
          }
        })
        .catch((err) => console.warn('Failed to load departments in role step:', err));
      return () => {
        isMounted = false;
      };
    }
  }, [tokenMeta]);

  const permittedDepts = tokenMeta?.allowed_departments || allowedDepartments;
  const departmentOptions = useMemo(() => {
    let list = departmentsList;
    if (Array.isArray(permittedDepts) && permittedDepts.length > 0) {
      const allowedSet = new Set(permittedDepts.map((d: any) => String(d).trim()));
      list = list.filter((dept) => allowedSet.has(String(dept.id)));
    }
    return list.map((dept: any) => ({
      value: String(dept.id),
      label: dept.name,
      badge: dept.code || undefined,
    }));
  }, [departmentsList, permittedDepts]);

  useEffect(() => {
    if (departmentOptions.length === 1 && (!formData.department || formData.department !== departmentOptions[0].value)) {
      onChange('department', departmentOptions[0].value);
    }
  }, [departmentOptions, formData.department, onChange]);

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

  const staffTypeField = (
    <CustomSelect
      label={t('staffType', 'Staff Category')}
      options={filteredCategoryOptions}
      value={formData.staff_type}
      onChange={(val) => onChange('staff_type', val)}
    />
  );

  const departmentField = (
    <CustomSelect
      label={t('department', 'Department')}
      options={departmentOptions}
      value={formData.department}
      onChange={(val) => onChange('department', val)}
      placeholder={t('selectDepartment', 'Select Department')}
      searchable={false}
      error={errors.department}
    />
  );

  const joiningDateField = (
    <div>
      <label className="text-xs font-bold theme-text-secondary block mb-1.5 text-start">
        {t('joiningDate', 'Joining Date')}
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
          {departmentField}
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
            {t('roleSectionTitle', 'Department & Employment Details')}
          </h4>
          <p className="text-[11px] theme-text-secondary mt-0.5">
            {t(
              'roleSectionSubtitle',
              'Select your staff category, target department, and employment status.'
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-4 border-0">
        {staffTypeField}
        {departmentField}
      </div>

      <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-4 border-0">
        <CustomSelect
          label={t('employmentStatus', 'Employment Status')}
          options={employmentStatusOptions}
          value={formData.employment_status}
          onChange={(val) => onChange('employment_status', val)}
        />
        {joiningDateField}
      </div>
    </div>
  );
};

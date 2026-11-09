import React, { useMemo } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import DepartmentSelect from '@/components/selectors/DepartmentSelect';
import { STAFF_CATEGORY_OPTIONS } from '@/utils/localStore';
import type { StaffOnboardingPayload, StaffRankItem } from '../../types';

interface StaffOnboardingStepRoleProps {
  formData: StaffOnboardingPayload;
  ranksList: StaffRankItem[];
  errors: Record<string, string>;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
}

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'PERMANENT', label: 'Permanent Full-Time' },
  { value: 'PROBATION', label: 'Probationary' },
  { value: 'CONTRACT', label: 'Contractual' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'VISITING', label: 'Visiting / Honorary Faculty' },
];

export const StaffOnboardingStepRole: React.FC<StaffOnboardingStepRoleProps> = ({
  formData,
  ranksList,
  errors,
  onChange,
}) => {
  const rankOptions = useMemo(() => {
    return [
      ...ranksList.map((r) => ({
        label: `${r.name_bn ? `${r.name_bn} (${r.name})` : r.name} — [Rank ${r.order}]`,
        value: r.name,
        rank_order: r.order,
        staff_type: r.type,
      })),
    ];
  }, [ranksList]);

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
      <div className="p-4 rounded-2xl theme-bg-app border-0">
        <h4 className="text-xs font-bold theme-text-primary">Institutional Hierarchy &amp; Designation</h4>
        <p className="text-[11px] theme-text-secondary mt-0.5">
          Select the official faculty rank, institutional department, and employment status.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-0">
        <CustomSelect
          label="Staff Category *"
          options={STAFF_CATEGORY_OPTIONS}
          value={formData.staff_type}
          onChange={(val) => onChange('staff_type', val)}
        />

        <CustomSelect
          label="Designation / Official Rank *"
          options={rankOptions}
          value={formData.designation}
          onChange={(val) => handleRankSelect(val)}
          placeholder="Select Institutional Rank"
          searchable={true}
          error={errors.designation}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-0">
        <div>
          <label className="text-xs font-bold theme-text-secondary block mb-1.5">Department</label>
          <DepartmentSelect
            value={formData.department}
            onChange={(val: any) => onChange('department', val)}
            placeholder="Select Department"
          />
        </div>

        <CustomSelect
          label="Employment Status"
          options={EMPLOYMENT_STATUS_OPTIONS}
          value={formData.employment_status}
          onChange={(val) => onChange('employment_status', val)}
        />

        <div>
          <label className="text-xs font-bold theme-text-secondary block mb-1.5">Joining Date</label>
          <ReusableCalendar
            selectedDate={formData.joining_date}
            onSelectDate={(val: string) => onChange('joining_date', val)}
            placeholder="Official joining date"
          />
        </div>
      </div>
    </div>
  );
};


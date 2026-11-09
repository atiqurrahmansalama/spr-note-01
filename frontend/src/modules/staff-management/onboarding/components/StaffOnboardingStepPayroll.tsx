import React from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import AddressPickerInput from '@/components/ui/AddressPickerInput';
import type { StaffOnboardingPayload } from '../../types';

interface StaffOnboardingStepPayrollProps {
  formData: StaffOnboardingPayload;
  sameAsPresent: boolean;
  showPayroll: boolean;
  errors: Record<string, string>;
  onSameAsPresentChange: (val: boolean) => void;
  onChange: (field: keyof StaffOnboardingPayload, val: any) => void;
}

const SALARY_TYPE_OPTIONS = [
  { value: 'MONTHLY_FIXED', label: 'Monthly Fixed Salary (Standard)' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'PER_PERIOD', label: 'Per Class / Lecture Period' },
  { value: 'FIXED', label: 'Fixed Term Contract' },
  { value: 'VOLUNTEER', label: 'Honorary / Volunteer Faculty' },
];

export const StaffOnboardingStepPayroll: React.FC<StaffOnboardingStepPayrollProps> = ({
  formData,
  sameAsPresent,
  showPayroll,
  errors,
  onSameAsPresentChange,
  onChange,
}) => {
  return (
    <div className="space-y-6 animate-fade-in border-0">
      {/* 1. Address Section */}
      <div className="p-4 rounded-2xl theme-bg-app space-y-4 border-0">
        <h4 className="text-xs font-bold theme-text-primary">Address &amp; Emergency Contact</h4>

        <div>
          <label className="text-xs font-bold theme-text-secondary block mb-1.5">Present Address</label>
          <AddressPickerInput
            value={{
              address: formData.address || '',
              division: formData.division || '',
              district: formData.district || '',
              upazila: formData.upazila_thana || '',
              postalCode: formData.postal_code || '',
            }}
            onChange={(val: any) => {
              onChange('address', val?.address);
              onChange('division', val?.division);
              onChange('district', val?.district);
              onChange('upazila_thana', val?.upazila);
              onChange('postal_code', val?.postalCode);
            }}
          />
        </div>

        <div className="pt-2 border-0">
          <CustomCheckbox
            label="Permanent address is identical to present address"
            checked={sameAsPresent}
            onChange={(checked) => onSameAsPresentChange(checked)}
          />
        </div>

        {!sameAsPresent && (
          <div className="pt-2 animate-fade-in border-0">
            <label className="text-xs font-bold theme-text-secondary block mb-1.5">Permanent Address</label>
            <AddressPickerInput
              value={{
                address: formData.permanent_address || '',
                division: formData.permanent_division || '',
                district: formData.permanent_district || '',
                upazila: formData.permanent_upazila_thana || '',
              }}
              onChange={(val: any) => {
                onChange('permanent_address', val?.address);
                onChange('permanent_division', val?.division);
                onChange('permanent_district', val?.district);
                onChange('permanent_upazila_thana', val?.upazila);
              }}
            />
          </div>
        )}

        <div className="pt-2 max-w-sm border-0">
          <CustomInput
            label="Emergency Contact Phone"
            name="emergency_contact"
            placeholder="01XXXXXXXXX"
            value={formData.emergency_contact || ''}
            onChange={(val) => onChange('emergency_contact', val)}
            error={errors.emergency_contact}
          />
        </div>
      </div>

      {/* 2. Payroll & Banking Section */}
      {showPayroll && (
        <div className="p-4 rounded-2xl theme-bg-app space-y-4 border-0">
          <h4 className="text-xs font-bold theme-text-primary">Salary Structure &amp; Banking Details</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-0">
            <CustomSelect
              label="Salary Type"
              options={SALARY_TYPE_OPTIONS}
              value={formData.salary_type || 'MONTHLY_FIXED'}
              onChange={(val) => onChange('salary_type', val)}
            />

            <CustomInput
              label="Base Monthly Salary (BDT)"
              name="base_salary"
              type="number"
              placeholder="e.g. 25000"
              value={String(formData.base_salary || '')}
              onChange={(val) => onChange('base_salary', Number(val) || 0)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-0">
            <CustomInput
              label="Bank Name (Optional)"
              name="bank_name"
              placeholder="e.g. Islami Bank Bangladesh"
              value={formData.bank_name || ''}
              onChange={(val) => onChange('bank_name', val)}
            />

            <CustomInput
              label="Bank Account No."
              name="bank_account_no"
              placeholder="2050XXXXXXXXXXXXX"
              value={formData.bank_account_no || ''}
              onChange={(val) => onChange('bank_account_no', val)}
            />

            <CustomInput
              label="Mobile Banking (bKash/Nagad)"
              name="mobile_banking_no"
              placeholder="01XXXXXXXXX"
              value={formData.mobile_banking_no || ''}
              onChange={(val) => onChange('mobile_banking_no', val)}
              error={errors.mobile_banking_no}
            />
          </div>
        </div>
      )}
    </div>
  );
};


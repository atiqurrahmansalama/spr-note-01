import React from 'react';
import {
  BankIcon,
  BanknotesIcon,
  PhoneIcon,
} from '@/components/ui/Icons';
import type { StaffMember } from '@/types/staff';

export interface StaffPayrollTabProps {
  staff: StaffMember;
}

export const StaffPayrollTab: React.FC<StaffPayrollTabProps> = ({ staff }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <BankIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Compensation, Salary &amp; Banking Details
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Base salary schedule, payment credentials, and bank account setup
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Base Salary / Honorarium
            </span>
            <p className="font-bold theme-text-primary text-lg font-mono">
              {staff.base_salary ? (
                <>৳ {Number(staff.base_salary).toLocaleString()}</>
              ) : (
                '—'
              )}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Salary Structure Type
            </span>
            <p className="font-bold theme-text-primary text-sm">
              {staff.salary_type || 'Monthly Fixed'}
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Bank Name
            </span>
            <p className="font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <BankIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.bank_name || '—'}</span>
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Bank Account Number
            </span>
            <p className="font-mono font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <BanknotesIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.bank_account_no || '—'}</span>
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary mb-1">
              Mobile Banking (bKash / Nagad / Rocket)
            </span>
            <p className="font-mono font-bold theme-text-primary text-sm flex items-center gap-1.5">
              <PhoneIcon className="w-3.5 h-3.5 opacity-60" />
              <span>{staff.mobile_banking_no || '—'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPayrollTab;

import React from 'react';
import { useTranslation } from '../../../../i18n';
import { 
  BanknotesIcon, 
  InvoiceIcon, 
  ScaleIcon, 
  CalculatorIcon, 
  ReceiptPercentIcon,
  WalletIcon
} from '../../../../components/ui/Icons';

interface QuickActionToolbarProps {
  onOpenQuickPos: () => void;
  onOpenBatchBilling: () => void;
  onOpenCreateVoucher: () => void;
  onOpenProcessPayroll: () => void;
  onOpenGrantWaiver: () => void;
  onOpenSalaryAdvance: () => void;
}

export const QuickActionToolbar: React.FC<QuickActionToolbarProps> = ({
  onOpenQuickPos,
  onOpenBatchBilling,
  onOpenCreateVoucher,
  onOpenProcessPayroll,
  onOpenGrantWaiver,
  onOpenSalaryAdvance,
}) => {
  const { t } = useTranslation('finance');

  const actions = [
    {
      id: 'quick_pos',
      label: t('quickPosCashier', 'Quick POS Cash Desk'),
      description: 'Instant student fee payment & slip',
      Icon: BanknotesIcon,
      onClick: onOpenQuickPos,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400',
    },
    {
      id: 'batch_billing',
      label: t('batchInvoicing', 'Batch Invoicing'),
      description: 'Generate monthly class bills in 1-click',
      Icon: InvoiceIcon,
      onClick: onOpenBatchBilling,
      color: 'hover:border-indigo-500/50 hover:bg-indigo-500/5 text-indigo-400',
    },
    {
      id: 'create_voucher',
      label: t('newVoucher', 'Create Voucher'),
      description: 'Post JV, PV, RV, or Contra entry',
      Icon: ScaleIcon,
      onClick: onOpenCreateVoucher,
      color: 'hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-400',
    },
    {
      id: 'process_payroll',
      label: t('processPayroll', 'Run Payroll'),
      description: 'Monthly staff salary & deductions',
      Icon: CalculatorIcon,
      onClick: onOpenProcessPayroll,
      color: 'hover:border-sky-500/50 hover:bg-sky-500/5 text-sky-400',
    },
    {
      id: 'grant_waiver',
      label: t('grantWaiver', 'Grant Waiver'),
      description: 'Approve scholarship & discounts',
      Icon: ReceiptPercentIcon,
      onClick: onOpenGrantWaiver,
      color: 'hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-400',
    },
    {
      id: 'salary_advance',
      label: t('salaryAdvance', 'Salary Advance'),
      description: 'Staff loan & advance applications',
      Icon: WalletIcon,
      onClick: onOpenSalaryAdvance,
      color: 'hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((act) => {
        const IconComponent = act.Icon;
        return (
          <button
            key={act.id}
            onClick={act.onClick}
            type="button"
            className={`p-3.5 rounded-xl border theme-border bg-surface text-left transition-all duration-200 flex flex-col justify-between group shadow-sm ${act.color}`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="p-2 rounded-lg bg-surface-sub border theme-border group-hover:scale-105 transition-transform">
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-primary group-hover:text-primary transition-colors">
                {act.label}
              </h4>
              <p className="text-[11px] text-secondary line-clamp-1 mt-0.5">
                {act.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

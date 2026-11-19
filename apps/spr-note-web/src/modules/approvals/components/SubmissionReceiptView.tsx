import React from 'react';
import CustomButton from '@/components/ui/CustomButton';
import {
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  PrinterIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { useToast } from '@/context/ToastContext';
import { useApprovalsTranslation } from '../locales';

export interface SubmissionReceiptViewProps {
  trackingCode: string;
  status?: string;
  applicantName?: string;
  designationOrClass?: string;
  effectiveDate?: string | null;
  message?: string;
  onReset?: () => void;
  onPrint?: () => void;
}

export const SubmissionReceiptView: React.FC<SubmissionReceiptViewProps> = ({
  trackingCode,
  status = 'PENDING',
  applicantName,
  designationOrClass,
  effectiveDate,
  message,
  onReset,
  onPrint,
}) => {
  const { showToast } = useToast();
  const { t } = useApprovalsTranslation();

  const handleCopyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    showToast(t('codeCopiedToast', 'Tracking Code copied to clipboard!'), 'success');
  };

  const isScheduled = status === 'SCHEDULED';

  return (
    <div className="w-full max-w-xl mx-auto p-6 @[500px]:p-8 rounded-3xl theme-bg-surface shadow-xs border-0 text-center space-y-6 animate-fade-in">
      <div className="w-14 h-14 rounded-3xl theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto shadow-xs border-0">
        {isScheduled ? <ClockIcon className="w-7 h-7" /> : <SparklesIcon className="w-7 h-7" />}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg @[500px]:text-xl font-bold theme-text-primary tracking-tight">
          {isScheduled
            ? t('scheduledTitle', 'Application Approved & Scheduled')
            : t('pendingReceiptTitle', 'Application Submitted for Review')}
        </h3>
        <p className="text-xs theme-text-secondary max-w-md mx-auto leading-relaxed">
          {message ||
            t(
              'pendingReceiptSubtitle',
              'Your submission has been securely registered in the institutional queue. Please keep your tracking code for future inquiries.'
            )}
        </p>
      </div>

      {/* Tracking Code Badge Box */}
      <div className="p-4 rounded-2xl theme-bg-app border-0 flex items-center justify-between gap-3 text-start">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary block">
            {t('trackingCodeLabel', 'Official Tracking Code')}
          </span>
          <span className="text-sm @[500px]:text-base font-mono font-bold theme-accent tracking-wide block truncate">
            {trackingCode}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="p-2 rounded-xl theme-bg-surface hover:theme-bg-elevated/60 theme-text-primary transition shadow-xs cursor-pointer border-0 shrink-0"
          title={t('copyCode', 'Copy Code')}
        >
          <CopyIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Essential Details Grid */}
      {(applicantName || designationOrClass || effectiveDate) && (
        <div className="p-3.5 rounded-2xl theme-bg-tile border-0 grid grid-cols-2 gap-3 text-xs text-start">
          {applicantName && (
            <div>
              <span className="text-[10px] font-bold uppercase theme-text-secondary block">
                {t('colTracking', 'Applicant')}
              </span>
              <span className="font-semibold theme-text-primary truncate block">
                {applicantName}
              </span>
            </div>
          )}
          {designationOrClass && (
            <div>
              <span className="text-[10px] font-bold uppercase theme-text-secondary block">
                {t('colDetails', 'Applied Post / Role')}
              </span>
              <span className="font-semibold theme-text-primary truncate block">
                {designationOrClass}
              </span>
            </div>
          )}
          {effectiveDate && (
            <div className="col-span-2 pt-1 border-t theme-border">
              <span className="text-[10px] font-bold uppercase theme-text-secondary block">
                {t('effectiveDateLabel', 'Effective Implementation Date')}
              </span>
              <span className="font-mono font-semibold theme-text-primary">
                {effectiveDate}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse @[400px]:flex-row items-center justify-center gap-2.5 pt-2 border-0">
        {onPrint && (
          <CustomButton
            type="button"
            variant="surface"
            size="md"
            icon={PrinterIcon}
            onClick={onPrint}
            className="w-full @[400px]:w-auto"
          >
            {t('printReceipt', 'Print Voucher')}
          </CustomButton>
        )}
        {onReset && (
          <CustomButton
            type="button"
            variant="primary"
            size="md"
            icon={CheckCircleIcon}
            onClick={onReset}
            className="w-full @[400px]:w-auto"
          >
            {t('submitAnother', 'New Application')}
          </CustomButton>
        )}
      </div>
    </div>
  );
};

export default SubmissionReceiptView;


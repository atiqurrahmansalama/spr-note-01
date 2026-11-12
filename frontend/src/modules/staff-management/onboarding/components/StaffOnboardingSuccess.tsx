import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@/components/ui/Icons';
import { SubmissionReceiptView } from '@/modules/approvals';
import { useStaffTranslation } from '../../locales';

interface StaffOnboardingSuccessProps {
  result: any;
  onReset: () => void;
}

export const StaffOnboardingSuccess: React.FC<StaffOnboardingSuccessProps> = ({
  result,
  onReset,
}) => {
  const navigate = useNavigate();
  const { t } = useStaffTranslation();

  if (
    result?.tracking_code &&
    (result?.status === 'pending' ||
      result?.status === 'scheduled' ||
      result?.approval_status === 'PENDING' ||
      !result?.staff?.employee_id)
  ) {
    return (
      <SubmissionReceiptView
        trackingCode={result.tracking_code}
        status={result.approval_status || (result.status === 'scheduled' ? 'SCHEDULED' : 'PENDING')}
        message={result.message}
        effectiveDate={result.effective_date}
        applicantName={result?.staff?.name}
        designationOrClass={result?.staff?.designation}
        onReset={onReset}
      />
    );
  }

  const staff = result?.staff || result?.data || result;
  const staffId = staff?.id;
  const empId = staff?.employee_id || staff?.id;
  const staffName = staff?.name || staff?.user_name;
  const designation = staff?.designation || 'Staff Member';
  const role = staff?.staff_type || 'Faculty';

  return (
    <div className="p-8 sm:p-10 rounded-3xl theme-bg-surface shadow-md max-w-xl mx-auto text-center space-y-6 animate-zoom-in border-0">
      <div className="w-16 h-16 rounded-3xl theme-bg-accent-soft text-emerald-500 flex items-center justify-center mx-auto shadow-inner border-0">
        <CheckCircleIcon className="w-8 h-8" />
      </div>

      <div>
        <h3 className="text-base sm:text-lg font-bold theme-text-primary">
          {t('onboardingSuccessTitle', 'Staff Member Successfully Onboarded!')}
        </h3>
        <p className="text-xs theme-text-secondary mt-1">
          {t('registeredWithIdPrefix', 'Official employee profile registered with ID')}{' '}
          <span className="font-mono font-bold theme-accent">{empId}</span>
        </p>
      </div>

      <div className="p-4 rounded-2xl theme-bg-app text-xs text-start space-y-2.5 border-0">
        <div className="flex justify-between gap-3">
          <span className="theme-text-secondary">{t('labelName', 'Name')}:</span>
          <span className="font-bold theme-text-primary text-end">{staffName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="theme-text-secondary">{t('labelDesignation', 'Designation')}:</span>
          <span className="font-bold theme-accent text-end">{designation}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="theme-text-secondary">{t('labelStaffCategory', 'Staff Category')}:</span>
          <span className="font-medium theme-text-primary text-end">{role}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-0">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-semibold theme-text-primary transition cursor-pointer border-0 shadow-xs"
        >
          {t('onboardAnotherStaff', 'Onboard Another Staff')}
        </button>
        {staffId && (
          <button
            type="button"
            onClick={() => navigate(`/staff/${staffId}`)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition cursor-pointer shadow-xs border-0"
          >
            {t('viewProfileDetail', 'View Profile Detail')}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/staff/roster')}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-semibold theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
        >
          {t('returnToRoster', 'Return to Staff Roster')}
        </button>
      </div>
    </div>
  );
};

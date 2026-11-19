import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, ChevronIcon } from '@/components/ui/Icons';
import CustomButton from '@/components/ui/CustomButton';
import { useTranslation } from '@/i18n';

export interface AccessDeniedViewProps {
  title?: string;
  message?: string;
  sectionKey?: string | string[];
  className?: string;
}

/**
 * Enterprise Access Denied & Feature Restricted View
 * Displayed when a user navigates to a route or module that is disabled in Feature Control
 * or where their role lacks permission.
 */
export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  title,
  message,
  sectionKey,
  className = '',
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const resolvedTitle = title || t('accessRestricted', 'Access Restricted');
  const resolvedMessage =
    message ||
    t(
      'featureDisabledMessage',
      'This feature or module is currently disabled by your institution administrator. If you believe this is an error or require access, please contact your administrator.'
    );

  const displayKey = Array.isArray(sectionKey) ? sectionKey.join(', ') : sectionKey;

  return (
    <div
      className={`min-h-[50vh] flex items-center justify-center p-4 sm:p-6 select-none ${className}`}
    >
      <div className="max-w-md w-full theme-bg-surface border theme-border rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-fade-in">
        <div className="mx-auto w-14 h-14 rounded-2xl theme-bg-accent-soft border border-current/20 flex items-center justify-center theme-accent shadow-xs">
          <LockClosedIcon className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold theme-text-primary tracking-tight">
            {resolvedTitle}
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
            {resolvedMessage}
          </p>
        </div>

        {displayKey && (
          <div className="inline-block px-2.5 py-1 rounded-md theme-bg-sub border theme-border text-[11px] font-mono theme-text-secondary opacity-80">
            <span className="opacity-60 uppercase mr-1 text-[10px]">Scope:</span>
            <span>{displayKey}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CustomButton
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <span>{t('goBack', 'Go Back')}</span>
          </CustomButton>

          <CustomButton
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto"
          >
            <span>{t('returnToDashboard', 'Return to Dashboard')}</span>
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedView;


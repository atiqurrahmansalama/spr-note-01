import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomButton } from '@repo/ui';
import { ArrowLeftNavIcon, LockClosedIcon } from '../../components/icons/UniverseIcons';
import { useRecipientTranslation } from './locales';

export const AccessDeniedView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useRecipientTranslation();

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full rounded-3xl theme-bg-surface p-8 space-y-5 shadow-2xl border-0">
        <div className="w-14 h-14 mx-auto rounded-2xl theme-bg-danger-soft theme-danger flex items-center justify-center">
          <LockClosedIcon className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold theme-text-primary">
            {t('accessDeniedTitle', 'Owner Access Required')}
          </h2>
          <p className="text-xs theme-text-secondary leading-relaxed">
            {t(
              'accessDeniedBody',
              'This control chamber is reserved for the Universe Owner. Your Recipient account can explore all unlocked experiences safely.'
            )}
          </p>
        </div>
        <CustomButton
          variant="primary"
          icon={ArrowLeftNavIcon}
          onClick={() => navigate('/welcome', { replace: true })}
        >
          {t('returnWelcome', 'Return to Universe')}
        </CustomButton>
      </div>
    </div>
  );
};

export default AccessDeniedView;

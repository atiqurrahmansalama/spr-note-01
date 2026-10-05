import React from 'react';
import { useTranslation } from '../../../i18n';
import { Modal } from '../../ui/Modal';
import CustomButton from '../../ui/CustomButton';
import { LaptopIcon, ArrowLeftIcon, SparklesIcon } from '../../ui/Icons';

export interface DocLabMobileGuardProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const DocLabMobileGuard: React.FC<DocLabMobileGuardProps> = ({
  isOpen = true,
  onClose,
  className = '',
}) => {
  const { t, isRTL } = useTranslation('common');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      size="sm"
      closeOnEscape={true}
      closeOnOverlayClick={false}
      showCloseButton={Boolean(onClose)}
      icon={LaptopIcon}
      title={t('docLabMobileTitle', 'Desktop Screen Recommended')}
      className={className}
      zIndex={10005}
      footer={
        <div className="flex items-center justify-center w-full">
          {onClose && (
            <CustomButton
              variant="primary"
              size="md"
              icon={ArrowLeftIcon}
              onClick={onClose}
              fullWidth={true}
              className="w-full"
            >
              {t('docLabMobileBack', 'Return Back')}
            </CustomButton>
          )}
        </div>
      }
    >
      <div className="p-4 sm:p-5 text-center space-y-4 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Device Artwork Spotlight */}
        <div className="mx-auto w-14 h-14 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center relative shadow-inner">
          <LaptopIcon className="w-7 h-7 theme-accent" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full theme-bg-surface border theme-border flex items-center justify-center shadow-xs">
            <SparklesIcon className="w-3 h-3 theme-accent" />
          </div>
        </div>

        {/* Message description */}
        <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed px-1">
          {t(
            'docLabMobileDesc',
            'DocLab Studio is built for precision document layout, pagination typesetting, and print template design. For the full editing experience, please access this studio on a desktop PC, laptop, or tablet landscape display. Dedicated small screen and mobile editing support will be introduced in a future update.'
          )}
        </p>
      </div>
    </Modal>
  );
};

export default DocLabMobileGuard;

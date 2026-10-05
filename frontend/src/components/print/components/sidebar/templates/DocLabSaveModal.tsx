import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import { SparklesIcon } from '@/components/ui/Icons';
import { useTranslation } from '@/i18n';

export interface DocLabSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, docType?: 'template' | 'generated') => void;
  totalRecordsCount?: number;
}

/**
 * DocLabSaveModal
 * Clean enterprise dialog to save customized document templates.
 */
export const DocLabSaveModal: React.FC<DocLabSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { t, isRTL } = useTranslation('common');
  const [templateName, setTemplateName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!templateName.trim()) return;
    onSave(templateName.trim(), 'template');
    setTemplateName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('saveCanvasAsTemplate', 'Save Canvas as Template')}
      subtitle={t('saveCanvasAsTemplateDesc', 'Save your customized document design as a reusable template for this module.')}
      icon={SparklesIcon}
      size="md"
      closeOnOverlayClick={false}
      closeOnEscape={true}
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <CustomButton
            variant="sub"
            size="sm"
            onClick={onClose}
          >
            {t('cancel', 'Cancel')}
          </CustomButton>
          <CustomButton
            variant="primary"
            size="sm"
            icon={SparklesIcon}
            onClick={() => handleSubmit()}
            disabled={!templateName.trim()}
          >
            {t('saveTemplate', 'Save Template')}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
        <div>
          <label className="block text-xs font-semibold theme-text-primary mb-1.5">
            {t('templateName', 'Template Name')} <span className="theme-danger">*</span>
          </label>
          <CustomInput
            value={templateName}
            onChange={(val: any) => setTemplateName(typeof val === 'string' ? val : val?.target?.value ?? '')}
            placeholder={t('templateNamePlaceholder', 'e.g. Official Daily Progress Report')}
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
};

export default DocLabSaveModal;


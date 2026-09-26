import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import CustomInput from '@/components/ui/CustomInput';
import { SparklesIcon } from '@/components/ui/Icons';

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
      title="Save Canvas as Template"
      subtitle="Save your customized document design as a reusable template for this module."
      icon={SparklesIcon}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border theme-border text-xs font-medium theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!templateName.trim()}
            className="px-4 py-1.5 rounded-lg theme-bg-accent text-white text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Save Template
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 py-1">
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1.5">
            Template Name <span className="theme-danger">*</span>
          </label>
          <CustomInput
            value={templateName}
            onChange={(val: any) => setTemplateName(typeof val === 'string' ? val : val?.target?.value ?? '')}
            placeholder="e.g. Official Progress Report"
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
};

export default DocLabSaveModal;

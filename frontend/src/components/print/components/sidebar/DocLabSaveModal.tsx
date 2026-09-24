import React, { useState } from 'react';
import CustomInput from '../../../ui/CustomInput';
import { SparklesIcon } from '../../../ui/Icons';

interface DocLabSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, docType?: 'template' | 'generated') => void;
  totalRecordsCount?: number;
}

/**
 * DocLabSaveModal
 * Clean dialog to save customized document templates for the active scope.
 */
export const DocLabSaveModal: React.FC<DocLabSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [templateName, setTemplateName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSave(templateName.trim(), 'template');
    setTemplateName('');
    onClose();
  };

  return (
    <div className="p-3.5 rounded-xl border theme-border-accent/40 theme-bg-elevated shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-150 text-left">
      <div className="flex items-center justify-between border-b theme-border pb-2">
        <span className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
          <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
          <span>Save as Template</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs theme-text-muted hover:theme-text-primary cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium theme-text-secondary mb-1">
            Template Name <span className="theme-danger">*</span>
          </label>
          <CustomInput
            value={templateName}
            onChange={(val: any) => setTemplateName(typeof val === 'string' ? val : val?.target?.value ?? '')}
            placeholder="e.g. Official Daily Progress Template"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border theme-border text-xs font-medium theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!templateName.trim()}
            className="px-3 py-1.5 rounded-lg theme-bg-accent text-white text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Save Template
          </button>
        </div>
      </form>
    </div>
  );
};

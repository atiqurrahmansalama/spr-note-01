import React, { useState } from 'react';
import CustomInput from '../../../ui/CustomInput';
import { SparklesIcon, FileIcon } from '../../../ui/Icons';

interface DocLabSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, docType: 'template' | 'generated') => void;
  totalRecordsCount?: number;
}

/**
 * DocLabSaveModal
 * Clean dialog to save customized document templates or generated multi-page records.
 */
export const DocLabSaveModal: React.FC<DocLabSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  totalRecordsCount = 0,
}) => {
  const [templateName, setTemplateName] = useState('');
  const [docType, setDocType] = useState<'template' | 'generated'>('template');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSave(templateName.trim(), docType);
    setTemplateName('');
    onClose();
  };

  return (
    <div className="p-3.5 rounded-xl border theme-border-accent/40 theme-bg-elevated shadow-lg space-y-3 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b theme-border pb-2">
        <span className="text-xs font-bold theme-text-primary">
          Save Document
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
        {totalRecordsCount > 0 && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl theme-bg-sub border theme-border">
            <button
              type="button"
              onClick={() => setDocType('template')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                docType === 'template'
                  ? 'theme-bg-accent text-white shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <FileIcon className="w-3.5 h-3.5" />
              <span>Template</span>
            </button>
            <button
              type="button"
              onClick={() => setDocType('generated')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                docType === 'generated'
                  ? 'theme-bg-accent text-white shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Filled Doc</span>
            </button>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium theme-text-secondary mb-1">
            {docType === 'template' ? 'Template Name' : 'Document Name'}
          </label>
          <CustomInput
            value={templateName}
            onChange={(val: any) => setTemplateName(typeof val === 'string' ? val : val?.target?.value ?? '')}
            placeholder={docType === 'template' ? 'e.g. Official Mark Sheet 2026' : 'e.g. Class 10 Generated Report'}
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
            Save Document
          </button>
        </div>
      </form>
    </div>
  );
};

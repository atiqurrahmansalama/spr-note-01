import React, { useState, useMemo } from 'react';
import {
  FileIcon,
  SparklesIcon,
  PlusIcon,
  BookOpenIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  EditIcon,
} from '../../../ui/Icons';
import Modal, { ConfirmModal } from '../../../ui/Modal';
import CustomButton from '../../../ui/CustomButton';
import CustomInput from '../../../ui/CustomInput';
import { DocLabTemplateCard } from './DocLabTemplateCard';
import { DocLabSaveModal } from './DocLabSaveModal';
import { DocxTemplate } from '../../types';
import { DocumentScopeDefinition, ScopeValidationResult } from '../../keyLibrary/types';
import { getDefaultTemplateIdForScope } from '../../scopeTemplateStore';
import { useToast } from '../../../../context/ToastContext';

interface DocLabPresetsTabProps {
  templates: DocxTemplate[];
  activeTemplateId: string | null;
  customDocxTemplate: DocxTemplate | null;
  scopeDefinition: DocumentScopeDefinition;
  activeScopeValidation: ScopeValidationResult | null;
  docxRenderMode: 'template' | 'sample' | 'all';
  totalRecordsCount: number;
  isScopeDefault: boolean;
  onSelectTemplate: (template: DocxTemplate) => void;
  onOpenDocxModal?: () => void;
  onOpenTemplateLibrary?: () => void;
  onDeleteDocxTemplate?: (template: DocxTemplate) => void;
  onDuplicateDocxTemplate?: (template: DocxTemplate) => void;
  onUpdateDocxTemplate?: (templateId: string, updates: { name?: string; description?: string }) => void;
  onSaveCurrentTemplate?: (name: string, docType: 'template' | 'generated') => void;
  onDocxRenderModeChange?: (mode: 'template' | 'sample' | 'all') => void;
  onToggleScopeDefault?: (templateId: string) => void;
}

/**
 * DocLabPresetsTab
 * Manages document templates, scope blueprints, batch record generation, and template library.
 */
export const DocLabPresetsTab: React.FC<DocLabPresetsTabProps> = ({
  templates = [],
  activeTemplateId,
  customDocxTemplate,
  scopeDefinition,
  activeScopeValidation,
  docxRenderMode,
  totalRecordsCount,
  isScopeDefault,
  onSelectTemplate,
  onOpenDocxModal,
  onOpenTemplateLibrary,
  onDeleteDocxTemplate,
  onDuplicateDocxTemplate,
  onUpdateDocxTemplate,
  onSaveCurrentTemplate,
  onDocxRenderModeChange,
  onToggleScopeDefault,
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocxTemplate | null>(null);
  const [templateToRename, setTemplateToRename] = useState<DocxTemplate | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameDescription, setRenameDescription] = useState('');

  const scopeDefaultTemplateId = useMemo(() => {
    return scopeDefinition?.id ? getDefaultTemplateIdForScope(scopeDefinition.id) : null;
  }, [scopeDefinition?.id, isScopeDefault]);

  const { showToast } = useToast();

  const handleEditTemplate = (tmpl: DocxTemplate) => {
    onSelectTemplate(tmpl);
    if (onDocxRenderModeChange) {
      onDocxRenderModeChange('template');
    }

    // Programmatically focus and scroll to the document canvas
    requestAnimationFrame(() => {
      setTimeout(() => {
        const editable = document.querySelector(
          '.universal-print-workbench [contenteditable="true"]'
        ) as HTMLElement | null;
        if (editable) {
          editable.focus({ preventScroll: false });
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            const leafNodes = Array.from(
              editable.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
            ) as HTMLElement[];
            const targetEl = leafNodes[leafNodes.length - 1] || editable.lastElementChild || editable;
            range.selectNodeContents(targetEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          editable.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    });

    if (showToast) {
      showToast(`Loaded "${tmpl.name || 'Template'}" for editing. Edits will auto-save.`, 'info');
    }
  };

  const handleOpenRename = (tmpl: DocxTemplate) => {
    setTemplateToRename(tmpl);
    setRenameName(tmpl.name || '');
    setRenameDescription(tmpl.description || '');
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!templateToRename || !renameName.trim()) return;
    onUpdateDocxTemplate?.(templateToRename.id, {
      name: renameName.trim(),
      description: renameDescription.trim(),
    });
    setTemplateToRename(null);
  };

  const customTemplatesList = useMemo(() => {
    const list = (templates || []).filter((t: any) => {
      if (t.isTable || t.id === 'default_table' || t.isBlank || t.id === 'blank_document' || t.id === 'default_layout') {
        return false;
      }
      const tScope = t.scopeId || t.templateMeta?.scopeId || 'general_document';
      if (scopeDefinition?.id && scopeDefinition.id !== 'general_document') {
        return tScope === scopeDefinition.id;
      }
      return true;
    });

    // Stable alphabetical sorting by template/file name (prevents jumping on selection)
    return [...list].sort((a: any, b: any) => {
      const nameA = String(a.name || a.title || a.id || '').trim().toLowerCase();
      const nameB = String(b.name || b.title || b.id || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [templates, scopeDefinition]);

  const blankTemplate = useMemo(() => {
    return (templates || []).find((t: any) => t.isBlank || t.id === 'blank_document');
  }, [templates]);

  const isCustomDocxActive = Boolean(
    customDocxTemplate || (activeTemplateId && activeTemplateId !== 'default_table')
  );

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* 1. Batch Data Generation Controls */}
      {isCustomDocxActive && (
        <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Multi-Page Batch Generator</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold theme-info-badge">
              {totalRecordsCount > 0
                ? `${totalRecordsCount} ${totalRecordsCount === 1 ? 'Record' : 'Records'}`
                : 'Active Template'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl theme-bg-elevated border theme-border">
            <button
              type="button"
              onClick={() => onDocxRenderModeChange?.('template')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                docxRenderMode === 'template'
                  ? 'theme-bg-accent-soft theme-accent shadow-2xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Template Design
            </button>
            <button
              type="button"
              onClick={() => onDocxRenderModeChange?.('all')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                docxRenderMode === 'all'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <span>
                {totalRecordsCount > 0
                  ? `Generate ${totalRecordsCount} ${totalRecordsCount === 1 ? 'Document' : 'Documents'}`
                  : 'Generate Documents'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Master Document Creation & Library Bar */}
      <div className="grid grid-cols-2 gap-2">
        {onOpenDocxModal && (
          <button
            type="button"
            onClick={onOpenDocxModal}
            className="py-2.5 px-3 rounded-xl border theme-border theme-bg-surface hover:theme-border-accent/40 font-semibold text-xs theme-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Import Template</span>
          </button>
        )}

        {onOpenTemplateLibrary && (
          <button
            type="button"
            onClick={onOpenTemplateLibrary}
            className="py-2.5 px-3 rounded-xl border theme-border theme-bg-surface hover:theme-border-accent/40 font-semibold text-xs theme-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookOpenIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Template Library</span>
          </button>
        )}
      </div>

      {/* 4. Save Modal Trigger Card */}
      {isCustomDocxActive && onSaveCurrentTemplate && (
        <div className="pt-1">
          {isSaveModalOpen ? (
            <DocLabSaveModal
              isOpen={isSaveModalOpen}
              onClose={() => setIsSaveModalOpen(false)}
              onSave={onSaveCurrentTemplate}
              totalRecordsCount={totalRecordsCount}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl border theme-border theme-bg-sub/60 hover:theme-bg-sub text-xs font-semibold theme-accent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Save Current Canvas as Template</span>
            </button>
          )}
        </div>
      )}

      {/* 5. Base Builtin Layouts Section */}
      {blankTemplate && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted block">
            Standard Canvas
          </span>

          <div
            onClick={() => onSelectTemplate(blankTemplate)}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
              activeTemplateId === blankTemplate.id
                ? 'theme-bg-accent-soft theme-border-accent-soft shadow-xs'
                : 'theme-bg-surface theme-border-subtle hover:theme-border-accent-soft hover:theme-bg-sub/30'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeTemplateId === blankTemplate.id
                  ? 'theme-bg-accent text-white shadow-xs'
                  : 'theme-bg-sub theme-text-secondary'
              }`}
            >
              <FileIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-xs font-semibold block ${activeTemplateId === blankTemplate.id ? 'theme-accent font-bold' : 'theme-text-primary'}`}>
                Blank Document
              </span>
              <span className="text-[11px] theme-text-secondary block truncate">
                Start with a fresh canvas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Saved Custom Scope Templates */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
            Scope Templates {customTemplatesList.length > 0 ? `(${customTemplatesList.length})` : ''}
          </span>
        </div>

        {customTemplatesList.length > 0 ? (
          <div className="space-y-2">
            {customTemplatesList.map((tmpl) => (
              <DocLabTemplateCard
                key={tmpl.id}
                template={tmpl}
                isActive={activeTemplateId === tmpl.id}
                isScopeDefault={scopeDefaultTemplateId === tmpl.id}
                onSelect={onSelectTemplate}
                onEdit={handleEditTemplate}
                onRename={handleOpenRename}
                onDuplicate={onDuplicateDocxTemplate}
                onDelete={(target) => setTemplateToDelete(target)}
                onToggleScopeDefault={onToggleScopeDefault}
              />
            ))}
          </div>
        ) : (
          /* Empty State: No Template */
          <div className="p-5 rounded-2xl border border-dashed theme-border theme-bg-sub/40 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl theme-bg-sub theme-text-secondary flex items-center justify-center shadow-xs">
              <FileIcon className="w-5 h-5 opacity-60" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold theme-text-primary block">
                No Template
              </span>
              <p className="text-[11px] theme-text-secondary leading-relaxed max-w-[210px]">
                No templates found for this module. You can import one or design on the canvas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(templateToDelete)}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={() => {
          if (templateToDelete) {
            onDeleteDocxTemplate?.(templateToDelete);
            setTemplateToDelete(null);
          }
        }}
        title="Delete Template"
        subtitle={`Are you sure you want to delete "${templateToDelete?.name}"?`}
        icon={TrashIcon}
        confirmText="Delete Template"
        confirmVariant="danger"
        confirmIcon={TrashIcon}
        callout={{
          type: 'danger',
          title: 'Permanent Deletion',
          message: 'This document template will be permanently removed from your scope library. Any future print jobs requiring this specific design will have to be recreated.',
        }}
        summaryItems={[
          { label: 'Template Name', value: templateToDelete?.name || '' },
          { label: 'Scope', value: scopeDefinition?.name || 'General' },
          { label: 'Type', value: templateToDelete?.templateType === 'generated' ? 'Filled Document' : 'Document Template' },
        ]}
      />

      {/* Rename / Edit Details Modal */}
      <Modal
        isOpen={Boolean(templateToRename)}
        onClose={() => setTemplateToRename(null)}
        title="Edit Template Details"
        subtitle="Update the title and description for this template"
        icon={EditIcon}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <CustomButton variant="sub" size="sm" onClick={() => setTemplateToRename(null)}>
              Cancel
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              disabled={!renameName.trim()}
              onClick={() => handleSaveRename()}
            >
              Save Changes
            </CustomButton>
          </div>
        }
      >
        <form onSubmit={handleSaveRename} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold theme-text-primary mb-1.5">
              Template Name <span className="theme-danger">*</span>
            </label>
            <CustomInput
              value={renameName}
              onChange={(val: any) => setRenameName(typeof val === 'string' ? val : val?.target?.value ?? '')}
              placeholder="e.g. Official Daily Progress Template"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold theme-text-primary mb-1.5">
              Description (Optional)
            </label>
            <CustomInput
              value={renameDescription}
              onChange={(val: any) => setRenameDescription(typeof val === 'string' ? val : val?.target?.value ?? '')}
              placeholder="e.g. Used for daily student memorization reports"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

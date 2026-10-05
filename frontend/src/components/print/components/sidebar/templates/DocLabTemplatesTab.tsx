import React, { useState, useMemo, useRef } from 'react';
import {
  FileIcon,
  SparklesIcon,
  PlusIcon,
  BookOpenIcon,
  SearchIcon,
  UploadIcon,
  TrashIcon,
  EditIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import CustomButton from '@/components/ui/CustomButton';
import CustomInput from '@/components/ui/CustomInput';
import { DocLabTemplateCard } from './DocLabTemplateCard';
import { DocLabSaveModal } from './DocLabSaveModal';
import { DocxTemplate } from '@/components/print/types';
import { DocumentScopeDefinition, ScopeValidationResult } from '@/components/print/keyLibrary/types';
import {
  ALL_DOCUMENT_SCOPES,
  getDefaultTemplateIdForScope,
  getScopeById,
  resolveTemplateScopeId,
} from '@/components/print/scopeTemplateStore';
import {
  parseDocxDocument,
  saveDocxTemplate,
  CustomDocxTemplate,
} from '@/components/print/docxTemplateEngine';
import { useToast } from '@/context/ToastContext';

export interface DocLabTemplatesTabProps {
  templates: DocxTemplate[];
  activeTemplateId: string | null;
  customDocxTemplate: DocxTemplate | null;
  scopeDefinition: DocumentScopeDefinition;
  activeScopeValidation: ScopeValidationResult | null;
  docxRenderMode: 'template' | 'sample' | 'all';
  totalRecordsCount: number;
  isScopeDefault: boolean;
  onSelectTemplate: (template: DocxTemplate) => void;
  onDeleteDocxTemplate?: (template: DocxTemplate) => void;
  onDuplicateDocxTemplate?: (template: DocxTemplate) => void;
  onUpdateDocxTemplate?: (templateId: string, updates: { name?: string; description?: string }) => void;
  onSaveCurrentTemplate?: (name: string, docType: 'template' | 'generated') => void;
  onDocxRenderModeChange?: (mode: 'template' | 'sample' | 'all') => void;
  onToggleScopeDefault?: (templateId: string) => void;
}

/**
 * DocLabTemplatesTab
 * Centralized in-sidebar Template Hub replacing legacy Presets and popups.
 * Provides instant scope filtering, all-library exploration, Word (.docx) upload, and template management.
 */
export const DocLabTemplatesTab: React.FC<DocLabTemplatesTabProps> = ({
  templates = [],
  activeTemplateId,
  customDocxTemplate,
  scopeDefinition,
  activeScopeValidation,
  docxRenderMode,
  totalRecordsCount,
  isScopeDefault,
  onSelectTemplate,
  onDeleteDocxTemplate,
  onDuplicateDocxTemplate,
  onUpdateDocxTemplate,
  onSaveCurrentTemplate,
  onDocxRenderModeChange,
  onToggleScopeDefault,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const [templateToDelete, setTemplateToDelete] = useState<DocxTemplate | null>(null);
  const [templateToRename, setTemplateToRename] = useState<DocxTemplate | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameDescription, setRenameDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const scopeDefaultTemplateId = useMemo(() => {
    return scopeDefinition?.id ? getDefaultTemplateIdForScope(scopeDefinition.id) : null;
  }, [scopeDefinition?.id, isScopeDefault]);

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

  // Direct Word (.docx) File Ingestion
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parseResult = await parseDocxDocument(buffer);

      const templateName = file.name.replace(/\.[^/.]+$/, '');
      const targetScope = scopeDefinition?.id || 'general_document';

      const newTemplate: CustomDocxTemplate = {
        id: `docx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: templateName,
        description: `Imported Word template for ${scopeDefinition?.name || targetScope}`,
        rawHtml: parseResult.html,
        detectedPlaceholders: parseResult.detectedPlaceholders,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTableDocument: parseResult.isTableDocument,
        sampleColumns: parseResult.extractedColumns,
        sampleData: parseResult.extractedRows,
        scopeId: targetScope,
      };

      saveDocxTemplate(newTemplate);
      onSelectTemplate(newTemplate);

      if (showToast) {
        showToast(`Successfully imported "${templateName}".`, 'success');
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err.message || 'Failed to parse Word document template.', 'error');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Split templates into Module-Specific Templates and Other Library Templates
  const { moduleTemplates, otherTemplates } = useMemo(() => {
    const filterPredicate = (t: any) => {
      if (t.isTable || t.id === 'default_table' || t.isBlank || t.id === 'blank_document' || t.id === 'default_layout') {
        return false;
      }

      // Search Query Filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(t.name || t.title || '').toLowerCase().includes(q);
        const matchesDesc = String(t.description || '').toLowerCase().includes(q);
        const tScope = resolveTemplateScopeId(t);
        const scopeDef = getScopeById(tScope);
        const matchesScope = scopeDef ? scopeDef.name.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesDesc && !matchesScope) return false;
      }

      return true;
    };

    const activeCanonicalScope = getScopeById(scopeDefinition?.id)?.id || scopeDefinition?.id || 'general_document';
    const mod: DocxTemplate[] = [];
    const oth: DocxTemplate[] = [];

    (templates || []).forEach((t: any) => {
      if (!filterPredicate(t)) return;
      const tResolvedScope = resolveTemplateScopeId(t);
      if (tResolvedScope === activeCanonicalScope) {
        mod.push(t);
      } else {
        oth.push(t);
      }
    });

    const sortFn = (a: any, b: any) => {
      const nameA = String(a.name || a.title || a.id || '').trim().toLowerCase();
      const nameB = String(b.name || b.title || b.id || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    };

    return {
      moduleTemplates: mod.sort(sortFn),
      otherTemplates: oth.sort(sortFn),
    };
  }, [templates, scopeDefinition?.id, searchQuery]);

  const blankTemplate = useMemo(() => {
    return (templates || []).find((t: any) => t.isBlank || t.id === 'blank_document');
  }, [templates]);

  const totalTemplatesCount = moduleTemplates.length + otherTemplates.length;

  return (
    <div className="space-y-4 pt-1 pb-6">
      {/* 1. Header Action & Direct File Upload / Save Template */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleDirectFileUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
          disabled={isUploading}
          className="flex-1 py-2 px-3 rounded-xl border theme-border theme-bg-surface hover:theme-border-accent/40 font-semibold text-xs theme-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <UploadIcon className="w-3.5 h-3.5 theme-accent" />
          <span>{isUploading ? 'Importing...' : 'Import Word'}</span>
        </button>

        {onSaveCurrentTemplate && (
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-xl theme-bg-accent text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Save as Template</span>
          </button>
        )}
      </div>

      {/* 2. Base Builtin Layouts Section (Blank Document) */}
      {blankTemplate && (
        <DocLabTemplateCard
          template={blankTemplate}
          isActive={activeTemplateId === blankTemplate.id}
          isScopeDefault={scopeDefaultTemplateId === blankTemplate.id}
          onSelect={onSelectTemplate}
        />
      )}

      {/* 3. Search Input */}
      <CustomInput
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(val: any) => setSearchQuery(typeof val === 'string' ? val : val?.target?.value ?? '')}
        icon={SearchIcon}
        size="sm"
        clearable
        className="w-full"
      />

      {/* 4. Module Templates Section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
            Module Templates {moduleTemplates.length > 0 ? `(${moduleTemplates.length})` : ''}
          </span>
        </div>

        {moduleTemplates.length > 0 ? (
          <div className="space-y-2">
            {moduleTemplates.map((tmpl) => (
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
          <div className="p-3 rounded-xl border border-dashed theme-border theme-bg-sub/20 text-center">
            <p className="text-[11px] theme-text-muted">
              {searchQuery.trim()
                ? 'No module templates match your search.'
                : 'No templates saved for this module yet.'}
            </p>
          </div>
        )}
      </div>

      {/* 5. Library Templates Section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
            Library Templates {otherTemplates.length > 0 ? `(${otherTemplates.length})` : ''}
          </span>
        </div>

        {otherTemplates.length > 0 ? (
          <div className="space-y-2">
            {otherTemplates.map((tmpl) => (
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
          <div className="p-3 rounded-xl border border-dashed theme-border theme-bg-sub/20 text-center">
            <p className="text-[11px] theme-text-muted">
              {searchQuery.trim()
                ? 'No library templates match your search.'
                : 'No other templates found in the library.'}
            </p>
          </div>
        )}
      </div>

      {/* Fallback Empty State when library is completely empty */}
      {totalTemplatesCount === 0 && searchQuery.trim() && (
        <div className="p-5 rounded-2xl border border-dashed theme-border theme-bg-sub/40 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl theme-bg-sub theme-text-secondary flex items-center justify-center shadow-xs">
            <FileIcon className="w-5 h-5 opacity-60" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold theme-text-primary block">
              No Templates Found
            </span>
            <p className="text-[11px] theme-text-secondary leading-relaxed max-w-[210px]">
              No templates match "{searchQuery.trim()}".
            </p>
          </div>
        </div>
      )}

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
          message: 'This document template will be permanently removed from your template library.',
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

      {/* Save Canvas As Template Modal */}
      {isSaveModalOpen && onSaveCurrentTemplate && (
        <DocLabSaveModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={(name) => {
            onSaveCurrentTemplate(name, 'template');
            setIsSaveModalOpen(false);
            if (showToast) {
              showToast(`Saved "${name}" as a template for this module.`, 'success');
            }
          }}
          totalRecordsCount={totalRecordsCount}
        />
      )}
    </div>
  );
};

export default DocLabTemplatesTab;

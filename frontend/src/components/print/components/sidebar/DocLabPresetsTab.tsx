import React, { useState, useMemo } from 'react';
import {
  FileIcon,
  SparklesIcon,
  PlusIcon,
  BookOpenIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
} from '../../../ui/Icons';
import { DocLabTemplateCard } from './DocLabTemplateCard';
import { DocLabSaveModal } from './DocLabSaveModal';
import { DocxTemplate } from '../../types';
import { DocumentScopeDefinition, ScopeValidationResult } from '../../keyLibrary/types';

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
  onSaveCurrentTemplate,
  onDocxRenderModeChange,
  onToggleScopeDefault,
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [filesFilter, setFilesFilter] = useState<'all' | 'templates' | 'generated'>('all');

  const customTemplatesList = useMemo(() => {
    return (templates || []).filter((t: any) => {
      if (t.isTable || t.id === 'default_table' || t.isBlank || t.id === 'blank_document' || t.id === 'default_layout') {
        return false;
      }
      const tScope = t.scopeId || t.templateMeta?.scopeId || 'general_document';
      if (scopeDefinition?.id && scopeDefinition.id !== 'general_document') {
        return tScope === scopeDefinition.id;
      }
      return true;
    });
  }, [templates, scopeDefinition]);

  const templatesList = useMemo(() => {
    return customTemplatesList.filter((t: any) => t.templateType !== 'generated' && !t.id?.startsWith('gen_'));
  }, [customTemplatesList]);

  const generatedList = useMemo(() => {
    return customTemplatesList.filter((t: any) => t.templateType === 'generated' || t.id?.startsWith('gen_'));
  }, [customTemplatesList]);

  const displayedFiles = useMemo(() => {
    if (filesFilter === 'templates') return templatesList;
    if (filesFilter === 'generated') return generatedList;
    return customTemplatesList;
  }, [filesFilter, templatesList, generatedList, customTemplatesList]);

  const blankTemplate = useMemo(() => {
    return (templates || []).find((t: any) => t.isBlank || t.id === 'blank_document');
  }, [templates]);

  const isCustomDocxActive = Boolean(
    customDocxTemplate || (activeTemplateId && activeTemplateId !== 'default_table')
  );

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Batch Data Generation Controls */}
      {totalRecordsCount > 0 && isCustomDocxActive && (
        <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Multi-Page Batch Generator</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold theme-info-badge">
              {totalRecordsCount} Records
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
              <span> Generate {totalRecordsCount} Documents </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Scope Validation Status Badge */}
      {activeScopeValidation && isCustomDocxActive && !(customDocxTemplate as any)?.isBlank && customDocxTemplate?.id !== 'blank_document' && (
        <div
          className={`p-3 rounded-xl flex items-start gap-2.5 ${
            activeScopeValidation.isValid
              ? 'theme-success-badge'
              : 'theme-warning-badge'
          }`}
        >
          {activeScopeValidation.isValid ? (
            <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1 text-[11px]">
            <span className="font-bold block">
              {activeScopeValidation.isValid ? 'Scope Blueprint Valid' : 'Missing Blueprint Tokens'}
            </span>
            <p className="leading-tight mt-0.5 opacity-90">
              {activeScopeValidation.validationMessage}
            </p>
          </div>
        </div>
      )}

      {/* 3. Master Document Creation & Library Bar */}
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
                ? 'theme-bg-accent-soft theme-border-accent shadow-xs'
                : 'theme-bg-card theme-border hover:theme-border-accent/40'
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

      {/* 6. Saved Custom Templates & Generated Docs */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
            Scope Templates {customTemplatesList.length > 0 ? `(${customTemplatesList.length})` : ''}
          </span>

          {/* Filter Tabs */}
          {generatedList.length > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setFilesFilter('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filesFilter === 'all'
                    ? 'theme-bg-accent text-white font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilesFilter('templates')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filesFilter === 'templates'
                    ? 'theme-bg-accent text-white font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Templates ({templatesList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilesFilter('generated')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filesFilter === 'generated'
                    ? 'theme-bg-accent text-white font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Filled ({generatedList.length})
              </button>
            </div>
          )}
        </div>

        {customTemplatesList.length > 0 ? (
          <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
            {displayedFiles.length > 0 ? (
              displayedFiles.map((tmpl) => (
                <DocLabTemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  isActive={activeTemplateId === tmpl.id}
                  isScopeDefault={isScopeDefault && activeTemplateId === tmpl.id}
                  onSelect={onSelectTemplate}
                  onEdit={onOpenDocxModal}
                  onDuplicate={onDuplicateDocxTemplate}
                  onDelete={onDeleteDocxTemplate}
                  onToggleScopeDefault={onToggleScopeDefault}
                />
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed theme-border text-center py-6 text-xs theme-text-secondary">
                No templates in this category
              </div>
            )}
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
    </div>
  );
};

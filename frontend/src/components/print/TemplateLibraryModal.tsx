import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Modal, CustomButton, CustomInput, CustomSelect } from '../ui';
import {
  FileIcon,
  CheckCircleIcon,
  SparklesIcon,
  UploadIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  SearchIcon,
  AcademicCapIcon,
  ChartBarIcon,
  IdentificationIcon,
  GridIcon,
  BookOpenIcon,
  AlertTriangleIcon,
} from '../ui/Icons';
import {
  CustomDocxTemplate,
  getSavedDocxTemplates,
  deleteDocxTemplate,
  saveDocxTemplate,
  parseDocxDocument,
} from './docxTemplateEngine';
import {
  ALL_DOCUMENT_SCOPES,
  getDefaultTemplateIdForScope,
  setDefaultTemplateForScope,
  validateTemplateForScope,
  getScopeKeysBlueprint,
  getScopeById,
} from './scopeTemplateStore';
import { DocumentScopeId } from './keyLibrary/types';

export interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: CustomDocxTemplate) => void;
  activeScopeId?: string;
  onScopeChange?: (scopeId: string) => void;
}

/**
 * Enterprise Centralized Template Library Hub & Manager
 * 
 * Allows users and administrators to browse, upload, preview, and set default
 * templates across all system document scopes (Admit Cards, Marksheets, Fee Vouchers, etc.).
 */
export default function TemplateLibraryModal({
  isOpen,
  onClose,
  onApplyTemplate,
  activeScopeId = 'general_document',
  onScopeChange,
}: TemplateLibraryModalProps) {
  const [templates, setTemplates] = useState<CustomDocxTemplate[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>(activeScopeId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scopeDefaults, setScopeDefaults] = useState<Record<string, string>>({});
  const [copiedKeys, setCopiedKeys] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync templates and defaults on modal open
  const reloadData = () => {
    setTemplates(getSavedDocxTemplates());
    const defaultsMap: Record<string, string> = {};
    ALL_DOCUMENT_SCOPES.forEach((s) => {
      const defId = getDefaultTemplateIdForScope(s.id);
      if (defId) defaultsMap[s.id] = defId;
    });
    setScopeDefaults(defaultsMap);
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      if (activeScopeId) {
        setSelectedScope(activeScopeId);
      }
    }
  }, [isOpen, activeScopeId]);

  // Categories list
  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'All Templates' },
      { id: 'Examination', label: 'Examination & Results' },
      { id: 'Academic', label: 'Academic & Studies' },
      { id: 'Financial', label: 'Financial & Fees' },
      { id: 'Certificates', label: 'Certificates & Testimonials' },
      { id: 'Staff', label: 'Staff Management' },
      { id: 'General', label: 'General Documents' },
    ];
  }, []);

  // Filtered scopes based on selected category
  const filteredScopes = useMemo(() => {
    if (selectedCategory === 'all') return ALL_DOCUMENT_SCOPES;
    return ALL_DOCUMENT_SCOPES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  // Scope blueprint for current selection
  const currentScopeBlueprint = useMemo(() => {
    if (selectedScope === 'all') return null;
    return getScopeKeysBlueprint(selectedScope);
  }, [selectedScope]);

  // Filtered templates based on scope, category, and search query
  const filteredTemplates = useMemo(() => {
    const list = templates.filter((tmpl) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tmpl.name.toLowerCase().includes(q);
        const matchesDesc = (tmpl.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      // 2. Scope Filter
      if (selectedScope !== 'all') {
        const tmplScope = (tmpl as any).scopeId || 'general_document';
        if (tmplScope !== selectedScope) return false;
      } else if (selectedCategory !== 'all') {
        const scopeDef = ALL_DOCUMENT_SCOPES.find((s) => s.id === (tmpl as any).scopeId);
        if (scopeDef && scopeDef.category !== selectedCategory) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const nameA = String(a.name || a.id || '').trim().toLowerCase();
      const nameB = String(b.name || b.id || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [templates, selectedScope, selectedCategory, searchQuery]);

  // Handle setting a template as default for its scope
  const handleToggleDefault = (tmpl: CustomDocxTemplate) => {
    const scopeId = (tmpl as any).scopeId || selectedScope || 'general_document';
    const currentDefault = scopeDefaults[scopeId];

    if (currentDefault === tmpl.id) {
      // Unset default
      setDefaultTemplateForScope(scopeId, null);
      setScopeDefaults((prev) => {
        const next = { ...prev };
        delete next[scopeId];
        return next;
      });
    } else {
      setDefaultTemplateForScope(scopeId, tmpl.id);
      setScopeDefaults((prev) => ({ ...prev, [scopeId]: tmpl.id }));
    }
  };

  // Handle direct file upload (.docx)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const buffer = await file.arrayBuffer();
      const parseResult = await parseDocxDocument(buffer);

      const templateName = file.name.replace(/\.[^/.]+$/, '');
      const targetScope = selectedScope === 'all' ? 'general_document' : selectedScope;

      const newTemplate: CustomDocxTemplate = {
        id: `docx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: templateName,
        description: `Imported Word template for ${targetScope}`,
        rawHtml: parseResult.html,
        detectedPlaceholders: parseResult.detectedPlaceholders,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTableDocument: parseResult.isTableDocument,
        sampleColumns: parseResult.extractedColumns,
        sampleData: parseResult.extractedRows,
      };

      // Tag template with assigned scope
      (newTemplate as any).scopeId = targetScope;

      saveDocxTemplate(newTemplate);
      reloadData();
    } catch (err: any) {
      console.error('Template upload failed', err);
      setUploadError(err.message || 'Failed to parse Word document template.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle template deletion
  const handleDelete = (tmplId: string, tmplName: string) => {
    if (window.confirm(`Are you sure you want to delete template "${tmplName}"?`)) {
      deleteDocxTemplate(tmplId);
      reloadData();
    }
  };

  // Handle applying template to canvas
  const handleSelectTemplate = (tmpl: CustomDocxTemplate) => {
    onApplyTemplate(tmpl);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Universal Template Library Hub"
      subtitle="Manage, upload, and assign default document templates across all modules"
      size="5xl"
    >
      <div className="space-y-5">
        {/* Category Tabs & Upload Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b theme-border">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedScope('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 shadow-xs'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Upload Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <CustomButton
              variant="primary"
              size="sm"
              icon={UploadIcon}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Ingesting...' : 'Upload Word (.docx)'}
            </CustomButton>
          </div>
        </div>

        {/* Scope Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedScope('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedScope === 'all'
                  ? 'theme-bg-elevated theme-text-primary border theme-border shadow-2xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              All Scopes
            </button>
            {filteredScopes.map((scope) => (
              <button
                key={scope.id}
                type="button"
                onClick={() => setSelectedScope(scope.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedScope === scope.id
                    ? 'theme-bg-elevated theme-text-primary border theme-border shadow-2xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <span>{scope.name}</span>
                {scopeDefaults[scope.id] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Has Default Template" />
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
            />
            <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 theme-text-secondary pointer-events-none" />
          </div>
        </div>

        {/* Scope Blueprint & Mandatory Keys Guide Banner */}
        {currentScopeBlueprint && (
          <div className="p-3.5 rounded-2xl border theme-border theme-bg-sub/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
                <div>
                  <span className="text-xs font-bold theme-text-primary">
                    {currentScopeBlueprint.scope.name} Blueprint:
                  </span>
                  <span className="text-[11px] theme-text-secondary ml-1.5">
                    {currentScopeBlueprint.scope.description}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const text = currentScopeBlueprint.required.map((k) => `{{${k.key}}}`).join('  ');
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                  }
                  setCopiedKeys(true);
                  setTimeout(() => setCopiedKeys(false), 2000);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold theme-bg-elevated hover:theme-bg-sub border theme-border theme-text-primary transition-all cursor-pointer shrink-0"
              >
                {copiedKeys ? 'Copied Required Keys!' : 'Copy Required Keys'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t theme-border">
              <span className="text-[11px] font-bold theme-text-primary">Mandatory Keys:</span>
              {currentScopeBlueprint.required.map((rk) => (
                <button
                  key={rk.key}
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(`{{${rk.key}}}`);
                    }
                  }}
                  title={`Click to copy {{${rk.key}}}`}
                  className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold theme-bg-accent/10 theme-accent border border-[var(--accent-main)]/20 hover:border-[var(--accent-main)] cursor-pointer"
                >
                  {`{{${rk.key}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs font-medium">
            {uploadError}
          </div>
        )}

        {/* Templates Grid Cards */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {filteredTemplates.map((tmpl) => {
              const tmplScopeId = (tmpl as any).scopeId || 'general_document';
              const scopeDef = ALL_DOCUMENT_SCOPES.find((s) => s.id === tmplScopeId);
              const isDefault = scopeDefaults[tmplScopeId] === tmpl.id;
              const validation = validateTemplateForScope(tmpl, tmplScopeId);

              return (
                <div
                  key={tmpl.id}
                  className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-4 theme-card relative group hover:shadow-md ${
                    isDefault ? 'border-[var(--accent-main)] ring-1 ring-[var(--accent-main)]/30' : 'theme-border hover:theme-border'
                  }`}
                >
                  {/* Top: Header info & Default Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold theme-text-primary truncate" title={tmpl.name}>
                            {tmpl.name}
                          </h4>
                          <span className="text-[10px] theme-text-secondary font-medium">
                            {scopeDef?.name || 'General Document'}
                          </span>
                        </div>
                      </div>

                      {isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                          <CheckCircleIcon className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>

                    <p className="text-xs theme-text-secondary line-clamp-2 leading-relaxed">
                      {tmpl.description || 'Custom Word document template with dynamic placeholders.'}
                    </p>

                    {/* Scope Compliance Badge */}
                    <div className="mt-2.5">
                      {validation.isValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircleIcon className="w-3 h-3" />
                          100% Scope Qualified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20" title={validation.validationMessage}>
                          <AlertTriangleIcon className="w-3 h-3" />
                          <span>Missing {validation.missingRequiredKeys.length} keys ({validation.matchScore}%)</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] theme-text-secondary">
                      <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border font-mono text-[10px]">
                        {tmpl.detectedPlaceholders?.length || 0} Placeholders
                      </span>
                      {tmpl.isTableDocument && (
                        <span className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border text-[10px]">
                          Table Enabled
                        </span>
                      )}
                      <span className="text-[10px]">
                        {new Date(tmpl.updatedAt || tmpl.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t theme-border">
                    <button
                      type="button"
                      onClick={() => handleToggleDefault(tmpl)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isDefault
                          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                      }`}
                      title="Set this template as the default for its scope"
                    >
                      {isDefault ? 'Default for Scope' : 'Set as Default'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(tmpl.id, tmpl.name)}
                        className="p-1.5 rounded-lg theme-text-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete template"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>

                      <CustomButton
                        variant="primary"
                        size="xs"
                        onClick={() => handleSelectTemplate(tmpl)}
                      >
                        Use Template
                      </CustomButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed theme-border rounded-2xl p-6">
            <div className="w-12 h-12 rounded-2xl theme-bg-sub flex items-center justify-center theme-text-secondary mb-3">
              <FileIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold theme-text-primary mb-1">No Templates Found</h4>
            <p className="text-xs theme-text-secondary max-w-sm mb-4">
              {searchQuery
                ? 'No templates match your search query.'
                : `No templates uploaded for "${selectedScope === 'all' ? selectedCategory : selectedScope}". Upload a Word (.docx) file to get started.`}
            </p>
            <CustomButton
              variant="outline"
              size="sm"
              icon={UploadIcon}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Template (.docx)
            </CustomButton>
          </div>
        )}
      </div>
    </Modal>
  );
}

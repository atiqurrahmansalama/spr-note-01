import React, { useState, useMemo } from 'react';
import RightSidebarPanel from '../ui/RightSidebarPanel';
import DrawerContainer, { DrawerSection } from '../layout/DrawerContainer';
import CustomCheckbox from '../ui/CustomCheckbox';
import CustomSelect from '../ui/CustomSelect';
import CustomInput from '../ui/CustomInput';
import KeyPaletteExplorer from './KeyPaletteExplorer';
import {
  PRINT_ORIENTATION_OPTIONS,
  PRINT_PAPER_SIZE_OPTIONS,
  PRINT_MARGIN_OPTIONS,
  PRINT_DENSITY_OPTIONS,
  PRINT_COLOR_MODE_OPTIONS,
  PRINT_SIGNATURE_STYLE_OPTIONS,
} from '../../stores/printStore';
import {
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  CheckIcon,
  AlertTriangleIcon,
  ChevronIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
  FileIcon,
  GroupsIcon,
  SessionsIcon,
  SparklesIcon,
  BookOpenIcon,
  AcademicCapIcon,
  StarIcon,
  DuplicateIcon,
} from '../ui/Icons';
import { getScopeById, validateTemplateForScope, getDefaultTemplateIdForScope } from './scopeTemplateStore';

/**
 * PrintConfigSidebar
 * Project-standard Right Sidebar Panel for document presets, key library, page layout, and signatures.
 * Built with DrawerContainer, DrawerSection, and responsive container queries.
 */
export default function PrintConfigSidebar({
  options = {},
  onOptionsChange,
  templates = [],
  customDocxTemplate = null,
  activeTemplateId = null,
  onTemplateChange,
  onOpenDocxModal = null,
  onOpenTemplateLibrary = null,
  onDeleteDocxTemplate = null,
  onSaveCurrentTemplate = null,
  onDuplicateDocxTemplate = null,
  onSetScopeDefault = null,
  scopeId = 'general_document',
  scopeName = '',
  scopeDescription = '',
  placeholderKeys = [],
  requiredKeys = [],
  onToggleScopeDefault = null,
  isScopeDefault = false,
  onInsertKey = null,
  activeRecord = {},
  docxRenderMode = 'template',
  onDocxRenderModeChange = null,
  totalRecordsCount = 0,
  onResetDefaults,
  onClose,
  width,
  isResizing = false,
  onStartResize,
  onResetResize,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'keys' | 'layout' | 'signatures'
  const [isEditSignaturesOpen, setIsEditSignaturesOpen] = useState(false);
  const [expandedSigIds, setExpandedSigIds] = useState([]);
  const [isSaveInputOpen, setIsSaveInputOpen] = useState(false);
  const [saveDocType, setSaveDocType] = useState('template'); // 'template' | 'generated'
  const [filesFilter, setFilesFilter] = useState('all'); // 'all' | 'templates' | 'generated'
  const [customTemplateName, setCustomTemplateName] = useState('');

  const scopeDefinition = useMemo(() => {
    const baseline = getScopeById(scopeId) || {
      id: scopeId || 'general_document',
      name: scopeName || 'Document Scope',
      category: 'Document',
      description: scopeDescription || 'Dynamic print template and field blueprint.',
      requiredKeys: [],
      recommendedKeys: [],
      defaultKeys: [],
    };

    let dynamicRequiredKeys = Array.isArray(requiredKeys) && requiredKeys.length > 0 ? requiredKeys : [];
    if (dynamicRequiredKeys.length === 0 && Array.isArray(placeholderKeys) && placeholderKeys.length > 0) {
      const explicitRequired = placeholderKeys.filter((k) => k.required || k.isMandatory).map((k) => k.key);
      dynamicRequiredKeys = explicitRequired.length > 0 ? explicitRequired : (baseline.requiredKeys || []);
    }
    if (dynamicRequiredKeys.length === 0) {
      dynamicRequiredKeys = baseline.requiredKeys || [];
    }

    return {
      ...baseline,
      name: scopeName || baseline.name,
      description: scopeDescription || baseline.description,
      requiredKeys: dynamicRequiredKeys,
      placeholderKeys: placeholderKeys || [],
    };
  }, [scopeId, scopeName, scopeDescription, requiredKeys, placeholderKeys]);

  const activeScopeValidation = useMemo(() => {
    if (!scopeDefinition || !customDocxTemplate) return null;
    return validateTemplateForScope(customDocxTemplate, scopeDefinition);
  }, [scopeDefinition, customDocxTemplate]);

  const customTemplatesList = useMemo(() => {
    return (templates || []).filter((t) => {
      if (t.isTable || t.id === 'default_table' || t.isBlank || t.id === 'blank_document' || t.id === 'default_layout') {
        return false;
      }
      const tScope = t.scopeId || t.templateMeta?.scopeId || 'general_document';
      if (scopeId && scopeId !== 'general_document') {
        return tScope === scopeId;
      }
      return true;
    });
  }, [templates, scopeId]);

  const templatesList = useMemo(() => {
    return customTemplatesList.filter((t) => t.templateType !== 'generated' && !t.id?.startsWith('gen_'));
  }, [customTemplatesList]);

  const generatedList = useMemo(() => {
    return customTemplatesList.filter((t) => t.templateType === 'generated' || t.id?.startsWith('gen_'));
  }, [customTemplatesList]);

  const displayedFiles = useMemo(() => {
    if (filesFilter === 'templates') return templatesList;
    if (filesFilter === 'generated') return generatedList;
    return customTemplatesList;
  }, [filesFilter, templatesList, generatedList, customTemplatesList]);

  const blankTemplate = useMemo(() => {
    return (templates || []).find((t) => t.isBlank || t.id === 'blank_document');
  }, [templates]);

  const isCustomDocxActive = Boolean(
    customDocxTemplate ||
    (activeTemplateId && activeTemplateId !== 'default_table')
  );

  const updateOption = (key, value) => {
    if (onOptionsChange) {
      onOptionsChange({
        ...options,
        [key]: value,
      });
    }
  };

  // Signatures handlers
  const addSignatureLine = () => {
    const current = options.signatureLines || [];
    if (current.length >= 6) return;
    const newId = `sig_${Date.now()}`;
    const newLines = [
      ...current,
      {
        id: newId,
        label: `Authority #${current.length + 1}`,
        sub: 'Authorized Signature',
        placeholder: 'SEAL & SIGN',
        align: 'center',
        enabled: true,
      },
    ];
    updateOption('signatureLines', newLines);
    setExpandedSigIds((prev) => [...prev, newId]);
  };

  const removeSignatureLine = (idOrIndex) => {
    const current = options.signatureLines || [];
    const newLines = typeof idOrIndex === 'string'
      ? current.filter((sig) => sig.id !== idOrIndex)
      : current.filter((_, i) => i !== idOrIndex);
    updateOption('signatureLines', newLines);
    if (typeof idOrIndex === 'string') {
      setExpandedSigIds((prev) => prev.filter((id) => id !== idOrIndex));
    }
  };

  const toggleSigExpand = (id) => {
    setExpandedSigIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderDataGenerationCard = () => {
    if (totalRecordsCount <= 0 || !isCustomDocxActive) return null;
    return (
      <div className="p-3 rounded-xl border theme-border theme-bg-sub/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
            <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Data Generation</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {totalRecordsCount} Records Available
          </span>
        </div>

        <p className="text-[11px] theme-text-secondary leading-tight">
          Edit the template with placeholder keys or generate filled documents for all records.
        </p>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl theme-bg-elevated border theme-border">
          <button
            type="button"
            onClick={() => onDocxRenderModeChange?.('template')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              docxRenderMode === 'template'
                ? 'theme-bg-accent-soft theme-accent shadow-2xs font-bold'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
            title="Show and edit template with placeholder keys (1 Page)"
          >
            Template (Keys)
          </button>
          <button
            type="button"
            onClick={() => onDocxRenderModeChange?.('all')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
              docxRenderMode === 'all'
                ? 'theme-bg-accent text-white shadow-xs font-bold'
                : 'theme-text-secondary hover:theme-text-primary'
            }`}
            title={`Generate all ${totalRecordsCount} pages`}
          >
            <span>All Records</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {totalRecordsCount}
            </span>
          </button>
        </div>

        {docxRenderMode === 'template' ? (
          <button
            type="button"
            onClick={() => onDocxRenderModeChange?.('all')}
            className="w-full py-2 px-3 rounded-xl theme-bg-accent text-white font-semibold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Generate with All {totalRecordsCount} Records</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onDocxRenderModeChange?.('template')}
              className="w-full py-1.5 px-3 rounded-xl border theme-border theme-bg-elevated hover:theme-bg-sub theme-text-primary font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Back to Template (Keys) Editor</span>
            </button>

            {onSaveCurrentTemplate && (
              <button
                type="button"
                onClick={() => {
                  setSaveDocType('generated');
                  setCustomTemplateName(`${scopeDefinition.name} — Generated (${totalRecordsCount} Records)`);
                  setIsSaveInputOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-indigo-500/20 shadow-2xs"
              >
                <FileIcon className="w-3.5 h-3.5" />
                <span>Save Generated Document ({totalRecordsCount} Records)</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <RightSidebarPanel
      title="Print & Layout Studio"
      category="Studio"
      width={width}
      isResizing={isResizing}
      onStartResize={onStartResize}
      onResetResize={onResetResize}
      onClose={onClose}
      className={className}
      footer={
        onResetDefaults ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all print preferences and custom settings back to default?')) {
                onResetDefaults();
              }
            }}
            className="w-full py-2 px-3 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
          >
            Reset Settings to Default
          </button>
        ) : null
      }
    >
      <DrawerContainer padding="none" spacing="normal" className="pb-10 @[480px]:pb-12">
        {/* Studio Navigation Tabs */}
        <div className="pt-1 pb-1">
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl theme-bg-sub border theme-border">
            {[
              { id: 'presets', label: 'Presets' },
              { id: 'keys', label: 'Keys' },
              { id: 'layout', label: 'Layout' },
              { id: 'signatures', label: 'Sign' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-1 text-[11px] font-semibold rounded-lg transition-all text-center cursor-pointer truncate ${
                  activeTab === tab.id
                    ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                    : 'theme-text-secondary hover:theme-text-primary border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Presets, Template Library & Scope Defaults */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <DrawerSection
              icon={FileIcon}
              title="Document Modes & Templates"
            >
              {/* Scope & Default Template Assignment Card */}
              {scopeDefinition && (
                <div className="p-3 rounded-xl border theme-border theme-bg-sub/50 space-y-2.5 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AcademicCapIcon className="w-4 h-4 theme-accent shrink-0" />
                      <span className="text-xs font-bold theme-text-primary truncate">
                        Scope: {scopeDefinition.name}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-medium theme-bg-elevated theme-text-secondary border theme-border">
                      {scopeDefinition.category}
                    </span>
                  </div>

                  <p className="text-[11px] theme-text-secondary leading-relaxed">
                    {scopeDefinition.description}
                  </p>

                  {/* Mandatory Scope Keys Blueprint */}
                  {scopeDefinition.requiredKeys && scopeDefinition.requiredKeys.length > 0 && (
                    <div className="pt-2 border-t theme-border space-y-1.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10.5px] font-bold theme-text-primary flex items-center gap-1">
                            <span>Required Keys for:</span>
                            <span className="theme-accent font-bold">{scopeDefinition.name}</span>
                          </span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                            {scopeDefinition.requiredKeys.length} Keys
                          </span>
                        </div>
                        {customDocxTemplate?.name && (
                          <div className="text-[10px] theme-text-secondary truncate">
                            Target File: <span className="font-semibold theme-text-primary">{customDocxTemplate.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Keys with matched vs missing indicator */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {scopeDefinition.requiredKeys.map((k) => {
                          const isMatched = activeScopeValidation?.matchedRequiredKeys?.includes(k);
                          return (
                            <button
                              key={k}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => onInsertKey?.(`{{${k}}}`)}
                              title={
                                isMatched
                                  ? `{{${k}}} is present in this template (Click to insert again)`
                                  : `Click to insert missing {{${k}}} into ${scopeDefinition.name}`
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${
                                isMatched
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:border-rose-500 animate-pulse'
                              }`}
                            >
                              <span>{`{{${k}}}`}</span>
                              {isMatched ? <CheckIcon className="w-2.5 h-2.5" /> : <AlertTriangleIcon className="w-2.5 h-2.5" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Live Validation Summary */}
                      {activeScopeValidation && (
                        <div className="flex items-center justify-between text-[10.5px] pt-1">
                          <span className="theme-text-secondary">Scope Compliance:</span>
                          {activeScopeValidation.isValid ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              <span>100% Ready (All Keys Present)</span>
                            </span>
                          ) : (
                            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <AlertTriangleIcon className="w-3.5 h-3.5" />
                              <span>{activeScopeValidation.missingRequiredKeys.length} Required Key(s) Missing</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Save / Name Box */}
                  {isSaveInputOpen ? (
                    <div className="pt-2 border-t theme-border space-y-2">
                      <div className="text-[11px] font-bold theme-text-primary flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                        <span>
                          {saveDocType === 'generated'
                            ? `Save Generated Document (${totalRecordsCount} Records)`
                            : 'Save Active Canvas as Template (Keys)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customTemplateName}
                          onChange={(e) => setCustomTemplateName(e.target.value)}
                          placeholder={
                            saveDocType === 'generated'
                              ? `${scopeDefinition.name} — Generated (${totalRecordsCount} Records)`
                              : `e.g., ${scopeDefinition.name} Official 2026`
                          }
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && onSaveCurrentTemplate) {
                              onSaveCurrentTemplate(customTemplateName, saveDocType);
                              setIsSaveInputOpen(false);
                              setCustomTemplateName('');
                            } else if (e.key === 'Escape') {
                              setIsSaveInputOpen(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (onSaveCurrentTemplate) {
                              onSaveCurrentTemplate(customTemplateName, saveDocType);
                              setIsSaveInputOpen(false);
                              setCustomTemplateName('');
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold theme-bg-accent text-white hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSaveInputOpen(false);
                            setCustomTemplateName('');
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold theme-text-secondary hover:theme-text-primary border theme-border hover:theme-bg-sub transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t theme-border space-y-2">
                      {/* Action Row: Save as Reusable Template & Set Active as Default */}
                      {onSaveCurrentTemplate && (
                        <button
                          type="button"
                          onClick={() => {
                            setSaveDocType('template');
                            setCustomTemplateName(customDocxTemplate?.name || `${scopeDefinition.name} Template`);
                            setIsSaveInputOpen(true);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold border theme-border theme-text-primary hover:theme-accent hover:border-[var(--accent-main)] theme-bg-surface hover:theme-bg-elevated transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                          <span>Save Canvas as Template (Keys Blueprint)</span>
                        </button>
                      )}

                      {onToggleScopeDefault && activeTemplateId && (
                        <button
                          type="button"
                          onClick={onToggleScopeDefault}
                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isScopeDefault
                              ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
                              : activeScopeValidation?.isValid === false
                              ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                              : 'theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                          }`}
                        >
                          {isScopeDefault ? (
                            <StarIcon className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                          ) : (
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isScopeDefault
                              ? `Default Template for ${scopeDefinition.name}`
                              : activeScopeValidation?.isValid === false
                              ? `Set Active as Scope Default (${activeScopeValidation.missingRequiredKeys.length} Missing)`
                              : 'Set Active as Scope Default'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Data Merging & Multi-page Generation Controls */}
              {renderDataGenerationCard()}

              {/* Saved Templates & Files Section (Custom Scope Documents) */}
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <FileIcon className="w-3.5 h-3.5 theme-accent" />
                    <span>Saved Templates &amp; Files</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md theme-bg-sub theme-text-secondary font-semibold">
                    {customTemplatesList.length} Files
                  </span>
                </div>

                {/* Filter Tabs: All / Templates (Keys) / Generated Docs */}
                {customTemplatesList.length > 0 && (
                  <div className="flex items-center gap-1 p-0.5 rounded-lg theme-bg-sub border theme-border">
                    {[
                      { id: 'all', label: `All (${customTemplatesList.length})` },
                      { id: 'templates', label: `Templates (${templatesList.length})` },
                      { id: 'generated', label: `Generated (${generatedList.length})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilesFilter(f.id)}
                        className={`flex-1 py-1 px-1.5 text-[10px] font-semibold rounded-md transition-all text-center cursor-pointer truncate ${
                          filesFilter === f.id
                            ? 'theme-bg-elevated theme-text-primary shadow-xs border theme-border'
                            : 'theme-text-secondary hover:theme-text-primary border border-transparent'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Blank Canvas Option (Shown when all or templates filter is active) */}
                {blankTemplate && filesFilter !== 'generated' && (
                  <div
                    onClick={() => onTemplateChange?.(blankTemplate.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      activeTemplateId === blankTemplate.id
                        ? 'border-[var(--accent-main)] theme-bg-accent-soft theme-text-primary shadow-2xs'
                        : 'theme-border hover:theme-bg-sub theme-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg theme-bg-surface border theme-border flex items-center justify-center theme-accent shrink-0">
                        <EditIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold theme-text-primary truncate">Blank Page (Live Canvas)</div>
                        <div className="text-[10px] theme-text-secondary truncate">Interactive layout &amp; custom formatting</div>
                      </div>
                    </div>
                    {activeTemplateId === blankTemplate.id && (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                )}

                {/* Custom Saved Files List */}
                {displayedFiles.length > 0 ? (
                  <div className="space-y-1.5">
                    {displayedFiles.map((tmpl) => {
                      const isGenerated = tmpl.templateType === 'generated' || tmpl.id?.startsWith('gen_');
                      const isActive = activeTemplateId === tmpl.id || customDocxTemplate?.id === tmpl.id;
                      const isDefault = getDefaultTemplateIdForScope(scopeId) === tmpl.id;
                      const val = validateTemplateForScope(tmpl, scopeId);

                      return (
                        <div
                          key={tmpl.id}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                            isActive
                              ? 'border-[var(--accent-main)] theme-bg-accent-soft theme-text-primary shadow-2xs'
                              : 'theme-border hover:theme-bg-sub/60 theme-text-secondary'
                          }`}
                        >
                          {/* Top File Row: Icon, Title & Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onTemplateChange?.(tmpl.id)}
                              className="flex items-start gap-2 min-w-0 flex-1 text-left cursor-pointer group"
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isGenerated
                                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                    : tmpl.isWordDocx
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                <FileIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 truncate flex-1">
                                <div className="text-xs font-bold theme-text-primary group-hover:theme-accent transition-colors truncate">
                                  {tmpl.name}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {isGenerated ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                                      Generated ({tmpl.recordsCount || 'All'} Records)
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                      Template (Keys)
                                    </span>
                                  )}
                                  {tmpl.isWordDocx && !isGenerated && (
                                    <span className="text-[9px] font-mono font-bold px-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                      DOCX
                                    </span>
                                  )}
                                  {isDefault && !isGenerated && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                      <StarIcon className="w-2.5 h-2.5 fill-current" />
                                      Default
                                    </span>
                                  )}
                                  {isActive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Action Toolbar on File Card */}
                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                              {!isGenerated && onSetScopeDefault && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSetScopeDefault(isDefault ? null : tmpl.id);
                                  }}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    isDefault
                                      ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                                      : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                                  }`}
                                  title={isDefault ? 'Current default for scope (Click to unset)' : 'Set as default template for scope'}
                                >
                                  <StarIcon className={`w-3.5 h-3.5 ${isDefault ? 'fill-current' : ''}`} />
                                </button>
                              )}

                              {onDuplicateDocxTemplate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateDocxTemplate(tmpl.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-500/10 transition-colors cursor-pointer"
                                  title="Duplicate file"
                                >
                                  <DuplicateIcon className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onDeleteDocxTemplate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete "${tmpl.name}"?`)) {
                                      onDeleteDocxTemplate(tmpl.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Delete file"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Bottom Compliance & Scope Bar */}
                          <div className="pt-1.5 border-t theme-border flex items-center justify-between text-[10px] theme-text-secondary">
                            <span className="truncate">
                              Scope: <span className="font-semibold theme-text-primary">{scopeDefinition.name}</span>
                            </span>
                            {isGenerated ? (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0">
                                <CheckCircleIcon className="w-3 h-3" />
                                <span>Finished Document</span>
                              </span>
                            ) : val.isValid ? (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                                <CheckCircleIcon className="w-3 h-3" />
                                <span>100% Ready</span>
                              </span>
                            ) : (
                              <span className="font-semibold text-rose-500 flex items-center gap-1 shrink-0">
                                <AlertTriangleIcon className="w-3 h-3" />
                                <span>{val.missingRequiredKeys.length} Missing</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-dashed theme-border flex flex-col items-center justify-center text-center space-y-2 theme-bg-sub/30">
                    <div className="w-9 h-9 rounded-xl theme-bg-elevated border theme-border flex items-center justify-center theme-text-secondary shadow-2xs">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold theme-text-primary text-center">
                      {filesFilter === 'generated'
                        ? 'No Generated Documents Saved Yet'
                        : filesFilter === 'templates'
                        ? 'No Custom Templates Saved Yet'
                        : 'No Saved Files for this Scope'}
                    </div>
                    <div className="text-[11px] theme-text-secondary max-w-xs mx-auto leading-relaxed text-center">
                      {filesFilter === 'generated'
                        ? 'Generate pages with all records above and click "Save Generated Document" to keep finished files.'
                        : 'Customize the canvas with placeholder keys and click "Save Canvas as Template" to keep blueprints.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Template Library Hub & Word Upload */}
              <div className="pt-2 border-t theme-border mt-3 space-y-2">
                {onOpenTemplateLibrary && (
                  <button
                    type="button"
                    onClick={onOpenTemplateLibrary}
                    className="w-full py-2 px-3 rounded-xl border theme-border theme-text-primary hover:theme-accent hover:border-[var(--accent-main)] theme-bg-elevated hover:theme-bg-sub transition-all text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <BookOpenIcon className="w-3.5 h-3.5" />
                    <span>Open Template Library Hub</span>
                  </button>
                )}

                {onOpenDocxModal && (
                  <button
                    type="button"
                    onClick={onOpenDocxModal}
                    className="w-full py-2 px-3 rounded-xl border border-dashed theme-border theme-text-secondary hover:theme-accent hover:border-[var(--accent-main)] theme-bg-sub/40 hover:theme-bg-sub transition-all text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Upload Word Template (.docx)</span>
                  </button>
                )}
              </div>
            </DrawerSection>
          </div>
        )}

        {/* TAB 2: Dynamic Key Library Explorer */}
        {activeTab === 'keys' && (
          <div className="space-y-3">
            {renderDataGenerationCard()}

            {/* Scope Recommended Keys Banner */}
            {scopeDefinition?.requiredKeys && scopeDefinition.requiredKeys.length > 0 && (
              <div className="p-3 rounded-xl border theme-border theme-bg-sub/60 space-y-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold theme-text-primary flex items-center gap-1">
                      <span>Recommended Keys for:</span>
                      <span className="theme-accent font-bold">{scopeDefinition.name}</span>
                    </span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                      {scopeDefinition.requiredKeys.length} Keys
                    </span>
                  </div>
                  {customDocxTemplate?.name && (
                    <div className="text-[10px] theme-text-secondary truncate">
                      Target File: <span className="font-semibold theme-text-primary">{customDocxTemplate.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {scopeDefinition.requiredKeys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onInsertKey?.(`{{${k}}}`)}
                      title={`Click to insert {{${k}}} into ${scopeDefinition.name}`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:border-blue-500 cursor-pointer transition-all active:scale-95"
                    >
                      {`{{${k}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DrawerSection
              icon={SparklesIcon}
              title="Data Key Library & Taxonomy"
            >
              <KeyPaletteExplorer
                onInsertKey={onInsertKey}
                activeRecord={activeRecord}
                placeholderKeys={placeholderKeys}
              />
            </DrawerSection>
          </div>
        )}

        {/* TAB 3: Layout & Paper Settings */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            {/* Section 1: Paper & Geometry */}
            <DrawerSection
              icon={AdjustmentsHorizontalIcon}
              title="Paper & Geometry"
            >
              <div className="grid grid-cols-1 @[360px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Paper Size"
                  value={options.pageSize || 'A4'}
                  options={PRINT_PAPER_SIZE_OPTIONS}
                  onChange={(val) => updateOption('pageSize', val)}
                  size="sm"
                />

                <CustomSelect
                  label="Orientation"
                  value={options.orientation || 'PORTRAIT'}
                  options={PRINT_ORIENTATION_OPTIONS}
                  onChange={(val) => updateOption('orientation', val)}
                  size="sm"
                />
              </div>

              <div className="pt-2 border-t theme-border">
                <CustomCheckbox
                  checked={options.enablePageBreak !== false}
                  onChange={(val) => updateOption('enablePageBreak', val)}
                  label="Auto Page Break (Multi-Page)"
                  description="Automatically split long documents into multiple pages"
                  size="sm"
                />
              </div>
            </DrawerSection>

            {/* Section 2: Print & Spacing */}
            <DrawerSection
              icon={AdjustmentsHorizontalIcon}
              title="Print & Spacing"
            >
              <div className="grid grid-cols-1 @[360px]:grid-cols-2 gap-3">
                <CustomSelect
                  label="Margins"
                  value={options.margin || 'NORMAL'}
                  options={PRINT_MARGIN_OPTIONS}
                  onChange={(val) => updateOption('margin', val)}
                  size="sm"
                />

                <CustomSelect
                  label="Print Output Mode"
                  value={options.colorMode || 'FULL_COLOR'}
                  options={PRINT_COLOR_MODE_OPTIONS}
                  onChange={(val) => updateOption('colorMode', val)}
                  size="sm"
                />
              </div>

              <CustomSelect
                label="Content Density"
                value={options.density || 'NORMAL'}
                options={PRINT_DENSITY_OPTIONS}
                onChange={(val) => updateOption('density', val)}
                size="sm"
              />
            </DrawerSection>
          </div>
        )}

        {/* TAB 4: Signatures & Approvals */}
        {activeTab === 'signatures' && (
          <div className="space-y-4">
            {/* Section 1: Signatures Control & Sub Checkboxes */}
            <DrawerSection
              icon={SessionsIcon}
              title="Signature Block"
            >
              <div className="space-y-2.5">
                <CustomCheckbox
                  checked={options.showSignatures !== false}
                  onChange={(val) => updateOption('showSignatures', val)}
                  label="Enable Bottom Signature Block"
                  size="sm"
                />

                {/* Sub-checkboxes for individual saved signature lines */}
                {options.showSignatures !== false && (options.signatureLines || []).length > 0 && (
                  <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5 @[420px]:gap-3 pl-6 animate-fade-in">
                    {(options.signatureLines || []).map((sig, sIdx) => (
                      <CustomCheckbox
                        key={sig.id || `sig_line_${sIdx}`}
                        checked={sig.enabled !== false}
                        onChange={(val) => {
                          const newLines = [...(options.signatureLines || [])];
                          newLines[sIdx] = { ...newLines[sIdx], enabled: val };
                          updateOption('signatureLines', newLines);
                        }}
                        label={sig.label || `Signatory #${sIdx + 1}`}
                        size="sm"
                      />
                    ))}
                  </div>
                )}

                {options.showSignatures !== false && (
                  <div className="pt-1">
                    <CustomSelect
                      label="Line Style"
                      value={options.signatureStyle || 'SOLID'}
                      options={PRINT_SIGNATURE_STYLE_OPTIONS}
                      onChange={(val) => updateOption('signatureStyle', val)}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </DrawerSection>

            {/* Section 2: Signatory Designations & Details */}
            {options.showSignatures !== false && (
              <DrawerSection
                icon={GroupsIcon}
                title="Signatory Designations"
              >
                <div className="space-y-3">
                  {/* Expandable Trigger Box */}
                  <button
                    type="button"
                    onClick={() => setIsEditSignaturesOpen((prev) => !prev)}
                    className="w-full p-2.5 rounded-xl border theme-border theme-bg-sub/50 hover:theme-bg-sub transition-all cursor-pointer flex items-center justify-between group select-none shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg theme-bg-surface border theme-border flex items-center justify-center theme-accent shrink-0 shadow-2xs">
                        <EditIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold theme-text-primary group-hover:theme-accent transition-colors">
                        Edit Signatures
                      </span>
                      {(options.signatureLines || []).length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-bg-elevated border theme-border theme-text-secondary font-mono">
                          {(options.signatureLines || []).length}
                        </span>
                      )}
                    </div>
                    <ChevronIcon
                      isOpen={isEditSignaturesOpen}
                      className="w-3.5 h-3.5 theme-text-secondary group-hover:theme-text-primary"
                    />
                  </button>

                  {/* Expanded Signatory Form Fields */}
                  {isEditSignaturesOpen && (
                    <div className="space-y-2.5 pt-1 animate-fade-in">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-semibold theme-text-secondary">
                          Signatures ({(options.signatureLines || []).length})
                        </span>
                        {(options.signatureLines || []).length < 6 && (
                          <button
                            type="button"
                            onClick={addSignatureLine}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-surface border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                          >
                            <PlusIcon className="w-3 h-3" />
                            Add
                          </button>
                        )}
                      </div>

                      {(!options.signatureLines || options.signatureLines.length === 0) ? (
                        <div className="p-4 rounded-xl border border-dashed theme-border text-center space-y-2">
                          <p className="text-xs theme-text-secondary">No signature lines configured.</p>
                          <button
                            type="button"
                            onClick={addSignatureLine}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold theme-bg-accent text-white hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Add First Signatory
                          </button>
                        </div>
                      ) : (
                        options.signatureLines.map((sig, sIdx) => {
                          const sigId = sig.id || `sig_line_${sIdx}`;
                          const isExpanded = expandedSigIds.includes(sigId);

                          return (
                            <div
                              key={sigId}
                              className={`rounded-xl border transition-all overflow-hidden ${
                                isExpanded
                                  ? 'theme-border theme-bg-elevated shadow-xs'
                                  : sig.enabled !== false
                                  ? 'theme-border theme-bg-sub/40 hover:theme-bg-sub/70'
                                  : 'border-dashed theme-border opacity-60 theme-bg-sub/30'
                              }`}
                            >
                              {/* Card Summary Header */}
                              <div className="p-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <CustomCheckbox
                                    checked={sig.enabled !== false}
                                    onChange={(val) => {
                                      const newLines = [...(options.signatureLines || [])];
                                      newLines[sIdx] = { ...newLines[sIdx], enabled: val };
                                      updateOption('signatureLines', newLines);
                                    }}
                                    size="sm"
                                  />
                                  <div
                                    onClick={() => toggleSigExpand(sigId)}
                                    className="min-w-0 flex-1 cursor-pointer select-none"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold theme-text-primary truncate">
                                        {sig.label || `Signatory #${sIdx + 1}`}
                                      </p>
                                    </div>
                                    <p className="text-[11px] theme-text-secondary truncate">
                                      {sig.sub || 'No subtitle designated'}
                                    </p>
                                  </div>
                                </div>

                                {/* Actions: Edit & Delete (Hidden when expanded) */}
                                {!isExpanded && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleSigExpand(sigId)}
                                      className="p-1 rounded-lg transition-colors cursor-pointer theme-text-secondary hover:theme-text-primary hover:theme-bg-sub"
                                      title="Edit signature details"
                                      aria-label="Edit signature details"
                                    >
                                      <EditIcon className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => removeSignatureLine(sig.id || sIdx)}
                                      title="Delete signature line"
                                      className="p-1 rounded-lg theme-danger hover:theme-bg-danger-soft transition-colors cursor-pointer"
                                      aria-label="Delete signature line"
                                    >
                                      <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Expanded Edit Inputs */}
                              {isExpanded && (
                                <div className="p-3 border-t theme-border theme-bg-sub/30 space-y-2.5 animate-fade-in">
                                  <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-2.5">
                                    <CustomInput
                                      label="Primary Title / Role"
                                      value={sig.label}
                                      onChange={(val, e) => {
                                        const str = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                                        const newLines = [...(options.signatureLines || [])];
                                        newLines[sIdx] = { ...newLines[sIdx], label: str };
                                        updateOption('signatureLines', newLines);
                                      }}
                                      placeholder="e.g. Prepared By / Tabulator"
                                      size="sm"
                                    />

                                    <CustomInput
                                      label="Subtitle / Designation"
                                      value={sig.sub || ''}
                                      onChange={(val, e) => {
                                        const str = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                                        const newLines = [...(options.signatureLines || [])];
                                        newLines[sIdx] = { ...newLines[sIdx], sub: str };
                                        updateOption('signatureLines', newLines);
                                      }}
                                      placeholder="e.g. Head of Department / Seal"
                                      size="sm"
                                    />
                                  </div>

                                  <CustomInput
                                    label="Stamp Text"
                                    value={sig.placeholder || ''}
                                    onChange={(val, e) => {
                                      const str = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                                      const newLines = [...(options.signatureLines || [])];
                                      newLines[sIdx] = { ...newLines[sIdx], placeholder: str };
                                      updateOption('signatureLines', newLines);
                                    }}
                                    placeholder="e.g. SEAL & SIGN"
                                    size="sm"
                                  />

                                  <div className="flex items-center justify-between pt-1 border-t theme-border">
                                    <button
                                      type="button"
                                      onClick={() => removeSignatureLine(sig.id || sIdx)}
                                      className="text-xs font-medium theme-danger hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <TrashIcon className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleSigExpand(sigId)}
                                      className="px-3 py-1 rounded-lg text-xs font-bold theme-bg-accent text-white hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </DrawerSection>
            )}
          </div>
        )}
      </DrawerContainer>
    </RightSidebarPanel>
  );
}

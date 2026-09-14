import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Modal, CustomButton, CustomInput, CustomSelect, DataTable } from '../ui';
import {
  FileIcon,
  CheckCircleIcon,
  SparklesIcon,
  UploadIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
  SleekCheckIcon,
  EditIcon,
  SearchIcon,
} from '../ui/Icons';
import {
  parseDocxDocument,
  saveDocxTemplate,
  mergeTemplateWithData,
  extractAvailableKeysFromContext,
  DocxParseResult,
  CustomDocxTemplate,
  TemplatePlaceholderKey,
} from './docxTemplateEngine';

export interface DocxTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (result: {
    html: string;
    isTableDocument: boolean;
    columns: Array<{ id: string; header: string; label: string }>;
    data: Array<Record<string, any>>;
    templateMeta?: CustomDocxTemplate;
  }) => void;
  sampleData?: Record<string, any>;
  columns?: Array<{ id: string; header: string; label: string }>;
  metaItems?: Array<{ label: string; value: any }>;
  placeholderKeys?: TemplatePlaceholderKey[];
}

const CUSTOM_USER_KEYS_STORAGE_KEY = 'spr_custom_template_user_keys_v1';

/**
 * Enterprise Word (.docx) Template & Document Ingestion Modal with Dynamic Placeholder Manager
 */
export default function DocxTemplateModal({
  isOpen,
  onClose,
  onApplyTemplate,
  sampleData = {},
  columns = [],
  metaItems = [],
  placeholderKeys = [],
}: DocxTemplateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<DocxParseResult | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'keys' | 'mapping' | 'preview' | 'merge'>('keys');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & category filter for Available Placeholders
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // User-defined custom keys state (Hydrated from localStorage)
  const [customUserKeys, setCustomUserKeys] = useState<TemplatePlaceholderKey[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CUSTOM_USER_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load custom user keys', e);
    }
    return [];
  });

  // New Custom Key Form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isAddingKey, setIsAddingKey] = useState(false);

  // Custom Tag Remapping state: maps detected word placeholder -> target system key or static text
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});

  // Consolidated available keys from module taxonomy, runtime sampleData, columns, meta, and user custom keys
  const availableKeysList = useMemo(() => {
    return extractAvailableKeysFromContext({
      moduleKeys: placeholderKeys,
      sampleData,
      columns,
      metaItems,
      customKeys: customUserKeys,
    });
  }, [placeholderKeys, sampleData, columns, metaItems, customUserKeys]);

  // Handle switching to upload tab when file is chosen or vice-versa
  useEffect(() => {
    if (parseResult && activeTab === 'upload') {
      setActiveTab('merge');
    }
  }, [parseResult]);

  const handleCopyKey = (keyName: string) => {
    const formattedToken = `{{${keyName}}}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formattedToken);
    }
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === keyName ? null : prev));
    }, 1800);
  };

  const handleCopyAllKeys = () => {
    const text = availableKeysList
      .map((k) => `{{${k.key}}}  -  ${k.label}${k.sampleValue ? ` (Sample: ${k.sampleValue})` : ''}`)
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedAll(true);
    setTimeout(() => {
      setCopiedAll(false);
    }, 2000);
  };

  const handleAddCustomKey = () => {
    const cleanKey = newKeyName.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    if (!cleanKey) {
      alert('Please provide a valid key identifier (e.g. center_code).');
      return;
    }

    const newKeyObj: TemplatePlaceholderKey = {
      key: cleanKey,
      label: newKeyLabel.trim() || cleanKey,
      category: 'custom',
      sampleValue: newKeyValue.trim() || `[${cleanKey}]`,
      description: 'Custom user-defined template placeholder',
      isCustom: true,
    };

    const updated = [...customUserKeys.filter((k) => k.key.toLowerCase() !== cleanKey), newKeyObj];
    setCustomUserKeys(updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CUSTOM_USER_KEYS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist custom keys', e);
      }
    }

    setNewKeyName('');
    setNewKeyLabel('');
    setNewKeyValue('');
    setIsAddingKey(false);
  };

  const handleDeleteCustomKey = (keyName: string) => {
    const updated = customUserKeys.filter((k) => k.key.toLowerCase() !== keyName.toLowerCase());
    setCustomUserKeys(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CUSTOM_USER_KEYS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to delete custom key', e);
      }
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    if (!selectedFile || !/\.docx$/i.test(selectedFile.name)) {
      alert('Please upload a valid Microsoft Word (.docx) document.');
      return;
    }

    setFile(selectedFile);
    setTemplateName(selectedFile.name.replace(/\.docx$/i, ''));
    setIsParsing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await parseDocxDocument(arrayBuffer);
      setParseResult(result);
      setActiveTab('merge');
    } catch (err) {
      console.error('Failed to parse docx document', err);
      alert('Failed to parse Word document. Please ensure the file is not corrupted.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Build merged HTML accounting for custom user key values and remappings
  const getProcessedHtml = useMemo(() => {
    if (!parseResult) return '';
    let html = parseResult.html;

    // Apply custom placeholder remappings
    Object.entries(customMappings).forEach(([detectedTag, targetFieldOrValue]) => {
      if (!targetFieldOrValue) return;
      const regex = new RegExp(`\\{\\{\\s*${detectedTag}\\s*\\}\\}|\\{\\s*${detectedTag}\\s*\\}`, 'gi');
      if (targetFieldOrValue.startsWith('{{') && targetFieldOrValue.endsWith('}}')) {
        html = html.replace(regex, targetFieldOrValue);
      } else {
        html = html.replace(regex, `{{${targetFieldOrValue}}}`);
      }
    });

    return html;
  }, [parseResult, customMappings]);

  // Combined sample data merging active context + custom user key values
  const effectiveSampleData = useMemo(() => {
    const data: Record<string, any> = { ...sampleData };
    customUserKeys.forEach((ck) => {
      if (ck.sampleValue !== undefined && !data[ck.key]) {
        data[ck.key] = ck.sampleValue;
      }
    });
    return data;
  }, [sampleData, customUserKeys]);

  const handleApply = (saveAsTemplate = false) => {
    if (!parseResult) return;
    const finalHtml = getProcessedHtml;

    let savedTemplate: CustomDocxTemplate | undefined;
    if (saveAsTemplate) {
      const templateId = `docx_tpl_${Date.now()}`;
      savedTemplate = saveDocxTemplate({
        id: templateId,
        name: templateName.trim() || 'Custom Word Template',
        description: templateDescription.trim(),
        rawHtml: finalHtml,
        detectedPlaceholders: parseResult.detectedPlaceholders,
        isTableDocument: parseResult.isTableDocument,
        sampleColumns: parseResult.extractedColumns,
        sampleData: parseResult.extractedRows,
      });
    }

    onApplyTemplate({
      html: finalHtml,
      isTableDocument: parseResult.isTableDocument,
      columns: parseResult.extractedColumns,
      data: parseResult.extractedRows,
      templateMeta: savedTemplate,
    });

    onClose();
  };

  // Filtered available keys
  const filteredKeys = useMemo(() => {
    return availableKeysList.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCat) return false;
      if (!keySearchQuery.trim()) return true;
      const q = keySearchQuery.toLowerCase();
      return (
        item.key.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        (item.sampleValue && String(item.sampleValue).toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [availableKeysList, selectedCategory, keySearchQuery]);

  // Dynamic categories derived from available active keys
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableKeysList.forEach((k) => {
      if (k.category) set.add(k.category);
    });

    const categoryLabelMap: Record<string, string> = {
      student: 'Student Bio',
      examination: 'Examination',
      logistics: 'Hall & Seating',
      institution: 'Institution',
      academic: 'Academic Data',
      attendance: 'Attendance',
      marks: 'Marks & Results',
      general: 'General Meta',
      custom: `Custom (${customUserKeys.length})`,
    };

    const dynamicPills = Array.from(set).map((catId) => ({
      id: catId,
      label: categoryLabelMap[catId] || catId.charAt(0).toUpperCase() + catId.slice(1),
    }));

    return [
      { id: 'all', label: `All Available Keys (${availableKeysList.length})` },
      ...dynamicPills,
    ];
  }, [availableKeysList, customUserKeys.length]);

  // Dynamic columns definition for the reusable project DataTable
  const keyTableColumns = useMemo(() => [
    {
      key: 'key',
      label: 'Placeholder Token',
      sortable: true,
      render: (_: any, item: TemplatePlaceholderKey) => {
        const isCopied = copiedKey === item.key;
        return (
          <button
            type="button"
            onClick={() => handleCopyKey(item.key)}
            title="Click to copy token into clipboard"
            className={`font-mono text-xs font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              isCopied
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40 shadow-2xs'
                : 'theme-bg-sub theme-text-primary hover:theme-bg-accent-soft hover:theme-accent hover:border-[var(--accent-main)]/50 theme-border'
            }`}
          >
            <span>{`{{${item.key}}}`}</span>
            {isCopied ? (
              <SleekCheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <CopyIcon className="w-3.5 h-3.5 opacity-40 hover:opacity-100 shrink-0" />
            )}
          </button>
        );
      },
    },
    {
      key: 'label',
      label: 'Field Label & Category',
      sortable: true,
      render: (_: any, item: TemplatePlaceholderKey) => (
        <div className="py-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold theme-text-primary text-xs">
              {item.label}
            </span>
            {item.category && item.category !== 'general' && (
              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold theme-bg-sub uppercase tracking-wider theme-text-secondary shrink-0">
                {item.category}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-[11px] theme-text-secondary mt-0.5 line-clamp-1 opacity-80">
              {item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'sampleValue',
      label: 'Live Preview Value',
      sortable: true,
      render: (_: any, item: TemplatePlaceholderKey) => (
        item.sampleValue ? (
          <span className="inline-block font-mono text-xs px-2.5 py-1 rounded-lg theme-bg-sub theme-text-primary border theme-border/60 max-w-full truncate" title={String(item.sampleValue)}>
            {String(item.sampleValue)}
          </span>
        ) : (
          <span className="text-xs theme-text-secondary italic opacity-50">
            Empty
          </span>
        )
      ),
    },
    {
      key: 'action',
      label: 'Action',
      align: 'right',
      render: (_: any, item: TemplatePlaceholderKey) => {
        const isCopied = copiedKey === item.key;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <CustomButton
              variant="outline"
              size="xs"
              onClick={() => handleCopyKey(item.key)}
              icon={isCopied ? SleekCheckIcon : CopyIcon}
              className={isCopied ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10' : ''}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </CustomButton>

            {item.isCustom && (
              <button
                type="button"
                onClick={() => handleDeleteCustomKey(item.key)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Delete custom key"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ], [copiedKey]);

  // Dynamic columns definition for Field Mapping DataTable
  const mappingTableColumns = useMemo(() => [
    {
      key: 'placeholder',
      label: 'Detected Word Token',
      sortable: true,
      render: (_: any, item: { id: string; placeholder: string }) => (
        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-block">
          {`{{${item.placeholder}}}`}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Matched System Field & Live Value',
      render: (_: any, item: { id: string; placeholder: string }) => {
        const ph = item.placeholder;
        const currentMapped = customMappings[ph] || ph;
        const matchedSysKey = availableKeysList.find(
          (k) => k.key.toLowerCase() === currentMapped.toLowerCase()
        );
        const isAutoMatched = Boolean(matchedSysKey);
        return (
          <div className="py-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold theme-text-primary">
                {matchedSysKey ? matchedSysKey.label : 'Custom / Unmapped'}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                  isAutoMatched
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {isAutoMatched ? 'Auto Matched' : 'Needs Mapping'}
              </span>
            </div>
            {matchedSysKey?.sampleValue && (
              <p className="text-[11px] theme-text-secondary mt-0.5 truncate">
                Live Value: <span className="font-mono">{String(matchedSysKey.sampleValue)}</span>
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'mapping',
      label: 'Map to System Variable',
      align: 'right',
      render: (_: any, item: { id: string; placeholder: string }) => {
        const ph = item.placeholder;
        return (
          <div className="w-56 ml-auto">
            <select
              value={customMappings[ph] || ph}
              onChange={(e) => {
                const val = e.target.value;
                setCustomMappings((prev) => ({ ...prev, [ph]: val }));
              }}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)] cursor-pointer"
            >
              <optgroup label="Standard System Fields">
                {availableKeysList.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label} ({`{{${k.key}}}`})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        );
      },
    },
  ], [customMappings, availableKeysList]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={10000}
      title="Word (.docx) Template Studio"
      subtitle="Use any Microsoft Word document as an automated template. Copy dynamic tags and map them with real exam & student data."
      size="5xl"
      bodyClassName="p-5 sm:p-6 space-y-4"
      footer={
        <div className="flex items-center justify-between w-full">
          <CustomButton
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </CustomButton>

          <div className="flex items-center gap-2.5">
            {parseResult && (
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => handleApply(true)}
                icon={SparklesIcon}
                className="theme-border text-xs"
              >
                Save as Reusable Studio Template
              </CustomButton>
            )}

            <CustomButton
              variant="primary"
              size="sm"
              onClick={() => handleApply(false)}
              disabled={!parseResult || isParsing}
              icon={CheckCircleIcon}
              className="shadow-xs"
            >
              Apply Document to Canvas
            </CustomButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Feature Navigation Tabs */}
        <div className="flex items-center justify-between border-b theme-border pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('keys')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'keys'
                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Available Dynamic Keys ({availableKeysList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
              }`}
            >
              <UploadIcon className="w-3.5 h-3.5" />
              <span>{file ? `File: ${file.name.slice(0, 20)}...` : 'Upload Word Document (.docx)'}</span>
            </button>

            {parseResult && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('mapping')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'mapping'
                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
                      : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                  }`}
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  <span>Field Mapping ({parseResult.detectedPlaceholders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('merge')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'merge'
                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
                      : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                  }`}
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>Live Data Merge Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'preview'
                      ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
                      : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                  }`}
                >
                  <FileIcon className="w-3.5 h-3.5" />
                  <span>Raw HTML</span>
                </button>
              </>
            )}
          </div>

          <div className="text-[11px] font-mono theme-text-secondary">
            {parseResult ? `${parseResult.detectedPlaceholders.length} Placeholders Detected` : 'Ready to Parse'}
          </div>
        </div>

        {/* ─── TAB 1: AVAILABLE DYNAMIC KEYS CHEAT SHEET & CUSTOM KEY CREATOR ─── */}
        {activeTab === 'keys' && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Action Bar: Search, Category Pills, Copy All Keys, and Add Custom Key */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Search keys (e.g. student_name, roll)..."
                  value={keySearchQuery}
                  onChange={(e) => setKeySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <SearchIcon className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Category Filter Pills (Only shown if multiple categories exist) */}
              {categories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedCategory === cat.id
                          ? 'theme-bg-accent theme-accent-text shadow-2xs'
                          : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 sm:ml-auto">
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllKeys}
                  icon={copiedAll ? SleekCheckIcon : CopyIcon}
                  className="text-xs"
                >
                  {copiedAll ? 'Copied All Tokens!' : 'Copy All Keys'}
                </CustomButton>

                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingKey((prev) => !prev)}
                  icon={PlusIcon}
                  className="text-xs"
                >
                  {isAddingKey ? 'Cancel New Key' : 'Add Custom Key'}
                </CustomButton>
              </div>
            </div>

            {/* Quick Add Custom Key Card Form */}
            {isAddingKey && (
              <div className="p-4 rounded-2xl theme-bg-sub border border-[var(--accent-main)]/40 shadow-sm space-y-3 animate-slide-down">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                    <span>Create New Custom Template Placeholder</span>
                  </h4>
                  <span className="text-[10.5px] theme-text-secondary">
                    Will be available across all Word templates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold theme-text-secondary block mb-1">
                      Key Identifier (e.g. <code>center_code</code>)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. center_code"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs theme-bg-surface border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold theme-text-secondary block mb-1">
                      Human Label (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Exam Center Code"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs theme-bg-surface border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold theme-text-secondary block mb-1">
                      Default / Fallback Value
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DH-102 (Main Hall)"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs theme-bg-surface border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingKey(false)}
                    className="text-xs"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    variant="primary"
                    size="sm"
                    onClick={handleAddCustomKey}
                    icon={CheckCircleIcon}
                    className="text-xs"
                  >
                    Save &amp; Register Key
                  </CustomButton>
                </div>
              </div>
            )}

            {/* Standard Project Reusable DataTable */}
            <div className="rounded-2xl border theme-border overflow-hidden theme-bg-surface shadow-2xs">
              <DataTable
                data={filteredKeys}
                columns={keyTableColumns}
                keyExtractor={(item: TemplatePlaceholderKey) => item.key}
                sortable={true}
                emptyTitle="No placeholder keys found"
                emptySubMessage="Try searching for another keyword or click Add Custom Key."
                wrapperClassName="max-h-[380px] overflow-y-auto"
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: UPLOAD & TEMPLATE INFO ─── */}
        {activeTab === 'upload' && (
          <div className="space-y-4 animate-fade-in">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                dragOver
                  ? 'border-[var(--accent-main)] bg-[var(--accent-main)]/5 scale-[1.01]'
                  : 'theme-border hover:border-slate-400 theme-bg-sub/40 hover:theme-bg-sub/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mb-3 shadow-xs">
                <UploadIcon className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-bold theme-text-primary">
                {isParsing ? 'Parsing Microsoft Word Document...' : 'Choose a Word document or drag it here'}
              </h3>
              <p className="text-xs theme-text-secondary mt-1 max-w-sm">
                Supports <strong className="theme-text-primary">.docx</strong> files. All styles, tables, borders, alignments, and <code>{'{{placeholders}}'}</code> will be loaded.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold theme-bg-surface border theme-border theme-text-secondary">
                <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Supports Unicode Bengali &amp; English with 100% layout fidelity</span>
              </div>
            </div>

            {/* Template Identification Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomInput
                label="Template Name"
                placeholder="e.g. Official Student Admit Card"
                value={templateName}
                onChange={(e: any) => setTemplateName(e.target.value)}
              />
              <CustomInput
                label="Description / Category (Optional)"
                placeholder="e.g. Standard 2 per page exam slip"
                value={templateDescription}
                onChange={(e: any) => setTemplateDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 3: FIELD MAPPING & INSPECTION ─── */}
        {activeTab === 'mapping' && parseResult && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="p-3 rounded-xl theme-bg-sub border theme-border text-xs theme-text-secondary flex items-center justify-between">
              <div>
                <strong>{parseResult.detectedPlaceholders.length} placeholders</strong> found in this Word document. Map any non-standard tags to system fields:
              </div>
              <button
                type="button"
                onClick={() => setCustomMappings({})}
                className="text-xs font-bold theme-accent hover:underline cursor-pointer"
              >
                Reset Mappings
              </button>
            </div>

            <div className="rounded-2xl border theme-border overflow-hidden theme-bg-surface shadow-2xs">
              <DataTable
                data={parseResult.detectedPlaceholders.map((ph) => ({ id: ph, placeholder: ph }))}
                columns={mappingTableColumns}
                keyExtractor={(item: { id: string }) => item.id}
                sortable={true}
                emptyTitle="No placeholders detected"
                emptySubMessage="This Word document does not contain any {{placeholder}} tokens."
                wrapperClassName="max-h-[380px] overflow-y-auto"
              />
            </div>
          </div>
        )}

        {/* ─── TAB 4: LIVE DATA MERGE TEST PREVIEW ─── */}
        {activeTab === 'merge' && parseResult && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs theme-text-secondary px-1">
              <span>Previewing document merged with active record:</span>
              <span className="font-mono">{file?.name}</span>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-5 rounded-2xl theme-bg-surface border theme-border shadow-xs">
              <div
                className="docx-preview-content font-sans text-xs sm:text-sm"
                dangerouslySetInnerHTML={{
                  __html: mergeTemplateWithData(getProcessedHtml, effectiveSampleData),
                }}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 5: RAW HTML PREVIEW ─── */}
        {activeTab === 'preview' && parseResult && (
          <div className="space-y-3 animate-fade-in">
            <div className="max-h-[420px] overflow-y-auto p-5 rounded-2xl theme-bg-surface border theme-border font-mono text-xs">
              <pre className="whitespace-pre-wrap theme-text-secondary">
                {getProcessedHtml}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}


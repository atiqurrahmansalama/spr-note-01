import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import RightSidebarPanel from '../ui/RightSidebarPanel';
import DrawerContainer, { DrawerSection } from '../layout/DrawerContainer';
import CustomCheckbox from '../ui/CustomCheckbox';
import CustomSelect from '../ui/CustomSelect';
import CustomInput from '../ui/CustomInput';
import {
  DEFAULT_WATERMARK_TEMPLATES,
  PRINT_ORIENTATION_OPTIONS,
  PRINT_PAPER_SIZE_OPTIONS,
  PRINT_MARGIN_OPTIONS,
  PRINT_DENSITY_OPTIONS,
  PRINT_BLANK_ROWS_OPTIONS,
  PRINT_COLOR_MODE_OPTIONS,
  PRINT_SIGNATURE_STYLE_OPTIONS,
  PRINT_META_FONT_SIZE_OPTIONS,
  PRINT_TITLE_LINE_STYLE_OPTIONS,
} from '../../stores/printStore';
import {
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ChevronIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
  FileIcon,
  BuildingIcon,
  GridIcon,
  GroupsIcon,
  SessionsIcon,
  SettingsIcon,
} from '../ui/Icons';

/**
 * PrintConfigSidebar
 * Project-standard Right Sidebar Panel for paper, layout, content, branding, and signatures.
 * Built with DrawerContainer, DrawerSection, and responsive container queries.
 */
export default function PrintConfigSidebar({
  options = {},
  onOptionsChange,
  defaultTitle = 'Official Document',
  defaultSubtitle = '',
  title = '',
  subtitle = '',
  availableColumns = [],
  visibleColumnKeys = [],
  onVisibleColumnsChange,
  extraBlankRows = 0,
  onExtraBlankRowsChange,
  showSectionsAndBars = true,
  showSectionsBar = true,
  showDisplayBars = true,
  showDataDisplay = true,
  showColumns = true,
  showHeaderSection = true,
  showWatermarkSection = true,
  showSignaturesSection = true,
  templates = [],
  activeTemplateId = null,
  onTemplateChange,
  onResetDefaults,
  onClose,
  width,
  isResizing = false,
  onStartResize,
  onResetResize,
  className = '',
}) {
  const { currentInstitution } = useTenant ? useTenant() : { currentInstitution: null };
  const [activeTab, setActiveTab] = useState('layout'); // 'layout' | 'content' | 'signatures'
  const [isEditSignaturesOpen, setIsEditSignaturesOpen] = useState(false);
  const [expandedSigIds, setExpandedSigIds] = useState([]);
  const [isMetaOptionsExpanded, setIsMetaOptionsExpanded] = useState(false);
  const [isTitleOptionsExpanded, setIsTitleOptionsExpanded] = useState(false);

  // Dynamic Section Visibility Flags (Controlled via props or options)
  const isSectionsAndBarsVisible =
    showSectionsAndBars !== false &&
    showSectionsBar !== false &&
    showDisplayBars !== false &&
    options.showSectionsAndBars !== false &&
    options.showSectionsBar !== false &&
    options.showDisplayBars !== false;

  const isDataDisplayVisible =
    showDataDisplay !== false &&
    showColumns !== false &&
    options.showDataDisplay !== false &&
    options.showColumns !== false &&
    availableColumns &&
    availableColumns.length > 0;

  const isHeaderSectionVisible =
    showHeaderSection !== false &&
    options.showHeaderSection !== false;

  const isWatermarkSectionVisible =
    showWatermarkSection !== false &&
    options.showWatermarkSection !== false;

  const isSignaturesSectionVisible =
    showSignaturesSection !== false &&
    options.showSignaturesSection !== false;

  const updateOption = (key, value) => {
    if (onOptionsChange) {
      onOptionsChange({
        ...options,
        [key]: value,
      });
    }
  };

  const toggleColumn = (key) => {
    if (!onVisibleColumnsChange) return;
    if (visibleColumnKeys.includes(key)) {
      if (visibleColumnKeys.length <= 1) return; // keep at least 1
      onVisibleColumnsChange(visibleColumnKeys.filter((k) => k !== key));
    } else {
      onVisibleColumnsChange([...visibleColumnKeys, key]);
    }
  };

  const selectAllColumns = () => {
    if (!onVisibleColumnsChange) return;
    const allKeys = availableColumns.map((c) => c.id || c.key || c.accessor || c.dataIndex);
    onVisibleColumnsChange(allKeys);
  };

  const deselectAllColumns = () => {
    if (!onVisibleColumnsChange || availableColumns.length === 0) return;
    const firstKey = availableColumns[0].id || availableColumns[0].key || availableColumns[0].accessor || availableColumns[0].dataIndex;
    onVisibleColumnsChange([firstKey]);
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
              if (window.confirm('Reset all print preferences and custom columns back to default?')) {
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
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl theme-bg-sub border theme-border">
            {[
              { id: 'layout', label: 'Layout' },
              { id: 'content', label: 'Content' },
              { id: 'signatures', label: 'Signatures' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-1 text-[11px] @[360px]:text-xs font-semibold rounded-lg transition-all text-center cursor-pointer truncate ${
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
          {/* Template Selector (if templates provided) */}
          {templates && templates.length > 0 && (
            <DrawerSection
              icon={FileIcon}
              title="Document Presets"
            >
              <div className="space-y-1.5">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => onTemplateChange?.(tmpl.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      activeTemplateId === tmpl.id
                        ? 'border-[var(--accent-main)] theme-bg-accent-soft theme-text-primary font-semibold'
                        : 'theme-border hover:theme-bg-sub theme-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="text-xs truncate">{tmpl.name}</span>
                    </div>
                    {activeTemplateId === tmpl.id && (
                      <CheckCircleIcon className="w-4 h-4 theme-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* TAB 1: Layout & Paper Settings */}
          {activeTab === 'layout' && (
            <>
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
              </DrawerSection>

              {/* Section 2: Print & Spacing */}
              <DrawerSection
                icon={GridIcon}
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
                  label="Table Density"
                  value={options.density || 'NORMAL'}
                  options={PRINT_DENSITY_OPTIONS}
                  onChange={(val) => updateOption('density', val)}
                  size="sm"
                />
              </DrawerSection>
            </>
          )}

          {/* TAB 2: Content (Header, Watermark, Columns & Blank Rows) */}
          {activeTab === 'content' && (
            <>
              {/* Section 1: Header Branding & Document Title */}
              {isHeaderSectionVisible && (
                <DrawerSection
                  icon={BuildingIcon}
                  title="Header & Document Title"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5 @[420px]:gap-3">
                      <CustomCheckbox
                        checked={options.showHeader !== false}
                        onChange={(val) => updateOption('showHeader', val)}
                        label="Show Institution Header"
                        size="sm"
                      />

                      <CustomCheckbox
                        checked={options.showLogo !== false}
                        onChange={(val) => updateOption('showLogo', val)}
                        label="Show Institution Logo"
                        size="sm"
                      />
                    </div>

                    {/* Document Title & Subtitle Control */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <CustomCheckbox
                          checked={options.showTitle !== false}
                          onChange={(val) => updateOption('showTitle', val)}
                          label="Show Document Title & Header"
                          size="sm"
                          className="flex-1"
                        />

                        {options.showTitle !== false && (
                          <button
                            type="button"
                            onClick={() => setIsTitleOptionsExpanded((prev) => !prev)}
                            className="p-1 rounded-md transition-colors flex items-center justify-center cursor-pointer shrink-0 theme-text-secondary hover:theme-text-primary hover:theme-bg-sub"
                            title={isTitleOptionsExpanded ? 'Hide title styling options' : 'Customize title styling'}
                          >
                            <ChevronIcon
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isTitleOptionsExpanded ? 'rotate-180 theme-accent' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Expandable Sub-options for Document Title (Collapsed by default) */}
                      {options.showTitle !== false && isTitleOptionsExpanded && (
                        <div className="p-3 rounded-xl theme-bg-sub/60 space-y-3 animate-fade-in pl-3.5">
                          <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5 @[420px]:gap-3 items-center">
                            <CustomCheckbox
                              checked={Boolean(options.showTitleLine)}
                              onChange={(val) => updateOption('showTitleLine', val)}
                              label="Show Line Below Title"
                              size="sm"
                            />

                            {options.showTitleLine && (
                              <CustomSelect
                                label="Title Line Style"
                                value={options.titleLineStyle || 'SOLID'}
                                options={PRINT_TITLE_LINE_STYLE_OPTIONS}
                                onChange={(val) => updateOption('titleLineStyle', val)}
                                size="sm"
                              />
                            )}
                          </div>

                          <div className="space-y-2.5 pt-1 border-t theme-border">
                            <CustomInput
                              label="Document Header (Title)"
                              value={options.customTitle ?? ''}
                              onChange={(val, e) => {
                                const nextVal = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                                updateOption('customTitle', nextVal);
                              }}
                              placeholder={defaultTitle || title || 'Official Document'}
                              size="sm"
                            />

                            <CustomInput
                              label="Document Header (Subtitle / Term)"
                              value={options.customSubtitle ?? ''}
                              onChange={(val, e) => {
                                const nextVal = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                                updateOption('customSubtitle', nextVal);
                              }}
                              placeholder={defaultSubtitle || subtitle || 'Academic Session / Examination'}
                              size="sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </DrawerSection>
              )}

              {/* Section 2: Sections & Display Bars */}
              {isSectionsAndBarsVisible && (
                <DrawerSection
                  icon={GridIcon}
                  title="Sections & Display Bars"
                >
                  <div className="space-y-3">
                    {/* 1. Document Metadata Bar Control & Expandable Styling */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <CustomCheckbox
                          checked={options.showMeta !== false}
                          onChange={(val) => updateOption('showMeta', val)}
                          label="Show Document Metadata Bar"
                          size="sm"
                          className="flex-1"
                        />

                        {options.showMeta !== false && (
                          <button
                            type="button"
                            onClick={() => setIsMetaOptionsExpanded((prev) => !prev)}
                            className="p-1 rounded-md transition-colors flex items-center justify-center cursor-pointer shrink-0 theme-text-secondary hover:theme-text-primary hover:theme-bg-sub"
                            title={isMetaOptionsExpanded ? 'Hide metadata styling options' : 'Customize metadata styling'}
                          >
                            <ChevronIcon
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isMetaOptionsExpanded ? 'rotate-180 theme-accent' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Expandable Sub-options (Collapsed by default) */}
                      {options.showMeta !== false && isMetaOptionsExpanded && (
                        <div className="p-3 rounded-xl theme-bg-sub/60 space-y-2.5 animate-fade-in pl-3.5">
                          <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5 @[420px]:gap-3 items-center">
                            <CustomCheckbox
                              checked={options.showMetaBox !== false}
                              onChange={(val) => updateOption('showMetaBox', val)}
                              label="Show Background Box & Border"
                              size="sm"
                            />

                            <CustomSelect
                              label="Metadata Font Size"
                              value={options.metaFontSize || 'MD'}
                              options={PRINT_META_FONT_SIZE_OPTIONS}
                              onChange={(val) => updateOption('metaFontSize', val)}
                              size="sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Additional Section Bars (Summary & Footer) */}
                    <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5 @[420px]:gap-3">
                      <CustomCheckbox
                        checked={options.showSummary !== false}
                        onChange={(val) => updateOption('showSummary', val)}
                        label="Show Summary & Statistics Bar"
                        size="sm"
                      />

                      <CustomCheckbox
                        checked={options.showFooter !== false}
                        onChange={(val) => updateOption('showFooter', val)}
                        label="Show Footer & Page Numbers"
                        size="sm"
                      />
                    </div>
                  </div>
                </DrawerSection>
              )}

              {/* Section 3: Security & Watermark */}
              {isWatermarkSectionVisible && (
                <DrawerSection
                  icon={SettingsIcon}
                  title="Security & Watermark"
                >
                  <CustomCheckbox
                    checked={Boolean(options.showWatermark)}
                    onChange={(val) => updateOption('showWatermark', val)}
                    label="Show Background Watermark"
                    size="sm"
                  />

                  {options.showWatermark && (
                    <div className="space-y-2 pt-1">
                      <CustomInput
                        label="Watermark Text"
                        value={options.watermarkText || 'OFFICIAL'}
                        onChange={(val, e) => {
                          const nextVal = typeof val === 'string' ? val : (e?.target?.value ?? val ?? '');
                          updateOption('watermarkText', nextVal);
                        }}
                        placeholder="e.g. CONFIDENTIAL / OFFICIAL"
                        size="sm"
                        enableTemplates={true}
                        templateCategory="print_watermark_templates"
                        templateMode="replace"
                        templateInitialList={DEFAULT_WATERMARK_TEMPLATES}
                        showTemplateClear={true}
                        showTemplateSave={true}
                        showTemplateSaved={true}
                        showTemplateCount={true}
                        showTemplateSearch={true}
                        showTemplateEdit={true}
                        showTemplateDelete={true}
                      />
                    </div>
                  )}
                </DrawerSection>
              )}

              {/* Section 4: Table Columns & Rows (Data Display) */}
              {isDataDisplayVisible && (
                <DrawerSection
                  icon={GridIcon}
                  title="Data Display"
                  headerRight={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllColumns}
                        className="text-[10px] theme-accent hover:underline cursor-pointer font-semibold"
                      >
                        All
                      </button>
                      <span className="theme-text-secondary opacity-40">•</span>
                      <button
                        type="button"
                        onClick={deselectAllColumns}
                        className="text-[10px] theme-text-secondary hover:theme-text-primary cursor-pointer font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-1.5">
                    {availableColumns.map((col) => {
                      const colKey = col.id || col.key || col.accessor || col.dataIndex;
                      const isChecked = visibleColumnKeys.includes(colKey);
                      const label = col.label || col.header || col.title || colKey;

                      return (
                        <div
                          key={colKey}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            isChecked
                              ? 'theme-bg-elevated theme-border'
                              : 'opacity-60 theme-border hover:opacity-90'
                          }`}
                        >
                          <CustomCheckbox
                            checked={isChecked}
                            onChange={() => toggleColumn(colKey)}
                            label={label}
                            size="sm"
                            className="w-full flex-1"
                          />
                          {col.subLabel && (
                            <span className="text-[10px] theme-text-secondary font-medium shrink-0 ml-2">
                              {col.subLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <CustomSelect
                    label="Include Blank Rows (Offline Use)"
                    value={String(extraBlankRows)}
                    options={PRINT_BLANK_ROWS_OPTIONS}
                    onChange={(val) => onExtraBlankRowsChange?.(parseInt(val, 10) || 0)}
                    size="sm"
                  />
                </DrawerSection>
              )}
            </>
          )}

          {/* TAB 3: Signatures & Approvals */}
          {activeTab === 'signatures' && (
            <>
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

                  {/* Sub-checkboxes for individual saved signature lines (Clean Content Display style) */}
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
                                    : 'border-dashed border-zinc-300 dark:border-zinc-800 opacity-60 bg-zinc-50/50 dark:bg-zinc-900/30'
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
            </>
          )}
        </DrawerContainer>
    </RightSidebarPanel>
  );
}

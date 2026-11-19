import React, { useState } from 'react';
import CustomSelect from '../../../ui/CustomSelect';
import CustomInput from '../../../ui/CustomInput';
import CustomCheckbox from '../../../ui/CustomCheckbox';
import {
  PlusIcon,
  TrashIcon,
  ChevronIcon,
} from '../../../ui/Icons';
import {
  PRINT_ORIENTATION_OPTIONS,
  PRINT_PAPER_SIZE_OPTIONS,
  PRINT_MARGIN_OPTIONS,
  PRINT_DENSITY_OPTIONS,
  PRINT_COLOR_MODE_OPTIONS,
  PRINT_SIGNATURE_STYLE_OPTIONS,
} from '../../../../stores/printStore';
import { PrintOptions, PrintSignatureLine } from '../../types';

export interface DocLabLayoutTabProps {
  options: Partial<PrintOptions>;
  onOptionsChange: (newOptions: Partial<PrintOptions>) => void;
  isCustomDocxActive?: boolean;
}

/**
 * DocLabLayoutTab
 * Paper dimensions, margins, typography density, branding, watermark, and authority signers.
 * Formatted with pure container queries (@container @[480px]:grid-cols-2).
 */
export const DocLabLayoutTab: React.FC<DocLabLayoutTabProps> = ({
  options = {},
  onOptionsChange,
  isCustomDocxActive = false,
}) => {
  const [expandedSigIds, setExpandedSigIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spr_doclab_signatures_expanded_ids');
        if (saved) return JSON.parse(saved);
      } catch (err) {
        // ignore
      }
    }
    return [];
  });

  const signatureLines = (options.signatureLines as PrintSignatureLine[]) || [];

  const updateOption = (key: string, value: any) => {
    if (onOptionsChange) {
      onOptionsChange({
        ...options,
        [key]: value,
      });
    }
  };

  const persistExpandedSigs = (ids: string[]) => {
    setExpandedSigIds(ids);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('spr_doclab_signatures_expanded_ids', JSON.stringify(ids));
      } catch (err) {
        // ignore
      }
    }
  };

  const addSignatureLine = () => {
    if (signatureLines.length >= 6) return;
    const newId = `sig_${Date.now()}`;
    const newLines: PrintSignatureLine[] = [
      ...signatureLines,
      {
        id: newId,
        label: `Authority #${signatureLines.length + 1}`,
        sub: 'Authorized Signature',
        placeholder: 'SEAL & SIGN',
        align: 'center',
        enabled: true,
      },
    ];
    updateOption('signatureLines', newLines);
    persistExpandedSigs([...expandedSigIds, newId]);
  };

  const removeSignatureLine = (id: string) => {
    const newLines = signatureLines.filter((sig) => sig.id !== id);
    updateOption('signatureLines', newLines);
    persistExpandedSigs(expandedSigIds.filter((item) => item !== id));
  };

  const toggleSigExpand = (id: string) => {
    const next = expandedSigIds.includes(id)
      ? expandedSigIds.filter((item) => item !== id)
      : [...expandedSigIds, id];
    persistExpandedSigs(next);
  };

  const updateSignatureItem = (id: string, field: keyof PrintSignatureLine, value: any) => {
    const newLines = signatureLines.map((sig) =>
      sig.id === id ? { ...sig, [field]: value } : sig
    );
    updateOption('signatureLines', newLines);
  };

  return (
    <div className="@container space-y-6 pt-1 pb-6">
      {/* ─── 1. Paper & Dimensions Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Paper & Dimensions
          </span>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Paper Size
            </label>
            <CustomSelect
              value={options.pageSize || 'A4'}
              onChange={(val: any) => updateOption('pageSize', val)}
              options={PRINT_PAPER_SIZE_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Orientation
            </label>
            <CustomSelect
              value={options.orientation || 'PORTRAIT'}
              onChange={(val: any) => updateOption('orientation', val)}
              options={PRINT_ORIENTATION_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Page Margins
            </label>
            <CustomSelect
              value={options.margin || 'NORMAL'}
              onChange={(val: any) => updateOption('margin', val)}
              options={PRINT_MARGIN_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Grid Density
            </label>
            <CustomSelect
              value={options.density || 'NORMAL'}
              onChange={(val: any) => updateOption('density', val)}
              options={PRINT_DENSITY_OPTIONS}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium theme-text-secondary mb-1">
            Print Color Palette
          </label>
          <CustomSelect
            value={options.colorMode || 'FULL_COLOR'}
            onChange={(val: any) => updateOption('colorMode', val)}
            options={PRINT_COLOR_MODE_OPTIONS}
          />
        </div>
      </div>

      {/* ─── 2. Institutional Branding & Title ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Header & Branding
          </span>
        </div>

        <div className="space-y-2">
          <CustomCheckbox
            checked={options.showHeader !== false}
            onChange={(checked: boolean) => updateOption('showHeader', checked)}
            label="Show Institutional Header & Logo"
          />

          <CustomCheckbox
            checked={options.showTitle !== false}
            onChange={(checked: boolean) => updateOption('showTitle', checked)}
            label="Show Document Title Banner"
          />

          <CustomCheckbox
            checked={Boolean(options.showTitleLine)}
            onChange={(checked: boolean) => updateOption('showTitleLine', checked)}
            label="Show Underline Below Title"
          />
        </div>
      </div>

      {/* ─── 3. Metadata Grid Box ─── */}
      {!isCustomDocxActive && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Document Metadata Grid
            </span>
          </div>

          <div className="space-y-2">
            <CustomCheckbox
              checked={options.showMeta !== false}
              onChange={(checked: boolean) => updateOption('showMeta', checked)}
              label="Display Metadata Info Grid (Class, Session, Date)"
            />

            <CustomCheckbox
              checked={options.showMetaBox !== false}
              onChange={(checked: boolean) => updateOption('showMetaBox', checked)}
              label="Show Border Box Around Metadata"
            />
          </div>
        </div>
      )}

      {/* ─── 4. Watermark & Security ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Security & Watermark
          </span>
        </div>

        <div className="space-y-2">
          <CustomCheckbox
            checked={Boolean(options.showWatermark)}
            onChange={(checked: boolean) => updateOption('showWatermark', checked)}
            label="Enable Diagonal Security Watermark"
          />

          {options.showWatermark && (
            <div className="pt-1">
              <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                Watermark Text
              </label>
              <CustomInput
                value={options.watermarkText || 'CONFIDENTIAL'}
                onChange={(val: any) => updateOption('watermarkText', typeof val === 'string' ? val : val?.target?.value ?? '')}
                placeholder="e.g. OFFICIAL / CONFIDENTIAL"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. Institutional Signatures & Authority Signers ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Authority Signatures {options.showSignatures !== false && signatureLines.length > 0 ? `(${signatureLines.length})` : ''}
          </span>

          {options.showSignatures !== false && signatureLines.length < 6 && (
            <button
              type="button"
              onClick={addSignatureLine}
              className="text-xs font-semibold theme-accent hover:opacity-80 flex items-center gap-1 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Signer</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <CustomCheckbox
              checked={options.showSignatures !== false}
              onChange={(checked: boolean) => updateOption('showSignatures', checked)}
              label="Display Institutional Signatures Block"
            />
          </div>

          {options.showSignatures !== false && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                  Signature Line Style
                </label>
                <CustomSelect
                  value={options.signatureStyle || 'SOLID'}
                  onChange={(val: any) => updateOption('signatureStyle', val)}
                  options={PRINT_SIGNATURE_STYLE_OPTIONS}
                />
              </div>

              {signatureLines.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {signatureLines.map((sig, idx) => {
                    const isExpanded = expandedSigIds.includes(sig.id);

                    return (
                      <div
                        key={sig.id}
                        className="rounded-xl border theme-border theme-bg-card overflow-hidden shadow-2xs"
                      >
                        {/* Summary Bar */}
                        <div
                          onClick={() => toggleSigExpand(sig.id)}
                          className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:theme-bg-sub/50 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div onClick={(e) => e.stopPropagation()}>
                              <CustomCheckbox
                                checked={sig.enabled !== false}
                                onChange={(checked: boolean) => {
                                  updateSignatureItem(sig.id, 'enabled', checked);
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold theme-text-primary truncate">
                              {sig.label || `Signer #${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => removeSignatureLine(sig.id)}
                              className="p-1 rounded-md theme-text-muted hover:theme-danger hover:theme-bg-sub transition-colors cursor-pointer"
                              title="Remove signer"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleSigExpand(sig.id)}
                              className="p-1 rounded-md theme-text-muted hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
                            >
                              <ChevronIcon
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Form */}
                        {isExpanded && (
                          <div className="p-3 pt-0 border-t theme-border space-y-3 theme-bg-sub/40 animate-in fade-in-50 duration-150">
                            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 pt-3">
                              <div>
                                <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                                  Primary Title
                                </label>
                                <CustomInput
                                  value={sig.label || ''}
                                  onChange={(val: any) => updateSignatureItem(sig.id, 'label', typeof val === 'string' ? val : val?.target?.value ?? '')}
                                  placeholder="e.g. Prepared By / Principal"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                                  Secondary Designation
                                </label>
                                <CustomInput
                                  value={typeof sig.sub === 'string' ? sig.sub : ''}
                                  onChange={(val: any) => updateSignatureItem(sig.id, 'sub', typeof val === 'string' ? val : val?.target?.value ?? '')}
                                  placeholder="e.g. Course Teacher / Controller"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                                  Placeholder Text
                                </label>
                                <CustomInput
                                  value={sig.placeholder || ''}
                                  onChange={(val: any) => updateSignatureItem(sig.id, 'placeholder', typeof val === 'string' ? val : val?.target?.value ?? '')}
                                  placeholder="e.g. SEAL & SIGN"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                                  Text Alignment
                                </label>
                                <CustomSelect
                                  value={sig.align || 'center'}
                                  onChange={(val: any) => updateSignatureItem(sig.id, 'align', val)}
                                  options={[
                                    { value: 'left', label: 'Left Aligned' },
                                    { value: 'center', label: 'Center Aligned' },
                                    { value: 'right', label: 'Right Aligned' },
                                  ]}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocLabLayoutTab;

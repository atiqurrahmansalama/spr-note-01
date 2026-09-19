import React, { useState } from 'react';
import CustomSelect from '../../../ui/CustomSelect';
import CustomInput from '../../../ui/CustomInput';
import CustomCheckbox from '../../../ui/CustomCheckbox';
import {
  PlusIcon,
  TrashIcon,
  ChevronIcon,
} from '../../../ui/Icons';
import { PRINT_SIGNATURE_STYLE_OPTIONS } from '../../../../stores/printStore';
import { PrintOptions, PrintSignatureLine } from '../../types';

interface DocLabSignaturesTabProps {
  options: Partial<PrintOptions>;
  onOptionsChange: (newOptions: Partial<PrintOptions>) => void;
}

/**
 * DocLabSignaturesTab
 * Institutional authority signature blocks, signer titles, seals, and alignment.
 */
export const DocLabSignaturesTab: React.FC<DocLabSignaturesTabProps> = ({
  options = {},
  onOptionsChange,
}) => {
  const [expandedSigIds, setExpandedSigIds] = useState<string[]>([]);

  const signatureLines = (options.signatureLines as PrintSignatureLine[]) || [];

  const updateOption = (key: string, value: any) => {
    if (onOptionsChange) {
      onOptionsChange({
        ...options,
        [key]: value,
      });
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
    setExpandedSigIds((prev) => [...prev, newId]);
  };

  const removeSignatureLine = (id: string) => {
    const newLines = signatureLines.filter((sig) => sig.id !== id);
    updateOption('signatureLines', newLines);
    setExpandedSigIds((prev) => prev.filter((item) => item !== id));
  };

  const toggleSigExpand = (id: string) => {
    setExpandedSigIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateSignatureItem = (id: string, field: keyof PrintSignatureLine, value: any) => {
    const newLines = signatureLines.map((sig) =>
      sig.id === id ? { ...sig, [field]: value } : sig
    );
    updateOption('signatureLines', newLines);
  };

  return (
    <div className="@container space-y-5 pt-1">
      {/* 1. Master Toggle & Styling Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Signatures Configuration
          </span>
        </div>

        <div className="space-y-2">
          <CustomCheckbox
            checked={options.showSignatures !== false}
            onChange={(checked: boolean) => updateOption('showSignatures', checked)}
            label="Display Institutional Signatures Block"
          />
        </div>

        {options.showSignatures !== false && (
          <div className="pt-1">
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Signature Line Style
            </label>
            <CustomSelect
              value={options.signatureStyle || 'SOLID'}
              onChange={(val: any) => updateOption('signatureStyle', val)}
              options={PRINT_SIGNATURE_STYLE_OPTIONS}
            />
          </div>
        )}
      </div>

      {/* 2. Signature Authorities List */}
      {options.showSignatures !== false && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b theme-border">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Authority Signers ({signatureLines.length})
            </span>

            {signatureLines.length < 6 && (
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

          <div className="space-y-2.5">
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
        </div>
      )}
    </div>
  );
};

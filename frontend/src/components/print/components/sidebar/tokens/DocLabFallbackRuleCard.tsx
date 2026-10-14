import React, { useState, useMemo } from 'react';
import { CopyIcon, CheckCircleIcon } from '@/components/ui/Icons';
import IconButton from '@/components/ui/IconButton';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { DocLabItemCard } from '../DocLabItemCard';

export interface DocLabFallbackRuleCardProps {
  onInsertKey?: (ruleToken: string) => void;
  initialPreset?: 'na' | 'dash' | 'blank' | 'zero' | 'custom';
  initialCustomValue?: string;
}

/**
 * DocLabFallbackRuleCard
 * 
 * Reusable, enterprise-grade Default / Missing Data Fallback Directive Card.
 * Generates directive snippets like `| default: "N/A"`, `| default: "---"`, or `| default: ""`.
 * Container-responsive: uses @container and project-standard CustomSelect & CustomInput controls.
 */
export const DocLabFallbackRuleCard: React.FC<DocLabFallbackRuleCardProps> = ({
  onInsertKey,
  initialPreset = 'na',
  initialCustomValue = '',
}) => {
  const [preset, setPreset] = useState<'na' | 'dash' | 'blank' | 'zero' | 'custom'>(initialPreset);
  const [customValue, setCustomValue] = useState<string>(initialCustomValue);
  const [copied, setCopied] = useState<boolean>(false);

  const presetOptions = useMemo(
    () => [
      { value: 'na', label: 'N/A (Not Applicable)' },
      { value: 'dash', label: 'Dash (---)' },
      { value: 'blank', label: 'Blank / Empty ("")' },
      { value: 'zero', label: 'Zero (0)' },
      { value: 'custom', label: 'Custom Text...' },
    ],
    []
  );

  // Resolved fallback text
  const resolvedFallbackText = useMemo(() => {
    switch (preset) {
      case 'na':
        return 'N/A';
      case 'dash':
        return '---';
      case 'blank':
        return '';
      case 'zero':
        return '0';
      case 'custom':
        return customValue;
      default:
        return 'N/A';
    }
  }, [preset, customValue]);

  // Dynamic directive snippet generation: e.g. `| default: "N/A"`
  const snippet = useMemo(() => {
    return `| default: "${resolvedFallbackText}"`;
  }, [resolvedFallbackText]);

  // Dynamic description
  const descriptionText = useMemo(() => {
    if (preset === 'blank') {
      return 'Prints completely blank if token data is missing or empty';
    }
    const val = resolvedFallbackText ? `"${resolvedFallbackText}"` : 'blank';
    return `Prints ${val} if token data is missing or empty`;
  }, [preset, resolvedFallbackText]);

  const handleInsertAndCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    onInsertKey?.(snippet);
  };

  return (
    <DocLabItemCard
      title="Default Value (No Data)"
      titleClassName="text-xs font-bold theme-text-primary"
      description={descriptionText}
      collapsible={true}
      defaultExpanded={false}
    >
      <div className="space-y-2.5 pt-1 text-left @container">
        {/* Row 1: Preset & Custom Fallback Value */}
        <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5">
          <CustomSelect
            label="Preset"
            options={presetOptions}
            value={preset}
            onChange={(val: any) => setPreset(val || 'na')}
            size="xs"
          />

          <CustomInput
            label="Fallback Value"
            type="text"
            size="xs"
            disabled={preset !== 'custom'}
            value={preset === 'custom' ? customValue : resolvedFallbackText}
            placeholder={preset === 'custom' ? 'e.g. Not Specified, Pending' : ''}
            onChange={(val: any) => {
              if (preset !== 'custom') return;
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              setCustomValue(rawStr !== undefined ? rawStr : '');
            }}
            title={
              preset === 'custom'
                ? 'Type custom fallback text to display when data is missing'
                : `Preset fallback: "${resolvedFallbackText}"`
            }
          />
        </div>

        {/* Bottom Full-Width Generated Snippet with Multi-Line Word Wrap */}
        <div
          onClick={handleInsertAndCopy}
          onMouseDown={(e) => e.preventDefault()}
          className="mt-2.5 p-2 rounded-lg border theme-border-subtle theme-bg-sub/80 hover:theme-bg-sub flex items-start justify-between gap-2 cursor-pointer transition-all shadow-2xs w-full min-w-0 active:scale-[0.99] group/snippet"
          title="Click to copy and insert snippet at cursor in document"
        >
          <div className="min-w-0 flex-1">
            <code className="text-[11px] font-mono font-bold theme-accent break-all whitespace-normal leading-relaxed text-left select-all block">
              {snippet}
            </code>
            <p className="text-[10px] theme-text-secondary mt-1 select-none flex items-center gap-1">
              {copied && <span className="theme-accent font-semibold ml-1">✓ Copied!</span>}
            </p>
          </div>

          <IconButton
            icon={copied ? CheckCircleIcon : CopyIcon}
            variant={copied ? 'accent-soft' : 'ghost'}
            size="xs"
            title="Copy snippet"
            ariaLabel="Copy snippet"
            className={`shrink-0 mt-0.5 ${copied ? 'theme-accent' : 'theme-text-secondary group-hover/snippet:theme-text-primary'}`}
          />
        </div>
      </div>
    </DocLabItemCard>
  );
};

export default DocLabFallbackRuleCard;

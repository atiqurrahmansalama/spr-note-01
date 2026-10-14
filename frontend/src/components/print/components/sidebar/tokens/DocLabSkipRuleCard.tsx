import React, { useState, useMemo } from 'react';
import { CopyIcon, CheckCircleIcon } from '@/components/ui/Icons';
import IconButton from '@/components/ui/IconButton';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { DocLabItemCard } from '../DocLabItemCard';

export interface DocLabSkipRuleCardProps {
  onInsertKey?: (ruleToken: string) => void;
  availableKeys?: string[];
  initialCondition?: 'empty' | 'text' | 'always';
  initialSkipText?: string;
  initialPosition?: 'b' | 'a' | 'self';
  initialLineCount?: number;
}

/**
 * DocLabSkipRuleCard
 * 
 * Reusable, enterprise-grade Conditional Data Skip & Line Removal Rule Card.
 * Generates directive snippets like `| skipData: "empty", removeLine: self`, `removeLine: b`, or `removeLine: a2`.
 * Fully responsive: uses Container Queries and project standard CustomSelect and CustomInput controls.
 */
export const DocLabSkipRuleCard: React.FC<DocLabSkipRuleCardProps> = ({
  onInsertKey,
  initialCondition = 'empty',
  initialSkipText = '',
  initialPosition = 'self',
  initialLineCount = 1,
}) => {
  const [condition, setCondition] = useState<'empty' | 'text' | 'always'>(initialCondition);
  const [skipText, setSkipText] = useState<string>(initialSkipText);
  const [position, setPosition] = useState<'b' | 'a' | 'self'>(initialPosition);
  const [lineCount, setLineCount] = useState<number>(initialLineCount);
  const [copied, setCopied] = useState<boolean>(false);

  const conditionOptions = useMemo(
    () => [
      { value: 'empty', label: 'When Empty (No Data)' },
      { value: 'text', label: 'When Matches Specific Text' },
      { value: 'always', label: 'Always / Any Data (*)' },
    ],
    []
  );

  const positionOptions = useMemo(
    () => [
      { value: 'self', label: 'Current Line Only (self)' },
      { value: 'b', label: 'Before (b)' },
      { value: 'a', label: 'After (a)' },
    ],
    []
  );

  // Dynamic directive snippet generation:
  // e.g. | skipData: "empty", removeLine: self
  // or | skipData: "MI Tawfiq", removeLine: b
  // or | skipData: "*", removeLine: a2
  const snippet = useMemo(() => {
    let target = 'empty';
    if (condition === 'text') {
      target = skipText.trim() ? skipText.trim() : '---';
    } else if (condition === 'always') {
      target = '*';
    }

    if (position === 'self') {
      return `| skipData: "${target}", removeLine: self`;
    }
    const count = Math.max(1, lineCount || 1);
    const rule = count === 1 ? position : `${position}${count}`;
    return `| skipData: "${target}", removeLine: ${rule}`;
  }, [condition, skipText, position, lineCount]);

  // Dynamic user-friendly description:
  const descriptionText = useMemo(() => {
    const count = Math.max(1, lineCount || 1);
    const posWord = position === 'b' ? 'before' : 'after';
    const lineWord = count === 1 ? '1 line' : `${count} lines`;

    if (condition === 'empty') {
      if (position === 'self') return 'Remove current line when data is empty';
      return `Remove ${lineWord} ${posWord} when data is empty`;
    }
    if (condition === 'always') {
      if (position === 'self') return 'Always remove current line';
      return `Always remove ${lineWord} ${posWord}`;
    }
    const target = skipText.trim() ? `"${skipText.trim()}"` : 'matching data';
    if (position === 'self') return `Omit ${target} + remove current line only`;
    return `Omit ${target} + remove ${lineWord} ${posWord}`;
  }, [condition, skipText, position, lineCount]);

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
      title="Data Skip & Line Removal"
      titleClassName="text-xs font-bold theme-text-primary"
      description={descriptionText}
      collapsible={true}
      defaultExpanded={false}
    >
      <div className="space-y-2.5 pt-1 text-left @container">
        {/* Row 1: Condition (When to Remove) & Target Text / Trigger (Single Responsive Row) */}
        <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5">
          <CustomSelect
            label="When to Remove"
            options={conditionOptions}
            value={condition}
            onChange={(val: any) => setCondition(val || 'empty')}
            size="xs"
          />

          <CustomInput
            label={condition === 'text' ? 'Target Text to Match' : 'Trigger'}
            type="text"
            size="xs"
            disabled={condition !== 'text'}
            value={
              condition === 'text'
                ? skipText
                : condition === 'empty'
                ? 'When empty or blank'
                : 'Unconditional (*)'
            }
            placeholder={condition === 'text' ? 'e.g. MI Taufiq, N/A, None' : ''}
            onChange={(val: any) => {
              if (condition !== 'text') return;
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              setSkipText(rawStr !== undefined ? rawStr : '');
            }}
            title={
              condition === 'text'
                ? 'Exact or partial text pattern to match and omit'
                : condition === 'empty'
                ? 'Removes line when data is empty or blank'
                : 'Unconditionally removes line'
            }
          />
        </div>

        {/* Row 3: Position (Current Line / Before / After) & Line Removal Count */}
        <div className="grid grid-cols-1 @[380px]:grid-cols-2 gap-2.5">
          <CustomSelect
            label="Position"
            options={positionOptions}
            value={position}
            onChange={(val: any) => setPosition(val === 'a' || val === 'b' ? val : 'self')}
            size="xs"
          />

          <CustomInput
            label="Line Removal"
            type="number"
            size="xs"
            min={1}
            max={50}
            allowDecimals={false}
            scrollable={true}
            disabled={position === 'self'}
            value={position === 'self' ? 0 : lineCount}
            onChange={(val: any) => {
              if (position === 'self') return;
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              if (rawStr === '' || rawStr === undefined || rawStr === null) {
                setLineCount(1);
                return;
              }
              const num = parseInt(rawStr, 10);
              if (!isNaN(num) && num >= 1 && num <= 50) {
                setLineCount(num);
              }
            }}
            title={position === 'self' ? 'Only the current token line is removed' : 'Number of lines to remove (1-50, use scroll or arrows)'}
          />
        </div>

        {/* ─── Bottom Full-Width Generated Snippet with Multi-Line Word Wrap ─── */}
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

export default DocLabSkipRuleCard;

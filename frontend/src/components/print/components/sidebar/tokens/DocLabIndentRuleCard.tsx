import React, { useState, useMemo } from 'react';
import { CopyIcon, CheckCircleIcon } from '@/components/ui/Icons';
import IconButton from '@/components/ui/IconButton';
import CustomInput from '@/components/ui/CustomInput';
import { DocLabItemCard } from '../DocLabItemCard';

export interface DocLabIndentRuleCardProps {
  onInsertKey?: (ruleToken: string) => void;
}

export const DocLabIndentRuleCard: React.FC<DocLabIndentRuleCardProps> = ({ onInsertKey }) => {
  const [spaceCount, setSpaceCount] = useState<number>(5);
  const [fromLine, setFromLine] = useState<number>(2);
  const [toLine, setToLine] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Dynamic directive snippet generation:
  // e.g. | indent: 5 or | indent: 5, from: 3 or | indent: 5, from: 2, to: 5
  const snippet = useMemo(() => {
    let s = `| indent: ${spaceCount}`;
    if (fromLine !== undefined && fromLine !== null && fromLine !== 2) {
      s += `, from: ${fromLine}`;
    } else if (fromLine === 2 && toLine) {
      s += `, from: 2`;
    }
    if (toLine && Number(toLine) > 0) {
      s += `, to: ${toLine}`;
    }
    return s;
  }, [spaceCount, fromLine, toLine]);

  const descriptionText = useMemo(() => {
    const toDesc = toLine && Number(toLine) > 0 ? `line ${toLine}` : 'end of text';
    return `Indent from line ${fromLine} to ${toDesc} by ${spaceCount} spaces`;
  }, [spaceCount, fromLine, toLine]);

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
      title="Text Indentation"
      titleClassName="text-xs font-bold theme-text-primary"
      description={descriptionText}
      collapsible={true}
      defaultExpanded={true}
      storageKey="spr_doclab_tokens_rule_indent"
    >
      <div className="space-y-2.5 pt-1 text-left">
        {/* Responsive 3-Column Parameters Grid using project standard CustomInput */}
        <div className="grid grid-cols-3 gap-2">
          <CustomInput
            label="Spaces"
            type="number"
            size="xs"
            min={1}
            max={30}
            allowDecimals={false}
            scrollable={true}
            value={spaceCount}
            onChange={(val: any) => {
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              if (rawStr === '' || rawStr === undefined || rawStr === null) {
                setSpaceCount(1);
                return;
              }
              const num = parseInt(rawStr, 10);
              if (!isNaN(num) && num >= 1 && num <= 30) {
                setSpaceCount(num);
              }
            }}
            title="Number of spaces (1-30, use scroll or arrows)"
          />

          <CustomInput
            label="From Line"
            type="number"
            size="xs"
            min={1}
            max={99}
            allowDecimals={false}
            scrollable={true}
            value={fromLine}
            onChange={(val: any) => {
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              if (rawStr === '' || rawStr === undefined || rawStr === null) {
                setFromLine(1);
                return;
              }
              const num = parseInt(rawStr, 10);
              if (!isNaN(num) && num >= 1 && num <= 99) {
                setFromLine(num);
              }
            }}
            title="Starting line for indentation (1-99)"
          />

          <CustomInput
            label="To Line"
            type="number"
            size="xs"
            min={1}
            max={99}
            allowDecimals={false}
            scrollable={true}
            value={toLine}
            placeholder="All"
            onChange={(val: any) => {
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              if (rawStr === '' || rawStr === undefined || rawStr === null) {
                setToLine('');
                return;
              }
              const num = parseInt(rawStr, 10);
              if (!isNaN(num) && num >= 1 && num <= 99) {
                setToLine(String(num));
              }
            }}
            title="Ending line for indentation (empty for all lines)"
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
          </div>
          <IconButton
            icon={copied ? CheckCircleIcon : CopyIcon}
            variant={copied ? 'accent-soft' : 'ghost'}
            size="xs"
            onClick={handleInsertAndCopy}
            onMouseDown={(e: any) => e.preventDefault()}
            title="Click to copy and insert snippet"
            ariaLabel="Copy snippet"
            className={`shrink-0 mt-0.5 ${copied ? 'theme-accent' : 'theme-text-secondary hover:theme-text-primary'}`}
          />
        </div>
      </div>
    </DocLabItemCard>
  );
};

export default DocLabIndentRuleCard;

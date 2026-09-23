import React, { useState, useMemo } from 'react';
import { CopyIcon, CheckCircleIcon } from '../../../ui/Icons';
import CustomInput from '../../../ui/CustomInput';
import { DocLabItemCard } from './DocLabItemCard';

export interface DocLabConditionsTabProps {
  onInsertKey?: (ruleToken: string) => void;
  placeholderKeys?: any[];
  requiredKeys?: string[];
  activeRecord?: Record<string, any>;
  scopeId?: string;
  scopeName?: string;
  className?: string;
}

/**
 * DocLabConditionsTab
 * Ultra-clean, customizable indentation rules tab for DocLab Studio.
 * Provides a dynamic <| indent: N, from: X, to: Y> rule with real-time controls for:
 * 1. Spaces: Number of non-breaking spaces (default 5)
 * 2. From Line: Start line for indentation (default line 2)
 * 3. To Line: End line for indentation (empty / All for all remaining lines)
 */
export const DocLabConditionsTab: React.FC<DocLabConditionsTabProps> = ({
  onInsertKey,
  className = '',
}) => {
  const [spaceCount, setSpaceCount] = useState<number>(5);
  const [fromLine, setFromLine] = useState<number>(2);
  const [toLine, setToLine] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Dynamic directive snippet generation:
  // e.g. <| indent: 5> or <| indent: 5, from: 3> or <| indent: 5, from: 2, to: 5>
  const snippet = useMemo(() => {
    let s = `<| indent: ${spaceCount}`;
    if (fromLine !== undefined && fromLine !== null && fromLine !== 2) {
      s += `, from: ${fromLine}`;
    } else if (fromLine === 2 && toLine) {
      s += `, from: 2`;
    }
    if (toLine && Number(toLine) > 0) {
      s += `, to: ${toLine}`;
    }
    s += `>`;
    return s;
  }, [spaceCount, fromLine, toLine]);

  // Dynamic user-friendly description:
  const descriptionText = useMemo(() => {
    const toDesc = toLine && Number(toLine) > 0 ? `line ${toLine}` : 'end of text';
    return `Indent from line ${fromLine} to ${toDesc} by ${spaceCount} spaces`;
  }, [spaceCount, fromLine, toLine]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`space-y-3 pt-1 text-left ${className}`}>
      {/* Helper Guidance Text */}
      <p className="text-[11px] theme-text-secondary leading-tight">
        Click any rule below to insert <code className="text-[10px] font-mono theme-text-primary theme-bg-surface border theme-border-subtle px-1.5 py-0.5 rounded-md">{'{{remarks<| indent: 5>}}'}</code> at your active cursor position on the document canvas.
      </p>

      {/* Dynamic Indent Rule Card with Configurable Parameters */}
      <DocLabItemCard
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onInsertKey?.(snippet)}
        title={snippet}
        titleClassName="font-mono text-[11.5px] font-bold theme-accent"
        titleTooltip={`Click to insert ${snippet} at cursor in document`}
        badge={
          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border theme-border-accent-soft">
            Indent
          </span>
        }
        description={descriptionText}
        actions={
          <button
            type="button"
            onClick={handleCopy}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              copied
                ? 'theme-border-accent-soft theme-accent theme-bg-accent-soft'
                : 'theme-border-subtle theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
            }`}
            title="Copy rule snippet to clipboard"
          >
            {copied ? (
              <CheckCircleIcon className="w-3.5 h-3.5 theme-accent" />
            ) : (
              <CopyIcon className="w-3.5 h-3.5" />
            )}
          </button>
        }
      >
        {/* Responsive 3-Column Parameters Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Spaces Input */}
          <div>
            <label className="block text-[10px] theme-text-muted font-medium mb-1 truncate">
              Spaces
            </label>
            <div className="h-6 px-1 rounded-md border theme-border-subtle theme-bg-sub flex items-center justify-center transition-all focus-within:theme-border-accent">
              <CustomInput
                type="number"
                variant="borderless"
                size="sm"
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
                inputClassName="text-xs text-center font-mono font-bold theme-text-primary p-0 h-full cursor-text"
                wrapperClassName="w-full h-full flex items-center justify-center"
                title="Number of spaces (1-30, use arrow keys or scroll)"
              />
            </div>
          </div>

          {/* 2. From Line Input */}
          <div>
            <label className="block text-[10px] theme-text-muted font-medium mb-1 truncate">
              From Line
            </label>
            <div className="h-6 px-1 rounded-md border theme-border-subtle theme-bg-sub flex items-center justify-center transition-all focus-within:theme-border-accent">
              <CustomInput
                type="number"
                variant="borderless"
                size="sm"
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
                inputClassName="text-xs text-center font-mono font-bold theme-text-primary p-0 h-full cursor-text"
                wrapperClassName="w-full h-full flex items-center justify-center"
                title="Starting line for indentation (1-99)"
              />
            </div>
          </div>

          {/* 3. To Line Input */}
          <div>
            <label className="block text-[10px] theme-text-muted font-medium mb-1 truncate">
              To Line
            </label>
            <div className="h-6 px-1 rounded-md border theme-border-subtle theme-bg-sub flex items-center justify-center transition-all focus-within:theme-border-accent">
              <CustomInput
                type="number"
                variant="borderless"
                size="sm"
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
                inputClassName="text-xs text-center font-mono font-bold theme-text-primary p-0 h-full cursor-text placeholder:theme-text-muted placeholder:font-normal"
                wrapperClassName="w-full h-full flex items-center justify-center"
                title="Ending line for indentation (empty for all lines)"
              />
            </div>
          </div>
        </div>
      </DocLabItemCard>
    </div>
  );
};

export default DocLabConditionsTab;

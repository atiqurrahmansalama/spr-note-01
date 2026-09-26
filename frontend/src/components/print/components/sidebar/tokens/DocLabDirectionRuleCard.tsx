import React, { useState, useMemo } from 'react';
import { CopyIcon, CheckCircleIcon } from '@/components/ui/Icons';
import IconButton from '@/components/ui/IconButton';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { DocLabItemCard } from '../DocLabItemCard';

export interface DocLabDirectionRuleCardProps {
  onInsertKey?: (ruleToken: string) => void;
}

/**
 * DocLabDirectionRuleCard
 * 
 * Unified, enterprise-grade Direction & Multi-Value Layout Rule Card.
 * Powered by collapsible DocLabItemCard and standardized project UI controls.
 */
export const DocLabDirectionRuleCard: React.FC<DocLabDirectionRuleCardProps> = ({ onInsertKey }) => {
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [separator, setSeparator] = useState<string>('newline');
  const [prefix, setPrefix] = useState<string>('none');
  const [limit, setLimit] = useState<string>('');
  const [indent, setIndent] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // When switching direction, set smart default separator
  const handleDirectionChange = (newDir: 'vertical' | 'horizontal') => {
    setDirection(newDir);
    if (newDir === 'vertical' && separator === ', ') {
      setSeparator('newline');
    } else if (newDir === 'horizontal' && separator === 'newline') {
      setSeparator(', ');
    }
  };

  // Dynamic directive snippet generation:
  const snippet = useMemo(() => {
    const parts: string[] = [`direction: ${direction}`];

    if (direction === 'vertical') {
      if (separator === 'cell') {
        parts.push('separator: cell');
      } else if (separator && separator !== 'newline') {
        parts.push(`separator: '${separator}'`);
      }
    } else {
      if (separator === 'cell') {
        parts.push('separator: cell');
      } else if (separator && separator !== ', ') {
        parts.push(`separator: '${separator}'`);
      }
    }

    if (order === 'desc') {
      parts.push('order: desc');
    }

    if (prefix && prefix !== 'none') {
      parts.push(`prefix: ${prefix}`);
    }

    if (indent > 0) {
      parts.push(`indent: ${indent}`);
    }

    if (limit && Number(limit) > 0) {
      parts.push(`limit: ${limit}`);
    }

    return `<${parts.join(', ')}>`;
  }, [direction, separator, order, prefix, limit, indent]);

  // Dynamic user-friendly description:
  const descriptionText = useMemo(() => {
    if (separator === 'cell') {
      return direction === 'horizontal'
        ? 'Horizontal across consecutive table cells (→ <td>)'
        : 'Vertical across consecutive table rows (↓ <tr>)';
    }
    const pfxText = prefix !== 'none' ? `, ${prefix} list` : '';
    const limitText = limit ? `, max ${limit}` : '';
    const indentText = indent > 0 ? `, ${indent}sp indent` : '';

    if (direction === 'vertical') {
      const orderText = order === 'desc' ? 'Bottom-to-Top' : 'Top-to-Bottom';
      const sepDesc = separator === 'newline' ? 'lines' : `separated by "${separator}"`;
      return `Vertical ${sepDesc} (${orderText})${pfxText}${limitText}${indentText}`;
    } else {
      const sepDesc = separator === ', ' ? 'comma' : separator === ' • ' ? 'bullet (•)' : separator === ' - ' ? 'dash (-)' : separator === 'newline' ? 'new line' : `"${separator}"`;
      const orderDesc = order === 'desc' ? ' (Reverse)' : '';
      return `Horizontal inline separated by ${sepDesc}${orderDesc}${pfxText}${limitText}${indentText}`;
    }
  }, [direction, separator, order, prefix, limit, indent]);

  const handleInsertAndCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    onInsertKey?.(snippet);
  };

  const directionOptions = [
    { value: 'vertical', label: 'Vertical' },
    { value: 'horizontal', label: 'Horizontal' },
  ];

  const prefixOptions = [
    { value: 'none', label: 'None' },
    { value: 'number', label: '1. 2. 3. (Numbered)' },
    { value: 'bullet', label: '• (Bullet)' },
    { value: 'dash', label: '- (Dash)' },
  ];

  const orderOptions = useMemo(() => {
    return direction === 'vertical'
      ? [
          { value: 'asc', label: 'Top-to-Bottom' },
          { value: 'desc', label: 'Bottom-to-Top' },
        ]
      : [
          { value: 'asc', label: 'Left-to-Right' },
          { value: 'desc', label: 'Right-to-Left' },
        ];
  }, [direction]);

  const separatorOptions = useMemo(() => {
    return direction === 'vertical'
      ? [
          { value: 'newline', label: 'New Line (<br>)' },
          { value: 'cell', label: 'Next Table Row (↓ <tr>)' },
          { value: ', ', label: 'Comma (,)' },
          { value: ' • ', label: 'Bullet (•)' },
          { value: ' - ', label: 'Dash (-)' },
          { value: ' | ', label: 'Pipe (|)' },
          { value: '  ', label: 'Space ( )' },
        ]
      : [
          { value: ', ', label: 'Comma (,)' },
          { value: 'cell', label: 'Next Table Cell (→ <td>)' },
          { value: ' • ', label: 'Bullet (•)' },
          { value: ' - ', label: 'Dash (-)' },
          { value: ' / ', label: 'Slash (/)' },
          { value: ' | ', label: 'Pipe (|)' },
          { value: '  ', label: 'Space ( )' },
          { value: 'newline', label: 'New Line (<br>)' },
        ];
  }, [direction]);

  return (
    <DocLabItemCard
      title="Data Direction"
      titleClassName="text-xs font-bold theme-text-primary"
      description={descriptionText}
      collapsible={true}
      defaultExpanded={true}
      storageKey="spr_doclab_tokens_rule_direction"
    >
      <div className="space-y-2.5 pt-1 text-left">
        {/* Row 1: Direction & Flow Order */}
        <div className="grid grid-cols-2 gap-2.5">
          <CustomSelect
            label="Direction"
            options={directionOptions}
            value={direction}
            onChange={(val: any) => handleDirectionChange(val || 'vertical')}
            size="xs"
          />
          <CustomSelect
            label="Flow Order"
            options={orderOptions}
            value={order}
            onChange={(val: any) => setOrder(val || 'asc')}
            size="xs"
          />
        </div>

        {/* Row 2: Separator & Limit Items */}
        <div className="grid grid-cols-2 gap-2.5">
          <CustomSelect
            label="Separator"
            options={separatorOptions}
            value={separator}
            onChange={(val: any) => setSeparator(val !== undefined ? String(val) : (direction === 'vertical' ? 'newline' : ', '))}
            size="xs"
          />
          <CustomInput
            label="Limit Items"
            type="number"
            size="xs"
            min={1}
            max={99}
            allowDecimals={false}
            scrollable={true}
            value={limit}
            placeholder="All Items"
            onChange={(val: any) => {
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              if (!rawStr) {
                setLimit('');
                return;
              }
              const num = parseInt(rawStr, 10);
              if (!isNaN(num) && num >= 1 && num <= 99) setLimit(String(num));
            }}
            title="Max items to include (empty for all)"
          />
        </div>

        {/* Row 3: Prefix Style & Indent */}
        <div className="grid grid-cols-2 gap-2.5">
          <CustomSelect
            label="Prefix Style"
            options={prefixOptions}
            value={prefix}
            onChange={(val: any) => setPrefix(val || 'none')}
            size="xs"
          />
          <CustomInput
            label="Indent"
            type="number"
            size="xs"
            min={0}
            max={30}
            allowDecimals={false}
            scrollable={true}
            value={indent}
            onChange={(val: any) => {
              const rawStr = typeof val === 'string' ? val : val?.target?.value;
              const num = parseInt(rawStr, 10);
              if (!isNaN(num) && num >= 0 && num <= 30) setIndent(num);
            }}
            title="Number of indent spaces (0-30)"
          />
        </div>

        {/* ─── Bottom Full-Width Generated Snippet with Multi-Line Word Wrap ─── */}
        <div
          onClick={handleInsertAndCopy}
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
            title="Click to copy and insert snippet"
            ariaLabel="Copy snippet"
            className={`shrink-0 mt-0.5 ${copied ? 'theme-accent' : 'theme-text-secondary hover:theme-text-primary'}`}
          />
        </div>
      </div>
    </DocLabItemCard>
  );
};

export default DocLabDirectionRuleCard;

import React, { useState, useMemo } from 'react';
import IconButton from '@/components/ui/IconButton';
import {
  CopyIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import { DrawerSection } from '@/components/layout/DrawerContainer';
import {
  KeyTaxonomyItem,
  DocumentScopeDefinition,
  ScopeValidationResult,
  KEY_CATEGORY_METADATA,
  createDynamicKeyItem,
} from '@/components/print/keyLibrary';
import { DocLabItemCard } from '../DocLabItemCard';
import { DocLabDirectionRuleCard } from './DocLabDirectionRuleCard';
import { DocLabIndentRuleCard } from './DocLabIndentRuleCard';

export interface KeyPaletteExplorerProps {
  onInsertKey?: (keyToken: string) => void;
  activeRecord?: Record<string, any>;
  placeholderKeys?: KeyTaxonomyItem[];
  requiredKeys?: string[];
  scopeDefinition?: DocumentScopeDefinition;
  activeScopeValidation?: ScopeValidationResult | null;
  scopeId?: string;
  scopeName?: string;
  className?: string;
}

const EMPTY_PLACEHOLDER_KEYS: KeyTaxonomyItem[] = [];
const EMPTY_REQUIRED_KEYS: string[] = [];

/**
 * KeyPaletteExplorer
 * 
 * Clean, lightweight token explorer for DocLab Studio with collapsible category cards.
 * Displays exclusively the dynamic schema requirement tokens for the active module/scope.
 */
export default function KeyPaletteExplorer({
  onInsertKey,
  activeRecord = {},
  placeholderKeys = EMPTY_PLACEHOLDER_KEYS,
  requiredKeys = EMPTY_REQUIRED_KEYS,
  scopeDefinition,
  activeScopeValidation = null,
  scopeId = 'general_document',
  scopeName = '',
  className = '',
}: KeyPaletteExplorerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Set of effective required keys for the active document blueprint
  const effectiveRequiredKeyList = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(requiredKeys)) {
      requiredKeys.forEach((k) => {
        const trimmed = (k || '').toLowerCase().trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    if (scopeDefinition?.requiredKeys && Array.isArray(scopeDefinition.requiredKeys)) {
      scopeDefinition.requiredKeys.forEach((k) => {
        const trimmed = (k || '').toLowerCase().trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    return list;
  }, [requiredKeys, scopeDefinition?.requiredKeys]);

  // Derive keys strictly and exclusively from the current template's requirement keys
  const allKeys = useMemo<KeyTaxonomyItem[]>(() => {
    const map = new Map<string, KeyTaxonomyItem>();

    // 1. If explicit placeholderKeys are passed for this template, use those requirement keys
    if (Array.isArray(placeholderKeys) && placeholderKeys.length > 0) {
      placeholderKeys.forEach((k) => {
        if (k && k.key) {
          const lower = k.key.toLowerCase().trim();
          const liveVal = activeRecord?.[k.key] ?? activeRecord?.[lower];
          map.set(lower, {
            ...k,
            example:
              liveVal !== undefined && liveVal !== null && liveVal !== ''
                ? String(liveVal)
                : k.example || '',
          });
        }
      });
    }

    // 2. Ensure all required blueprint keys defined for this active template exist
    effectiveRequiredKeyList.forEach((rk) => {
      const lower = rk.toLowerCase().trim();
      if (lower && !map.has(lower)) {
        const liveVal = activeRecord?.[rk] ?? activeRecord?.[lower];
        map.set(
          lower,
          createDynamicKeyItem(
            rk,
            rk.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            (scopeDefinition?.category?.toLowerCase() as any) || 'academic',
            liveVal !== undefined && liveVal !== null && liveVal !== '' ? String(liveVal) : '',
            'Required template variable'
          )
        );
      }
    });

    return Array.from(map.values());
  }, [placeholderKeys, effectiveRequiredKeyList, activeRecord, scopeDefinition?.category]);

  // Group requirement keys by category
  const groupedKeys = useMemo(() => {
    const map = new Map<string, KeyTaxonomyItem[]>();
    allKeys.forEach((item) => {
      const cat = item.category || 'general';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    });

    return Array.from(map.entries()).map(([catKey, items]) => {
      const meta = KEY_CATEGORY_METADATA[catKey] || {
        label: catKey.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `${items.length} document variables`,
      };
      return {
        categoryKey: catKey,
        label: meta.label,
        description: meta.description,
        items,
      };
    });
  }, [allKeys]);

  // Copy token to clipboard
  const handleCopyKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = `{{${key}}}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(token);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ─── 1. Template Required Keys Section ─── */}
      <DrawerSection
        title="Required Keys for This Template"
        className="!pt-0 !space-y-2.5"
      >
        {groupedKeys.length > 0 ? (
          groupedKeys.map((group) => (
            <DocLabItemCard
              key={group.categoryKey}
              storageKey={`spr_doclab_tokens_cat_${group.categoryKey}`}
              title={group.label}
              titleClassName="text-xs font-bold theme-text-primary"
              description={group.description}
              badge={
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase theme-bg-sub theme-text-secondary border theme-border-subtle">
                  {group.items.length} {group.items.length === 1 ? 'key' : 'keys'}
                </span>
              }
              collapsible={true}
              defaultExpanded={true}
            >
              <div className="space-y-1.5 pt-1">
                {group.items.map((item) => {
                  const token = `{{${item.key}}}`;
                  const isCopied = copiedKey === item.key;
                  const liveValue = activeRecord ? activeRecord[item.key] : undefined;
                  const itemKeyLower = item.key.toLowerCase();
                  const isMatched = activeScopeValidation?.matchedRequiredKeys?.some(
                    (k) => (k || '').toLowerCase() === itemKeyLower
                  );

                  return (
                    <div
                      key={item.key}
                      onClick={() => onInsertKey?.(token)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="group/item relative p-2 rounded-lg border theme-border-subtle theme-bg-surface hover:theme-border-accent-soft hover:theme-bg-sub/40 transition-all cursor-pointer flex items-center justify-between gap-2 select-none active:scale-[0.99]"
                      title={`Click to insert ${token} at cursor in document`}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="font-mono text-[11px] font-bold theme-accent truncate">
                            {token}
                          </code>
                          {isMatched && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider theme-bg-accent-soft theme-accent border theme-border-accent-soft">
                              Used
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] theme-text-secondary truncate mt-0.5 leading-tight">
                          {item.label}
                          {liveValue !== undefined && liveValue !== null && liveValue !== '' ? (
                            <span className="theme-text-muted italic ml-1.5">
                              (Live: &quot;{String(liveValue)}&quot;)
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <IconButton
                        icon={isCopied ? CheckCircleIcon : CopyIcon}
                        variant={isCopied ? 'accent-soft' : 'ghost'}
                        size="xs"
                        onClick={(e) => handleCopyKey(item.key, e)}
                        title="Copy token to clipboard"
                        ariaLabel="Copy token"
                        className={`shrink-0 ${isCopied ? 'theme-accent' : 'theme-text-secondary hover:theme-text-primary'}`}
                      />
                    </div>
                  );
                })}
              </div>
            </DocLabItemCard>
          ))
        ) : (
          <div className="py-6 text-center theme-text-secondary text-xs">
            No requirement tokens defined for this document template.
          </div>
        )}
      </DrawerSection>

      {/* ─── 2. Directive Rules Section (Data Direction & Indentation) ─── */}
      <DrawerSection
        title="Layout & Formatting Directives"
        className="!pt-3 !space-y-2.5"
      >
        <DocLabDirectionRuleCard onInsertKey={onInsertKey} />
        <DocLabIndentRuleCard onInsertKey={onInsertKey} />
      </DrawerSection>
    </div>
  );
}

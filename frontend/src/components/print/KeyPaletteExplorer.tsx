import React, { useState, useMemo } from 'react';
import { CustomInput } from '../ui';
import {
  SearchIcon,
  CopyIcon,
  CheckCircleIcon,
} from '../ui/Icons';
import {
  KeyTaxonomyItem,
  DocumentScopeDefinition,
  ScopeValidationResult,
} from './keyLibrary';

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
 * Clean, lightweight token explorer for DocLab Studio.
 * Displays exclusively the required tokens for the active module/scope.
 * Category tabs and unnecessary global taxonomy keys are eliminated.
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Derive keys strictly scoped to the active module's required keys
  const allKeys = useMemo<KeyTaxonomyItem[]>(() => {
    const map = new Map<string, KeyTaxonomyItem>();

    // 1. If explicit placeholderKeys are passed from the active module, prioritize and use them
    if (Array.isArray(placeholderKeys) && placeholderKeys.length > 0) {
      placeholderKeys.forEach((k) => {
        if (k && k.key) {
          map.set(k.key.toLowerCase(), k);
        }
      });
    }

    // 2. Ensure all required keys defined for this scope exist in map
    effectiveRequiredKeyList.forEach((rk) => {
      const lower = rk.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, {
          key: rk,
          label: rk.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          category: 'academic',
          example: '',
          description: 'Required document blueprint variable',
        });
      }
    });

    return Array.from(map.values());
  }, [placeholderKeys, effectiveRequiredKeyList]);

  // Filter keys solely based on search query
  const filteredKeys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allKeys;

    return allKeys.filter((item) => {
      const matchesKey = item.key.toLowerCase().includes(q);
      const matchesLabel = item.label.toLowerCase().includes(q);
      const matchesDesc = (item.description || '').toLowerCase().includes(q);
      return matchesKey || matchesLabel || matchesDesc;
    });
  }, [allKeys, searchQuery]);

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
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <CustomInput
        placeholder="Search required keys (e.g. student-name, juz)..."
        value={searchQuery}
        onChange={(val: any) => setSearchQuery(typeof val === 'string' ? val : val?.target?.value ?? '')}
        icon={SearchIcon}
        size="sm"
        className="w-full"
      />

      {/* Required Taxonomy Keys List */}
      <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5">
        {filteredKeys.length > 0 ? (
          filteredKeys.map((item) => {
            const token = `{{${item.key}}}`;
            const isCopied = copiedKey === item.key;
            const liveValue = activeRecord ? activeRecord[item.key] : undefined;
            const itemKeyLower = item.key.toLowerCase();
            const isMatched = activeScopeValidation?.matchedRequiredKeys?.some(
              (k) => (k || '').toLowerCase() === itemKeyLower
            );
            const isMissing = activeScopeValidation?.missingRequiredKeys?.some(
              (k) => (k || '').toLowerCase() === itemKeyLower
            );

            return (
              <div
                key={item.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsertKey?.(token)}
                className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-[0.99] ${
                  isMissing
                    ? 'border-amber-500/40 theme-bg-sub/80 hover:border-amber-500'
                    : isMatched
                    ? 'theme-border-accent/40 theme-bg-sub/60 hover:border-[var(--accent-main)]'
                    : 'theme-border theme-card hover:border-[var(--accent-main)] hover:theme-bg-sub'
                }`}
                title={`Click to insert ${token} at cursor in document`}
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] font-bold theme-accent truncate">
                      {token}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                        isMatched
                          ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30'
                          : isMissing
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                      }`}
                    >
                      {isMatched ? 'Used' : isMissing ? 'Missing' : 'Required'}
                    </span>
                  </div>

                  <div className="text-[11px] theme-text-secondary truncate mt-0.5">
                    {item.label}
                  </div>

                  {liveValue && (
                    <div className="text-[10px] theme-text-muted truncate mt-0.5 italic">
                      Live: &quot;{String(liveValue)}&quot;
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyKey(item.key, e)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isCopied
                        ? 'border-[var(--accent-main)] theme-accent theme-bg-accent-soft'
                        : 'theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                    }`}
                    title="Copy token to clipboard"
                  >
                    {isCopied ? (
                      <CheckCircleIcon className="w-3.5 h-3.5 theme-accent" />
                    ) : (
                      <CopyIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center theme-text-secondary text-xs">
            No keys match &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

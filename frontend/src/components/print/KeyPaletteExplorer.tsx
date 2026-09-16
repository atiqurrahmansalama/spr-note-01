import React, { useState, useMemo } from 'react';
import { CustomInput, CustomButton } from '../ui';
import {
  SearchIcon,
  CopyIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
} from '../ui/Icons';
import {
  getAllTaxonomyKeys,
  saveCustomUserKey,
  deleteCustomUserKey,
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
 * Interactive Key Library explorer and token insertion palette for the DocLab sidebar.
 * Includes dedicated Required Tokens tab, category filter, instant token insertion, and custom key creation.
 * Pure memoized architecture to eliminate any re-render loops or memory leaks.
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customVersion, setCustomVersion] = useState(0);

  // Add Custom Key Form State
  const [isAddingCustomKey, setIsAddingCustomKey] = useState(false);
  const [customKeyName, setCustomKeyName] = useState('');
  const [customKeyLabel, setCustomKeyLabel] = useState('');
  const [customDefaultValue, setCustomDefaultValue] = useState('');

  // Set of effective required keys for the active document blueprint (string comparison)
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

  const effectiveRequiredKeySet = useMemo(() => {
    return new Set(effectiveRequiredKeyList);
  }, [effectiveRequiredKeyList]);

  // Derive all taxonomy keys without any useEffect state mutations
  const allKeys = useMemo<KeyTaxonomyItem[]>(() => {
    const defaultKeys = getAllTaxonomyKeys();
    const map = new Map<string, KeyTaxonomyItem>();

    if (Array.isArray(placeholderKeys) && placeholderKeys.length > 0) {
      placeholderKeys.forEach((k) => {
        if (k && k.key) map.set(k.key.toLowerCase(), k);
      });
    }

    defaultKeys.forEach((k) => {
      if (!map.has(k.key.toLowerCase())) {
        map.set(k.key.toLowerCase(), k);
      }
    });

    // Ensure all required keys exist in map
    effectiveRequiredKeyList.forEach((rk) => {
      if (!map.has(rk)) {
        map.set(rk, {
          key: rk,
          label: rk.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          category: 'academic',
          example: '',
          description: 'Required document blueprint variable',
        });
      }
    });

    return Array.from(map.values());
  }, [placeholderKeys, effectiveRequiredKeyList, customVersion]);

  const categories = useMemo(() => {
    const list = [
      { id: 'all', label: 'All' },
    ];
    if (effectiveRequiredKeyList.length > 0) {
      list.push({
        id: 'required',
        label: `Required (${effectiveRequiredKeyList.length})`,
      });
    }
    list.push(
      { id: 'student', label: 'Student' },
      { id: 'guardian', label: 'Guardian' },
      { id: 'academic', label: 'Academic' },
      { id: 'hifz', label: 'Hifz / Quran' },
      { id: 'exam', label: 'Exam' },
      { id: 'finance', label: 'Finance' },
      { id: 'staff', label: 'Staff / HR' },
      { id: 'institution', label: 'Institution' },
      { id: 'system', label: 'System' },
      { id: 'signatures', label: 'Signatures' },
      { id: 'custom', label: 'Custom' },
    );
    return list;
  }, [effectiveRequiredKeyList.length]);

  const filteredKeys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allKeys.filter((item) => {
      const itemKeyLower = item.key.toLowerCase();
      if (selectedCategory === 'required') {
        if (!effectiveRequiredKeySet.has(itemKeyLower)) {
          return false;
        }
      } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (q) {
        const matchesKey = item.key.toLowerCase().includes(q);
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesKey && !matchesLabel && !matchesDesc) return false;
      }
      return true;
    });
  }, [allKeys, selectedCategory, effectiveRequiredKeySet, searchQuery]);

  const handleCopyKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = `{{${key}}}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(token);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const handleSaveCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKeyName.trim()) return;

    saveCustomUserKey({
      key: customKeyName,
      label: customKeyLabel || customKeyName,
      defaultValue: customDefaultValue,
      category: 'custom',
    });

    setCustomKeyName('');
    setCustomKeyLabel('');
    setCustomDefaultValue('');
    setIsAddingCustomKey(false);
    setCustomVersion((v) => v + 1);
  };

  const handleDeleteCustomKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete custom key "{{${key}}}"?`)) {
      deleteCustomUserKey(key);
      setCustomVersion((v) => v + 1);
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Search Input */}
      <CustomInput
        placeholder="Search data keys (e.g. name, marks)..."
        value={searchQuery}
        onChange={(val: any) => setSearchQuery(typeof val === 'string' ? val : val?.target?.value ?? '')}
        icon={SearchIcon}
        size="sm"
        className="w-full"
      />

      {/* Category Pills with Dedicated Required Tab */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const isRequiredCat = cat.id === 'required';

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? isRequiredCat
                    ? 'theme-bg-accent text-white shadow-xs font-bold border border-[var(--accent-main)]'
                    : 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 shadow-2xs font-bold'
                  : isRequiredCat
                  ? 'theme-bg-accent-soft/50 theme-accent border border-[var(--accent-main)]/20 hover:theme-bg-accent-soft'
                  : 'theme-text-secondary hover:theme-bg-sub border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Quick "Add Custom Key" toggle */}
      <div>
        {!isAddingCustomKey ? (
          <button
            type="button"
            onClick={() => setIsAddingCustomKey(true)}
            className="w-full py-1.5 px-2.5 rounded-xl border border-dashed theme-border text-xs font-semibold theme-text-secondary hover:theme-accent hover:border-[var(--accent-main)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Create Custom Key</span>
          </button>
        ) : (
          <form
            onSubmit={handleSaveCustomKey}
            className="p-3 rounded-xl border theme-border theme-bg-sub/60 space-y-2.5 animate-fade-in text-left"
          >
            <div className="text-xs font-bold theme-text-primary flex items-center justify-between">
              <span>New Custom Key</span>
              <button
                type="button"
                onClick={() => setIsAddingCustomKey(false)}
                className="text-[11px] theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <CustomInput
              label="Key Identifier"
              placeholder="e.g. hostel_bed_no"
              value={customKeyName}
              onChange={(val: any) => setCustomKeyName(typeof val === 'string' ? val : val?.target?.value ?? '')}
              size="sm"
              required
            />

            <CustomInput
              label="Display Label"
              placeholder="e.g. Hostel Bed Number"
              value={customKeyLabel}
              onChange={(val: any) => setCustomKeyLabel(typeof val === 'string' ? val : val?.target?.value ?? '')}
              size="sm"
              required
            />

            <CustomInput
              label="Default Fallback Value"
              placeholder="e.g. Bed-104"
              value={customDefaultValue}
              onChange={(val: any) => setCustomDefaultValue(typeof val === 'string' ? val : val?.target?.value ?? '')}
              size="sm"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <CustomButton
                type="submit"
                variant="primary"
                size="sm"
                className="text-xs w-full"
              >
                Save Custom Key
              </CustomButton>
            </div>
          </form>
        )}
      </div>

      {/* 4. Taxonomy Keys List */}
      <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-0.5">
        {filteredKeys.length > 0 ? (
          filteredKeys.map((item) => {
            const token = `{{${item.key}}}`;
            const isCopied = copiedKey === item.key;
            const liveValue = activeRecord ? activeRecord[item.key] : undefined;
            const itemKeyLower = item.key.toLowerCase();
            const isRequired = effectiveRequiredKeySet.has(itemKeyLower);
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
                className={`group p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-[0.99] ${
                  isRequired
                    ? isMissing
                      ? 'border-[var(--accent-main)]/40 theme-bg-sub/80 hover:border-[var(--accent-main)]'
                      : 'theme-border-accent/40 theme-bg-sub/60 hover:border-[var(--accent-main)]'
                    : 'theme-border theme-card hover:border-[var(--accent-main)] hover:theme-bg-sub'
                }`}
                title={`Click to insert ${token} at cursor in document`}
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] font-bold theme-accent truncate">
                      {token}
                    </span>

                    {/* Required / Scope Status Badge */}
                    {isRequired && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                          isMatched
                            ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30'
                            : isMissing
                            ? 'theme-bg-elevated theme-text-primary border theme-border font-bold'
                            : 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20'
                        }`}
                      >
                        {isMatched ? 'Required' : isMissing ? 'Required (Missing)' : 'Required'}
                      </span>
                    )}

                    {item.isCustom && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold theme-bg-surface theme-text-secondary border theme-border">
                        Custom
                      </span>
                    )}
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
                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomKey(item.key, e)}
                      className="p-1 theme-text-muted hover:theme-text-primary rounded transition-colors cursor-pointer"
                      title="Delete custom key"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

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
            {selectedCategory === 'required'
              ? 'No required keys defined for this document scope'
              : `No keys match "${searchQuery}"`}
          </div>
        )}
      </div>
    </div>
  );
}

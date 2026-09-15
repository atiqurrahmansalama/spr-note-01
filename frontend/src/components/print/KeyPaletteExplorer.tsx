import React, { useState, useMemo } from 'react';
import { CustomInput, CustomButton } from '../ui';
import {
  SearchIcon,
  CopyIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
} from '../ui/Icons';
import {
  getAllTaxonomyKeys,
  saveCustomUserKey,
  deleteCustomUserKey,
  KeyCategory,
  KeyTaxonomyItem,
} from './keyLibrary';

export interface KeyPaletteExplorerProps {
  onInsertKey?: (keyToken: string) => void;
  activeRecord?: Record<string, any>;
  placeholderKeys?: KeyTaxonomyItem[];
  className?: string;
}

/**
 * KeyPaletteExplorer
 * Interactive Key Library explorer and token insertion palette for the Print Studio sidebar.
 */
export default function KeyPaletteExplorer({
  onInsertKey,
  activeRecord = {},
  placeholderKeys = [],
  className = '',
}: KeyPaletteExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [allKeys, setAllKeys] = useState<KeyTaxonomyItem[]>(() => {
    const defaultKeys = getAllTaxonomyKeys();
    if (!placeholderKeys || placeholderKeys.length === 0) return defaultKeys;
    const map = new Map<string, KeyTaxonomyItem>();
    placeholderKeys.forEach((k) => map.set(k.key.toLowerCase(), k));
    defaultKeys.forEach((k) => {
      if (!map.has(k.key.toLowerCase())) {
        map.set(k.key.toLowerCase(), k);
      }
    });
    return Array.from(map.values());
  });

  // Re-sync if placeholderKeys changes
  useEffect(() => {
    const defaultKeys = getAllTaxonomyKeys();
    if (!placeholderKeys || placeholderKeys.length === 0) {
      setAllKeys(defaultKeys);
      return;
    }
    const map = new Map<string, KeyTaxonomyItem>();
    placeholderKeys.forEach((k) => map.set(k.key.toLowerCase(), k));
    defaultKeys.forEach((k) => {
      if (!map.has(k.key.toLowerCase())) {
        map.set(k.key.toLowerCase(), k);
      }
    });
    setAllKeys(Array.from(map.values()));
  }, [placeholderKeys]);

  // Add Custom Key Form State
  const [isAddingCustomKey, setIsAddingCustomKey] = useState(false);
  const [customKeyName, setCustomKeyName] = useState('');
  const [customKeyLabel, setCustomKeyLabel] = useState('');
  const [customDefaultValue, setCustomDefaultValue] = useState('');

  const refreshKeys = () => {
    const defaultKeys = getAllTaxonomyKeys();
    if (!placeholderKeys || placeholderKeys.length === 0) {
      setAllKeys(defaultKeys);
      return;
    }
    const map = new Map<string, KeyTaxonomyItem>();
    placeholderKeys.forEach((k) => map.set(k.key.toLowerCase(), k));
    defaultKeys.forEach((k) => {
      if (!map.has(k.key.toLowerCase())) {
        map.set(k.key.toLowerCase(), k);
      }
    });
    setAllKeys(Array.from(map.values()));
  };

  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'All' },
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
    ];
  }, []);

  const filteredKeys = useMemo(() => {
    return allKeys.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = item.key.toLowerCase().includes(q);
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesKey && !matchesLabel && !matchesDesc) return false;
      }
      return true;
    });
  }, [allKeys, selectedCategory, searchQuery]);

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
    refreshKeys();
  };

  const handleDeleteCustomKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete custom key "{{${key}}}"?`)) {
      deleteCustomUserKey(key);
      refreshKeys();
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Search Input */}
      <CustomInput
        placeholder="Search data keys (e.g. name, marks)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        icon={SearchIcon}
        size="sm"
        className="w-full"
      />

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 shadow-2xs'
                : 'theme-text-secondary hover:theme-bg-sub border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
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
                className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <CustomInput
              label="Key Identifier"
              placeholder="e.g. hostel_bed_no"
              value={customKeyName}
              onChange={(e) => setCustomKeyName(e.target.value)}
              size="sm"
              required
            />

            <CustomInput
              label="Human Label"
              placeholder="e.g. Hostel Bed Number"
              value={customKeyLabel}
              onChange={(e) => setCustomKeyLabel(e.target.value)}
              size="sm"
            />

            <CustomInput
              label="Default Fallback Value"
              placeholder="e.g. Bed #12 (Dorm A)"
              value={customDefaultValue}
              onChange={(e) => setCustomDefaultValue(e.target.value)}
              size="sm"
            />

            <div className="flex justify-end gap-2 pt-1">
              <CustomButton
                type="submit"
                variant="primary"
                size="xs"
              >
                Save Custom Key
              </CustomButton>
            </div>
          </form>
        )}
      </div>

      {/* Key Items List */}
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredKeys.length > 0 ? (
          filteredKeys.map((item) => {
            const token = `{{${item.key}}}`;
            const liveValue = activeRecord[item.key] || item.example;
            const isCopied = copiedKey === item.key;

            return (
              <div
                key={item.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsertKey?.(token)}
                className="group p-2 rounded-xl border theme-border theme-card hover:border-[var(--accent-main)] hover:theme-bg-sub transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-[0.99]"
                title={`Click to insert ${token} at cursor in document`}
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">
                      {token}
                    </span>
                    {item.isCustom && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600">
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
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
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
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                        : 'theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                    }`}
                    title="Copy token to clipboard"
                  >
                    {isCopied ? (
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
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

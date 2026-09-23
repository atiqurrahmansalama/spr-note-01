import React, { useMemo } from 'react';
import KeyPaletteExplorer from '../../KeyPaletteExplorer';
import { SparklesIcon } from '../../../ui/Icons';
import { DocumentScopeDefinition, ScopeValidationResult } from '../../keyLibrary/types';

interface DocLabKeysTabProps {
  scopeDefinition?: DocumentScopeDefinition;
  activeScopeValidation?: ScopeValidationResult | null;
  placeholderKeys?: any[];
  requiredKeys?: string[];
  activeRecord?: Record<string, any>;
  onInsertKey?: (keyObj: any) => void;
  scopeId?: string;
  scopeName?: string;
}

const EMPTY_PLACEHOLDER_KEYS: any[] = [];
const EMPTY_REQUIRED_KEYS: string[] = [];
const EMPTY_RECORD: Record<string, any> = {};

/**
 * DocLabKeysTab
 * Token Explorer & Scope Blueprint for dynamic document key insertion into live canvas.
 * Highlights Required Tokens, Blueprint Completion, and Category filtering.
 */
export const DocLabKeysTab: React.FC<DocLabKeysTabProps> = ({
  scopeDefinition,
  activeScopeValidation,
  placeholderKeys = EMPTY_PLACEHOLDER_KEYS,
  requiredKeys = EMPTY_REQUIRED_KEYS,
  activeRecord = EMPTY_RECORD,
  onInsertKey,
  scopeId = 'general_document',
  scopeName = '',
}) => {
  const effectiveRequiredKeys = useMemo(() => {
    if (Array.isArray(requiredKeys) && requiredKeys.length > 0) {
      return requiredKeys;
    }
    return scopeDefinition?.requiredKeys || EMPTY_REQUIRED_KEYS;
  }, [requiredKeys, scopeDefinition?.requiredKeys]);

  const totalRequired = effectiveRequiredKeys.length;
  const matchedRequired = activeScopeValidation?.matchedRequiredKeys?.length || 0;
  const isComplete = totalRequired > 0 && matchedRequired >= totalRequired;

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Scope Blueprint Progress Card */}
      {totalRequired > 0 && (
        <div className="p-3.5 rounded-xl border theme-border-subtle theme-bg-sub/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 theme-accent" />
              <span>{scopeName || scopeDefinition?.name || 'Document Blueprint'}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                isComplete
                  ? 'theme-bg-accent-soft theme-accent border theme-border-accent-soft'
                  : 'theme-bg-surface theme-text-secondary border theme-border-subtle'
              }`}
            >
              {matchedRequired} / {totalRequired} Required
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full theme-bg-surface border theme-border-subtle overflow-hidden">
            <div
              className="h-full theme-bg-accent transition-all duration-300"
              style={{
                width: `${totalRequired > 0 ? Math.min(100, (matchedRequired / totalRequired) * 100) : 100}%`,
              }}
            />
          </div>

          <p className="text-[11px] theme-text-secondary leading-tight">
            Click any field below to insert <code className="text-[10px] font-mono theme-text-primary theme-bg-surface border theme-border-subtle px-1.5 py-0.5 rounded-md">{'{{token}}'}</code> at your active cursor position on the document canvas.
          </p>
        </div>
      )}

      {/* 2. Key Palette Explorer Component with Dedicated Required Tab */}
      <KeyPaletteExplorer
        placeholderKeys={placeholderKeys}
        requiredKeys={effectiveRequiredKeys}
        scopeDefinition={scopeDefinition}
        activeScopeValidation={activeScopeValidation}
        scopeId={scopeId}
        scopeName={scopeName}
        activeRecord={activeRecord}
        onInsertKey={onInsertKey}
      />
    </div>
  );
};

export default DocLabKeysTab;

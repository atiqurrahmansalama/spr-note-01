import React, { useMemo } from 'react';
import KeyPaletteExplorer from '../../KeyPaletteExplorer';
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

  return (
    <div className="space-y-3 pt-1 pb-6 text-left">
      {/* Guidance Helper Text */}
      <p className="text-[11px] theme-text-secondary leading-tight">
        Click any field below to insert <code className="text-[10px] font-mono theme-text-primary theme-bg-surface border theme-border-subtle px-1.5 py-0.5 rounded-md">{'{{token}}'}</code> at your active cursor position on the document canvas.
      </p>

      {/* Key Palette Explorer Component */}
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

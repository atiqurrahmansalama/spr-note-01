import React, { useState, useMemo } from 'react';
import DrawerContainer from '../layout/DrawerContainer';
import {
  DocLabTemplatesTab,
  DocLabKeysTab,
  DocLabLayoutTab,
} from './components/sidebar';
import {
  SparklesIcon,
  BookOpenIcon,
  AdjustmentsHorizontalIcon,
} from '../ui/Icons';
import { getScopeById, validateTemplateForScope } from './scopeTemplateStore';
import { DocxTemplate, PrintOptions } from './types';
import { DocumentScopeDefinition, ScopeValidationResult } from './keyLibrary/types';

export interface DocLabSidebarProps {
  options?: Partial<PrintOptions>;
  onOptionsChange?: (options: Partial<PrintOptions>) => void;
  templates?: DocxTemplate[];
  customDocxTemplate?: DocxTemplate | null;
  activeTemplateId?: string | null;
  onTemplateChange?: (template: DocxTemplate) => void;
  onOpenTemplateLibrary?: () => void;
  onDeleteDocxTemplate?: (template: DocxTemplate) => void;
  onSaveCurrentTemplate?: (name: string, docType: 'template' | 'generated') => void;
  onDuplicateDocxTemplate?: (template: DocxTemplate) => void;
  onUpdateDocxTemplate?: (templateId: string, updates: { name?: string; description?: string }) => void;
  onSetScopeDefault?: (templateId: string) => void;
  scopeId?: string;
  scopeName?: string;
  scopeDescription?: string;
  placeholderKeys?: any[];
  requiredKeys?: string[];
  onToggleScopeDefault?: (templateId: string) => void;
  isScopeDefault?: boolean;
  onInsertKey?: (keyObj: any) => void;
  activeRecord?: Record<string, any>;
  docxRenderMode?: 'template' | 'sample' | 'all';
  onDocxRenderModeChange?: (mode: 'template' | 'sample' | 'all') => void;
  totalRecordsCount?: number;
  onResetDefaults?: () => void;
  onClose?: () => void;
  width?: number;
  isResizing?: boolean;
  onStartResize?: (e: React.MouseEvent) => void;
  onResetResize?: () => void;
  className?: string;
}

const EMPTY_TEMPLATES: DocxTemplate[] = [];
const EMPTY_PLACEHOLDER_KEYS: any[] = [];
const EMPTY_REQUIRED_KEYS: string[] = [];
const EMPTY_RECORD: Record<string, any> = {};
const EMPTY_OPTIONS: Partial<PrintOptions> = {};

/**
 * DocLabSidebar
 * Master Document Studio Right Sidebar Panel.
 * Decomposed into modular tabs: Templates, Blueprint Tokens & Rules, and Layout (with Signatures).
 */
export const DocLabSidebar: React.FC<DocLabSidebarProps> = ({
  options = EMPTY_OPTIONS,
  onOptionsChange = () => {},
  templates = EMPTY_TEMPLATES,
  customDocxTemplate = null,
  activeTemplateId = null,
  onTemplateChange = () => {},
  onOpenTemplateLibrary,
  onDeleteDocxTemplate,
  onSaveCurrentTemplate,
  onDuplicateDocxTemplate,
  onUpdateDocxTemplate,
  scopeId = 'general_document',
  scopeName = '',
  scopeDescription = '',
  placeholderKeys = EMPTY_PLACEHOLDER_KEYS,
  requiredKeys = EMPTY_REQUIRED_KEYS,
  onToggleScopeDefault,
  isScopeDefault = false,
  onInsertKey,
  activeRecord = EMPTY_RECORD,
  docxRenderMode = 'template',
  onDocxRenderModeChange,
  totalRecordsCount = 0,
  onResetDefaults,
  onClose,
  width,
  isResizing = false,
  onStartResize,
  onResetResize,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'keys' | 'layout'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spr_doclab_sidebar_active_tab');
        if (saved && ['templates', 'keys', 'layout'].includes(saved)) {
          return saved as 'templates' | 'keys' | 'layout';
        }
        if (saved === 'presets') return 'templates';
      } catch (err) {
        // Fallback to templates
      }
    }
    return 'templates';
  });

  const handleTabChange = (tab: 'templates' | 'keys' | 'layout') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('spr_doclab_sidebar_active_tab', tab);
      } catch (err) {
        // Ignore
      }
    }
  };

  // Compute scope metadata
  const scopeDefinition: DocumentScopeDefinition = useMemo(() => {
    const baseline = getScopeById(scopeId) || {
      id: (scopeId || 'general_document') as any,
      name: scopeName || 'Document Scope',
      category: 'General' as const,
      description: scopeDescription || 'Dynamic print template and field blueprint.',
      iconName: 'FileIcon',
      recommendedPaperSize: 'A4' as const,
      recommendedOrientation: 'PORTRAIT' as const,
      requiredKeys: [],
      recommendedKeys: [],
      defaultKeys: [],
    };

    let dynamicRequiredKeys = Array.isArray(requiredKeys) && requiredKeys.length > 0 ? requiredKeys : [];
    if (dynamicRequiredKeys.length === 0 && Array.isArray(placeholderKeys) && placeholderKeys.length > 0) {
      const explicitRequired = placeholderKeys
        .filter((k) => k.required || k.isMandatory)
        .map((k) => k.key);
      dynamicRequiredKeys = explicitRequired.length > 0 ? explicitRequired : baseline.requiredKeys || [];
    }
    if (dynamicRequiredKeys.length === 0) {
      dynamicRequiredKeys = baseline.requiredKeys || [];
    }

    return {
      ...baseline,
      name: scopeName || baseline.name,
      description: scopeDescription || baseline.description,
      requiredKeys: dynamicRequiredKeys,
    };
  }, [scopeId, scopeName, scopeDescription, requiredKeys, placeholderKeys]);

  const activeScopeValidation: ScopeValidationResult | null = useMemo(() => {
    if (!scopeDefinition || !customDocxTemplate) return null;
    return validateTemplateForScope(customDocxTemplate, scopeDefinition);
  }, [scopeDefinition, customDocxTemplate]);

  const isCustomDocxActive = Boolean(
    customDocxTemplate || (activeTemplateId && activeTemplateId !== 'default_table')
  );

  return (
    <div
      className={`w-full h-full flex flex-col theme-bg-app text-left overflow-y-auto px-4 py-3.5 @container max-w-full ${className}`}
      role="region"
      aria-label="Document Studio Configuration"
    >
      <DrawerContainer padding="none">
        <div className="pb-8">
          {/* Navigation Tabs Bar - 3 Tabs: Templates, Tokens, Layout */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl theme-bg-sub border theme-border mb-4">
            <button
              type="button"
              onClick={() => handleTabChange('templates')}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'templates'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50'
              }`}
              title="Scope Templates & Library"
            >
              <BookOpenIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Templates</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('keys')}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'keys'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50'
              }`}
              title="Scope Blueprint Tokens & Formatting Rules"
            >
              <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Tokens</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('layout')}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'layout'
                  ? 'theme-bg-accent text-white shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated/50'
              }`}
              title="Page Layout, Setup & Signatures"
            >
              <AdjustmentsHorizontalIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Layout</span>
            </button>
          </div>

          {/* Tab Content Panes */}
          {activeTab === 'templates' && (
            <DocLabTemplatesTab
              templates={templates}
              activeTemplateId={activeTemplateId}
              customDocxTemplate={customDocxTemplate}
              scopeDefinition={scopeDefinition}
              activeScopeValidation={activeScopeValidation}
              docxRenderMode={docxRenderMode}
              totalRecordsCount={totalRecordsCount}
              isScopeDefault={isScopeDefault}
              onSelectTemplate={onTemplateChange}
              onDeleteDocxTemplate={onDeleteDocxTemplate}
              onDuplicateDocxTemplate={onDuplicateDocxTemplate}
              onUpdateDocxTemplate={onUpdateDocxTemplate}
              onSaveCurrentTemplate={onSaveCurrentTemplate}
              onDocxRenderModeChange={onDocxRenderModeChange}
              onToggleScopeDefault={onToggleScopeDefault}
            />
          )}

          {activeTab === 'keys' && (
            <DocLabKeysTab
              scopeDefinition={scopeDefinition}
              activeScopeValidation={activeScopeValidation}
              placeholderKeys={placeholderKeys}
              requiredKeys={requiredKeys}
              activeRecord={activeRecord}
              onInsertKey={onInsertKey}
              scopeId={scopeId}
              scopeName={scopeName}
            />
          )}

          {activeTab === 'layout' && (
            <DocLabLayoutTab
              options={options}
              onOptionsChange={onOptionsChange}
              isCustomDocxActive={isCustomDocxActive}
            />
          )}
        </div>
      </DrawerContainer>
    </div>
  );
};

export default DocLabSidebar;


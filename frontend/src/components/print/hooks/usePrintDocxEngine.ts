import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CustomDocxTemplate,
  getSavedDocxTemplates,
  saveDocxTemplate,
  deleteDocxTemplate,
  bulkMergeTemplate,
  mergeTemplateWithData,
  mergeTabularTemplateWithData,
  isTabularTemplate,
  separateDocxStylesAndBody,
} from '../docxTemplateEngine';
import {
  getDefaultTemplateForScope,
  setDefaultTemplateForScope,
  getDefaultTemplateIdForScope,
  validateTemplateForScope,
  extractTagsFromText,
  getScopeById,
} from '../scopeTemplateStore';
import { PrintOptions, PrintMetaItem } from '../types';

export const BLANK_PAGE_HTML = `
  <div class="docx-blank-canvas font-sans leading-relaxed" style="min-height: 720px; outline: none;">
    <h1 style="font-size: 22pt; font-weight: 700; text-align: center; margin-bottom: 6px; color: #0f172a;">Untitled Document</h1>
    <p style="font-size: 11pt; text-align: center; color: #64748b; margin-bottom: 20px;">Institutional Notice / Letter / Blank Page</p>
    <hr style="border: 0; border-top: 1.5px solid #e2e8f0; margin-bottom: 20px;" />
    <p style="font-size: 11pt; color: #334155; line-height: 1.8; margin-bottom: 16px;">
      Click here and start typing your document content directly on this paper. You can format text, add headers, paste content, or design custom print documents.
    </p>
  </div>
`;

interface UsePrintDocxEngineParams {
  isOpen: boolean;
  scopeId?: string;
  scopeName?: string;
  templates?: any[];
  placeholderKeys?: any[];
  options: PrintOptions;
  liveData?: Array<Record<string, any>>;
  liveMetaItems?: PrintMetaItem[];
  liveColumns?: any[];
  setLiveColumns?: React.Dispatch<React.SetStateAction<any[]>>;
  setVisibleColumnKeys?: React.Dispatch<React.SetStateAction<string[]>>;
  institutionName?: string;
  institutionAddress?: string;
  resolvedTitle?: string;
  resolvedSubtitle?: string;
  onTemplateChange?: ((templateId: any) => void) | null;
}

export function usePrintDocxEngine({
  isOpen,
  scopeId = 'general_document',
  scopeName = '',
  templates = [],
  placeholderKeys = [],
  options,
  liveData = [],
  liveMetaItems = [],
  liveColumns = [],
  setLiveColumns,
  setVisibleColumnKeys,
  institutionName = 'SPR Note Academy',
  institutionAddress = 'Central Campus & Academic Affairs',
  resolvedTitle = 'Official Document',
  resolvedSubtitle = '',
  onTemplateChange = null,
}: UsePrintDocxEngineParams) {
  const [isDocxModalOpen, setIsDocxModalOpen] = useState<boolean>(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState<boolean>(false);
  const [savedWordTemplates, setSavedWordTemplates] = useState<CustomDocxTemplate[]>(() => {
    try {
      return getSavedDocxTemplates();
    } catch (e) {
      return [];
    }
  });

  const [customDocxTemplate, setCustomDocxTemplate] = useState<any>(() => {
    try {
      const scopeDefault = getDefaultTemplateForScope(scopeId);
      if (scopeDefault) {
        const { styles, body } = separateDocxStylesAndBody(scopeDefault.rawHtml || '');
        return {
          id: scopeDefault.id,
          name: scopeDefault.name,
          styles: styles,
          body: body || scopeDefault.rawHtml,
          html: scopeDefault.rawHtml,
          rawHtml: scopeDefault.rawHtml,
          isTableDocument: scopeDefault.isTableDocument,
          columns: scopeDefault.sampleColumns || [],
          data: scopeDefault.sampleData || [],
          templateMeta: scopeDefault,
          templateType: scopeDefault.templateType || 'template',
          recordsCount: scopeDefault.recordsCount,
        };
      }
    } catch (e) {
      console.warn('Failed to load default template for scope', e);
    }
    return null;
  });

  // Re-sync default template for scope whenever modal opens or scopeId changes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const scopeDefault = getDefaultTemplateForScope(scopeId);
      if (scopeDefault) {
        const { styles, body } = separateDocxStylesAndBody(scopeDefault.rawHtml || '');
        setCustomDocxTemplate({
          id: scopeDefault.id,
          name: scopeDefault.name,
          styles: styles,
          body: body || scopeDefault.rawHtml,
          html: scopeDefault.rawHtml,
          rawHtml: scopeDefault.rawHtml,
          isTableDocument: scopeDefault.isTableDocument,
          columns: scopeDefault.sampleColumns || [],
          data: scopeDefault.sampleData || [],
          templateMeta: scopeDefault,
          templateType: scopeDefault.templateType || 'template',
          recordsCount: scopeDefault.recordsCount,
        });
      } else {
        setCustomDocxTemplate(null);
      }
    } catch (e) {
      console.warn('Failed to sync default template for scope', e);
    }
  }, [isOpen, scopeId]);

  // Combine built-in templates with user-saved Word (.docx) templates strictly isolated by scopeId
  const combinedTemplates = useMemo(() => {
    const list: any[] = [
      {
        id: 'default_layout',
        name: 'Default Print Layout',
        description: 'Native High-Precision Table & Scoreboard Engine',
        isDefaultNative: true,
      },
      {
        id: 'blank_document',
        name: 'Blank Page (Live Canvas)',
        description: 'Interactive In-Place Typing & Word Layout',
        isWordDocx: true,
        isBlank: true,
      },
    ];
    if (Array.isArray(templates)) {
      templates.forEach((t) => {
        if (!t.isTable && t.id !== 'default_table' && !list.some((existing) => existing.id === t.id)) {
          list.push(t);
        }
      });
    }
    if (Array.isArray(savedWordTemplates)) {
      savedWordTemplates.forEach((wt) => {
        const tScope = wt.scopeId || (wt as any).templateMeta?.scopeId || 'general_document';
        const isMatch = scopeId && scopeId !== 'general_document' ? tScope === scopeId : true;
        if (isMatch) {
          const isGen = wt.templateType === 'generated' || wt.id?.startsWith('gen_');
          list.push({
            id: wt.id,
            name: wt.name,
            description: wt.description || (isGen ? `Generated Document (${wt.recordsCount || 'All'} Records)` : `Custom Template for ${scopeName || scopeId}`),
            isWordDocx: true,
            scopeId: tScope,
            rawHtml: wt.rawHtml,
            templateMeta: wt,
            templateType: wt.templateType || (isGen ? 'generated' : 'template'),
            recordsCount: wt.recordsCount,
            detectedPlaceholders: wt.detectedPlaceholders || [],
            createdAt: wt.createdAt,
          });
        }
      });
    }
    return list;
  }, [templates, savedWordTemplates, scopeId, scopeName]);

  // Extracted docx scoped styles rendered once at canvas container level (prevents 100 duplicate <style> tags)
  const docxStyles = useMemo<string>(() => {
    if (!customDocxTemplate) return '';
    if (customDocxTemplate.styles) return customDocxTemplate.styles;
    const { styles } = separateDocxStylesAndBody(customDocxTemplate.html || customDocxTemplate.rawHtml || '');
    return styles;
  }, [customDocxTemplate?.styles, customDocxTemplate?.html, customDocxTemplate?.rawHtml]);

  // Docx & Live Canvas Render Mode: 'template' (Single page with placeholder keys) | 'sample' (1 record sample) | 'all' (Batch all records)
  const [docxRenderMode, setDocxRenderMode] = useState<'template' | 'sample' | 'all'>('all');

  // Context-enriched base record containing tenant, document metadata, header and option information
  const contextEnrichedBaseRecord = useMemo<Record<string, any>>(() => {
    const base: Record<string, any> = {
      institution_name: institutionName,
      institution_address: institutionAddress,
      campus_address: institutionAddress,
      document_title: resolvedTitle,
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
      document_subtitle: resolvedSubtitle,
      issue_date: new Date().toLocaleDateString(),
      current_date: new Date().toLocaleDateString(),
      page_size: options.pageSize || 'A4',
      orientation: options.orientation || 'PORTRAIT',
    };

    if (Array.isArray(liveMetaItems)) {
      liveMetaItems.forEach((m) => {
        if (m && m.label && m.value !== undefined) {
          const rawLabel = String(m.label).trim();
          const cleanVal = String(m.value).trim();
          base[rawLabel] = cleanVal;
          const normKey = rawLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
          if (normKey) {
            base[normKey] = cleanVal;
          }
        }
      });
    }

    if (Array.isArray(placeholderKeys)) {
      placeholderKeys.forEach((pk) => {
        if (pk && pk.key && pk.example && base[pk.key] === undefined) {
          base[pk.key] = pk.example;
        }
      });
    }

    return base;
  }, [institutionName, institutionAddress, resolvedTitle, resolvedSubtitle, options.pageSize, options.orientation, liveMetaItems, placeholderKeys]);

  // Enriched records combining base document context with row-level data
  const enrichedRecords = useMemo<Array<Record<string, any>>>(() => {
    if (!Array.isArray(liveData) || liveData.length === 0) {
      return [contextEnrichedBaseRecord];
    }
    return liveData.map((row) => ({
      ...contextEnrichedBaseRecord,
      ...row,
    }));
  }, [liveData, contextEnrichedBaseRecord]);

  // Memoized merged pages for Word (.docx) mode
  const mergedDocxPages = useMemo<string[]>(() => {
    if (!customDocxTemplate?.html && !customDocxTemplate?.body) return [];
    const contentToMerge = customDocxTemplate.body || separateDocxStylesAndBody(customDocxTemplate.html || '').body || customDocxTemplate.html;

    // 0. Pre-Generated Document: If it is already a saved generated document, split on page breaks or return directly
    if (customDocxTemplate.templateType === 'generated' || customDocxTemplate.id?.startsWith('gen_')) {
      if (contentToMerge.includes('<!-- spr-page-break -->')) {
        const pages = contentToMerge.split('<!-- spr-page-break -->');
        const styles = customDocxTemplate.styles;
        return pages.map((p: string) => (styles ? `${styles}\n${p.trim()}` : p.trim()));
      }
      return [contentToMerge];
    }

    // 1. Template Design Mode: Strictly 1 single template page with placeholder keys
    if (docxRenderMode === 'template' || customDocxTemplate.id === 'blank_document') {
      return [contentToMerge];
    }

    // Tabular check: Only true for multi-student master lists/ledgers (tabulation_sheet).
    // For single-student documents (marksheet_transcript, admit_card), each record is a distinct student page with its own subject table.
    const isMultiRecordSingleDocumentScope = scopeId === 'tabulation_sheet' || scopeId === 'attendance_sheet';
    const isTabular = isMultiRecordSingleDocumentScope && (isTabularTemplate(contentToMerge) || Boolean(customDocxTemplate.isTableDocument));

    // 2. Sample Data Fill: 1 single page with enrichedRecords[0] or sample table rows
    if (docxRenderMode === 'sample') {
      if (isTabular) {
        const sampleRows = enrichedRecords.slice(0, Math.min(3, enrichedRecords.length));
        return [mergeTabularTemplateWithData(contentToMerge, sampleRows, contextEnrichedBaseRecord)];
      }
      return [
        enrichedRecords.length > 0
          ? mergeTemplateWithData(contentToMerge, enrichedRecords[0])
          : contentToMerge,
      ];
    }

    // 3. Batch Data Generation: Tabular ledger table or Multi-page batch merged with all enrichedRecords
    if ((docxRenderMode === 'all' || !docxRenderMode) && enrichedRecords.length > 0) {
      if (isTabular) {
        return [mergeTabularTemplateWithData(contentToMerge, enrichedRecords, contextEnrichedBaseRecord)];
      }
      return bulkMergeTemplate(contentToMerge, enrichedRecords);
    }

    return [contentToMerge];
  }, [customDocxTemplate?.body, customDocxTemplate?.html, customDocxTemplate?.id, customDocxTemplate?.isTableDocument, customDocxTemplate?.templateType, customDocxTemplate?.styles, docxRenderMode, enrichedRecords, contextEnrichedBaseRecord, scopeId]);

  // Handle template selection
  const handleTemplateSelection = useCallback(
    (templateIdOrObj: any) => {
      const tId = typeof templateIdOrObj === 'object' ? templateIdOrObj?.id : templateIdOrObj;
      if (!tId || tId === 'default_layout' || tId === 'native_layout' || tId === 'default_table') {
        setCustomDocxTemplate(null);
        setDocxRenderMode('all');
        onTemplateChange?.(templateIdOrObj);
        return;
      }
      if (tId === 'blank_document' || tId === 'blank_page') {
        setCustomDocxTemplate({
          id: 'blank_document',
          name: 'Blank Page (Live Canvas)',
          styles: '',
          body: BLANK_PAGE_HTML,
          html: BLANK_PAGE_HTML,
          rawHtml: BLANK_PAGE_HTML,
          isTableDocument: false,
          columns: [],
          data: [],
          templateType: 'template',
          templateMeta: {
            id: 'blank_document',
            name: 'Blank Page',
            rawHtml: BLANK_PAGE_HTML,
            detectedPlaceholders: [],
            templateType: 'template',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        setDocxRenderMode('template');
        onTemplateChange?.(templateIdOrObj);
        return;
      }
      const foundWordTemplate = (savedWordTemplates || []).find((t) => t.id === tId);
      if (foundWordTemplate) {
        const { styles, body } = separateDocxStylesAndBody(foundWordTemplate.rawHtml || '');
        const isGenerated = foundWordTemplate.templateType === 'generated' || foundWordTemplate.id?.startsWith('gen_');
        setCustomDocxTemplate({
          id: foundWordTemplate.id,
          name: foundWordTemplate.name,
          styles: styles,
          body: body || foundWordTemplate.rawHtml,
          html: foundWordTemplate.rawHtml,
          rawHtml: foundWordTemplate.rawHtml,
          isTableDocument: foundWordTemplate.isTableDocument,
          columns: foundWordTemplate.sampleColumns || [],
          data: foundWordTemplate.sampleData || [],
          templateMeta: foundWordTemplate,
          templateType: foundWordTemplate.templateType || (isGenerated ? 'generated' : 'template'),
          recordsCount: foundWordTemplate.recordsCount,
        });
        setDocxRenderMode('all');
      }
      onTemplateChange?.(templateIdOrObj);
    },
    [savedWordTemplates, onTemplateChange]
  );

  const handleApplyDocxTemplate = useCallback((result: any) => {
    if (!result) return;
    const templateId = result.id || result.templateMeta?.id || `docx_upload_${Date.now()}`;
    const htmlContent = result.html || result.rawHtml || result.templateMeta?.rawHtml || '';
    const templateName = result.name || result.templateMeta?.name || 'Custom Word Template';
    const isTableDoc = Boolean(result.isTableDocument || result.templateMeta?.isTableDocument);
    const cols = result.columns || result.sampleColumns || result.templateMeta?.sampleColumns || [];
    const rows = result.data || result.sampleData || result.templateMeta?.sampleData || [];

    const { styles, body } = separateDocxStylesAndBody(htmlContent);

    const normalizedTemplate = {
      id: templateId,
      name: templateName,
      styles: styles,
      body: body || htmlContent,
      html: htmlContent,
      rawHtml: htmlContent,
      isTableDocument: isTableDoc,
      columns: cols,
      data: rows,
      templateType: 'template' as const,
      templateMeta: result.templateMeta || {
        id: templateId,
        name: templateName,
        rawHtml: htmlContent,
        detectedPlaceholders: result.detectedPlaceholders || [],
        isTableDocument: isTableDoc,
        sampleColumns: cols,
        sampleData: rows,
        templateType: 'template',
      },
    };

    if (result.templateMeta || result.rawHtml) {
      setSavedWordTemplates(getSavedDocxTemplates());
    }

    setCustomDocxTemplate(normalizedTemplate);
    setDocxRenderMode('template');

    if (isTableDoc && cols.length > 0 && rows.length > 0) {
      setLiveColumns?.(cols);
      setVisibleColumnKeys?.(cols.map((c: any) => c.id || c.key || c.accessor || c.dataIndex));
    }
  }, [setLiveColumns, setVisibleColumnKeys]);

  const handleDeleteDocxTemplate = useCallback((templateId: string) => {
    deleteDocxTemplate(templateId);
    setSavedWordTemplates(getSavedDocxTemplates());
    setCustomDocxTemplate((prev: any) => {
      if (prev?.templateMeta?.id === templateId || prev?.id === templateId) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleSaveCurrentTemplate = useCallback(
    (customName: string, saveType: 'template' | 'generated' = 'template') => {
      let currentHtml = '';
      const container = document.querySelector('.docx-live-container');
      const scopeDef = getScopeById(scopeId as any);

      if (saveType === 'generated') {
        const targetBody = customDocxTemplate?.body || separateDocxStylesAndBody(customDocxTemplate?.html || customDocxTemplate?.rawHtml || '').body || customDocxTemplate?.html || '';
        const styles = customDocxTemplate?.styles || separateDocxStylesAndBody(customDocxTemplate?.html || customDocxTemplate?.rawHtml || '').styles || '';

        const recordsToMerge = enrichedRecords.length > 0 ? enrichedRecords : [contextEnrichedBaseRecord];
        const isTabular = isTabularTemplate(targetBody) || Boolean(customDocxTemplate?.isTableDocument);

        let mergedFullHtml = '';
        if (isTabular) {
          mergedFullHtml = mergeTabularTemplateWithData(targetBody, recordsToMerge, contextEnrichedBaseRecord);
        } else {
          const pages = bulkMergeTemplate(targetBody, recordsToMerge);
          mergedFullHtml = pages.join('\n<!-- spr-page-break -->\n');
        }

        currentHtml = styles ? `${styles}\n${mergedFullHtml}` : mergedFullHtml;

        const newId = 'gen_' + Date.now();
        const docName = customName?.trim() || `${scopeDef?.name || 'Document'} — Generated (${recordsToMerge.length} Records)`;

        const newGeneratedDoc: CustomDocxTemplate = {
          id: newId,
          name: docName,
          description: `Generated Document with ${recordsToMerge.length} populated records (${new Date().toLocaleDateString()})`,
          scopeId: scopeId,
          rawHtml: currentHtml,
          detectedPlaceholders: [],
          isTableDocument: isTabular,
          sampleColumns: [],
          sampleData: [],
          templateType: 'generated',
          recordsCount: recordsToMerge.length,
          sourceTemplateId: customDocxTemplate?.id || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveDocxTemplate(newGeneratedDoc);
        const updatedList = getSavedDocxTemplates();
        setSavedWordTemplates(updatedList);

        const normalized = {
          id: newId,
          name: docName,
          styles: styles,
          body: mergedFullHtml,
          html: currentHtml,
          rawHtml: currentHtml,
          isTableDocument: isTabular,
          columns: [],
          data: [],
          templateMeta: newGeneratedDoc,
          templateType: 'generated' as const,
          recordsCount: recordsToMerge.length,
        };
        setCustomDocxTemplate(normalized);
        setDocxRenderMode('all');
        return normalized;
      } else {
        if (container && container.innerHTML) {
          const rawBody = container.innerHTML;
          const preservedStyles = customDocxTemplate?.styles || separateDocxStylesAndBody(customDocxTemplate?.html || customDocxTemplate?.rawHtml || '').styles;
          currentHtml = preservedStyles ? `${preservedStyles}\n${rawBody}` : rawBody;
        } else {
          currentHtml = customDocxTemplate?.html || customDocxTemplate?.rawHtml || BLANK_PAGE_HTML;
        }

        const { styles, body } = separateDocxStylesAndBody(currentHtml);
        const detectedKeys = extractTagsFromText(currentHtml);
        const newId = 'tmpl_' + Date.now();
        const templateName = customName?.trim() || customDocxTemplate?.name || `${scopeDef?.name || 'Custom'} Template`;

        const newTemplate: CustomDocxTemplate = {
          id: newId,
          name: templateName,
          description: `Custom Template for ${scopeDef?.name || 'General Document'}`,
          scopeId: scopeId,
          rawHtml: currentHtml,
          detectedPlaceholders: detectedKeys,
          isTableDocument: false,
          sampleColumns: [],
          sampleData: [],
          templateType: 'template',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveDocxTemplate(newTemplate);
        const updatedList = getSavedDocxTemplates();
        setSavedWordTemplates(updatedList);

        const normalized = {
          id: newId,
          name: templateName,
          styles: styles,
          body: body || currentHtml,
          html: currentHtml,
          rawHtml: currentHtml,
          isTableDocument: false,
          columns: [],
          data: [],
          templateMeta: newTemplate,
          templateType: 'template' as const,
        };
        setCustomDocxTemplate(normalized);
        setDocxRenderMode('template');
        return normalized;
      }
    },
    [customDocxTemplate, scopeId, enrichedRecords, contextEnrichedBaseRecord]
  );

  const handleDuplicateDocxTemplate = useCallback((templateId: string) => {
    const existing = getSavedDocxTemplates().find((t) => t.id === templateId);
    if (!existing) return;
    const newTmpl: CustomDocxTemplate = {
      ...existing,
      id: 'tmpl_' + Date.now(),
      name: `${existing.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDocxTemplate(newTmpl);
    setSavedWordTemplates(getSavedDocxTemplates());
  }, []);

  const handleSetScopeDefault = useCallback(
    (templateId: string | null) => {
      if (!templateId) {
        setDefaultTemplateForScope(scopeId, null);
        setSavedWordTemplates(getSavedDocxTemplates());
        return;
      }
      const allTemplates = getSavedDocxTemplates();
      const tmpl = allTemplates.find((t) => t.id === templateId) || (customDocxTemplate?.id === templateId ? customDocxTemplate : null);
      if (tmpl) {
        const val = validateTemplateForScope(tmpl, scopeId);
        if (!val.isValid) {
          const proceed = window.confirm(
            `Warning: This template is missing ${val.missingRequiredKeys.length} required key(s) for "${val.scopeName}":\n\n${val.missingRequiredKeys.map((k) => `• {{${k}}}`).join('\n')}\n\nSetting this template as default may result in missing data during print generation. Do you want to set it as default anyway?`
          );
          if (!proceed) return;
        }
      }
      setDefaultTemplateForScope(scopeId, templateId);
      setSavedWordTemplates(getSavedDocxTemplates());
    },
    [scopeId, customDocxTemplate]
  );

  return {
    isDocxModalOpen,
    setIsDocxModalOpen,
    isTemplateLibraryOpen,
    setIsTemplateLibraryOpen,
    savedWordTemplates,
    setSavedWordTemplates,
    customDocxTemplate,
    setCustomDocxTemplate,
    combinedTemplates,
    docxStyles,
    docxRenderMode,
    setDocxRenderMode,
    contextEnrichedBaseRecord,
    enrichedRecords,
    mergedDocxPages,
    handleTemplateSelection,
    handleApplyDocxTemplate,
    handleDeleteDocxTemplate,
    handleSaveCurrentTemplate,
    handleDuplicateDocxTemplate,
    handleSetScopeDefault,
  };
}

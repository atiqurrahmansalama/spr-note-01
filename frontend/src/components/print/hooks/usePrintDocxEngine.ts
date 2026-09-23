import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAutoSave } from '../../../hooks/useAutoSave';
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
  splitHtmlIntoPages,
  joinPagesIntoHtml,
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
    <p><br /></p>
  </div>
`;

export function createBlankDocumentTemplate(): any {
  return {
    id: 'blank_document',
    name: 'Blank Page (Live Canvas)',
    styles: '',
    templateBody: BLANK_PAGE_HTML,
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
  };
}

interface UsePrintDocxEngineParams {
  isOpen: boolean;
  scopeId?: string;
  scopeName?: string;
  templates?: any[];
  placeholderKeys?: any[];
  options: PrintOptions;
  setOptions?: React.Dispatch<React.SetStateAction<PrintOptions>>;
  updateOptionsWithHistory?: (updater: any) => void;
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
  activeTemplateId?: string | null;
}

export function usePrintDocxEngine({
  isOpen,
  scopeId = 'general_document',
  scopeName = '',
  templates = [],
  placeholderKeys = [],
  options,
  setOptions,
  updateOptionsWithHistory,
  liveData = [],
  liveMetaItems = [],
  liveColumns = [],
  setLiveColumns,
  setVisibleColumnKeys,
  institutionName = '',
  institutionAddress = '',
  resolvedTitle = 'Official Document',
  resolvedSubtitle = '',
  onTemplateChange = null,
  activeTemplateId = null,
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
        const isGen = scopeDefault.templateType === 'generated' || scopeDefault.id?.startsWith('gen_');
        let srcBody = isGen ? undefined : (body || scopeDefault.rawHtml);
        if (isGen && scopeDefault.sourceTemplateId) {
          const all = getSavedDocxTemplates();
          const src = all.find((t) => t.id === scopeDefault.sourceTemplateId);
          if (src) srcBody = separateDocxStylesAndBody(src.rawHtml || '').body || src.rawHtml;
        }
        return {
          id: scopeDefault.id,
          name: scopeDefault.name,
          styles: styles,
          templateBody: srcBody || body || scopeDefault.rawHtml,
          body: body || scopeDefault.rawHtml,
          html: scopeDefault.rawHtml,
          rawHtml: scopeDefault.rawHtml,
          isTableDocument: scopeDefault.isTableDocument,
          columns: scopeDefault.sampleColumns || [],
          data: scopeDefault.sampleData || [],
          templateMeta: scopeDefault,
          templateType: scopeDefault.templateType || (isGen ? 'generated' : 'template'),
          recordsCount: scopeDefault.recordsCount,
          sourceTemplateId: scopeDefault.sourceTemplateId,
        };
      }
    } catch (e) {
      console.warn('Failed to load default template for scope', e);
    }
    return createBlankDocumentTemplate();
  });

  // Undo / Redo History Stack for Docx Templates and Live Canvas Edits
  const docxPastStackRef = useRef<any[]>([]);
  const docxFutureStackRef = useRef<any[]>([]);
  const [, setDocxHistoryVersion] = useState<number>(0);

  const docxCanUndo = docxPastStackRef.current.length > 0;
  const docxCanRedo = docxFutureStackRef.current.length > 0;

  const updateCustomDocxTemplateWithHistory = useCallback((updaterOrNew: any) => {
    setCustomDocxTemplate((prev: any) => {
      const next = typeof updaterOrNew === 'function' ? updaterOrNew(prev) : updaterOrNew;
      if (prev && JSON.stringify(prev) !== JSON.stringify(next)) {
        docxPastStackRef.current = [...docxPastStackRef.current, JSON.parse(JSON.stringify(prev))].slice(-40);
        docxFutureStackRef.current = [];
        setDocxHistoryVersion((v) => v + 1);
      }
      return next;
    });
  }, []);

  const handleDocxUndo = useCallback(() => {
    if (docxPastStackRef.current.length === 0) return;
    const previous = docxPastStackRef.current[docxPastStackRef.current.length - 1];
    docxPastStackRef.current = docxPastStackRef.current.slice(0, -1);

    setCustomDocxTemplate((current: any) => {
      if (current) {
        docxFutureStackRef.current = [JSON.parse(JSON.stringify(current)), ...docxFutureStackRef.current].slice(0, 40);
      }
      return previous;
    });
    setDocxHistoryVersion((v) => v + 1);
  }, []);

  const handleDocxRedo = useCallback(() => {
    if (docxFutureStackRef.current.length === 0) return;
    const next = docxFutureStackRef.current[0];
    docxFutureStackRef.current = docxFutureStackRef.current.slice(1);

    setCustomDocxTemplate((current: any) => {
      if (current) {
        docxPastStackRef.current = [...docxPastStackRef.current, JSON.parse(JSON.stringify(current))].slice(-40);
      }
      return next;
    });
    setDocxHistoryVersion((v) => v + 1);
  }, []);

  // Re-sync default template for scope whenever modal opens or scopeId changes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const scopeDefault =
        getDefaultTemplateForScope(scopeId) ||
        (templates || []).find((t: any) => (t.scopeId && t.scopeId === scopeId) || (activeTemplateId && t.id === activeTemplateId)) ||
        (savedWordTemplates || []).find((t) => t.scopeId === scopeId && t.templateType !== 'generated');
      if (scopeDefault) {
        const { styles, body } = separateDocxStylesAndBody(scopeDefault.rawHtml || '');
        const isGen = scopeDefault.templateType === 'generated' || scopeDefault.id?.startsWith('gen_');
        let srcBody = isGen ? undefined : (body || scopeDefault.rawHtml);
        if (isGen && scopeDefault.sourceTemplateId) {
          const all = getSavedDocxTemplates();
          const src = all.find((t) => t.id === scopeDefault.sourceTemplateId);
          if (src) srcBody = separateDocxStylesAndBody(src.rawHtml || '').body || src.rawHtml;
        }
        setCustomDocxTemplate({
          id: scopeDefault.id,
          name: scopeDefault.name,
          styles: styles,
          templateBody: srcBody || body || scopeDefault.rawHtml,
          body: body || scopeDefault.rawHtml,
          html: scopeDefault.rawHtml,
          rawHtml: scopeDefault.rawHtml,
          isTableDocument: scopeDefault.isTableDocument,
          columns: scopeDefault.sampleColumns || [],
          data: scopeDefault.sampleData || [],
          templateMeta: scopeDefault,
          templateType: scopeDefault.templateType || (isGen ? 'generated' : 'template'),
          recordsCount: scopeDefault.recordsCount,
          sourceTemplateId: scopeDefault.sourceTemplateId,
        });
        if (isGen) {
          setDocxRenderMode('all');
        } else {
          setDocxRenderMode('template');
        }
      } else {
        setCustomDocxTemplate(createBlankDocumentTemplate());
        setDocxRenderMode('template');
      }
    } catch (e) {
      console.warn('Failed to sync default template for scope', e);
    }
  }, [isOpen, scopeId]);

  // Combine built-in templates with user-saved Word (.docx) templates strictly isolated by scopeId
  const combinedTemplates = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Interactive blank canvas entry
    map.set('blank_document', {
      id: 'blank_document',
      name: 'Blank Page (Live Canvas)',
      description: 'Interactive In-Place Typing & Word Layout',
      isWordDocx: true,
      isBlank: true,
    });

    // 2. Built-in or prop templates
    if (Array.isArray(templates)) {
      templates.forEach((t) => {
        if (!t.isTable && t.id !== 'default_table' && t.id !== 'default_layout' && t.id) {
          map.set(t.id, t);
        }
      });
    }

    // 3. User-saved templates (highest precedence: overwrite built-ins with same ID)
    if (Array.isArray(savedWordTemplates)) {
      savedWordTemplates.forEach((wt) => {
        const tScope = wt.scopeId || (wt as any).templateMeta?.scopeId || 'general_document';
        const isMatch = scopeId && scopeId !== 'general_document' ? tScope === scopeId : true;
        if (isMatch && wt.id) {
          const isGen = wt.templateType === 'generated' || wt.id?.startsWith('gen_');
          map.set(wt.id, {
            id: wt.id,
            name: wt.name,
            description: wt.description || (isGen ? `Generated Document (${wt.recordsCount || 'All'} Records)` : `Custom Template for ${scopeName || scopeId}`),
            isWordDocx: true,
            scopeId: tScope,
            rawHtml: wt.rawHtml,
            templateMeta: wt,
            templateType: wt.templateType || (isGen ? 'generated' : 'template'),
            recordsCount: wt.recordsCount,
            sourceTemplateId: wt.sourceTemplateId,
            detectedPlaceholders: wt.detectedPlaceholders || [],
            createdAt: wt.createdAt,
            updatedAt: wt.updatedAt,
          });
        }
      });
    }

    return Array.from(map.values());
  }, [templates, savedWordTemplates, scopeId, scopeName]);

  // Extracted docx scoped styles rendered once at canvas container level (prevents 100 duplicate <style> tags)
  const docxStyles = useMemo<string>(() => {
    if (!customDocxTemplate) return '';
    if (customDocxTemplate.styles) return customDocxTemplate.styles;
    const { styles } = separateDocxStylesAndBody(customDocxTemplate.html || customDocxTemplate.rawHtml || '');
    return styles;
  }, [customDocxTemplate?.styles, customDocxTemplate?.html, customDocxTemplate?.rawHtml]);

  // Docx & Live Canvas Render Mode: 'template' (Single page with placeholder keys) | 'sample' (1 record sample) | 'all' (Batch all records)
  const [docxRenderMode, setDocxRenderMode] = useState<'template' | 'sample' | 'all'>('template');

  // Payload watched by universal useAutoSave engine
  const autoSavePayload = useMemo(() => {
    if (docxRenderMode !== 'template' || !customDocxTemplate) return null;
    const targetId = customDocxTemplate.id || customDocxTemplate.templateMeta?.id;
    if (!targetId || targetId === 'blank_document' || targetId === 'default_table' || targetId === 'default_layout') {
      return null;
    }

    const styles =
      customDocxTemplate.styles ||
      separateDocxStylesAndBody(customDocxTemplate.rawHtml || customDocxTemplate.html || '').styles ||
      '';
    const body =
      customDocxTemplate.templateBody ||
      customDocxTemplate.body ||
      separateDocxStylesAndBody(customDocxTemplate.rawHtml || customDocxTemplate.html || '').body ||
      '';

    if (!body || body === BLANK_PAGE_HTML) return null;
    const fullHtml = styles ? `${styles}\n${body}` : body;

    return {
      targetId,
      fullHtml,
      name: customDocxTemplate.name,
      description: customDocxTemplate.description,
      scopeId: customDocxTemplate.scopeId || scopeId,
      isTableDocument: Boolean(customDocxTemplate.isTableDocument),
      columns: customDocxTemplate.columns,
      data: customDocxTemplate.data,
      pageSize: options.pageSize || customDocxTemplate.pageSize,
      orientation: options.orientation || customDocxTemplate.orientation,
      margin: options.margin || customDocxTemplate.margin,
      pageProperties: customDocxTemplate.pageProperties,
      createdAt: customDocxTemplate.createdAt,
    };
  }, [
    docxRenderMode,
    customDocxTemplate,
    scopeId,
    options.pageSize,
    options.orientation,
    options.margin,
  ]);

  // Persistent auto-save handler invoked by useAutoSave engine
  const handleAutoSave = useCallback(
    async (payload: any) => {
      if (!payload || !payload.targetId || !payload.fullHtml) return;

      const { targetId, fullHtml } = payload;
      const allSaved = getSavedDocxTemplates();
      const existing = allSaved.find((t) => t.id === targetId);
      const scopeDef = getScopeById(scopeId as any);
      const detectedKeys = extractTagsFromText(fullHtml);

      const templateToSave: CustomDocxTemplate = {
        id: targetId,
        name: payload.name || existing?.name || `${scopeDef?.name || 'Custom'} Template`,
        description: payload.description || existing?.description || `Custom Template for ${scopeDef?.name || scopeId}`,
        scopeId: payload.scopeId || existing?.scopeId || scopeId,
        rawHtml: fullHtml,
        detectedPlaceholders: detectedKeys,
        isTableDocument: Boolean(payload.isTableDocument || existing?.isTableDocument),
        sampleColumns: payload.columns || existing?.sampleColumns || [],
        sampleData: payload.data || existing?.sampleData || [],
        pageSize: payload.pageSize || existing?.pageSize,
        orientation: payload.orientation || existing?.orientation,
        margin: payload.margin || existing?.margin,
        pageProperties: payload.pageProperties || existing?.pageProperties,
        templateType: 'template',
        createdAt: existing?.createdAt || payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveDocxTemplate(templateToSave);
      setSavedWordTemplates(getSavedDocxTemplates());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('spr_doclab_template_saved', { detail: { templateId: targetId } })
        );
      }
    },
    [scopeId]
  );

  // Universal Enterprise Auto-Save Engine Integration
  const {
    status: autoSaveStatus,
    lastSavedAt: autoSaveLastSavedAt,
    isSaving: isAutoSaving,
    isSaved: isAutoSaved,
    forceSave: flushAutoSave,
    resetSavedState: resetAutoSaveState,
  } = useAutoSave({
    data: autoSavePayload,
    onSave: handleAutoSave,
    debounceMs: 500,
    enabled: Boolean(autoSavePayload),
    validate: (data: any) => Boolean(data && data.targetId && data.fullHtml),
  });

  // Flush pending auto-save on component unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushAutoSave();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      flushAutoSave();
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [flushAutoSave]);

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
    if (!customDocxTemplate?.html && !customDocxTemplate?.body && !customDocxTemplate?.rawHtml) return [];

    // Extract the original unmerged template body (containing {{tokens}})
    let templateBodyContent =
      customDocxTemplate.templateBody ||
      (customDocxTemplate.templateType !== 'generated' && separateDocxStylesAndBody(customDocxTemplate.rawHtml || customDocxTemplate.html || '').body) ||
      (customDocxTemplate.templateType !== 'generated' && customDocxTemplate.body) ||
      BLANK_PAGE_HTML;

    // If templateBodyContent is missing for a generated doc, try resolving from sourceTemplateId
    if ((!templateBodyContent || templateBodyContent === BLANK_PAGE_HTML) && customDocxTemplate.sourceTemplateId) {
      const src = (savedWordTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId) ||
                  (combinedTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId);
      if (src) {
        const { body } = separateDocxStylesAndBody(src.rawHtml || src.html || '');
        if (body) templateBodyContent = body;
      }
    }

    // 1. Template Design Mode: Split by page breaks or sections
    if (docxRenderMode === 'template') {
      let activeBody = templateBodyContent;
      // If current document is a generated document, try resolving its unmerged source template body
      if (customDocxTemplate.templateType === 'generated' || customDocxTemplate.id?.startsWith('gen_')) {
        let srcBody = '';
        if (customDocxTemplate.sourceTemplateId) {
          const src = (savedWordTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId) ||
                      (combinedTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId);
          if (src) {
            srcBody = separateDocxStylesAndBody(src.rawHtml || src.html || '').body || src.rawHtml || '';
          }
        }
        if (!srcBody) {
          const scopeDefTmpl = getDefaultTemplateForScope(scopeId) ||
            (combinedTemplates || []).find((t) => t.scopeId === scopeId && t.templateType !== 'generated') ||
            (templates || []).find((t: any) => t.scopeId === scopeId);
          if (scopeDefTmpl) {
            srcBody = separateDocxStylesAndBody(scopeDefTmpl.rawHtml || scopeDefTmpl.html || '').body || scopeDefTmpl.rawHtml || '';
          }
        }
        if (srcBody) {
          activeBody = srcBody;
        }
      }
      const pages = splitHtmlIntoPages(activeBody);
      return pages.length > 0 ? pages : [activeBody];
    }

    // 0. Pre-Generated Document: If it is already a saved generated document in Batch view
    if (customDocxTemplate.templateType === 'generated' || customDocxTemplate.id?.startsWith('gen_')) {
      const genContent = customDocxTemplate.body || customDocxTemplate.rawHtml || customDocxTemplate.html || '';
      const pages = splitHtmlIntoPages(genContent);
      const styles = customDocxTemplate.styles;
      return pages.map((p: string) => (styles && !p.includes('<style') ? `${styles}\n${p.trim()}` : p.trim()));
    }

    // Tabular check: Only true for multi-student master lists/ledgers (tabulation_sheet).
    // For single-student documents (marksheet_transcript, admit_card), each record is a distinct student page with its own subject table.
    const isMultiRecordSingleDocumentScope = scopeId === 'tabulation_sheet' || scopeId === 'attendance_sheet';
    const isTabular = isMultiRecordSingleDocumentScope && (isTabularTemplate(templateBodyContent) || Boolean(customDocxTemplate.isTableDocument));

    // 2. Sample Data Fill: 1 single page with enrichedRecords[0] or sample table rows
    if (docxRenderMode === 'sample') {
      if (isTabular) {
        const sampleRows = enrichedRecords.slice(0, Math.min(3, enrichedRecords.length));
        return [mergeTabularTemplateWithData(templateBodyContent, sampleRows, contextEnrichedBaseRecord)];
      }
      return [
        enrichedRecords.length > 0
          ? mergeTemplateWithData(templateBodyContent, enrichedRecords[0])
          : templateBodyContent,
      ];
    }

    // 3. Batch Data Generation: Tabular ledger table or Multi-page batch merged with all enrichedRecords
    if ((docxRenderMode === 'all' || !docxRenderMode) && enrichedRecords.length > 0) {
      if (isTabular) {
        return [mergeTabularTemplateWithData(templateBodyContent, enrichedRecords, contextEnrichedBaseRecord)];
      }
      return bulkMergeTemplate(templateBodyContent, enrichedRecords);
    }

    return [templateBodyContent];
  }, [
    customDocxTemplate,
    docxRenderMode,
    enrichedRecords,
    contextEnrichedBaseRecord,
    scopeId,
    savedWordTemplates,
    combinedTemplates,
  ]);

  // Handle template selection
  const handleTemplateSelection = useCallback(
    (templateIdOrObj: any) => {
      // Flush any pending edits of current template before loading the new one
      flushAutoSave();

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
          templateBody: BLANK_PAGE_HTML,
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

      // Robustly resolve target template: prioritize savedWordTemplates (latest edited copy)
      const foundWordTemplate =
        (savedWordTemplates || []).find((t) => t.id === tId) ||
        (combinedTemplates || []).find((t) => t.id === tId) ||
        (typeof templateIdOrObj === 'object' && templateIdOrObj?.rawHtml ? templateIdOrObj : null) ||
        (templates || []).find((t: any) => t.id === tId);

      if (foundWordTemplate) {
        const rawHtmlContent = foundWordTemplate.rawHtml || foundWordTemplate.html || '';
        const { styles, body } = separateDocxStylesAndBody(rawHtmlContent);
        const isGenerated = foundWordTemplate.templateType === 'generated' || foundWordTemplate.id?.startsWith('gen_');
        
        let sourceTmplBody = isGenerated ? foundWordTemplate.templateBody : (body || rawHtmlContent);
        if (isGenerated && !sourceTmplBody && foundWordTemplate.sourceTemplateId) {
          const srcTmpl = (savedWordTemplates || []).find((t) => t.id === foundWordTemplate.sourceTemplateId) ||
                          (combinedTemplates || []).find((t) => t.id === foundWordTemplate.sourceTemplateId);
          if (srcTmpl) {
            sourceTmplBody = separateDocxStylesAndBody(srcTmpl.rawHtml || srcTmpl.html || '').body || srcTmpl.rawHtml;
          }
        }

        const detectedPageSize = foundWordTemplate.pageSize || foundWordTemplate.pageProperties?.pageSize || foundWordTemplate.templateMeta?.pageSize || foundWordTemplate.templateMeta?.pageProperties?.pageSize;
        const detectedOrientation = foundWordTemplate.orientation || foundWordTemplate.pageProperties?.orientation || foundWordTemplate.templateMeta?.orientation || foundWordTemplate.templateMeta?.pageProperties?.orientation;
        const detectedMargin = foundWordTemplate.margin || foundWordTemplate.pageProperties?.margin || foundWordTemplate.templateMeta?.margin || foundWordTemplate.templateMeta?.pageProperties?.margin;

        if (detectedPageSize || detectedOrientation || detectedMargin) {
          const optionUpdater = (prev: PrintOptions) => ({
            ...prev,
            ...(detectedPageSize ? { pageSize: detectedPageSize } : {}),
            ...(detectedOrientation ? { orientation: detectedOrientation } : {}),
            ...(detectedMargin ? { margin: detectedMargin } : {}),
          });
          if (updateOptionsWithHistory) {
            updateOptionsWithHistory(optionUpdater);
          } else if (setOptions) {
            setOptions(optionUpdater);
          }
        }

        setCustomDocxTemplate({
          id: foundWordTemplate.id,
          name: foundWordTemplate.name,
          styles: styles,
          templateBody: sourceTmplBody || body || rawHtmlContent,
          body: body || rawHtmlContent,
          html: rawHtmlContent,
          rawHtml: rawHtmlContent,
          isTableDocument: foundWordTemplate.isTableDocument,
          columns: foundWordTemplate.sampleColumns || foundWordTemplate.columns || [],
          data: foundWordTemplate.sampleData || foundWordTemplate.data || [],
          pageSize: detectedPageSize,
          orientation: detectedOrientation,
          margin: detectedMargin,
          pageProperties: foundWordTemplate.pageProperties || foundWordTemplate.templateMeta?.pageProperties,
          templateMeta: foundWordTemplate.templateMeta || foundWordTemplate,
          templateType: foundWordTemplate.templateType || (isGenerated ? 'generated' : 'template'),
          recordsCount: foundWordTemplate.recordsCount,
          sourceTemplateId: foundWordTemplate.sourceTemplateId,
        });

        if (isGenerated) {
          setDocxRenderMode('all');
        } else {
          setDocxRenderMode('template');
        }
      }
      onTemplateChange?.(templateIdOrObj);
    },
    [savedWordTemplates, combinedTemplates, templates, onTemplateChange, updateOptionsWithHistory, setOptions]
  );

  const handleDocxRenderModeChange = useCallback(
    (mode: 'template' | 'sample' | 'all') => {
      flushAutoSave();
      setDocxRenderMode(mode);
      if (mode === 'template') {
        // If currently loaded document is a generated document, immediately switch back to its source template
        if (customDocxTemplate?.templateType === 'generated' || customDocxTemplate?.id?.startsWith('gen_')) {
          let sourceTmpl: any = null;
          if (customDocxTemplate.sourceTemplateId) {
            sourceTmpl =
              (savedWordTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId) ||
              (combinedTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId);
          }
          if (!sourceTmpl) {
            sourceTmpl =
              getDefaultTemplateForScope(scopeId) ||
              (combinedTemplates || []).find((t) => t.scopeId === scopeId && t.templateType !== 'generated') ||
              (savedWordTemplates || []).find((t) => t.scopeId === scopeId && t.templateType !== 'generated') ||
              (templates || []).find((t: any) => t.scopeId === scopeId);
          }
          if (sourceTmpl) {
            handleTemplateSelection(sourceTmpl);
          } else if (customDocxTemplate.templateBody && customDocxTemplate.templateBody !== BLANK_PAGE_HTML) {
            const rawBody = customDocxTemplate.templateBody;
            const preservedStyles = customDocxTemplate.styles || '';
            const fullHtml = preservedStyles ? `${preservedStyles}\n${rawBody}` : rawBody;
            setCustomDocxTemplate((prev: any) => ({
              ...prev,
              body: rawBody,
              html: fullHtml,
              rawHtml: fullHtml,
              templateType: 'template' as const,
            }));
          }
        }
      }
    },
    [customDocxTemplate, savedWordTemplates, combinedTemplates, scopeId, templates, handleTemplateSelection]
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

    const detectedPageSize = result.pageSize || result.pageProperties?.pageSize || result.templateMeta?.pageSize || result.templateMeta?.pageProperties?.pageSize;
    const detectedOrientation = result.orientation || result.pageProperties?.orientation || result.templateMeta?.orientation || result.templateMeta?.pageProperties?.orientation;
    const detectedMargin = result.margin || result.pageProperties?.margin || result.templateMeta?.margin || result.templateMeta?.pageProperties?.margin;

    if (detectedPageSize || detectedOrientation || detectedMargin) {
      const optionUpdater = (prev: PrintOptions) => ({
        ...prev,
        pageSize: detectedPageSize || prev.pageSize || 'A4',
        orientation: detectedOrientation || prev.orientation || 'PORTRAIT',
        margin: detectedMargin || prev.margin || 'NORMAL',
      });
      if (updateOptionsWithHistory) {
        updateOptionsWithHistory(optionUpdater);
      } else if (setOptions) {
        setOptions(optionUpdater);
      }
    }

    const normalizedTemplate = {
      id: templateId,
      name: templateName,
      styles: styles,
      templateBody: body || htmlContent,
      body: body || htmlContent,
      html: htmlContent,
      rawHtml: htmlContent,
      isTableDocument: isTableDoc,
      columns: cols,
      data: rows,
      pageSize: detectedPageSize,
      orientation: detectedOrientation,
      margin: detectedMargin,
      pageProperties: result.pageProperties || result.templateMeta?.pageProperties,
      templateType: 'template' as const,
      templateMeta: result.templateMeta || {
        id: templateId,
        name: templateName,
        rawHtml: htmlContent,
        detectedPlaceholders: result.detectedPlaceholders || [],
        isTableDocument: isTableDoc,
        sampleColumns: cols,
        sampleData: rows,
        pageSize: detectedPageSize,
        orientation: detectedOrientation,
        margin: detectedMargin,
        pageProperties: result.pageProperties,
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
  }, [setLiveColumns, setVisibleColumnKeys, updateOptionsWithHistory, setOptions]);

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
      const scopeDef = getScopeById(scopeId as any);
      let baseTemplateBody =
        customDocxTemplate?.templateBody ||
        (customDocxTemplate?.templateType !== 'generated' && separateDocxStylesAndBody(customDocxTemplate?.rawHtml || customDocxTemplate?.html || '').body) ||
        (customDocxTemplate?.templateType !== 'generated' && customDocxTemplate?.body);

      if (!baseTemplateBody && customDocxTemplate?.sourceTemplateId) {
        const src = (savedWordTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId) ||
                    (combinedTemplates || []).find((t) => t.id === customDocxTemplate.sourceTemplateId);
        if (src) {
          baseTemplateBody = separateDocxStylesAndBody(src.rawHtml || src.html || '').body || src.rawHtml;
        }
      }

      if (!baseTemplateBody) {
        baseTemplateBody = BLANK_PAGE_HTML;
      }

      const styles =
        customDocxTemplate?.styles ||
        separateDocxStylesAndBody(customDocxTemplate?.rawHtml || customDocxTemplate?.html || '').styles ||
        '';

      if (saveType === 'generated') {
        const recordsToMerge = enrichedRecords.length > 0 ? enrichedRecords : [contextEnrichedBaseRecord];
        const isTabular = isTabularTemplate(baseTemplateBody) || Boolean(customDocxTemplate?.isTableDocument);

        let mergedFullHtml = '';
        if (isTabular) {
          mergedFullHtml = mergeTabularTemplateWithData(baseTemplateBody, recordsToMerge, contextEnrichedBaseRecord);
        } else {
          const pages = bulkMergeTemplate(baseTemplateBody, recordsToMerge);
          mergedFullHtml = pages.join('\n<!-- spr-page-break -->\n');
        }

        const currentHtml = styles ? `${styles}\n${mergedFullHtml}` : mergedFullHtml;
        const newId = 'gen_' + Date.now();
        const docName = customName?.trim() || `${scopeDef?.name || 'Document'} — Filled (${recordsToMerge.length} Records)`;

        const newGeneratedDoc: CustomDocxTemplate = {
          id: newId,
          name: docName,
          description: `Filled Document with ${recordsToMerge.length} populated records (${new Date().toLocaleDateString()})`,
          scopeId: scopeId,
          rawHtml: currentHtml,
          detectedPlaceholders: [],
          isTableDocument: isTabular,
          sampleColumns: [],
          sampleData: [],
          pageSize: options.pageSize || customDocxTemplate?.pageSize,
          orientation: options.orientation || customDocxTemplate?.orientation,
          margin: options.margin || customDocxTemplate?.margin,
          pageProperties: customDocxTemplate?.pageProperties,
          templateType: 'generated',
          recordsCount: recordsToMerge.length,
          sourceTemplateId: customDocxTemplate?.id || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveDocxTemplate(newGeneratedDoc);
        setSavedWordTemplates(getSavedDocxTemplates());

        const normalized = {
          id: newId,
          name: docName,
          styles: styles,
          templateBody: baseTemplateBody,
          body: mergedFullHtml,
          html: currentHtml,
          rawHtml: currentHtml,
          isTableDocument: isTabular,
          columns: [],
          data: [],
          pageSize: options.pageSize || customDocxTemplate?.pageSize,
          orientation: options.orientation || customDocxTemplate?.orientation,
          margin: options.margin || customDocxTemplate?.margin,
          pageProperties: customDocxTemplate?.pageProperties,
          templateMeta: newGeneratedDoc,
          templateType: 'generated' as const,
          recordsCount: recordsToMerge.length,
          sourceTemplateId: customDocxTemplate?.id || undefined,
        };
        setCustomDocxTemplate(normalized);
        setDocxRenderMode('all');
        return normalized;
      } else {
        // Saving as Template Blueprint (holding pure {{tokens}})
        let templateBodyToSave = baseTemplateBody;
        if (docxRenderMode === 'template') {
          const container = document.querySelector('.docx-live-container');
          if (container && container.innerHTML) {
            templateBodyToSave = container.innerHTML;
          }
        }

        const fullHtml = styles ? `${styles}\n${templateBodyToSave}` : templateBodyToSave;
        const detectedKeys = extractTagsFromText(fullHtml);
        const newId = 'tmpl_' + Date.now();
        const templateName = customName?.trim() || customDocxTemplate?.name || `${scopeDef?.name || 'Custom'} Template`;

        const newTemplate: CustomDocxTemplate = {
          id: newId,
          name: templateName,
          description: `Custom Template for ${scopeDef?.name || 'General Document'}`,
          scopeId: scopeId,
          rawHtml: fullHtml,
          detectedPlaceholders: detectedKeys,
          isTableDocument: Boolean(customDocxTemplate?.isTableDocument),
          sampleColumns: customDocxTemplate?.columns || [],
          sampleData: customDocxTemplate?.data || [],
          pageSize: options.pageSize || customDocxTemplate?.pageSize,
          orientation: options.orientation || customDocxTemplate?.orientation,
          margin: options.margin || customDocxTemplate?.margin,
          pageProperties: customDocxTemplate?.pageProperties,
          templateType: 'template',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveDocxTemplate(newTemplate);
        setSavedWordTemplates(getSavedDocxTemplates());

        const normalized = {
          id: newId,
          name: templateName,
          styles: styles,
          templateBody: templateBodyToSave,
          body: templateBodyToSave,
          html: fullHtml,
          rawHtml: fullHtml,
          isTableDocument: Boolean(customDocxTemplate?.isTableDocument),
          columns: customDocxTemplate?.columns || [],
          data: customDocxTemplate?.data || [],
          pageSize: options.pageSize || customDocxTemplate?.pageSize,
          orientation: options.orientation || customDocxTemplate?.orientation,
          margin: options.margin || customDocxTemplate?.margin,
          pageProperties: customDocxTemplate?.pageProperties,
          templateMeta: newTemplate,
          templateType: 'template' as const,
        };
        setCustomDocxTemplate(normalized);
        setDocxRenderMode('template');
        return normalized;
      }
    },
    [customDocxTemplate, docxRenderMode, scopeId, enrichedRecords, contextEnrichedBaseRecord, savedWordTemplates, combinedTemplates, options.pageSize, options.orientation, options.margin]
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

  const handleUpdateDocxTemplate = useCallback(
    (templateId: string, updates: { name?: string; description?: string; rawHtml?: string }) => {
      const all = getSavedDocxTemplates();
      let existing = all.find((t) => t.id === templateId);

      if (!existing) {
        const found = (combinedTemplates || []).find((t) => t.id === templateId) ||
                      (templates || []).find((t: any) => t.id === templateId);
        if (found) {
          const scopeDef = getScopeById(scopeId as any);
          existing = {
            id: templateId,
            name: found.name || `${scopeDef?.name || 'Custom'} Template`,
            description: found.description || '',
            scopeId: found.scopeId || scopeId,
            rawHtml: found.rawHtml || found.html || BLANK_PAGE_HTML,
            detectedPlaceholders: found.detectedPlaceholders || [],
            isTableDocument: Boolean(found.isTableDocument),
            sampleColumns: found.sampleColumns || found.columns || [],
            sampleData: found.sampleData || found.data || [],
            pageSize: found.pageSize,
            orientation: found.orientation,
            margin: found.margin,
            pageProperties: found.pageProperties,
            templateType: found.templateType || 'template',
            createdAt: found.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }

      if (!existing) return;
      const updated: CustomDocxTemplate = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveDocxTemplate(updated);
      setSavedWordTemplates(getSavedDocxTemplates());
      setCustomDocxTemplate((prev: any) => {
        if (prev?.templateMeta?.id === templateId || prev?.id === templateId) {
          return {
            ...prev,
            name: updates.name ?? prev.name,
            description: updates.description !== undefined ? updates.description : prev.description,
            ...(updates.rawHtml ? { rawHtml: updates.rawHtml, html: updates.rawHtml } : {}),
            templateMeta: {
              ...prev.templateMeta,
              ...updates,
            },
          };
        }
        return prev;
      });
    },
    [combinedTemplates, templates, scopeId]
  );

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
    setDocxRenderMode: handleDocxRenderModeChange,
    contextEnrichedBaseRecord,
    enrichedRecords,
    mergedDocxPages,
    handleTemplateSelection,
    handleApplyDocxTemplate,
    handleDeleteDocxTemplate,
    handleSaveCurrentTemplate,
    handleDuplicateDocxTemplate,
    handleUpdateDocxTemplate,
    handleSetScopeDefault,
    docxCanUndo,
    docxCanRedo,
    handleDocxUndo,
    handleDocxRedo,
    updateCustomDocxTemplateWithHistory,
    flushAutoSave,
    autoSaveStatus,
    autoSaveLastSavedAt,
    isAutoSaving,
    isAutoSaved,
  };
}

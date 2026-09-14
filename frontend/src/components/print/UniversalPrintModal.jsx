import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFullscreen, useResizablePanel } from '../../hooks';
import FullscreenButton from '../ui/FullscreenButton';
import PanelResizer from '../ui/PanelResizer';
import PrintExportMenu from './PrintExportMenu';
import PrintConfigSidebar from './PrintConfigSidebar';
import PrintCanvasViewer from './PrintCanvasViewer';
import PrintDocumentWrapper from './PrintDocumentWrapper';
import PrintTableRenderer from './PrintTableRenderer';
import DocxTemplateModal from './DocxTemplateModal';
import DocxLiveRenderer from './DocxLiveRenderer';
import {
  getSavedDocxTemplates,
  deleteDocxTemplate,
  bulkMergeTemplate,
  mergeTemplateWithData,
  separateDocxStylesAndBody,
} from './docxTemplateEngine';
import { DEFAULT_PRINT_OPTIONS } from '../../stores/printStore';
import { printDocument, updatePrintPageStyle, getPageMarginCSS } from './printExportUtils';
import {
  ZoomInIcon,
  ZoomOutIcon,
  SidebarRightIcon,
  UndoIcon,
  RedoIcon,
  HandIcon,
  CursorPointerIcon,
  FileIcon,
  SparklesIcon,
} from '../ui/Icons';
import './printEngine.css';

/**
 * UniversalPrintModal
 * Master Universal Print & Export Studio following SPR Note Fullscreen Standards (as in Attendance).
 * Supports both 100% Viewport Fullscreen Portal and Spacious Modal Windowing with Right Sidebar configuration.
 */
/** @type {any} */
export default function UniversalPrintModal({
  isOpen = false,
  onClose = () => {},
  title = 'Official Document',
  subtitle = '',
  metaItems = [], // [{ label: 'Class', value: 'Class 10' }]
  // Tabular Data Mode
  columns = [],
  data = [],
  summaryMetrics = [],
  footerRow = null,
  footerRows = [],
  isColumnMandatory = null,
  isColumnRequired = null,
  requiredColumnKeys = [],
  // Row Customization Controls
  visibleRowKeys: propVisibleRowKeys = null,
  onVisibleRowsChange: propOnVisibleRowsChange = null,
  isRowMandatory = null,
  isRowRequired = null,
  requiredRowKeys = [],
  getRowKey = null,
  rowKey = null,
  getRowLabel = null,
  getRowSubLabel = null,
  showRows = true,
  // Rich Custom Content Mode
  children = null,
  customSheets = false,
  // Initial default options override
  defaultOptions = {},
  // Pre-configured templates list
  templates = [],
  activeTemplateId = null,
  onTemplateChange = null,
  // Template Placeholder keys for Word (.docx) dynamic merge
  placeholderKeys = [],
  // Section Visibility Switches & Controls
  showSectionsAndBars = true,
  showSectionsBar = true,
  showDisplayBars = true,
  showDataDisplay = true,
  showColumns = true,
  showHeaderSection = true,
  showWatermarkSection = true,
  showSignaturesSection = true,
  // Format Visibility Switches & Filters
  showPrint = true,
  showPDF = true,
  showExcel = true,
  showTxt = true,
  showWord = true,
  showImages = true,
  showPng = true,
  showJpg = true,
  enabledFormats = null,
  // Custom action triggers
  onPrint = null,
  onExportPDF = null,
  onExportExcel = null,
  onExportCsv = null,
  onExportTxt = null,
  onExportWord = null,
  onExportPng = null,
  onExportJpg = null,
  // URL Deep-Linking & History Sync
  urlSync = true,
  urlParam = 'print',
  urlParamValue = null,
}) {
  const GLOBAL_PREFS_KEY = 'spr_print_preferences_global_v1';
  const getDocStorageKey = (docTitle) => {
    const clean = String(docTitle || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    return `spr_print_doc_${clean}_v1`;
  };

  const docKey = useMemo(() => getDocStorageKey(title), [title]);

  // Factory Default Options from printStore
  const factoryDefaults = useMemo(
    () => ({
      ...DEFAULT_PRINT_OPTIONS,
      customInstitutionName: '',
      customSubtitle: '',
      ...defaultOptions,
    }),
    [defaultOptions]
  );

  // Master Print Options State with localStorage Hydration
  const [options, setOptions] = useState(() => {
    let savedGlobal = {};
    let savedDoc = {};

    try {
      if (typeof window !== 'undefined') {
        const rawGlobal = localStorage.getItem(GLOBAL_PREFS_KEY);
        if (rawGlobal) savedGlobal = JSON.parse(rawGlobal);
        const rawDoc = localStorage.getItem(getDocStorageKey(title));
        if (rawDoc) savedDoc = JSON.parse(rawDoc);
      }
    } catch (e) {
      console.warn('Failed to parse print options from localStorage', e);
    }

    return {
      ...factoryDefaults,
      ...savedGlobal,
      ...savedDoc,
      ...defaultOptions,
    };
  });

  // Sync defaultOptions if provided with strict signature change detection
  const defaultOptionsSig = useMemo(
    () => (defaultOptions && typeof defaultOptions === 'object' ? JSON.stringify(defaultOptions) : ''),
    [defaultOptions]
  );
  const prevDefaultOptionsSigRef = useRef(defaultOptionsSig);

  useEffect(() => {
    if (defaultOptions && Object.keys(defaultOptions).length > 0) {
      if (defaultOptionsSig !== prevDefaultOptionsSigRef.current) {
        prevDefaultOptionsSigRef.current = defaultOptionsSig;
        setOptions((prev) => ({ ...prev, ...defaultOptions }));
      }
    }
  }, [defaultOptionsSig, defaultOptions]);

  // ── WYSIWYG Live Canvas State (Data Rows, Columns, Metadata, Summaries) ───
  const [liveData, setLiveData] = useState(() => (Array.isArray(data) ? [...data] : []));
  const [liveColumns, setLiveColumns] = useState(() => (Array.isArray(columns) ? [...columns] : []));
  const [liveMetaItems, setLiveMetaItems] = useState(() => (Array.isArray(metaItems) ? [...metaItems] : []));
  const [liveSummaryMetrics, setLiveSummaryMetrics] = useState(() => (Array.isArray(summaryMetrics) ? [...summaryMetrics] : []));

  const dataSignature = useMemo(
    () => (Array.isArray(data) ? `${data.length}_${data[0]?.id || data[0]?.key || ''}` : ''),
    [data]
  );
  const prevDataSigRef = useRef(dataSignature);

  useEffect(() => {
    if (isOpen && Array.isArray(data) && dataSignature !== prevDataSigRef.current) {
      prevDataSigRef.current = dataSignature;
      setLiveData(data);
    }
  }, [isOpen, dataSignature, data]);

  const columnsSignature = useMemo(
    () => (Array.isArray(columns) ? columns.map((c) => c.id || c.key || c.accessor || c.dataIndex).join(',') : ''),
    [columns]
  );
  const prevColumnsSigRef = useRef(columnsSignature);

  useEffect(() => {
    if (isOpen && Array.isArray(columns) && columnsSignature !== prevColumnsSigRef.current) {
      prevColumnsSigRef.current = columnsSignature;
      setLiveColumns(columns);
    }
  }, [isOpen, columnsSignature, columns]);

  const metaSignature = useMemo(
    () => (Array.isArray(metaItems) ? JSON.stringify(metaItems) : ''),
    [metaItems]
  );
  const prevMetaSigRef = useRef(metaSignature);

  useEffect(() => {
    if (isOpen && Array.isArray(metaItems) && metaSignature !== prevMetaSigRef.current) {
      prevMetaSigRef.current = metaSignature;
      setLiveMetaItems(metaItems);
    }
  }, [isOpen, metaSignature, metaItems]);

  const summarySignature = useMemo(
    () => (Array.isArray(summaryMetrics) ? JSON.stringify(summaryMetrics) : ''),
    [summaryMetrics]
  );
  const prevSummarySigRef = useRef(summarySignature);

  useEffect(() => {
    if (isOpen && Array.isArray(summaryMetrics) && summarySignature !== prevSummarySigRef.current) {
      prevSummarySigRef.current = summarySignature;
      setLiveSummaryMetrics(summaryMetrics);
    }
  }, [isOpen, summarySignature, summaryMetrics]);

  // Column and Row key signatures to prevent wiping user uncheck selections
  const columnKeySignature = useMemo(
    () => (liveColumns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex).join(','),
    [liveColumns]
  );

  const getRowIdentifier = useCallback(
    (row, idx) => {
      if (typeof getRowKey === 'function') return String(getRowKey(row, idx));
      if (typeof rowKey === 'string' && row && row[rowKey] !== undefined) return String(row[rowKey]);
      return String(row?.id ?? row?.key ?? row?._id ?? row?.studentId ?? row?.subjectId ?? `row_${idx}`);
    },
    [getRowKey, rowKey]
  );

  const allRowKeys = useMemo(() => {
    if (!Array.isArray(liveData)) return [];
    return liveData.map((r, i) => getRowIdentifier(r, i));
  }, [liveData, getRowIdentifier]);

  const rowKeySignature = useMemo(() => allRowKeys.join(','), [allRowKeys]);

  // ── Word (.docx) Document & Template Ingestion State ─────────────────────
  const [isDocxModalOpen, setIsDocxModalOpen] = useState(false);
  const [customDocxTemplate, setCustomDocxTemplate] = useState(null);
  const [savedWordTemplates, setSavedWordTemplates] = useState(() => {
    try {
      return getSavedDocxTemplates();
    } catch (e) {
      return [];
    }
  });

  // Combine built-in templates with user-saved Word (.docx) templates
  const combinedTemplates = useMemo(() => {
    const list = Array.isArray(templates) ? [...templates] : [];
    if (Array.isArray(savedWordTemplates)) {
      savedWordTemplates.forEach((wt) => {
        list.push({
          id: wt.id,
          name: wt.name,
          description: wt.description || 'Custom Word (.docx) Template',
          isWordDocx: true,
          rawHtml: wt.rawHtml,
        });
      });
    }
    return list;
  }, [templates, savedWordTemplates]);

  // Handle template selection (built-in or Word docx)
  const handleTemplateSelection = useCallback((templateIdOrObj) => {
    const tId = typeof templateIdOrObj === 'object' ? templateIdOrObj?.id : templateIdOrObj;
    const foundWordTemplate = (savedWordTemplates || []).find((t) => t.id === tId);
    if (foundWordTemplate) {
      setCustomDocxTemplate({
        html: foundWordTemplate.rawHtml,
        isTableDocument: foundWordTemplate.isTableDocument,
        columns: foundWordTemplate.sampleColumns || [],
        data: foundWordTemplate.sampleData || [],
        templateMeta: foundWordTemplate,
      });
    } else {
      setCustomDocxTemplate(null);
    }
    onTemplateChange?.(templateIdOrObj);
  }, [savedWordTemplates, onTemplateChange]);

  const handleApplyDocxTemplate = useCallback((result) => {
    if (result.templateMeta) {
      setSavedWordTemplates(getSavedDocxTemplates());
    }
    // Always set customDocxTemplate so the document canvas mounts immediately
    setCustomDocxTemplate(result);
    if (result.isTableDocument && result.columns?.length > 0 && result.data?.length > 0) {
      setLiveColumns(result.columns);
      setVisibleColumnKeys(result.columns.map((c) => c.id));
    }
  }, []);

  const handleDeleteDocxTemplate = useCallback((templateId) => {
    deleteDocxTemplate(templateId);
    setSavedWordTemplates(getSavedDocxTemplates());
    if (customDocxTemplate?.templateMeta?.id === templateId) {
      setCustomDocxTemplate(null);
    }
  }, [customDocxTemplate]);

  // Extracted docx scoped styles rendered once at canvas container level (prevents 100 duplicate <style> tags)
  const docxStyles = useMemo(() => {
    if (!customDocxTemplate?.html) return '';
    const { styles } = separateDocxStylesAndBody(customDocxTemplate.html);
    return styles;
  }, [customDocxTemplate?.html]);

  // Memoized merged pages for Word (.docx) mode: eliminates continuous re-merges during zoom, resize, or pan
  const mergedDocxPages = useMemo(() => {
    if (!customDocxTemplate?.html) return [];
    const { body } = separateDocxStylesAndBody(customDocxTemplate.html);
    const contentToMerge = body || customDocxTemplate.html;

    if (Array.isArray(liveData) && liveData.length > 0 && (contentToMerge.includes('{{') || /\{[a-zA-Z0-9_]+\}/.test(contentToMerge))) {
      return bulkMergeTemplate(contentToMerge, liveData);
    }
    return [
      Array.isArray(liveData) && liveData.length > 0
        ? mergeTemplateWithData(contentToMerge, liveData[0])
        : contentToMerge,
    ];
  }, [customDocxTemplate?.html, liveData]);

  // Mouse Pointer & Canvas Tool Mode: 'hand' (Movable) | 'select' (Text Selection & Live Edit)
  const [pointerMode, setPointerMode] = useState('select');

  // Column Visibility State with localStorage Hydration
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawDoc = localStorage.getItem(getDocStorageKey(title));
        if (rawDoc) {
          const parsed = JSON.parse(rawDoc);
          if (Array.isArray(parsed.visibleColumnKeys) && parsed.visibleColumnKeys.length > 0) {
            const availableKeys = new Set(
              (columns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex)
            );
            const valid = parsed.visibleColumnKeys.filter((k) => availableKeys.has(k));
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch (e) {
      // fallback
    }
    return (columns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex);
  });

  useEffect(() => {
    if (!liveColumns || liveColumns.length === 0) return;
    setVisibleColumnKeys((prev) => {
      if (!prev || prev.length === 0) {
        return liveColumns.map((c) => c.id || c.key || c.accessor || c.dataIndex);
      }
      const currentKeys = new Set(liveColumns.map((c) => c.id || c.key || c.accessor || c.dataIndex));
      const retained = prev.filter((k) => currentKeys.has(k));
      if (retained.length === prev.length && retained.every((k, i) => k === prev[i])) {
        return prev;
      }
      return retained.length > 0 ? retained : liveColumns.map((c) => c.id || c.key || c.accessor || c.dataIndex);
    });
  }, [columnKeySignature]);

  // Row Visibility State with localStorage Hydration
  const [visibleRowKeys, setVisibleRowKeys] = useState(() => {
    if (propVisibleRowKeys && Array.isArray(propVisibleRowKeys)) {
      return propVisibleRowKeys.map(String);
    }
    try {
      if (typeof window !== 'undefined') {
        const rawDoc = localStorage.getItem(getDocStorageKey(title));
        if (rawDoc) {
          const parsed = JSON.parse(rawDoc);
          if (Array.isArray(parsed.visibleRowKeys) && parsed.visibleRowKeys.length > 0) {
            const availableSet = new Set(allRowKeys);
            const valid = parsed.visibleRowKeys.map(String).filter((k) => availableSet.has(k));
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch (e) {
      // fallback
    }
    return allRowKeys;
  });

  useEffect(() => {
    if (propVisibleRowKeys && Array.isArray(propVisibleRowKeys)) {
      setVisibleRowKeys(propVisibleRowKeys.map(String));
      return;
    }
    if (!allRowKeys || allRowKeys.length === 0) return;
    setVisibleRowKeys((prev) => {
      if (!prev || prev.length === 0) return allRowKeys;
      const currentSet = new Set(allRowKeys);
      const retained = prev.filter((k) => currentSet.has(k));
      if (retained.length === prev.length && retained.every((k, i) => k === prev[i])) {
        return prev;
      }
      return retained.length > 0 ? retained : allRowKeys;
    });
  }, [rowKeySignature, propVisibleRowKeys]);

  // Extra Blank Rows with localStorage Hydration
  const [extraBlankRows, setExtraBlankRows] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawDoc = localStorage.getItem(getDocStorageKey(title));
        if (rawDoc) {
          const parsed = JSON.parse(rawDoc);
          if (parsed.extraBlankRows !== undefined) {
            return parsed.extraBlankRows;
          }
        }
      }
    } catch (e) {
      // fallback
    }
    return 0;
  });

  // Zoom State with localStorage Hydration
  const [zoomLevel, setZoomLevel] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawGlobal = localStorage.getItem(GLOBAL_PREFS_KEY);
        if (rawGlobal) {
          const parsed = JSON.parse(rawGlobal);
          if (parsed.zoomLevel) return parsed.zoomLevel;
        }
      }
    } catch (e) {
      // fallback
    }
    return 1;
  });

  // Right Sidebar Visibility State with localStorage Hydration
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawGlobal = localStorage.getItem(GLOBAL_PREFS_KEY);
        if (rawGlobal) {
          const parsed = JSON.parse(rawGlobal);
          if (parsed.isSidebarOpen !== undefined) return parsed.isSidebarOpen;
        }
      }
    } catch (e) {
      // fallback
    }
    return true;
  });

  // ── Reusable Right Sidebar Resizing with localStorage Persistence ─────────
  const {
    width: sidebarWidth,
    isResizing: isSidebarResizing,
    startResizing: startSidebarResizing,
    toggleWidth: handleSidebarResizerDoubleClick,
  } = useResizablePanel({
    storageKey: 'spr_print_sidebar_width',
    defaultWidth: 580,
    minWidth: 360,
    maxWidth: 1080,
    maxRatio: 0.85,
    side: 'right',
    toggleCompactWidth: 580,
    toggleExpandedWidth: 760,
  });

  // Persist Global & Document-Specific Options to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // 1. Save global options
        const globalData = {
          pageSize: options.pageSize,
          orientation: options.orientation,
          margin: options.margin,
          density: options.density,
          colorMode: options.colorMode,
          showHeader: options.showHeader,
          showLogo: options.showLogo,
          showTitle: options.showTitle,
          showTitleLine: options.showTitleLine,
          titleLineStyle: options.titleLineStyle,
          showMeta: options.showMeta,
          showMetaBox: options.showMetaBox,
          metaFontSize: options.metaFontSize,
          showSummary: options.showSummary,
          showFooter: options.showFooter,
          showWatermark: options.showWatermark,
          watermarkText: options.watermarkText,
          showSignatures: options.showSignatures,
          signatureStyle: options.signatureStyle,
          zoomLevel,
          isSidebarOpen,
        };
        localStorage.setItem(GLOBAL_PREFS_KEY, JSON.stringify(globalData));

        // 2. Save document-specific customizations
        const docData = {
          ...options,
          visibleColumnKeys,
          visibleRowKeys,
          extraBlankRows,
          zoomLevel,
        };
        localStorage.setItem(docKey, JSON.stringify(docData));
      }
    } catch (e) {
      console.warn('Failed to save print settings to localStorage', e);
    }
  }, [options, visibleColumnKeys, visibleRowKeys, extraBlankRows, zoomLevel, isSidebarOpen, docKey]);

  // ── Undo / Redo History Architecture for Print Studio ─────────────────────
  const pastStackRef = useRef([]);
  const futureStackRef = useRef([]);
  const isRestoringRef = useRef(false);
  const [, setHistoryVersion] = useState(0);

  const canUndo = pastStackRef.current.length > 0;
  const canRedo = futureStackRef.current.length > 0;

  // Push an action before mutating state
  const pushStateChange = useCallback((updaterFn) => {
    if (isRestoringRef.current) {
      updaterFn();
      return;
    }
    const prevSnapshot = {
      options: { ...options },
      visibleColumnKeys: Array.isArray(visibleColumnKeys) ? [...visibleColumnKeys] : [],
      visibleRowKeys: Array.isArray(visibleRowKeys) ? [...visibleRowKeys] : [],
      extraBlankRows,
      liveData: Array.isArray(liveData) ? JSON.parse(JSON.stringify(liveData)) : [],
      liveColumns: Array.isArray(liveColumns) ? JSON.parse(JSON.stringify(liveColumns)) : [],
      liveMetaItems: Array.isArray(liveMetaItems) ? JSON.parse(JSON.stringify(liveMetaItems)) : [],
      liveSummaryMetrics: Array.isArray(liveSummaryMetrics) ? JSON.parse(JSON.stringify(liveSummaryMetrics)) : [],
    };
    pastStackRef.current = [...pastStackRef.current, prevSnapshot].slice(-40);
    futureStackRef.current = [];
    updaterFn();
    setHistoryVersion((v) => v + 1);
  }, [options, visibleColumnKeys, visibleRowKeys, extraBlankRows, liveData, liveColumns, liveMetaItems, liveSummaryMetrics]);

  // Wrapped State Setters
  const updateOptionsWithHistory = useCallback((nextValOrUpdater) => {
    pushStateChange(() => {
      setOptions(nextValOrUpdater);
    });
  }, [pushStateChange]);

  const updateVisibleColumnsWithHistory = useCallback((nextValOrUpdater) => {
    pushStateChange(() => {
      setVisibleColumnKeys(nextValOrUpdater);
    });
  }, [pushStateChange]);

  const updateVisibleRowsWithHistory = useCallback((nextValOrUpdater) => {
    pushStateChange(() => {
      setVisibleRowKeys((prev) => {
        const resolved = typeof nextValOrUpdater === 'function' ? nextValOrUpdater(prev) : nextValOrUpdater;
        propOnVisibleRowsChange?.(resolved);
        return resolved;
      });
    });
  }, [pushStateChange, propOnVisibleRowsChange]);

  const updateExtraBlankRowsWithHistory = useCallback((nextValOrUpdater) => {
    pushStateChange(() => {
      setExtraBlankRows(nextValOrUpdater);
    });
  }, [pushStateChange]);

  // ── WYSIWYG Live Canvas Mutation Handlers ─────────────────────────────────
  const handleCellChange = useCallback((rowIndex, colKey, newValue) => {
    pushStateChange(() => {
      setLiveData((prev) => {
        const next = [...prev];
        if (next[rowIndex]) {
          next[rowIndex] = { ...next[rowIndex], [colKey]: newValue };
        }
        return next;
      });
    });
  }, [pushStateChange]);

  const handleRowDelete = useCallback((rowIndex) => {
    pushStateChange(() => {
      setLiveData((prev) => prev.filter((_, idx) => idx !== rowIndex));
    });
  }, [pushStateChange]);

  const handleRowInsert = useCallback((rowIndex, position = 'below') => {
    pushStateChange(() => {
      setLiveData((prev) => {
        const newRow = { id: `row_custom_${Date.now()}` };
        (liveColumns || []).forEach((c) => {
          const k = c.id || c.key || c.accessor || c.dataIndex;
          if (k) newRow[k] = '';
        });
        const insertIdx = position === 'above' ? rowIndex : rowIndex + 1;
        const next = [...prev];
        next.splice(insertIdx, 0, newRow);
        return next;
      });
    });
  }, [liveColumns, pushStateChange]);

  const handleRowMove = useCallback((fromIndex, toIndex) => {
    pushStateChange(() => {
      setLiveData((prev) => {
        if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    });
  }, [pushStateChange]);

  const handleColumnHeaderChange = useCallback((colKey, newHeader) => {
    pushStateChange(() => {
      setLiveColumns((prev) =>
        prev.map((c) => {
          const k = c.id || c.key || c.accessor || c.dataIndex;
          return k === colKey ? { ...c, header: newHeader, label: newHeader, title: newHeader } : c;
        })
      );
    });
  }, [pushStateChange]);

  const handleMetaItemsChange = useCallback((newMetaItems) => {
    pushStateChange(() => {
      setLiveMetaItems(newMetaItems);
    });
  }, [pushStateChange]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (pastStackRef.current.length === 0) return;
    const currentSnapshot = {
      options: { ...options },
      visibleColumnKeys: Array.isArray(visibleColumnKeys) ? [...visibleColumnKeys] : [],
      visibleRowKeys: Array.isArray(visibleRowKeys) ? [...visibleRowKeys] : [],
      extraBlankRows,
      liveData: Array.isArray(liveData) ? JSON.parse(JSON.stringify(liveData)) : [],
      liveColumns: Array.isArray(liveColumns) ? JSON.parse(JSON.stringify(liveColumns)) : [],
      liveMetaItems: Array.isArray(liveMetaItems) ? JSON.parse(JSON.stringify(liveMetaItems)) : [],
      liveSummaryMetrics: Array.isArray(liveSummaryMetrics) ? JSON.parse(JSON.stringify(liveSummaryMetrics)) : [],
    };
    const previousSnapshot = pastStackRef.current[pastStackRef.current.length - 1];
    pastStackRef.current = pastStackRef.current.slice(0, -1);
    futureStackRef.current = [currentSnapshot, ...futureStackRef.current].slice(0, 40);

    isRestoringRef.current = true;
    setOptions(previousSnapshot.options);
    setVisibleColumnKeys(previousSnapshot.visibleColumnKeys);
    setVisibleRowKeys(previousSnapshot.visibleRowKeys || allRowKeys);
    setExtraBlankRows(previousSnapshot.extraBlankRows);
    if (previousSnapshot.liveData) setLiveData(previousSnapshot.liveData);
    if (previousSnapshot.liveColumns) setLiveColumns(previousSnapshot.liveColumns);
    if (previousSnapshot.liveMetaItems) setLiveMetaItems(previousSnapshot.liveMetaItems);
    if (previousSnapshot.liveSummaryMetrics) setLiveSummaryMetrics(previousSnapshot.liveSummaryMetrics);
    isRestoringRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, [options, visibleColumnKeys, visibleRowKeys, extraBlankRows, allRowKeys, liveData, liveColumns, liveMetaItems, liveSummaryMetrics]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (futureStackRef.current.length === 0) return;
    const currentSnapshot = {
      options: { ...options },
      visibleColumnKeys: Array.isArray(visibleColumnKeys) ? [...visibleColumnKeys] : [],
      visibleRowKeys: Array.isArray(visibleRowKeys) ? [...visibleRowKeys] : [],
      extraBlankRows,
      liveData: Array.isArray(liveData) ? JSON.parse(JSON.stringify(liveData)) : [],
      liveColumns: Array.isArray(liveColumns) ? JSON.parse(JSON.stringify(liveColumns)) : [],
      liveMetaItems: Array.isArray(liveMetaItems) ? JSON.parse(JSON.stringify(liveMetaItems)) : [],
      liveSummaryMetrics: Array.isArray(liveSummaryMetrics) ? JSON.parse(JSON.stringify(liveSummaryMetrics)) : [],
    };
    const nextSnapshot = futureStackRef.current[0];
    futureStackRef.current = futureStackRef.current.slice(1);
    pastStackRef.current = [...pastStackRef.current, currentSnapshot].slice(-40);

    isRestoringRef.current = true;
    setOptions(nextSnapshot.options);
    setVisibleColumnKeys(nextSnapshot.visibleColumnKeys);
    setVisibleRowKeys(nextSnapshot.visibleRowKeys || allRowKeys);
    setExtraBlankRows(nextSnapshot.extraBlankRows);
    if (nextSnapshot.liveData) setLiveData(nextSnapshot.liveData);
    if (nextSnapshot.liveColumns) setLiveColumns(nextSnapshot.liveColumns);
    if (nextSnapshot.liveMetaItems) setLiveMetaItems(nextSnapshot.liveMetaItems);
    if (nextSnapshot.liveSummaryMetrics) setLiveSummaryMetrics(nextSnapshot.liveSummaryMetrics);
    isRestoringRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, [options, visibleColumnKeys, visibleRowKeys, extraBlankRows, allRowKeys, liveData, liveColumns, liveMetaItems, liveSummaryMetrics]);

  // Reset to Defaults
  const handleResetDefaults = useCallback(() => {
    pushStateChange(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(docKey);
        }
      } catch (e) {
        // ignore
      }
      setOptions(factoryDefaults);
      setLiveData(Array.isArray(data) ? [...data] : []);
      setLiveColumns(Array.isArray(columns) ? [...columns] : []);
      setLiveMetaItems(Array.isArray(metaItems) ? [...metaItems] : []);
      setLiveSummaryMetrics(Array.isArray(summaryMetrics) ? [...summaryMetrics] : []);
      setVisibleColumnKeys((columns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex));
      setVisibleRowKeys(allRowKeys);
      setExtraBlankRows(0);
      setZoomLevel(1);
    });
  }, [docKey, factoryDefaults, columns, data, metaItems, summaryMetrics, allRowKeys, pushStateChange]);

  // Universal Project Fullscreen Hook (identical to Attendance module)
  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen({ initialState: true });

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.3, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  // Sync dynamic @page print CSS whenever pageSize, orientation or margin changes
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    updatePrintPageStyle({
      pageSize: options.pageSize,
      orientation: options.orientation,
      margin: options.margin,
    });
    return () => {
      const styleEl = document.getElementById('spr-dynamic-print-page-style');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, [isOpen, options.pageSize, options.orientation, options.margin]);

  // Print Trigger (Ctrl+P shortcut)
  const handlePrint = useCallback(() => {
    printDocument(options);
  }, [options]);

  // Keyboard Shortcuts (Ctrl+P, Esc, +, -, 0, Ctrl+B, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    if (!isOpen) return;

    const isNativeEditing = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toUpperCase();
      if (tag === 'TEXTAREA') return true;
      if (tag === 'INPUT') {
        const type = (el.type || 'text').toLowerCase();
        return ['text', 'search', 'password', 'email', 'number', 'tel', 'url'].includes(type);
      }
      return el.isContentEditable || el.getAttribute('contenteditable') === 'true';
    };

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const inText = isNativeEditing(activeEl);

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (!inText) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        if (!inText) {
          e.preventDefault();
          handleRedo();
        }
      } else if (!inText && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'm') {
          setPointerMode('hand');
        } else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 's') {
          setPointerMode('select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint, onClose, handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Lock body scroll when studio modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ── URL Synchronization & Browser History (Back/Forward button support) ─────
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!urlSync || typeof window === 'undefined') return;

    const targetParamValue =
      urlParamValue ||
      String(title || 'studio')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      'studio';

    if (isOpen) {
      wasOpenRef.current = true;
      const url = new URL(window.location.href);
      if (url.searchParams.get(urlParam) !== targetParamValue) {
        url.searchParams.set(urlParam, targetParamValue);
        window.history.pushState(
          { printStudio: true, [urlParam]: targetParamValue },
          '',
          url.toString()
        );
      }

      const handlePopState = () => {
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has(urlParam)) {
          onClose?.();
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      // Clean up URL parameter ONLY if this modal was previously opened and is now closing
      const url = new URL(window.location.href);
      if (url.searchParams.has(urlParam)) {
        url.searchParams.delete(urlParam);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [isOpen, urlSync, urlParam, urlParamValue, title, onClose]);

  // Filter active visible rows for accurate pagination calculation
  const activeData = useMemo(() => {
    if (!visibleRowKeys || !Array.isArray(visibleRowKeys) || !Array.isArray(liveData)) {
      return liveData || [];
    }
    const visibleSet = new Set(visibleRowKeys.map(String));
    return (liveData || []).filter((row, idx) => {
      const key = getRowIdentifier(row, idx);
      const isMandatory =
        (typeof isRowMandatory === 'function' && isRowMandatory(row, idx)) ||
        (typeof isRowRequired === 'function' && isRowRequired(row, idx)) ||
        (requiredRowKeys && Array.isArray(requiredRowKeys) && requiredRowKeys.map(String).includes(key)) ||
        Boolean(row?.required || row?.mandatory || row?.isMandatory || row?.locked || row?.isLocked);

      return isMandatory || visibleSet.has(key);
    });
  }, [liveData, visibleRowKeys, getRowIdentifier, isRowMandatory, isRowRequired, requiredRowKeys]);

  // ── Dynamic Real-Pixel DOM Measurement & Auto-Pagination Engine ───────────
  const measureSandboxRef = useRef(null);
  const [measuredPageSlices, setMeasuredPageSlices] = useState(null);

  // Helper to only update state if calculated slices actually changed in content
  const updateSlicesIfChanged = useCallback((newSlices) => {
    setMeasuredPageSlices((prev) => {
      if (!prev && !newSlices) return prev;
      if (!prev && newSlices) return newSlices;
      if (prev && !newSlices) return null;
      if (prev.length !== newSlices.length) return newSlices;
      const isSame = prev.every((p, i) => {
        const n = newSlices[i];
        return (
          n &&
          p.startIndex === n.startIndex &&
          p.endIndex === n.endIndex &&
          p.isFirstPage === n.isFirstPage &&
          p.isLastPage === n.isLastPage
        );
      });
      return isSame ? prev : newSlices;
    });
  }, []);

  // Recalculate exact page slices naturally when content exceeds physical page height
  const recalculateDOMPagination = useCallback(() => {
    if (options.enablePageBreak === false || children) {
      updateSlicesIfChanged(null);
      return;
    }

    const sandbox = measureSandboxRef.current;
    if (!sandbox) return;

    const paperEl = sandbox.querySelector('.paper-sheet');
    if (!paperEl) return;

    const { pageSize = 'A4', orientation = 'PORTRAIT' } = options;

    let targetPageHeight = 1123;
    if (pageSize === 'LEGAL') {
      targetPageHeight = orientation === 'LANDSCAPE' ? 816 : 1344;
    } else if (pageSize === 'LETTER') {
      targetPageHeight = orientation === 'LANDSCAPE' ? 816 : 1056;
    } else {
      targetPageHeight = orientation === 'LANDSCAPE' ? 794 : 1123;
    }

    const trEls = Array.from(paperEl.querySelectorAll('.print-table tbody tr'));
    if (trEls.length === 0) {
      updateSlicesIfChanged(null);
      return;
    }

    const totalRows = trEls.length;
    const paperRect = paperEl.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(paperEl);
    const paddingTop = parseFloat(computedStyle.paddingTop) || 38;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 38;

    // Measure actual rendered heights of footer components
    const bottomSectionEl = paperEl.querySelector('.print-signature-footer-container');
    const tfootEl = paperEl.querySelector('.print-table tfoot');
    const signaturesHeight = bottomSectionEl ? bottomSectionEl.offsetHeight : 0;
    const tfootHeight = tfootEl ? tfootEl.offsetHeight : 0;
    const totalBottomOverhead = tfootHeight + signaturesHeight;

    const theadEl = paperEl.querySelector('.print-table thead');
    const theadHeight = theadEl ? theadEl.offsetHeight : 32;

    const page1MaxBottom = targetPageHeight - paddingBottom;

    // Measure the exact bottom of the LAST table row relative to the top of the paper
    const lastTr = trEls[totalRows - 1];
    const lastTrBottom = lastTr ? (lastTr.getBoundingClientRect().bottom - paperRect.top) : 0;
    const totalHeightIfSinglePage = lastTrBottom + totalBottomOverhead;

    // 1. If entire content (All Table Rows + TFoot + Signatures + Footer) fits on Page 1:
    if (totalHeightIfSinglePage <= page1MaxBottom) {
      updateSlicesIfChanged([
        {
          startIndex: 0,
          endIndex: totalRows,
          isFirstPage: true,
          isLastPage: true,
        },
      ]);
      return;
    }

    // Find maximum rows that can physically fit on Page 1
    let maxPage1Rows = 0;
    for (let i = 0; i < totalRows; i++) {
      const rowRect = trEls[i].getBoundingClientRect();
      const rowBottom = rowRect.bottom - paperRect.top;
      if (rowBottom > page1MaxBottom - 12) {
        break;
      }
      maxPage1Rows = i + 1;
    }
    if (maxPage1Rows === 0) maxPage1Rows = 1;

    // Calculate available height on continuation / last pages:
    const continuationHeaderHeight = 32;
    const subPageAvailableHeight = targetPageHeight - paddingTop - paddingBottom - continuationHeaderHeight - theadHeight;
    const lastPageAvailableForRows = subPageAvailableHeight - totalBottomOverhead;

    // Calculate how many rows we can safely fit on the last page along with footer/signatures
    let maxLastPageRows = 0;
    let accumulatedLastPageH = 0;
    for (let i = totalRows - 1; i >= 0; i--) {
      const rowH = trEls[i].offsetHeight || trEls[i].getBoundingClientRect().height || 36;
      if (accumulatedLastPageH + rowH > lastPageAvailableForRows && maxLastPageRows >= 2) {
        break;
      }
      accumulatedLastPageH += rowH;
      maxLastPageRows++;
    }
    if (maxLastPageRows === 0) maxLastPageRows = 1;

    // Page 1 should take rows up to maxPage1Rows, leaving adequate rows for subsequent pages
    let page1End = Math.min(
      maxPage1Rows,
      Math.max(1, totalRows - Math.min(maxLastPageRows, Math.ceil(totalRows / 2)))
    );

    // If totalRows is moderate (e.g. <= 20) and exceeds 1 page, split rows evenly across pages:
    if (totalRows <= 20) {
      page1End = Math.min(maxPage1Rows, Math.ceil(totalRows / 2));
    }

    const slices = [
      {
        startIndex: 0,
        endIndex: page1End,
        isFirstPage: true,
        isLastPage: false,
      },
    ];

    let currentStart = page1End;

    while (currentStart < totalRows) {
      let currentEnd = currentStart;
      let accumulatedHeight = 0;

      // Check if all remaining rows can fit on this page as the LAST page
      let canAllFitOnLastPage = true;
      let testH = 0;
      for (let k = currentStart; k < totalRows; k++) {
        testH += (trEls[k].offsetHeight || 36);
      }
      if (testH + totalBottomOverhead > subPageAvailableHeight) {
        canAllFitOnLastPage = false;
      }

      if (canAllFitOnLastPage) {
        currentEnd = totalRows;
      } else {
        while (currentEnd < totalRows) {
          const rowH = trEls[currentEnd].offsetHeight || trEls[currentEnd].getBoundingClientRect().height || 36;
          if (accumulatedHeight + rowH > subPageAvailableHeight && currentEnd > currentStart) {
            break;
          }
          accumulatedHeight += rowH;
          currentEnd++;
        }
      }

      if (currentEnd === currentStart) {
        currentEnd = currentStart + 1;
      }

      const isLast = currentEnd >= totalRows;

      slices.push({
        startIndex: currentStart,
        endIndex: currentEnd,
        isFirstPage: false,
        isLastPage: isLast,
      });

      currentStart = currentEnd;
      if (isLast) break;
    }

    if (slices.length > 0) {
      slices[slices.length - 1].isLastPage = true;
    }

    updateSlicesIfChanged(slices);
  }, [options, children, updateSlicesIfChanged]);

  const recalcRef = useRef(recalculateDOMPagination);
  recalcRef.current = recalculateDOMPagination;

  // Trigger measurement synchronously after DOM mutation
  useLayoutEffect(() => {
    if (!isOpen) return;
    recalcRef.current();
  }, [
    isOpen,
    activeData,
    liveColumns,
    visibleRowKeys,
    visibleColumnKeys,
    extraBlankRows,
    options.pageSize,
    options.orientation,
    options.margin,
    options.density,
    options.enablePageBreak,
    options.showHeader,
    options.showLogo,
    options.showTitle,
    options.showMeta,
    options.showSignatures,
    options.showSummary,
    options.showFooter,
    title,
    subtitle,
    liveMetaItems,
    liveSummaryMetrics,
    footerRows,
    footerRow,
  ]);

  // Persistent, debounced ResizeObserver on measuring sandbox
  useEffect(() => {
    if (!isOpen || typeof ResizeObserver === 'undefined') return;
    const sandbox = measureSandboxRef.current;
    if (!sandbox) return;

    let rafId = null;
    const observer = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        recalcRef.current();
      });
    });

    observer.observe(sandbox);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isOpen]);

  // Calculate final pages consuming dynamic DOM measurement directly
  const paginationResult = useMemo(() => {
    const dataList = Array.isArray(activeData) ? activeData : [];
    const totalBlanks = Math.max(0, parseInt(extraBlankRows, 10) || 0);

    // Total unified items list (data rows + blank rows)
    const totalItems = [
      ...dataList,
      ...Array.from({ length: totalBlanks }).map((_, i) => ({ __isBlank: true, id: `blank_${i}` })),
    ];

    // If auto page break is disabled or custom children mode, keep single continuous page
    if (options.enablePageBreak === false || children) {
      return {
        pages: [
          {
            pageIndex: 0,
            rows: dataList,
            extraBlanks: totalBlanks,
            isFirstPage: true,
            isLastPage: true,
            startIndex: 0,
          },
        ],
        totalPages: 1,
      };
    }

    // 1. Direct Natural DOM Measurement Consumption:
    if (measuredPageSlices && measuredPageSlices.length > 0) {
      const pages = measuredPageSlices.map((slice, pIdx) => {
        const sliceItems = totalItems.slice(slice.startIndex, slice.endIndex);
        const pageDataRows = sliceItems.filter((r) => !r.__isBlank);
        const pageBlanksCount = sliceItems.filter((r) => r.__isBlank).length;
        return {
          pageIndex: pIdx,
          rows: pageDataRows,
          extraBlanks: pageBlanksCount,
          isFirstPage: slice.isFirstPage,
          isLastPage: slice.isLastPage,
          startIndex: slice.startIndex,
        };
      });

      return {
        pages,
        totalPages: pages.length,
      };
    }

    // Default safe initial frame before first DOM measurement pass
    return {
      pages: [
        {
          pageIndex: 0,
          rows: dataList,
          extraBlanks: totalBlanks,
          isFirstPage: true,
          isLastPage: true,
          startIndex: 0,
        },
      ],
      totalPages: 1,
    };
  }, [
    activeData,
    extraBlankRows,
    measuredPageSlices,
    options.enablePageBreak,
    children,
  ]);

  if (!isOpen) return null;

  const studioContent = (
    <div
      className={`universal-print-studio-root ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex flex-col theme-bg-app theme-text-primary overflow-hidden select-none animate-fade-in w-screen h-screen'
          : 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-fade-in text-left font-sans select-none'
      } print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:backdrop-filter-none print:shadow-none print:overflow-visible`}
    >
      {/* Dynamic @page Rules for Clean Browser Print Dialog */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${options.pageSize || 'A4'} ${(options.orientation || 'PORTRAIT').toLowerCase()};
                margin: ${getPageMarginCSS(options.margin)};
              }
            }
          `,
        }}
      />

      <div
        className={`universal-print-studio-container ${
          isFullscreen
            ? 'w-full h-full flex flex-col overflow-hidden'
            : 'w-full max-w-7xl h-[92vh] rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col animate-scale-up'
        } print:static print:block print:w-full print:max-w-none print:h-auto print:rounded-none print:border-none print:shadow-none print:bg-white print:overflow-visible`}
      >
        {/* 1. Master Top Action Toolbar */}
        <header className="px-4 py-2.5 border-b theme-border theme-bg-surface flex items-center justify-between shrink-0 shadow-xs print-topbar-control print-studio-no-print">
          {/* Left: Branding & Document Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl theme-bg-accent theme-accent-text flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              SPR
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold theme-text-primary text-base tracking-tight truncate leading-tight">
                  Print Studio
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold theme-bg-sub theme-text-secondary border theme-border uppercase">
                  {paginationResult.totalPages > 1 ? `${paginationResult.totalPages} Pages • ` : ''}{options.pageSize || 'A4'} • {options.orientation || 'PORTRAIT'}
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  Live Canvas • Click to Edit
                </span>
              </div>
              <p className="text-xs theme-text-secondary truncate leading-tight">
                {title} {subtitle ? `— ${subtitle}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Interactive Undo/Redo, Zoom Controller, and Word (.docx) Ingestion */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Import Word Template Action */}
            <button
              type="button"
              onClick={() => setIsDocxModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl theme-bg-sub/80 border theme-border theme-text-primary hover:theme-accent hover:border-[var(--accent-main)]/50 transition-all cursor-pointer shadow-2xs text-xs font-bold"
              title="Import Microsoft Word (.docx) Document or Template"
            >
              <FileIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Import Word (.docx)</span>
            </button>

            {/* Undo / Redo Actions */}
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-2xl theme-bg-sub/80 border theme-border shadow-2xl">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo print setting change (Ctrl+Z)"
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  canUndo
                    ? 'theme-text-primary hover:theme-accent hover:theme-bg-elevated'
                    : 'theme-text-muted/40 opacity-40 cursor-not-allowed'
                }`}
              >
                <UndoIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo print setting change (Ctrl+Y / Ctrl+Shift+Z)"
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  canRedo
                    ? 'theme-text-primary hover:theme-accent hover:theme-bg-elevated'
                    : 'theme-text-muted/40 opacity-40 cursor-not-allowed'
                }`}
              >
                <RedoIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl theme-bg-sub/80 border theme-border shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out (Ctrl -)"
                className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
              >
                <ZoomOutIcon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom to 100%"
                className="px-2 py-0.5 text-xs font-mono font-bold theme-text-primary hover:theme-accent transition-colors cursor-pointer"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In (Ctrl +)"
                className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
              >
                <ZoomInIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Actions (Export Dropdown Menu, Fullscreen, Sidebar Toggle, Close) */}
          <div className="flex items-center gap-2">
            <FullscreenButton
              isFullscreen={isFullscreen}
              onToggle={toggleFullscreen}
              size="sm"
              className="hidden md:inline-flex"
            />

            {/* Master Universal Export Button & Dropdown Menu */}
            <PrintExportMenu
              title={title}
              subtitle={subtitle}
              metaItems={liveMetaItems}
              summaryMetrics={liveSummaryMetrics}
              options={options}
              columns={liveColumns}
              visibleColumnKeys={visibleColumnKeys}
              extraBlankRows={extraBlankRows}
              data={liveData}
              showPrint={showPrint}
              showPDF={showPDF}
              showExcel={showExcel}
              showTxt={showTxt}
              showWord={showWord}
              showImages={showImages}
              showPng={showPng}
              showJpg={showJpg}
              enabledFormats={enabledFormats}
              onPrint={onPrint}
              onExportPDF={onExportPDF}
              onExportExcel={onExportExcel}
              onExportCsv={onExportCsv}
              onExportTxt={onExportTxt}
              onExportWord={onExportWord}
              onExportPng={onExportPng}
              onExportJpg={onExportJpg}
              pageSize={options.pageSize}
              orientation={options.orientation}
              margin={options.margin}
            />

            {/* Right Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
                isSidebarOpen
                  ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/40 shadow-xs'
                  : 'theme-bg-sub theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
              }`}
              title={isSidebarOpen ? 'Hide Settings Sidebar (Ctrl + B)' : 'Show Settings Sidebar (Ctrl + B)'}
              aria-label="Toggle Settings Sidebar"
            >
              <SidebarRightIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Print Studio (Esc)"
              className="p-2 rounded-xl theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer flex items-center justify-center text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </header>

        {/* 2. Main Studio Body: Workbench Canvas (Left/Center) + Right Configuration Sidebar */}
        <div className="flex-1 flex overflow-hidden relative print:static print:block print:w-full print:h-auto print:overflow-visible">
          {/* Main Live Paper Canvas Preview Area (Studio Workbench) */}
          <main className="flex-1 overflow-hidden relative universal-print-workbench print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
            <PrintCanvasViewer
              pageSize={options.pageSize}
              orientation={options.orientation}
              margin={options.margin}
              density={options.density}
              colorMode={options.colorMode}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              pointerMode={pointerMode}
              onPointerModeChange={setPointerMode}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            >
              {/* 1. Custom Word (.docx) Template Mode */}
              {customDocxTemplate ? (
                <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
                  {/* Single shared style block injected once for the entire batch */}
                  {docxStyles && (
                    <div
                      dangerouslySetInnerHTML={{ __html: docxStyles }}
                      className="hidden"
                    />
                  )}
                  {mergedDocxPages.map((pageHtml, pIdx) => (
                    <div key={`docx_page_${pIdx}`} className="relative paper-sheet-wrapper group">
                      <div
                        className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                        data-size={options.pageSize || 'A4'}
                        data-orientation={options.orientation || 'PORTRAIT'}
                        data-margin={options.margin || 'NORMAL'}
                        data-density={options.density || 'NORMAL'}
                        data-color-mode={options.colorMode || 'FULL_COLOR'}
                        data-page-break="true"
                      >
                        <div className="w-full h-full p-6 sm:p-8 print:p-4">
                          <DocxLiveRenderer
                            htmlContent={pageHtml}
                            isEditable={true}
                            onContentChange={(newHtml) => {
                              setCustomDocxTemplate((prev) => (prev ? { ...prev, html: newHtml } : null));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : customSheets ? (
                children
              ) : children ? (
                <div className="relative paper-sheet-wrapper group">
                  <div
                    className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                    data-size={options.pageSize || 'A4'}
                    data-orientation={options.orientation || 'PORTRAIT'}
                    data-margin={options.margin || 'NORMAL'}
                    data-density={options.density || 'NORMAL'}
                    data-color-mode={options.colorMode || 'FULL_COLOR'}
                    data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
                  >
                    <PrintDocumentWrapper
                      title={title}
                      subtitle={subtitle}
                      metaItems={liveMetaItems}
                      onMetaItemsChange={handleMetaItemsChange}
                      options={options}
                      onOptionsChange={updateOptionsWithHistory}
                      isEditable={true}
                      pageIndex={0}
                      totalPages={1}
                      isFirstPage={true}
                      isLastPage={true}
                    >
                      {children}
                    </PrintDocumentWrapper>
                  </div>
                </div>
              ) : (
                paginationResult.pages.map((page, pIdx) => (
                  <div key={pIdx} className="relative paper-sheet-wrapper group">
                    <div
                      className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
                      data-size={options.pageSize || 'A4'}
                      data-orientation={options.orientation || 'PORTRAIT'}
                      data-margin={options.margin || 'NORMAL'}
                      data-density={options.density || 'NORMAL'}
                      data-color-mode={options.colorMode || 'FULL_COLOR'}
                      data-page-break={options.enablePageBreak !== false ? 'true' : 'false'}
                    >
                      <PrintDocumentWrapper
                        title={title}
                        subtitle={subtitle}
                        metaItems={liveMetaItems}
                        onMetaItemsChange={handleMetaItemsChange}
                        options={options}
                        onOptionsChange={updateOptionsWithHistory}
                        isEditable={true}
                        pageIndex={pIdx}
                        totalPages={paginationResult.totalPages}
                        isFirstPage={page.isFirstPage}
                        isLastPage={page.isLastPage}
                      >
                        <PrintTableRenderer
                          columns={liveColumns}
                          data={page.rows}
                          visibleColumnKeys={visibleColumnKeys}
                          isColumnMandatory={isColumnMandatory}
                          isColumnRequired={isColumnRequired}
                          requiredColumnKeys={requiredColumnKeys}
                          visibleRowKeys={visibleRowKeys}
                          isRowMandatory={isRowMandatory}
                          isRowRequired={isRowRequired}
                          requiredRowKeys={requiredRowKeys}
                          getRowKey={getRowIdentifier}
                          extraBlankRows={page.extraBlanks}
                          summaryMetrics={page.isLastPage && options.showSummary !== false ? liveSummaryMetrics : []}
                          density={options.density}
                          footerRow={page.isLastPage ? footerRow : null}
                          footerRows={page.isLastPage ? footerRows : []}
                          startIndex={page.startIndex}
                          isEditable={true}
                          onCellChange={handleCellChange}
                          onRowDelete={handleRowDelete}
                          onRowInsert={handleRowInsert}
                          onRowMove={handleRowMove}
                          onColumnHeaderChange={handleColumnHeaderChange}
                        />
                      </PrintDocumentWrapper>
                    </div>
                  </div>
                ))
              )}
            </PrintCanvasViewer>
          </main>

          {/* Right Configuration Sidebar (Responsive Docked on Desktop / Full Slide-Over on Mobile) */}
          {isSidebarOpen && (
            <div 
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsSidebarOpen(false);
              }}
              className="fixed md:relative inset-0 md:inset-auto z-40 md:z-auto flex h-full justify-end bg-black/40 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none animate-fade-in print:hidden print-studio-no-print shrink-0 md:border-l theme-border shadow-2xl min-w-0"
              style={{
                width: `${sidebarWidth || 580}px`,
                maxWidth: 'min(1080px, 85vw)',
                minWidth: '360px',
                transition: isSidebarResizing ? "none" : "width 0.15s ease-out"
              }}
            >
              <PanelResizer
                onStartResize={startSidebarResizing}
                onResetResize={handleSidebarResizerDoubleClick}
                isResizing={isSidebarResizing}
                position="left"
              />
              <div className="w-full h-full flex-1 overflow-hidden">
                <PrintConfigSidebar
                  options={options}
                  onOptionsChange={updateOptionsWithHistory}
                  defaultTitle={title}
                  defaultSubtitle={subtitle}
                  title={title}
                  subtitle={subtitle}
                  availableColumns={liveColumns}
                  visibleColumnKeys={visibleColumnKeys}
                  onVisibleColumnsChange={updateVisibleColumnsWithHistory}
                  isColumnMandatory={isColumnMandatory}
                  isColumnRequired={isColumnRequired}
                  requiredColumnKeys={requiredColumnKeys}
                  availableRows={liveData}
                  visibleRowKeys={visibleRowKeys}
                  onVisibleRowsChange={updateVisibleRowsWithHistory}
                  isRowMandatory={isRowMandatory}
                  isRowRequired={isRowRequired}
                  requiredRowKeys={requiredRowKeys}
                  getRowKey={getRowIdentifier}
                  getRowLabel={getRowLabel}
                  getRowSubLabel={getRowSubLabel}
                  extraBlankRows={extraBlankRows}
                  onExtraBlankRowsChange={updateExtraBlankRowsWithHistory}
                  showSectionsAndBars={showSectionsAndBars}
                  showSectionsBar={showSectionsBar}
                  showDisplayBars={showDisplayBars}
                  showDataDisplay={showDataDisplay}
                  showColumns={showColumns}
                  showRows={showRows}
                  showHeaderSection={showHeaderSection}
                  showWatermarkSection={showWatermarkSection}
                  showSignaturesSection={showSignaturesSection}
                  templates={combinedTemplates}
                  activeTemplateId={customDocxTemplate?.templateMeta?.id || activeTemplateId}
                  onTemplateChange={handleTemplateSelection}
                  onOpenDocxModal={() => setIsDocxModalOpen(true)}
                  onDeleteDocxTemplate={handleDeleteDocxTemplate}
                  onResetDefaults={handleResetDefaults}
                  onClose={() => setIsSidebarOpen(false)}
                  className="w-full h-full max-w-full print-sidebar-control print-studio-no-print shadow-2xl md:shadow-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Docx Template Ingestion Modal */}
      {isDocxModalOpen && (
        <DocxTemplateModal
          isOpen={isDocxModalOpen}
          onClose={() => setIsDocxModalOpen(false)}
          onApplyTemplate={handleApplyDocxTemplate}
          placeholderKeys={placeholderKeys}
          sampleData={liveData && liveData[0] ? { ...liveData[0], title, subtitle } : { title, subtitle }}
          columns={liveColumns}
          metaItems={metaItems}
        />
      )}

      {/* Active Global Drag Overlay to ensure uninterrupted smooth resizing without mouse event trapping */}
      {isSidebarResizing && (
        <div 
          className="fixed inset-0 z-[99999] select-none bg-transparent cursor-col-resize pointer-events-auto"
          style={{ cursor: 'col-resize' }}
        />
      )}

      {/* Hidden Real-Time DOM Measurement Sandbox for 100% Exact Automatic Pagination */}
      <div
        ref={measureSandboxRef}
        aria-hidden="true"
        className="universal-print-measure-sandbox pointer-events-none select-none print:hidden"
        style={{
          position: 'absolute',
          top: '-99999px',
          left: '-99999px',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -9999,
          width:
            options.pageSize === 'LEGAL'
              ? (options.orientation === 'LANDSCAPE' ? '1344px' : '816px')
              : options.pageSize === 'LETTER'
              ? (options.orientation === 'LANDSCAPE' ? '1056px' : '816px')
              : (options.orientation === 'LANDSCAPE' ? '1123px' : '794px'),
          boxSizing: 'border-box',
        }}
      >
        <div
          className="paper-sheet"
          data-size={options.pageSize || 'A4'}
          data-orientation={options.orientation || 'PORTRAIT'}
          data-margin={options.margin || 'NORMAL'}
          data-density={options.density || 'NORMAL'}
          data-color-mode={options.colorMode || 'FULL_COLOR'}
          data-page-break="false"
          style={{ minHeight: 'auto', height: 'auto' }}
        >
          <PrintDocumentWrapper
            title={title}
            subtitle={subtitle}
            metaItems={liveMetaItems}
            options={options}
            pageIndex={0}
            totalPages={1}
            isFirstPage={true}
            isLastPage={true}
            isEditable={false}
          >
            <PrintTableRenderer
              columns={liveColumns}
              data={activeData}
              visibleColumnKeys={visibleColumnKeys}
              isColumnMandatory={isColumnMandatory}
              isColumnRequired={isColumnRequired}
              requiredColumnKeys={requiredColumnKeys}
              visibleRowKeys={visibleRowKeys}
              isRowMandatory={isRowMandatory}
              isRowRequired={isRowRequired}
              requiredRowKeys={requiredRowKeys}
              getRowKey={getRowIdentifier}
              extraBlankRows={extraBlankRows}
              summaryMetrics={options.showSummary !== false ? liveSummaryMetrics : []}
              density={options.density}
              footerRow={footerRow}
              footerRows={footerRows}
              startIndex={0}
            />
          </PrintDocumentWrapper>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(studioContent, document.body)
    : studioContent;
}

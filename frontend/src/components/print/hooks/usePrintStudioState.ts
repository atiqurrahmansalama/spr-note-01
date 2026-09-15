import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DEFAULT_PRINT_OPTIONS } from '../../../stores/printStore';
import {
  PrintOptions,
  PrintColumn,
  PrintMetaItem,
  PrintSummaryMetric,
  PrintHistorySnapshot,
} from '../types';

interface UsePrintStudioStateParams {
  isOpen: boolean;
  title?: string;
  defaultOptions?: Partial<PrintOptions>;
  columns?: PrintColumn[];
  placeholderKeys?: any[];
  data?: Array<Record<string, any>>;
  metaItems?: PrintMetaItem[];
  summaryMetrics?: PrintSummaryMetric[];
  propVisibleRowKeys?: string[] | null;
  propOnVisibleRowsChange?: ((rowKeys: string[]) => void) | null;
  getRowKey?: ((row: any, index: number) => string) | null;
  rowKey?: string | null;
}

const GLOBAL_PREFS_KEY = 'spr_print_preferences_global_v1';

export function getDocStorageKey(docTitle?: string): string {
  const clean = String(docTitle || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  return `spr_print_doc_${clean}_v1`;
}

export function deriveColumnsFromDataOrKeys(
  data: Array<Record<string, any>> = [],
  placeholderKeys: any[] = []
): PrintColumn[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  const first = data[0] || {};

  if (Array.isArray(placeholderKeys) && placeholderKeys.length > 0) {
    const matching = placeholderKeys.filter(
      (pk) =>
        first[pk.key] !== undefined &&
        typeof first[pk.key] !== 'object' &&
        pk.category !== 'signatures' &&
        pk.category !== 'institution'
    );
    if (matching.length > 0) {
      return matching.map((pk) => ({
        id: pk.key,
        header: pk.label || pk.key.replace(/_/g, ' ').toUpperCase(),
        label: pk.label || pk.key.replace(/_/g, ' ').toUpperCase(),
        align: pk.key.includes('name') || pk.key.includes('title') || pk.key.includes('description') ? ('left' as const) : ('center' as const),
        bold: Boolean(pk.key.includes('name') || pk.key.includes('total') || pk.isBold || pk.bold),
      }));
    }
  }

  return Object.keys(first)
    .filter((k) => typeof first[k] !== 'object' && k !== 'id' && !k.startsWith('_'))
    .slice(0, 10)
    .map((k) => ({
      id: k,
      header: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      align: 'center' as const,
    }));
}

export function usePrintStudioState({
  isOpen,
  title = 'Official Document',
  defaultOptions = {},
  columns = [],
  placeholderKeys = [],
  data = [],
  metaItems = [],
  summaryMetrics = [],
  propVisibleRowKeys = null,
  propOnVisibleRowsChange = null,
  getRowKey = null,
  rowKey = null,
}: UsePrintStudioStateParams) {
  const docKey = useMemo(() => getDocStorageKey(title), [title]);

  // Factory Default Options from printStore
  const factoryDefaults = useMemo<PrintOptions>(
    () => ({
      ...DEFAULT_PRINT_OPTIONS,
      customInstitutionName: '',
      customSubtitle: '',
      ...defaultOptions,
    }),
    [defaultOptions]
  );

  // Master Print Options State with localStorage Hydration
  const [options, setOptions] = useState<PrintOptions>(() => {
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

  const resolvedInitialColumns = useMemo<PrintColumn[]>(() => {
    if (Array.isArray(columns) && columns.length > 0) return columns;
    return deriveColumnsFromDataOrKeys(data, placeholderKeys);
  }, [columns, data, placeholderKeys]);

  // ── WYSIWYG Live Canvas State (Data Rows, Columns, Metadata, Summaries) ───
  const [liveData, setLiveData] = useState<Array<Record<string, any>>>(() => (Array.isArray(data) ? [...data] : []));
  const [liveColumns, setLiveColumns] = useState<PrintColumn[]>(() => resolvedInitialColumns);
  const [liveMetaItems, setLiveMetaItems] = useState<PrintMetaItem[]>(() => (Array.isArray(metaItems) ? [...metaItems] : []));
  const [liveSummaryMetrics, setLiveSummaryMetrics] = useState<PrintSummaryMetric[]>(() =>
    Array.isArray(summaryMetrics) ? [...summaryMetrics] : []
  );

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
    if (isOpen) {
      const cols =
        Array.isArray(columns) && columns.length > 0
          ? columns
          : deriveColumnsFromDataOrKeys(data, placeholderKeys);
      setLiveColumns(cols);
    }
  }, [isOpen, columnsSignature, dataSignature, placeholderKeys, columns, data]);

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

  // Column and Row key signatures
  const columnKeySignature = useMemo(
    () => (liveColumns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex).join(','),
    [liveColumns]
  );

  const getRowIdentifier = useCallback(
    (row: any, idx: number): string => {
      if (typeof getRowKey === 'function') return String(getRowKey(row, idx));
      if (typeof rowKey === 'string' && row && row[rowKey] !== undefined) return String(row[rowKey]);
      return String(row?.id ?? row?.key ?? row?._id ?? row?.studentId ?? row?.subjectId ?? `row_${idx}`);
    },
    [getRowKey, rowKey]
  );

  const allRowKeys = useMemo<string[]>(() => {
    if (!Array.isArray(liveData)) return [];
    return liveData.map((r, i) => getRowIdentifier(r, i));
  }, [liveData, getRowIdentifier]);

  const rowKeySignature = useMemo(() => allRowKeys.join(','), [allRowKeys]);

  // Column Visibility State with localStorage Hydration
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawDoc = localStorage.getItem(getDocStorageKey(title));
        if (rawDoc) {
          const parsed = JSON.parse(rawDoc);
          if (Array.isArray(parsed.visibleColumnKeys) && parsed.visibleColumnKeys.length > 0) {
            const availableKeys = new Set(
              (columns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex)
            );
            const valid = parsed.visibleColumnKeys.filter((k: string) => availableKeys.has(k));
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch (e) {
      // fallback
    }
    return (columns || []).map((c) => String(c.id || c.key || c.accessor || c.dataIndex));
  });

  useEffect(() => {
    if (!liveColumns || liveColumns.length === 0) return;
    setVisibleColumnKeys((prev) => {
      if (!prev || prev.length === 0) {
        return liveColumns.map((c) => String(c.id || c.key || c.accessor || c.dataIndex));
      }
      const currentKeys = new Set(liveColumns.map((c) => String(c.id || c.key || c.accessor || c.dataIndex)));
      const retained = prev.filter((k) => currentKeys.has(k));
      if (retained.length === prev.length && retained.every((k, i) => k === prev[i])) {
        return prev;
      }
      return retained.length > 0 ? retained : liveColumns.map((c) => String(c.id || c.key || c.accessor || c.dataIndex));
    });
  }, [columnKeySignature, liveColumns]);

  // Row Visibility State with localStorage Hydration
  const [visibleRowKeys, setVisibleRowKeys] = useState<string[]>(() => {
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
            const valid = parsed.visibleRowKeys.map(String).filter((k: string) => availableSet.has(k));
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
  }, [rowKeySignature, propVisibleRowKeys, allRowKeys]);

  // Extra Blank Rows with localStorage Hydration
  const [extraBlankRows, setExtraBlankRows] = useState<number>(() => {
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
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
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

  // Pointer & Selection Mode
  const [pointerMode, setPointerMode] = useState<'hand' | 'select'>('select');

  // Persist Global & Document-Specific Options to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
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

  // ── Undo / Redo History Architecture ──────────────────────────────────────
  const pastStackRef = useRef<PrintHistorySnapshot[]>([]);
  const futureStackRef = useRef<PrintHistorySnapshot[]>([]);
  const isRestoringRef = useRef<boolean>(false);
  const [, setHistoryVersion] = useState<number>(0);

  const canUndo = pastStackRef.current.length > 0;
  const canRedo = futureStackRef.current.length > 0;

  const pushStateChange = useCallback(
    (updaterFn: () => void) => {
      if (isRestoringRef.current) {
        updaterFn();
        return;
      }
      const prevSnapshot: PrintHistorySnapshot = {
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
    },
    [options, visibleColumnKeys, visibleRowKeys, extraBlankRows, liveData, liveColumns, liveMetaItems, liveSummaryMetrics]
  );

  const updateOptionsWithHistory = useCallback(
    (nextValOrUpdater: any) => {
      pushStateChange(() => {
        setOptions((prev) => (typeof nextValOrUpdater === 'function' ? nextValOrUpdater(prev) : nextValOrUpdater));
      });
    },
    [pushStateChange]
  );

  const updateVisibleColumnsWithHistory = useCallback(
    (nextValOrUpdater: any) => {
      pushStateChange(() => {
        setVisibleColumnKeys((prev) => (typeof nextValOrUpdater === 'function' ? nextValOrUpdater(prev) : nextValOrUpdater));
      });
    },
    [pushStateChange]
  );

  const updateVisibleRowsWithHistory = useCallback(
    (nextValOrUpdater: any) => {
      pushStateChange(() => {
        setVisibleRowKeys((prev) => {
          const resolved = typeof nextValOrUpdater === 'function' ? nextValOrUpdater(prev) : nextValOrUpdater;
          propOnVisibleRowsChange?.(resolved);
          return resolved;
        });
      });
    },
    [pushStateChange, propOnVisibleRowsChange]
  );

  const updateExtraBlankRowsWithHistory = useCallback(
    (nextValOrUpdater: any) => {
      pushStateChange(() => {
        setExtraBlankRows((prev) => (typeof nextValOrUpdater === 'function' ? nextValOrUpdater(prev) : nextValOrUpdater));
      });
    },
    [pushStateChange]
  );

  // ── WYSIWYG Live Canvas Mutation Handlers ─────────────────────────────────
  const handleCellChange = useCallback(
    (rowIndex: number, colKey: string, newValue: any) => {
      pushStateChange(() => {
        setLiveData((prev) => {
          const next = [...prev];
          if (next[rowIndex]) {
            next[rowIndex] = { ...next[rowIndex], [colKey]: newValue };
          }
          return next;
        });
      });
    },
    [pushStateChange]
  );

  const handleRowDelete = useCallback(
    (rowIndex: number) => {
      pushStateChange(() => {
        setLiveData((prev) => prev.filter((_, idx) => idx !== rowIndex));
      });
    },
    [pushStateChange]
  );

  const handleRowInsert = useCallback(
    (rowIndex: number, position: 'above' | 'below' = 'below') => {
      pushStateChange(() => {
        setLiveData((prev) => {
          const newRow: Record<string, any> = { id: `row_custom_${Date.now()}` };
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
    },
    [liveColumns, pushStateChange]
  );

  const handleRowMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      pushStateChange(() => {
        setLiveData((prev) => {
          if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return next;
        });
      });
    },
    [pushStateChange]
  );

  const handleColumnHeaderChange = useCallback(
    (colKey: string, newHeader: string) => {
      pushStateChange(() => {
        setLiveColumns((prev) =>
          prev.map((c) => {
            const k = c.id || c.key || c.accessor || c.dataIndex;
            return k === colKey ? { ...c, header: newHeader, label: newHeader, title: newHeader } : c;
          })
        );
      });
    },
    [pushStateChange]
  );

  const handleMetaItemsChange = useCallback(
    (newMetaItems: PrintMetaItem[]) => {
      pushStateChange(() => {
        setLiveMetaItems(newMetaItems);
      });
    },
    [pushStateChange]
  );

  const handleUndo = useCallback(() => {
    if (pastStackRef.current.length === 0) return;
    const currentSnapshot: PrintHistorySnapshot = {
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

  const handleRedo = useCallback(() => {
    if (futureStackRef.current.length === 0) return;
    const currentSnapshot: PrintHistorySnapshot = {
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
      setVisibleColumnKeys((columns || []).map((c) => String(c.id || c.key || c.accessor || c.dataIndex)));
      setVisibleRowKeys(allRowKeys);
      setExtraBlankRows(0);
      setZoomLevel(1);
    });
  }, [docKey, factoryDefaults, columns, data, metaItems, summaryMetrics, allRowKeys, pushStateChange]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.3, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  return {
    options,
    setOptions,
    updateOptionsWithHistory,
    liveData,
    setLiveData,
    liveColumns,
    setLiveColumns,
    liveMetaItems,
    setLiveMetaItems,
    liveSummaryMetrics,
    setLiveSummaryMetrics,
    visibleColumnKeys,
    setVisibleColumnKeys,
    updateVisibleColumnsWithHistory,
    visibleRowKeys,
    setVisibleRowKeys,
    updateVisibleRowsWithHistory,
    allRowKeys,
    extraBlankRows,
    setExtraBlankRows,
    updateExtraBlankRowsWithHistory,
    zoomLevel,
    setZoomLevel,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    isSidebarOpen,
    setIsSidebarOpen,
    pointerMode,
    setPointerMode,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleResetDefaults,
    handleCellChange,
    handleRowDelete,
    handleRowInsert,
    handleRowMove,
    handleColumnHeaderChange,
    handleMetaItemsChange,
    getRowIdentifier,
  };
}

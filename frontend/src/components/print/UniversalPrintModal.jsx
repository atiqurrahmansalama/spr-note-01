import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFullscreen, useResizablePanel } from '../../hooks';
import FullscreenButton from '../ui/FullscreenButton';
import PrintExportMenu from './PrintExportMenu';
import PrintConfigSidebar from './PrintConfigSidebar';
import PrintCanvasViewer from './PrintCanvasViewer';
import PrintDocumentWrapper from './PrintDocumentWrapper';
import PrintTableRenderer from './PrintTableRenderer';
import { DEFAULT_PRINT_OPTIONS } from '../../stores/printStore';
import { printDocument } from './printExportUtils';
import {
  ZoomInIcon,
  ZoomOutIcon,
  SidebarRightIcon,
  UndoIcon,
  RedoIcon,
} from '../ui/Icons';
import './printEngine.css';

/**
 * UniversalPrintModal
 * Master Universal Print & Export Studio following SPR Note Fullscreen Standards (as in Attendance).
 * Supports both 100% Viewport Fullscreen Portal and Spacious Modal Windowing with Right Sidebar configuration.
 */
export default function UniversalPrintModal({
  isOpen = false,
  onClose,
  title = 'Official Document',
  subtitle = '',
  metaItems = [], // [{ label: 'Class', value: 'Class 10' }]
  // Tabular Data Mode
  columns = [],
  data = [],
  summaryMetrics = [],
  // Rich Custom Content Mode
  children = null,
  // Initial default options override
  defaultOptions = {},
  // Pre-configured templates list
  templates = [],
  activeTemplateId = null,
  onTemplateChange,
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
  onPrint,
  onExportPDF,
  onExportExcel,
  onExportCsv,
  onExportTxt,
  onExportWord,
  onExportPng,
  onExportJpg,
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

  // Sync defaultOptions if provided
  useEffect(() => {
    if (defaultOptions && Object.keys(defaultOptions).length > 0) {
      setOptions((prev) => ({ ...prev, ...defaultOptions }));
    }
  }, [defaultOptions]);

  // Column key signature to prevent wiping user uncheck selections
  const columnKeySignature = useMemo(
    () => (columns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex).join(','),
    [columns]
  );

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
    if (columns && columns.length > 0) {
      setVisibleColumnKeys((prev) => {
        if (!prev || prev.length === 0) {
          return columns.map((c) => c.id || c.key || c.accessor || c.dataIndex);
        }
        const currentKeys = new Set(columns.map((c) => c.id || c.key || c.accessor || c.dataIndex));
        const retained = prev.filter((k) => currentKeys.has(k));
        return retained.length > 0 ? retained : columns.map((c) => c.id || c.key || c.accessor || c.dataIndex);
      });
    }
  }, [columnKeySignature]);

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
    defaultWidth: 384,
    minWidth: 320,
    maxWidth: 800,
    maxRatio: 0.65,
    side: 'right',
    toggleCompactWidth: 384,
    toggleExpandedWidth: 540,
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
          showMeta: options.showMeta,
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
          extraBlankRows,
          zoomLevel,
        };
        localStorage.setItem(docKey, JSON.stringify(docData));
      }
    } catch (e) {
      console.warn('Failed to save print settings to localStorage', e);
    }
  }, [options, visibleColumnKeys, extraBlankRows, zoomLevel, isSidebarOpen, docKey]);

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
      extraBlankRows,
    };
    pastStackRef.current = [...pastStackRef.current, prevSnapshot].slice(-40);
    futureStackRef.current = [];
    updaterFn();
    setHistoryVersion((v) => v + 1);
  }, [options, visibleColumnKeys, extraBlankRows]);

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

  const updateExtraBlankRowsWithHistory = useCallback((nextValOrUpdater) => {
    pushStateChange(() => {
      setExtraBlankRows(nextValOrUpdater);
    });
  }, [pushStateChange]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (pastStackRef.current.length === 0) return;
    const currentSnapshot = {
      options: { ...options },
      visibleColumnKeys: Array.isArray(visibleColumnKeys) ? [...visibleColumnKeys] : [],
      extraBlankRows,
    };
    const previousSnapshot = pastStackRef.current[pastStackRef.current.length - 1];
    pastStackRef.current = pastStackRef.current.slice(0, -1);
    futureStackRef.current = [currentSnapshot, ...futureStackRef.current].slice(0, 40);

    isRestoringRef.current = true;
    setOptions(previousSnapshot.options);
    setVisibleColumnKeys(previousSnapshot.visibleColumnKeys);
    setExtraBlankRows(previousSnapshot.extraBlankRows);
    isRestoringRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, [options, visibleColumnKeys, extraBlankRows]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (futureStackRef.current.length === 0) return;
    const currentSnapshot = {
      options: { ...options },
      visibleColumnKeys: Array.isArray(visibleColumnKeys) ? [...visibleColumnKeys] : [],
      extraBlankRows,
    };
    const nextSnapshot = futureStackRef.current[0];
    futureStackRef.current = futureStackRef.current.slice(1);
    pastStackRef.current = [...pastStackRef.current, currentSnapshot].slice(-40);

    isRestoringRef.current = true;
    setOptions(nextSnapshot.options);
    setVisibleColumnKeys(nextSnapshot.visibleColumnKeys);
    setExtraBlankRows(nextSnapshot.extraBlankRows);
    isRestoringRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, [options, visibleColumnKeys, extraBlankRows]);

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
      setVisibleColumnKeys((columns || []).map((c) => c.id || c.key || c.accessor || c.dataIndex));
      setExtraBlankRows(0);
      setZoomLevel(1);
    });
  }, [docKey, factoryDefaults, columns, pushStateChange]);

  // Universal Project Fullscreen Hook (identical to Attendance module)
  const { isFullscreen, setIsFullscreen, toggleFullscreen } = useFullscreen({ initialState: true });

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.2, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.35, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  // Print Trigger (Ctrl+P shortcut)
  const handlePrint = useCallback(() => {
    printDocument();
  }, []);

  // Keyboard Shortcuts (Ctrl+P, Esc, +, -, Ctrl+B, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint, onClose, handleUndo, handleRedo]);

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

  if (!isOpen) return null;

  const studioContent = (
    <div
      className={`universal-print-studio-root ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex flex-col theme-bg-app theme-text-primary overflow-hidden select-none animate-fade-in w-screen h-screen'
          : 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-fade-in text-left font-sans select-none'
      } print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:backdrop-filter-none print:shadow-none print:overflow-visible`}
      role="dialog"
      aria-modal="true"
    >
      {/* Dynamic @page Rules for Clean Browser Print Dialog */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${options.pageSize || 'A4'} ${(options.orientation || 'PORTRAIT').toLowerCase()};
                margin: ${
                  options.margin === 'NONE'
                    ? '0mm'
                    : options.margin === 'NARROW'
                    ? '8mm'
                    : options.margin === 'WIDE'
                    ? '25mm'
                    : '12mm'
                };
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
              </div>
              <p className="text-xs theme-text-secondary truncate leading-tight">
                {title} {subtitle ? `— ${subtitle}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Interactive Undo/Redo & Zoom Controller */}
          <div className="hidden sm:flex items-center gap-2">
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
              metaItems={metaItems}
              summaryMetrics={summaryMetrics}
              options={options}
              columns={columns}
              visibleColumnKeys={visibleColumnKeys}
              extraBlankRows={extraBlankRows}
              data={data}
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
            />

            {/* Toggle Right Sidebar Button (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
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
            >
              <PrintDocumentWrapper
                title={title}
                subtitle={subtitle}
                metaItems={metaItems}
                options={options}
              >
                {children ? (
                  children
                ) : (
                  <PrintTableRenderer
                    columns={columns}
                    data={data}
                    visibleColumnKeys={visibleColumnKeys}
                    extraBlankRows={extraBlankRows}
                    summaryMetrics={options.showSummary !== false ? summaryMetrics : []}
                    density={options.density}
                  />
                )}
              </PrintDocumentWrapper>
            </PrintCanvasViewer>
          </main>

          {/* Right Configuration Sidebar (Responsive Docked on Desktop / Full Slide-Over on Mobile) */}
          {isSidebarOpen && (
            <div 
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsSidebarOpen(false);
              }}
              className="fixed md:relative inset-0 md:inset-auto z-40 md:z-auto flex h-full justify-end bg-black/40 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none animate-fade-in print:hidden print-studio-no-print"
            >
              <PrintConfigSidebar
                options={options}
                onOptionsChange={updateOptionsWithHistory}
                availableColumns={columns}
                visibleColumnKeys={visibleColumnKeys}
                onVisibleColumnsChange={updateVisibleColumnsWithHistory}
                extraBlankRows={extraBlankRows}
                onExtraBlankRowsChange={updateExtraBlankRowsWithHistory}
                templates={templates}
                activeTemplateId={activeTemplateId}
                onTemplateChange={onTemplateChange}
                onResetDefaults={handleResetDefaults}
                onClose={() => setIsSidebarOpen(false)}
                width={sidebarWidth}
                isResizing={isSidebarResizing}
                onStartResize={startSidebarResizing}
                onResetResize={handleSidebarResizerDoubleClick}
                className="w-full sm:w-[420px] md:w-auto max-w-full print-sidebar-control print-studio-no-print shadow-2xl md:shadow-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(studioContent, document.body)
    : studioContent;
}

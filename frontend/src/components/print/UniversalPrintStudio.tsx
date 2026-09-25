import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFullscreen, useResizablePanel } from '../../hooks';
import { useTenant } from '../../context/TenantContext';
import PanelResizer from '../ui/PanelResizer';
import DocLabSidebar from './DocLabSidebar';
import DocxTemplateModal from './DocxTemplateModal';
import TemplateLibraryModal from './TemplateLibraryModal';
import { insertTokenAtActiveCaret } from './caretInsertManager';
import { getPageMarginCSS } from './docLabExportUtils';
import {
  getDefaultTemplateIdForScope,
  setDefaultTemplateForScope,
  validateTemplateForScope,
} from './scopeTemplateStore';
import { getSavedDocxTemplates } from './docxTemplateEngine';
import {
  usePrintStudioState,
  usePrintDocxEngine,
  usePrintPagination,
  usePrintStudioShortcuts,
} from './hooks';
import { DocLabHeader, DocLabWorkbench } from './components';
import { UniversalPrintStudioProps } from './types';
import { exportToNativeDocx } from './vectorDocxCompiler';
import { useToast } from '../../context/ToastContext';
import './printEngine.css';

/**
 * UniversalPrintStudio
 * Master Universal Print & Export Studio following SPR Note Enterprise Standards.
 * Decomposed into dedicated custom hooks and modular sub-components with strict TypeScript safety.
 */
export default function UniversalPrintStudio({
  isOpen = false,
  onClose = () => {},
  title = 'Official Document',
  subtitle = '',
  metaItems = [],
  columns = [],
  data = [],
  summaryMetrics = [],
  footerRow = null,
  footerRows = [],
  documents = undefined,
  batchDocuments = undefined,
  isColumnMandatory = null,
  isColumnRequired = null,
  requiredColumnKeys = [],
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
  children = null,
  customSheets = false,
  defaultOptions = {},
  templates = [],
  activeTemplateId = null,
  onTemplateChange = null,
  placeholderKeys = [],
  showSectionsAndBars = true,
  showSectionsBar = true,
  showDisplayBars = true,
  showDataDisplay = true,
  showColumns = true,
  showHeaderSection = true,
  showWatermarkSection = true,
  showSignaturesSection = true,
  showPrint = true,
  showPDF = true,
  showExcel = true,
  showTxt = true,
  showWord = true,
  showImages = true,
  showPng = true,
  showJpg = true,
  showSvg = true,
  enabledFormats = null,
  onPrint = undefined,
  onExportPDF = undefined,
  onExportExcel = undefined,
  onExportCsv = undefined,
  onExportTxt = undefined,
  onExportWord = undefined,
  onExportPng = undefined,
  onExportJpg = undefined,
  onExportSvg = undefined,
  scopeId = 'general_document',
  scopeName = '',
  scopeDescription = '',
  requiredKeys = [],
  urlSync = false,
  urlParam = 'print_studio',
  urlParamValue = null,
}: UniversalPrintStudioProps) {
  const { tenant } = useTenant();
  const { showToast } = useToast();

  // 1. Core State & History Hook
  const {
    options,
    setOptions,
    updateOptionsWithHistory,
    liveData,
    liveColumns,
    setLiveColumns,
    liveMetaItems,
    liveSummaryMetrics,
    visibleColumnKeys,
    setVisibleColumnKeys,
    visibleRowKeys,
    updateVisibleRowsWithHistory,
    extraBlankRows,
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
  } = usePrintStudioState({
    isOpen,
    title,
    defaultOptions,
    columns,
    placeholderKeys,
    data,
    metaItems,
    summaryMetrics,
    propVisibleRowKeys,
    propOnVisibleRowsChange,
    getRowKey,
    rowKey,
  });

  const institutionName = options.customInstitutionName || tenant?.name || 'Institution Name';
  const institutionAddress = options.customCampusAddress || tenant?.address || '';
  const resolvedTitle = options.customTitle || title;
  const resolvedSubtitle = options.customSubtitle || subtitle;

  // 2. Word (.docx) & Scope Template Engine Hook
  const {
    isDocxModalOpen,
    setIsDocxModalOpen,
    isTemplateLibraryOpen,
    setIsTemplateLibraryOpen,
    setSavedWordTemplates,
    customDocxTemplate,
    setCustomDocxTemplate,
    combinedTemplates,
    docxStyles,
    docxRenderMode,
    setDocxRenderMode,
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
    autoSaveStatus,
    autoSaveLastSavedAt,
    isAutoSaving,
    isAutoSaved,
  } = usePrintDocxEngine({
    isOpen,
    scopeId,
    scopeName,
    templates,
    placeholderKeys,
    options,
    setOptions,
    updateOptionsWithHistory,
    liveData,
    liveMetaItems,
    liveColumns,
    setLiveColumns,
    setVisibleColumnKeys,
    institutionName,
    institutionAddress,
    resolvedTitle,
    resolvedSubtitle,
    onTemplateChange,
    activeTemplateId,
  });

  // Dedicated Live Canvas Native Word (.docx) Exporter Handler
  const handleExportWord = React.useCallback(async () => {
    await exportToNativeDocx({
      targetId: 'universal-print-portal',
      title: resolvedTitle || title,
      subtitle: resolvedSubtitle || subtitle,
      metaItems: liveMetaItems,
      options: options,
      customPages: customDocxTemplate ? mergedDocxPages : undefined,
      columns: liveColumns,
      visibleColumnKeys: visibleColumnKeys,
      data: liveData,
      extraBlankRows: extraBlankRows,
      summaryMetrics: liveSummaryMetrics,
      showToast,
    });
  }, [
    resolvedTitle,
    title,
    resolvedSubtitle,
    subtitle,
    liveMetaItems,
    options,
    customDocxTemplate,
    mergedDocxPages,
    liveColumns,
    visibleColumnKeys,
    liveData,
    extraBlankRows,
    liveSummaryMetrics,
    showToast,
  ]);

  const effectiveCanUndo = customDocxTemplate ? docxCanUndo : canUndo;
  const effectiveCanRedo = customDocxTemplate ? docxCanRedo : canRedo;
  const effectiveHandleUndo = customDocxTemplate ? handleDocxUndo : handleUndo;
  const effectiveHandleRedo = customDocxTemplate ? handleDocxRedo : handleRedo;

  // 3. Dynamic Page Slicing & Pagination Hook
  const { paginationResult } = usePrintPagination({
    liveData,
    visibleRowKeys,
    extraBlankRows,
    getRowIdentifier,
    isRowMandatory,
    isRowRequired,
    requiredRowKeys,
    enablePageBreak: options.enablePageBreak,
    pageSize: options.pageSize,
    density: options.density,
    hasChildren: Boolean(children),
  });

  // 4. Global Keyboard Shortcuts & URL Sync Hook
  usePrintStudioShortcuts({
    isOpen,
    options,
    title,
    onClose,
    handleUndo: effectiveHandleUndo,
    handleRedo: effectiveHandleRedo,
    canUndo: effectiveCanUndo,
    canRedo: effectiveCanRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    setIsSidebarOpen,
    setPointerMode,
    urlSync,
    urlParam,
    urlParamValue,
  });

  // 5. Layout & Resizing
  const { isFullscreen, toggleFullscreen } = useFullscreen({ initialState: true });
  const {
    width: sidebarWidth,
    isResizing: isSidebarResizing,
    resizerProps: sidebarResizerProps,
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

  if (!isOpen) return null;

  const studioContent = (
    <div
      className={`universal-print-studio-root ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] flex flex-col theme-bg-app theme-text-primary overflow-hidden select-none animate-fade-in w-screen h-screen'
          : 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 animate-fade-in text-left font-sans select-none'
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
        <DocLabHeader
          title={title}
          subtitle={subtitle}
          totalPages={
            customDocxTemplate
              ? Math.max(1, mergedDocxPages.length)
              : documents && documents.length > 0
              ? documents.length
              : batchDocuments && batchDocuments.length > 0
              ? batchDocuments.length
              : paginationResult.totalPages
          }
          pageSize={options.pageSize}
          orientation={options.orientation}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen as () => void}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onClose={onClose}
          options={options}
          liveMetaItems={liveMetaItems}
          liveSummaryMetrics={liveSummaryMetrics}
          liveColumns={liveColumns}
          visibleColumnKeys={visibleColumnKeys}
          extraBlankRows={extraBlankRows}
          liveData={liveData}
          showPrint={showPrint}
          showPDF={showPDF}
          showExcel={showExcel}
          showTxt={showTxt}
          showWord={showWord}
          showImages={showImages}
          showPng={showPng}
          showJpg={showJpg}
          showSvg={showSvg}
          enabledFormats={enabledFormats as any}
          onPrint={onPrint}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onExportCsv={onExportCsv}
          onExportTxt={onExportTxt}
          onExportWord={onExportWord || handleExportWord}
          onExportPng={onExportPng}
          onExportJpg={onExportJpg}
          onExportSvg={onExportSvg}
        />

        {/* 2. Main Studio Body: Workbench Canvas (Left/Center) + Right Configuration Sidebar */}
        <div className="flex-1 flex overflow-hidden relative print:static print:block print:w-full print:h-auto print:overflow-visible">
          {/* Main Live Paper Canvas Preview Area (Studio Workbench) */}
          <DocLabWorkbench
            options={options}
            updateOptionsWithHistory={updateOptionsWithHistory}
            title={title}
            subtitle={subtitle}
            liveMetaItems={liveMetaItems}
            handleMetaItemsChange={handleMetaItemsChange}
            liveColumns={liveColumns}
            visibleColumnKeys={visibleColumnKeys}
            isColumnMandatory={isColumnMandatory ? (col: any, idx?: number) => (isColumnMandatory as any)(col, idx ?? 0) : null}
            isColumnRequired={isColumnRequired ? (col: any, idx?: number) => (isColumnRequired as any)(col, idx ?? 0) : null}
            requiredColumnKeys={requiredColumnKeys}
            visibleRowKeys={visibleRowKeys}
            isRowMandatory={isRowMandatory}
            isRowRequired={isRowRequired}
            requiredRowKeys={requiredRowKeys}
            getRowIdentifier={getRowIdentifier}
            liveSummaryMetrics={liveSummaryMetrics}
            footerRow={footerRow}
            footerRows={footerRows}
            documents={documents}
            batchDocuments={batchDocuments}
            paginationResult={paginationResult}
            customDocxTemplate={customDocxTemplate}
            setCustomDocxTemplate={setCustomDocxTemplate}
            updateCustomDocxTemplateWithHistory={updateCustomDocxTemplateWithHistory}
            docxStyles={docxStyles}
            mergedDocxPages={mergedDocxPages}
            docxRenderMode={docxRenderMode}
            setDocxRenderMode={setDocxRenderMode}
            liveData={liveData}
            customSheets={customSheets}
            children={children}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            pointerMode={pointerMode}
            setPointerMode={setPointerMode}
            canUndo={effectiveCanUndo}
            canRedo={effectiveCanRedo}
            handleUndo={effectiveHandleUndo}
            handleRedo={effectiveHandleRedo}
            handleCellChange={handleCellChange}
            handleRowDelete={handleRowDelete}
            handleRowInsert={handleRowInsert}
            handleRowMove={handleRowMove}
            handleColumnHeaderChange={handleColumnHeaderChange}
            autoSaveStatus={autoSaveStatus}
            autoSaveLastSavedAt={autoSaveLastSavedAt}
            isAutoSaving={isAutoSaving}
          />

          {/* Right Configuration Sidebar */}
          {isSidebarOpen && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsSidebarOpen(false);
              }}
              className="fixed md:relative inset-0 md:inset-auto z-40 md:z-auto flex h-full justify-end bg-black/40 md:bg-transparent animate-fade-in print:hidden print-studio-no-print shrink-0 md:border-l theme-border shadow-2xl min-w-0"
              style={{
                width: `${sidebarWidth || 580}px`,
                maxWidth: 'min(1080px, 85vw)',
                minWidth: '360px',
                transition: isSidebarResizing ? 'none' : 'width 0.15s ease-out',
              }}
            >
              <PanelResizer
                {...sidebarResizerProps}
                position="left"
              />
              <div className="w-full h-full flex-1 overflow-hidden">
                <DocLabSidebar
                  options={options}
                  onOptionsChange={updateOptionsWithHistory}
                  templates={combinedTemplates}
                  customDocxTemplate={customDocxTemplate}
                  activeTemplateId={customDocxTemplate?.id || customDocxTemplate?.templateMeta?.id || activeTemplateId}
                  onTemplateChange={handleTemplateSelection}
                  onOpenDocxModal={() => setIsDocxModalOpen(true)}
                  onOpenTemplateLibrary={() => setIsTemplateLibraryOpen(true)}
                  onDeleteDocxTemplate={(t: any) => handleDeleteDocxTemplate(t?.id || t)}
                  onSaveCurrentTemplate={handleSaveCurrentTemplate}
                  onDuplicateDocxTemplate={(t: any) => handleDuplicateDocxTemplate(t?.id || t)}
                  onUpdateDocxTemplate={handleUpdateDocxTemplate}
                  onSetScopeDefault={handleSetScopeDefault}
                  scopeId={scopeId}
                  scopeName={scopeName}
                  scopeDescription={scopeDescription}
                  placeholderKeys={placeholderKeys}
                  requiredKeys={requiredKeys}
                  isScopeDefault={
                    (customDocxTemplate?.id || customDocxTemplate?.templateMeta?.id)
                      ? getDefaultTemplateIdForScope(scopeId) === (customDocxTemplate.id || customDocxTemplate.templateMeta?.id)
                      : false
                  }
                  onToggleScopeDefault={(targetTmplId?: string) => {
                    const currentTmplId = targetTmplId || customDocxTemplate?.id || customDocxTemplate?.templateMeta?.id;
                    if (!currentTmplId) return;
                    const currentDefId = getDefaultTemplateIdForScope(scopeId);
                    if (currentDefId === currentTmplId) {
                      handleSetScopeDefault(null);
                    } else {
                      handleSetScopeDefault(currentTmplId);
                    }
                  }}
                  activeRecord={liveData && liveData[0] ? liveData[0] : {}}
                  docxRenderMode={docxRenderMode}
                  onDocxRenderModeChange={setDocxRenderMode}
                  totalRecordsCount={liveData?.length || 0}
                  onInsertKey={(token) => {
                    insertTokenAtActiveCaret(token);
                  }}
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
          columns={liveColumns as any}
          metaItems={metaItems}
        />
      )}

      {/* Universal Template Library Hub Modal */}
      {isTemplateLibraryOpen && (
        <TemplateLibraryModal
          isOpen={isTemplateLibraryOpen}
          onClose={() => setIsTemplateLibraryOpen(false)}
          onApplyTemplate={(tmpl) => {
            handleApplyDocxTemplate(tmpl);
            setSavedWordTemplates(getSavedDocxTemplates());
          }}
          activeScopeId={scopeId}
        />
      )}

      {/* Active Global Drag Overlay for smooth sidebar resizing */}
      {isSidebarResizing && (
        <div
          className="fixed inset-0 z-[99999] select-none bg-transparent cursor-col-resize pointer-events-auto"
          style={{ cursor: 'col-resize' }}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(studioContent, document.body)
    : studioContent;
}
